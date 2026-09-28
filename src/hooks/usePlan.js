import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { computeTotals, toAmount } from '../utils/plan.js'
import { itemToRow, LISTS, rowsToPlan } from '../utils/planMapper.js'

// Typing is saved once the person pauses, not on every keystroke
const SAVE_DELAY_MS = 400

// Replaces one list of the plan without touching the rest
function withList(plan, listKey, items) {
  return { ...plan, [listKey]: items }
}

/**
 * Where the writes stand: being sent, waiting for the typing pause, or all done
 * @param {number} waiting
 * @param {number} inFlight
 * @returns {'saving' | 'pending' | 'saved'}
 */
function saveStatusOf(waiting, inFlight) {
  if (!!inFlight) {
    return 'saving'
  }

  if (!!waiting) {
    return 'pending'
  }

  return 'saved'
}

// Loads every row of a plan and shapes it for the components
async function fetchPlan(planId) {
  const { data, error } = await api.get(`/plans/${planId}`)

  if (!!error) {
    throw new Error(error.message)
  }

  return rowsToPlan(data)
}

/**
 * The plan being viewed: edits are applied locally right away, then written to the server
 * @param {string} planId
 */
export default function usePlan(planId) {
  const [plan, setPlan] = useState(undefined)
  const [error, setError] = useState('')
  const latest = useRef(undefined)
  const timers = useRef({})
  // Writes waiting for the typing pause, by key, so they can also be sent early
  const queued = useRef({})
  const [waiting, setWaiting] = useState(0)
  const [inFlight, setInFlight] = useState(0)

  // Writers read the freshest state, not the one captured when they were scheduled
  latest.current = plan

  const reload = useCallback(async () => {
    try {
      setPlan(await fetchPlan(planId))
    } catch (failure) {
      setError(failure.message)
    }
  }, [planId])

  useEffect(() => {
    setPlan(undefined)
    reload()
  }, [reload])

  // A rejected write means the local state is wrong: surface it and resync from the server
  const persist = useCallback(
    async (request) => {
      setInFlight((count) => count + 1)

      const { error: failure } = await request

      setInFlight((count) => count - 1)

      if (!failure) {
        return
      }

      setError(failure.message)
      reload()
    },
    [reload]
  )

  // Drops a queued write, for a row about to be deleted anyway
  const cancel = useCallback((key) => {
    clearTimeout(timers.current[key])
    delete timers.current[key]
    delete queued.current[key]
    setWaiting(Object.keys(queued.current).length)
  }, [])

  // Sends one queued write right away
  const send = useCallback(
    (key) => {
      const write = queued.current[key]

      cancel(key)

      if (!!write) {
        persist(write())
      }
    },
    [cancel, persist]
  )

  // Sends every queued write without waiting for the typing pause
  const flush = useCallback(() => {
    Object.keys(queued.current).forEach(send)
  }, [send])

  // Leaving the plan sends what is still queued rather than dropping it
  useEffect(() => () => flush(), [flush])

  // Closing the tab cannot wait for a request, so the browser asks for confirmation instead
  useEffect(() => {
    if (!waiting && !inFlight) {
      return undefined
    }

    function warn(event) {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', warn)

    return () => window.removeEventListener('beforeunload', warn)
  }, [waiting, inFlight])

  /**
   * Runs a write once no other change to the same key happened for a moment
   * @param {string} key
   * @param {() => PromiseLike<object>} write
   */
  function debounce(key, write) {
    clearTimeout(timers.current[key])
    queued.current[key] = write
    setWaiting(Object.keys(queued.current).length)
    timers.current[key] = setTimeout(() => send(key), SAVE_DELAY_MS)
  }

  /**
   * Updates the annual tax of one place of the plan
   * @param {string} id - the place being edited
   * @param {string | number} value
   */
  function updateTax(id, value) {
    setPlan((current) => ({
      ...current,
      people: current.people.map((person) => {
        if (person.id !== id) {
          return person
        }

        return { ...person, annualTax: value }
      }),
    }))

    debounce(`tax-${id}`, () => {
      const person = latest.current.people.find((candidate) => candidate.id === id)

      return api.patch(`/plans/${planId}/slots/${id}/tax`, { annual_tax: toAmount(person.annualTax) })
    })
  }

  /**
   * Updates one shared setting, such as when the tax is deducted
   * @param {'taxTiming'} key
   * @param {string} value
   */
  function updateSetting(key, value) {
    setPlan((current) => ({ ...current, settings: { ...current.settings, [key]: value } }))
    persist(api.patch(`/plans/${planId}`, { tax_timing: value }))
  }

  /**
   * Appends a line or a sub-group
   * @param {keyof LISTS} listKey
   * @param {object} item
   */
  function addItem(listKey, item) {
    const next = withList(latest.current, listKey, [...latest.current[listKey], item])

    setPlan(next)
    persist(api.post(`/plans/${planId}/${LISTS[listKey].resource}`, itemToRow(next, listKey, item)))
  }

  /**
   * Updates one field of a line or a sub-group
   * @param {keyof LISTS} listKey
   * @param {string} id
   * @param {string} field
   * @param {string | number} value
   */
  function updateItem(listKey, id, field, value) {
    setPlan((current) =>
      withList(
        current,
        listKey,
        current[listKey].map((item) => {
          if (item.id !== id) {
            return item
          }

          return { ...item, [field]: value }
        })
      )
    )

    debounce(`${listKey}-${id}`, () => {
      const item = latest.current[listKey].find((candidate) => candidate.id === id)

      return api.put(`/plans/${planId}/${LISTS[listKey].resource}/${id}`, itemToRow(latest.current, listKey, item))
    })
  }

  /**
   * Drops a line
   * @param {'categories' | 'savings'} listKey
   * @param {string} id
   */
  function removeItem(listKey, id) {
    cancel(`${listKey}-${id}`)
    setPlan((current) =>
      withList(
        current,
        listKey,
        current[listKey].filter((item) => item.id !== id)
      )
    )
    persist(api.remove(`/plans/${planId}/lines/${id}`))
  }

  /**
   * Drops a sub-group, its lines moving up to the scope it belonged to (the server does the same on delete)
   * @param {'subgroups' | 'savingGroups'} groupKey
   * @param {'categories' | 'savings'} listKey
   * @param {string} id
   */
  function removeSubgroup(groupKey, listKey, id) {
    setPlan((current) => {
      const removed = current[groupKey].find((subgroup) => subgroup.id === id)

      return {
        ...current,
        [groupKey]: current[groupKey].filter((subgroup) => subgroup.id !== id),
        [listKey]: current[listKey].map((line) => {
          if (line.parent !== id) {
            return line
          }

          return { ...line, parent: removed.scope }
        }),
      }
    })
    persist(api.remove(`/plans/${planId}/groups/${id}`))
  }

  const totals = useMemo(() => {
    if (!plan) {
      return undefined
    }

    return computeTotals(plan)
  }, [plan])

  return {
    plan,
    totals,
    error,
    dismissError: () => setError(''),
    saveStatus: saveStatusOf(waiting, inFlight),
    flush,
    updateTax,
    updateSetting,
    addItem,
    updateItem,
    removeItem,
    removeSubgroup,
  }
}
