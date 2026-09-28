// Filling a plan from the JSON plan shape, for imported files and the example plan given to new accounts
import examplePlan from '../data/example-plan.json'
import { withDefaults } from '../utils/plan.js'
import { mappingByPosition } from '../utils/planFile.js'
import { toImportPayload } from '../utils/planMapper.js'
import { api } from './api.js'

// Income the example plan was built for, copied into the new account's profile so its figures add up
export const EXAMPLE_INCOME = examplePlan.people[0].netMonthly

/**
 * Appends the lines of a plan read from a JSON file to a fresh plan, each person taking the place at their position
 * @param {string} planId
 * @param {object} source
 * @returns {Promise<string | undefined>} an error message, if any
 */
export async function importInto(planId, source) {
  const { data, error } = await api.get(`/plans/${planId}`)

  if (error) {
    return error.message
  }

  const payload = toImportPayload(withDefaults(source), mappingByPosition(source.people, data.slots))
  const { error: failure } = await api.post(`/plans/${planId}/import`, payload)

  return failure?.message
}

/**
 * Creates the filled-in solo plan the guided tour walks through
 * @returns {Promise<string | undefined>} an error message, if any
 */
export async function createExamplePlan() {
  const { data, error } = await api.post('/plans', { name: examplePlan.name, slotCount: 1 })

  if (error) {
    return error.message
  }

  return importInto(data.id, examplePlan)
}
