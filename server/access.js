import { db } from './db.js'

// Authorization rules, previously the row level security policies of the database.
// Every route goes through them: nothing is filtered on the front-end side.

const slotOfMember = db.prepare('select id from plan_slots where plan_id = ? and user_id = ?')
const createdBy = db.prepare('select 1 from plans where id = ? and created_by = ?')
const bookableLine = db.prepare(
  "select 1 from plan_lines where id = ? and plan_id = ? and kind = 'expense' and (owner_id is null or owner_id = ?)"
)

/**
 * The place a person holds in a plan, undefined when they hold none
 * @param {string} planId
 * @param {string} userId
 */
export function slotOf(planId, userId) {
  return slotOfMember.get(planId, userId)?.id
}

/**
 * Only the creator adds a place, publishes a template and imports a whole plan
 * @param {string} planId
 * @param {string} userId
 */
export function isPlanCreator(planId, userId) {
  return !!createdBy.get(planId, userId)
}

/**
 * Members edit the common part and their own place only
 * @param {string} slotId - the place the viewer holds in the plan
 * @param {string | null} ownerId
 */
export function canEditScope(slotId, ownerId) {
  return !ownerId || ownerId === slotId
}

/**
 * Expenses are booked on an expense line of the same plan, common or owned by the author's place
 * @param {string} planId
 * @param {string} slotId
 * @param {string} lineId
 */
export function canBookOnLine(planId, slotId, lineId) {
  return !!bookableLine.get(lineId, planId, slotId)
}

// Express gate for every route nested under a plan, carrying the viewer's place to the handlers
export function requireMembership(req, res, next) {
  req.slotId = slotOf(req.params.planId, req.userId)

  if (!req.slotId) {
    res.status(403).json({ error: 'Ce plan n’est pas accessible.' })
    return
  }

  next()
}
