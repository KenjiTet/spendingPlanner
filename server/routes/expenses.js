import { Router } from 'express'
import { canBookOnLine } from '../access.js'
import { db } from '../db.js'
import { fail } from '../errors.js'
import { readId } from '../input.js'

// Mounted under a plan, membership already checked by the parent router
const router = Router({ mergeParams: true })

// Own expenses are always visible, the other place's only when booked on a common line.
// An expense outliving its line keeps a NULL line_id: it stays private rather than turning common.
const listMonth = db.prepare(`
  select e.id, e.line_id, e.slot_id, e.amount, e.spent_on, e.note, e.created_at
  from expenses e
  left join plan_lines l on l.id = e.line_id
  where e.plan_id = ? and e.spent_on between ? and ?
    and (e.slot_id = ? or (e.line_id is not null and l.owner_id is null))
`)
const insertExpense = db.prepare(
  'insert into expenses (id, plan_id, line_id, slot_id, amount, spent_on, note, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)'
)
const deleteOwn = db.prepare('delete from expenses where id = ? and plan_id = ? and slot_id = ?')

// Entry habits of one place only, so the other member's expenses never surface in the suggestions
const usageByLine = db.prepare(`
  select line_id, count(*) as uses, max(spent_on) as last_used
  from expenses
  where plan_id = ? and slot_id = ? and line_id is not null and spent_on >= ?
  group by line_id
  order by uses desc, last_used desc
`)

// Shortcuts of the expense form, private to their place like its habits
const listPins = db.prepare('select group_id from slot_pinned_groups where slot_id = ?')
const findPinnable = db.prepare(
  "select 1 from plan_groups where id = ? and plan_id = ? and kind = 'expense' and (owner_id is null or owner_id = ?)"
)
const insertPin = db.prepare('insert or ignore into slot_pinned_groups (slot_id, group_id) values (?, ?)')
const deletePin = db.prepare('delete from slot_pinned_groups where slot_id = ? and group_id = ?')
const listHidden = db.prepare('select group_id from slot_hidden_groups where slot_id = ?')
const insertHidden = db.prepare('insert or ignore into slot_hidden_groups (slot_id, group_id) values (?, ?)')
const deleteHidden = db.prepare('delete from slot_hidden_groups where slot_id = ? and group_id = ?')

// A sub-group is either pinned or hidden: setting one state clears the other
const pinGroup = db.transaction((slotId, groupId) => {
  deleteHidden.run(slotId, groupId)
  insertPin.run(slotId, groupId)
})
const hideGroup = db.transaction((slotId, groupId) => {
  deletePin.run(slotId, groupId)
  insertHidden.run(slotId, groupId)
})

/**
 * Refuses a sub-group the viewer cannot book on
 * @param {object} req
 */
function requirePinnable(req) {
  if (!findPinnable.get(req.params.groupId, req.params.planId, req.slotId)) {
    fail(403, 'Ce sous-groupe n’est pas accessible.')
  }
}
const listPresets = db.prepare(
  'select id, line_id, label, amount from expense_presets where plan_id = ? and slot_id = ? order by created_at'
)
const insertPreset = db.prepare(
  'insert into expense_presets (id, plan_id, slot_id, line_id, label, amount, created_at) values (?, ?, ?, ?, ?, ?, ?)'
)
const deletePreset = db.prepare('delete from expense_presets where id = ? and plan_id = ? and slot_id = ?')

// How far back the entry habits are looked for
const SUGGESTION_DAYS = 90

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

  res.json(listMonth.all(req.params.planId, from, to, req.slotId))
})

router.get('/suggestions', (req, res) => {
  const since = new Date(Date.now() - SUGGESTION_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { planId } = req.params

  res.json({ lines: usageByLine.all(planId, req.slotId, since) })
})

router.get('/shortcuts', (req, res) => {
  const { planId } = req.params

  res.json({
    pinnedGroupIds: listPins.all(req.slotId).map((row) => row.group_id),
    hiddenGroupIds: listHidden.all(req.slotId).map((row) => row.group_id),
    presets: listPresets.all(planId, req.slotId),
  })
})

// Pinning is idempotent, so a double tap does no harm
router.put('/pins/:groupId', (req, res) => {
  requirePinnable(req)
  pinGroup(req.slotId, req.params.groupId)
  res.json({})
})

router.delete('/pins/:groupId', (req, res) => {
  deletePin.run(req.slotId, req.params.groupId)
  res.json({})
})

router.put('/hidden/:groupId', (req, res) => {
  requirePinnable(req)
  hideGroup(req.slotId, req.params.groupId)
  res.json({})
})

router.delete('/hidden/:groupId', (req, res) => {
  deleteHidden.run(req.slotId, req.params.groupId)
  res.json({})
})

router.post('/presets', (req, res) => {
  const { planId } = req.params
  const lineId = String(req.body.line_id ?? '')
  const label = String(req.body.label ?? '').trim()
  const amount = Number(req.body.amount)

  if (!label) {
    fail(400, 'Le nom du raccourci est obligatoire.')
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    fail(400, 'Montant invalide.')
  }

  if (!canBookOnLine(planId, req.slotId, lineId)) {
    fail(403, 'Cette ligne de dépense n’est pas accessible.')
  }

  const preset = { id: readId(req.body.id), line_id: lineId, label, amount }

  insertPreset.run(preset.id, planId, req.slotId, lineId, label, amount, new Date().toISOString())
  res.json(preset)
})

router.delete('/presets/:id', (req, res) => {
  deletePreset.run(req.params.id, req.params.planId, req.slotId)
  res.json({})
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

  if (!canBookOnLine(planId, req.slotId, lineId)) {
    fail(403, 'Cette ligne de dépense n’est pas accessible.')
  }

  const expense = {
    id: String(req.body.id),
    plan_id: planId,
    line_id: lineId,
    slot_id: req.slotId,
    amount,
    spent_on: spentOn,
    note: String(req.body.note ?? ''),
    created_at: new Date().toISOString(),
  }

  insertExpense.run(expense.id, planId, lineId, req.slotId, amount, spentOn, expense.note, expense.created_at)
  res.json(expense)
})

router.delete('/:id', (req, res) => {
  const { changes } = deleteOwn.run(req.params.id, req.params.planId, req.slotId)

  if (!changes) {
    fail(403, 'Vous ne pouvez supprimer que vos propres dépenses.')
  }

  res.json({})
})

export default router
