import { Router } from 'express'
import { canBookOnLine } from '../access.js'
import { db } from '../db.js'
import { fail } from '../errors.js'

// Mounted under a plan, membership already checked by the parent router
const router = Router({ mergeParams: true })

// Own expenses are always visible, other members' only when booked on a common line
const listMonth = db.prepare(`
  select e.id, e.line_id, e.user_id, e.amount, e.spent_on, e.note, e.created_at
  from expenses e
  left join plan_lines l on l.id = e.line_id
  where e.plan_id = ? and e.spent_on between ? and ? and (e.user_id = ? or l.owner_id is null)
`)
const insertExpense = db.prepare(
  'insert into expenses (id, plan_id, line_id, user_id, amount, spent_on, note, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)'
)
const deleteOwn = db.prepare('delete from expenses where id = ? and plan_id = ? and user_id = ?')

const MONTH_PATTERN = /^\d{4}-\d{2}$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * First and last day of a YYYY-MM month
 * @param {string} month
 */
function monthRange(month) {
  if (!MONTH_PATTERN.test(month)) {
    fail(400, 'Mois invalide.')
  }

  return { from: `${month}-01`, to: `${month}-31` }
}

router.get('/', (req, res) => {
  const { from, to } = monthRange(String(req.query.month ?? ''))

  res.json(listMonth.all(req.params.planId, from, to, req.userId))
})

router.post('/', (req, res) => {
  const { planId } = req.params
  const lineId = String(req.body.line_id ?? '')
  const amount = Number(req.body.amount)
  const spentOn = String(req.body.spent_on ?? '')

  if (!Number.isFinite(amount) || amount <= 0) {
    fail(400, 'Montant invalide.')
  }

  if (!DATE_PATTERN.test(spentOn)) {
    fail(400, 'Date invalide.')
  }

  if (!canBookOnLine(planId, req.userId, lineId)) {
    fail(403, 'Cette ligne de dépense n’est pas accessible.')
  }

  const expense = {
    id: String(req.body.id),
    plan_id: planId,
    line_id: lineId,
    user_id: req.userId,
    amount,
    spent_on: spentOn,
    note: String(req.body.note ?? ''),
    created_at: new Date().toISOString(),
  }

  insertExpense.run(expense.id, planId, lineId, req.userId, amount, spentOn, expense.note, expense.created_at)
  res.json(expense)
})

router.delete('/:id', (req, res) => {
  const { changes } = deleteOwn.run(req.params.id, req.params.planId, req.userId)

  if (!changes) {
    fail(403, 'Vous ne pouvez supprimer que vos propres dépenses.')
  }

  res.json({})
})

export default router
