import { Router } from 'express'
import { db } from '../db.js'
import { fail } from '../errors.js'
import { readId } from '../input.js'

// Mounted under a plan, membership already checked by the parent router.
// The open sequence is every common expense not yet covered by a settlement, split equally between the two places.
const router = Router({ mergeParams: true })

const EXPENSE_COLUMNS = 'e.id, e.slot_id, e.line_id, e.amount, e.spent_on, e.note, e.created_at, e.settlement_id'

const listSlots = db.prepare('select id, user_id from plan_slots where plan_id = ? order by position')
const listTakenSlots = db.prepare('select id from plan_slots where plan_id = ? and user_id is not null order by position')
// Common lines only, entered since the plan started its settlements
const listOpen = db.prepare(`
  select ${EXPENSE_COLUMNS}
  from expenses e
  join plan_lines l on l.id = e.line_id
  join plans p on p.id = e.plan_id
  where e.plan_id = ? and e.settlement_id is null and l.owner_id is null and e.created_at >= p.settlements_since
  order by e.spent_on, e.created_at
`)
// A covered expense stays listed even once its line is deleted
const listSettled = db.prepare(`
  select ${EXPENSE_COLUMNS}
  from expenses e
  where e.plan_id = ? and e.settlement_id is not null
  order by e.spent_on, e.created_at
`)
const listSettlements = db.prepare('select * from settlements where plan_id = ? order by declared_at desc')
const findPending = db.prepare("select id from settlements where plan_id = ? and status = 'pending'")
const insertSettlement = db.prepare(
  "insert into settlements (id, plan_id, debtor_id, creditor_id, amount, status, declared_at) values (?, ?, ?, ?, ?, 'pending', ?)"
)
const attachExpense = db.prepare('update expenses set settlement_id = ? where id = ?')
const validatePending = db.prepare(
  "update settlements set status = 'validated', validated_at = ? where id = ? and plan_id = ? and status = 'pending' and creditor_id = ?"
)
// Refused by the creditor or cancelled by the debtor: its expenses fall back into the open sequence
const deletePending = db.prepare(
  "delete from settlements where id = ? and plan_id = ? and status = 'pending' and (debtor_id = ? or creditor_id = ?)"
)

/**
 * Rounds an amount to the cent
 * @param {number} amount
 */
function toCents(amount) {
  return Math.round(amount * 100) / 100
}

/**
 * Who paid what, and what the one who paid less owes the other, each place bearing half of the total
 * @param {{ slot_id: string, amount: number }[]} expenses
 * @param {string[]} slotIds - the two taken places
 */
function balanceOf(expenses, slotIds) {
  const paid = Object.fromEntries(slotIds.map((id) => [id, 0]))

  expenses.forEach((expense) => {
    paid[expense.slot_id] = toCents((paid[expense.slot_id] ?? 0) + expense.amount)
  })

  const [first, second] = slotIds
  const amount = toCents(Math.abs(paid[first] - paid[second]) / 2)

  if (paid[first] < paid[second]) {
    return { paid, debtorId: first, creditorId: second, amount }
  }

  return { paid, debtorId: second, creditorId: first, amount }
}

/**
 * What the viewer is expected to do, feeding the menu badge: repay an open balance, or validate a declared repayment
 * @param {{ debtorId: string, amount: number }} open
 * @param {{ creditor_id: string } | undefined} pending
 * @param {string} slotId
 */
function actionOf(open, pending, slotId) {
  if (!!pending) {
    if (pending.creditor_id === slotId) {
      return 'validate'
    }

    return undefined
  }

  if (!!open.amount && open.debtorId === slotId) {
    return 'declare'
  }

  return undefined
}

/**
 * The two taken places, refusing a plan that has fewer
 * @param {string} planId
 */
function requirePair(planId) {
  const slotIds = listTakenSlots.all(planId).map((slot) => slot.id)

  if (slotIds.length < 2) {
    fail(409, 'Les remboursements concernent les plans à deux.')
  }

  return slotIds
}

// Freezes the open sequence into a pending settlement, the amount always recomputed here
const declare = db.transaction((planId, slotId, id) => {
  if (!!findPending.get(planId)) {
    fail(409, 'Un remboursement attend déjà sa validation.')
  }

  const expenses = listOpen.all(planId)
  const balance = balanceOf(expenses, requirePair(planId))

  if (!balance.amount) {
    fail(409, 'Il n’y a rien à rembourser.')
  }

  if (balance.debtorId !== slotId) {
    fail(403, 'Seule la personne qui doit le montant peut déclarer le remboursement.')
  }

  const declaredAt = new Date().toISOString()

  insertSettlement.run(id, planId, balance.debtorId, balance.creditorId, balance.amount, declaredAt)
  expenses.forEach((expense) => attachExpense.run(id, expense.id))

  return { id, debtor_id: balance.debtorId, creditor_id: balance.creditorId, amount: balance.amount, status: 'pending', declared_at: declaredAt }
})

router.get('/', (req, res) => {
  const { planId } = req.params
  const slots = listSlots.all(planId)

  // Plans for two only, the page staying reachable while the second place is still free
  if (slots.length < 2) {
    res.json({ available: false })
    return
  }

  const slotIds = slots.map((slot) => slot.id)
  const expenses = listOpen.all(planId)
  const open = { expenses, ...balanceOf(expenses, slotIds) }
  const settled = listSettled.all(planId)
  const settlements = listSettlements.all(planId).map((settlement) => ({
    ...settlement,
    expenses: settled.filter((expense) => expense.settlement_id === settlement.id),
  }))
  const pending = settlements.find((settlement) => settlement.status === 'pending')

  res.json({
    available: true,
    // Nobody can repay a free place, so no repayment can be declared until it is taken
    waiting: slots.some((slot) => !slot.user_id),
    open,
    pending,
    history: settlements.filter((settlement) => settlement.status === 'validated'),
    action: actionOf(open, pending, req.slotId),
  })
})

router.post('/', (req, res) => {
  res.json(declare(req.params.planId, req.slotId, readId(req.body.id)))
})

router.post('/:id/validate', (req, res) => {
  const { changes } = validatePending.run(new Date().toISOString(), req.params.id, req.params.planId, req.slotId)

  if (!changes) {
    fail(403, 'Seule la personne remboursée peut valider ce remboursement.')
  }

  res.json({})
})

router.delete('/:id', (req, res) => {
  const { changes } = deletePending.run(req.params.id, req.params.planId, req.slotId, req.slotId)

  if (!changes) {
    fail(403, 'Ce remboursement ne peut plus être annulé.')
  }

  res.json({})
})

export default router
