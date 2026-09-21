import { db } from './db.js'

// Authorization rules, previously the row level security policies of the database.
// Every route goes through them: nothing is filtered on the front-end side.

const memberOf = db.prepare('select 1 from plan_members where plan_id = ? and user_id = ?')
const createdBy = db.prepare('select 1 from plans where id = ? and created_by = ?')
const bookableLine = db.prepare(
  "select 1 from plan_lines where id = ? and plan_id = ? and kind = 'expense' and (owner_id is null or owner_id = ?)"
)

/**
 * @param {string} planId
 * @param {string} userId
 */
export function isPlanMember(planId, userId) {
  return !!memberOf.get(planId, userId)
}

/**
 * Only the creator adds members and imports a whole plan
 * @param {string} planId
 * @param {string} userId
 */
export function isPlanCreator(planId, userId) {
  return !!createdBy.get(planId, userId)
}

/**
 * Members edit the common part and their own part only
 * @param {string} planId
 * @param {string} userId
 * @param {string | null} ownerId
 */
export function canEditScope(planId, userId, ownerId) {
  if (!isPlanMember(planId, userId)) {
    return false
  }

  return !ownerId || ownerId === userId
}

/**
 * Expenses are booked on an expense line of the same plan, common or owned by the author
 * @param {string} planId
 * @param {string} userId
 * @param {string} lineId
 */
export function canBookOnLine(planId, userId, lineId) {
  if (!isPlanMember(planId, userId)) {
    return false
  }

  return !!bookableLine.get(lineId, planId, userId)
}

// Express gate for every route nested under a plan
export function requireMembership(req, res, next) {
  if (!isPlanMember(req.params.planId, req.userId)) {
    res.status(403).json({ error: 'Ce plan n’est pas accessible.' })
    return
  }

  next()
}
