// Filling a plan from the JSON plan shape, for imported files and the starter plan proposed by the onboarding
import { withDefaults } from '../utils/plan.js'
import { mappingByPosition } from '../utils/planFile.js'
import { toImportPayload } from '../utils/planMapper.js'
import { api } from './api.js'

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
