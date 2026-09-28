// Moving a plan in and out of a JSON file
import { normalizePlan, SHARED } from './plan.js'

/**
 * Gives each person of an imported file the place at the same position, the common part when places run out
 * @param {{ id: string }[]} sourcePeople
 * @param {{ id: string }[]} places
 * @returns {Record<string, string>}
 */
export function mappingByPosition(sourcePeople, places) {
  return sourcePeople.reduce(
    (mapping, person, index) => ({ ...mapping, [person.id]: places[index]?.id ?? SHARED }),
    {}
  )
}

/**
 * Downloads a plan as a formatted JSON file named after it
 * @param {object} plan - the in-memory shape returned by rowsToPlan
 */
export function downloadPlan(plan) {
  const content = JSON.stringify(normalizePlan(plan), undefined, 2)
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const link = document.createElement('a')

  link.href = url
  link.download = `${plan.name}.json`
  link.click()
  URL.revokeObjectURL(url)
}
