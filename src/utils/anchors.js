// Element ids of the plan editor, shared by the blocks and the outline linking to them

/**
 * One section of the plan, e.g. "expenses"
 * @param {string} section
 */
export function sectionAnchor(section) {
  return `plan-${section}`
}

/**
 * A scope inside a section: scope ids repeat from one section to the other
 * @param {string} section
 * @param {string} scopeId
 */
export function scopeAnchor(section, scopeId) {
  return `plan-${section}-${scopeId}`
}

/**
 * A sub-group or a line, whose ids are unique across the plan
 * @param {string} id
 */
export function nodeAnchor(id) {
  return `plan-node-${id}`
}
