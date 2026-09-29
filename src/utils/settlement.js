/**
 * Place id to display name, for the repayment screens
 * @param {{ people: { id: string, label: string }[] }} plan
 * @returns {Record<string, { name: string }>}
 */
export function membersOf(plan) {
  return Object.fromEntries(plan.people.map((person) => [person.id, { name: person.label }]))
}

/**
 * @param {Record<string, { name: string }>} members - from membersOf
 * @param {string} slotId
 */
export function nameOf(members, slotId) {
  return members[slotId]?.name ?? 'Autre membre'
}

/**
 * Stage of the repayments: second place still free, a repayment waiting for validation, nothing owed, or an amount due
 * @param {{ waiting?: boolean, pending?: object, open: { amount: number } }} data
 * @returns {'waiting' | 'pending' | 'even' | 'due'}
 */
export function settlementPhaseOf(data) {
  if (data.waiting) {
    return 'waiting'
  }

  if (!!data.pending) {
    return 'pending'
  }

  if (!data.open.amount) {
    return 'even'
  }

  return 'due'
}
