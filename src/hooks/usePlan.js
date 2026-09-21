import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { computeTotals, toAmount, withDefaults } from '../utils/plan.js'
import { itemToRow, LISTS, rowsToPlan, toImportPayload } from '../utils/planMapper.js'

// Typing is saved once the person pauses, not on every keystroke
const SAVE_DELAY_MS = 400

// Replaces one list of the plan without touching the rest
function withList(plan, listKey, items) {
  return { ...plan, [listKey]: items }
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

  // Pending debounced writes are dropped when the plan changes or the page unmounts
  useEffect(() => {
    const pending = timers.current

    return () => Object.values(pending).forEach(clearTimeout)
  }, [planId])

  // A rejected write means the local state is wrong: surface it and resync from the server
  const persist = useCallback(
    async (request) => {
      const { error: failure } = await request

      if (!failure) {
        return
      }

      setError(failure.message)
      reload()
    },
    [reload]
  )

  /**
   * Runs a write once no other change to the same key happened for a moment
   * @param {string} key
   * @param {() => PromiseLike<object>} write
   */
  function debounce(key, write) {
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      delete timers.current[key]
      persist(write())
    }, SAVE_DELAY_MS)
  }

  /**
   * Updates the income or tax of the signed-in person, the only member row they may edit
   * @param {string} id
   * @param {'netMonthly' | 'annualTax'} field
   * @param {string | number} value
   */
  function updatePerson(id, field, value) {
    setPlan((current) => ({
      ...current,
      people: current.people.map((person) => {
        if (person.id !== id) {
          return person
        }

        return { ...person, [field]: value }
      }),
    }))

    debounce(`person-${id}`, () => {
      const person = latest.current.people.find((candidate) => candidate.id === id)

      return api.patch(`/plans/${planId}/members/me`, {
        net_monthly: toAmount(person.netMonthly),
        annual_tax: toAmount(person.annualTax),
      })
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
    clearTimeout(timers.current[`${listKey}-${id}`])
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

  /**
   * Appends a plan read from a JSON file, each JSON person mapped to a member or to the common part
   * @param {object} source
   * @param {Record<string, string>} scopeByPerson
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function importPlan(source, scopeByPerson) {
    const payload = toImportPayload(withDefaults(source), scopeByPerson)
    const { error: failure } = await api.post(`/plans/${planId}/import`, payload)

    if (failure) {
      return failure.message
    }

    await reload()
    return undefined
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
    updatePerson,
    updateSetting,
    addItem,
    updateItem,
    removeItem,
    removeSubgroup,
    importPlan,
  }
}
