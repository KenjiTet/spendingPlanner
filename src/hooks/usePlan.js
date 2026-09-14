import { useEffect, useMemo, useState } from 'react'
import defaultPlan from '../data/plan.json'
import { loadPlan, savePlan } from '../utils/storage.js'
import { computeTotals, withDefaults } from '../utils/plan.js'

// Replaces one list of the plan without touching the rest
function withList(plan, listKey, items) {
  return { ...plan, [listKey]: items }
}

// The only stateful module of the app: the whole plan lives here and is mirrored to the browser
export default function usePlan() {
  const [plan, setPlan] = useState(() => withDefaults(loadPlan(defaultPlan)))

  // Every edit is persisted, so a refresh keeps the plan
  useEffect(() => {
    savePlan(plan)
  }, [plan])

  /**
   * Updates one numeric or text field of a person
   * @param {string} id
   * @param {'label' | 'netMonthly' | 'annualTax'} field
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
  }

  /**
   * Updates one setting, such as when the tax is deducted
   * @param {string} key
   * @param {string} value
   */
  function updateSetting(key, value) {
    setPlan((current) => ({ ...current, settings: { ...current.settings, [key]: value } }))
  }

  /**
   * Appends a budget line to `categories` or `savings`
   * @param {'categories' | 'savings'} listKey
   * @param {{ id: string, label: string, amount: number }} item
   */
  function addItem(listKey, item) {
    setPlan((current) => withList(current, listKey, [...current[listKey], item]))
  }

  /**
   * Updates one field of a budget line
   * @param {'categories' | 'savings'} listKey
   * @param {string} id
   * @param {'label' | 'amount'} field
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
  }

  /**
   * Drops a budget line
   * @param {'categories' | 'savings'} listKey
   * @param {string} id
   */
  function removeItem(listKey, id) {
    setPlan((current) =>
      withList(
        current,
        listKey,
        current[listKey].filter((item) => item.id !== id)
      )
    )
  }

  /**
   * Drops a sub-group, its lines moving up to the scope it belonged to
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
  }

  // Swaps the whole plan, used by the JSON import
  function replacePlan(nextPlan) {
    setPlan(withDefaults(nextPlan))
  }

  // Back to the plan shipped in src/data/plan.json
  function resetPlan() {
    setPlan(defaultPlan)
  }

  const totals = useMemo(() => computeTotals(plan), [plan])

  return {
    plan,
    totals,
    updatePerson,
    updateSetting,
    addItem,
    updateItem,
    removeItem,
    removeSubgroup,
    replacePlan,
    resetPlan,
  }
}
