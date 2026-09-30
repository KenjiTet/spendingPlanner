import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { canEditScope, isPlanCreator, requireMembership, slotOf } from '../access.js'
import { requireUser } from '../auth.js'
import { db } from '../db.js'
import { fail } from '../errors.js'
import { readAmount, readFlag, readId, readKind, readPosition } from '../input.js'
import { randomShareCode, SHARE_CODE_PATTERN } from '../shareCode.js'
import expensesRouter from './expenses.js'
import settlementsRouter from './settlements.js'

const TAX_TIMINGS = ['monthly', 'yearly']
const MAX_SLOTS = 2
const CODE_ATTEMPTS = 5

const router = Router()

router.use(requireUser)

const listPlans = db.prepare(`
  select p.id, p.name, p.created_by, p.share_code, p.is_template,
         (select count(*) from plan_slots f where f.plan_id = p.id and f.user_id is null) as free_slots
  from plans p join plan_slots s on s.plan_id = p.id
  where s.user_id = ? order by p.created_at
`)
const listTemplates = db.prepare(`
  select p.id, p.name from plans p
  where p.is_template = 1
    and not exists (select 1 from plan_slots s where s.plan_id = p.id and s.user_id = ?)
  order by p.name
`)
const insertPlan = db.prepare(
  'insert into plans (id, name, share_code, created_by, created_at) values (@id, @name, @share_code, @created_by, @created_at)'
)
const insertSlot = db.prepare(
  'insert into plan_slots (id, plan_id, label, user_id, net_monthly, annual_tax, position) values (@id, @plan_id, @label, @user_id, @net_monthly, @annual_tax, @position)'
)
const findPlan = db.prepare(
  'select id, name, created_by, share_code, is_template from plans where id = ?'
)
const findByCode = db.prepare('select id, name from plans where share_code = ?')
const findTemplate = db.prepare('select id from plans where id = ? and is_template = 1')
const findProfile = db.prepare('select display_name, net_monthly from users where id = ?')
// A taken place reads its income from the account profile; the tax belongs to the place, set in the budget
const listSlots = db.prepare(`
  select s.id, s.label, s.user_id, u.display_name, s.annual_tax, s.tax_timing,
         coalesce(u.net_monthly, s.net_monthly) as net_monthly
  from plan_slots s left join users u on u.id = s.user_id
  where s.plan_id = ? order by s.position
`)
const findSlot = db.prepare('select id, user_id from plan_slots where id = ? and plan_id = ?')
// The tax already set on a free place, by the creator, is kept for whoever takes it
const claimSlot = db.prepare(
  'update plan_slots set user_id = ?, net_monthly = ? where id = ? and plan_id = ? and user_id is null'
)
const updateTax = db.prepare('update plan_slots set annual_tax = ? where id = ? and plan_id = ?')
const updateTaxTiming = db.prepare('update plan_slots set tax_timing = ? where id = ? and plan_id = ?')
const updateFigures = db.prepare(
  'update plan_slots set net_monthly = ?, annual_tax = ?, tax_timing = ? where id = ? and plan_id = ?'
)
const updateTemplate = db.prepare('update plans set is_template = ? where id = ?')
const listGroups = db.prepare('select * from plan_groups where plan_id = ? order by position')
const listLines = db.prepare('select * from plan_lines where plan_id = ? order by position')
const listSharedGroups = db.prepare(
  'select id, kind, label, color, position from plan_groups where plan_id = ? and owner_id is null order by position'
)
const listSharedLines = db.prepare(
  'select id, kind, label, auto_book, group_id, position from plan_lines where plan_id = ? and owner_id is null order by position'
)
const findGroup = db.prepare('select * from plan_groups where id = ?')
const findLine = db.prepare('select * from plan_lines where id = ?')
const insertGroup = db.prepare(
  'insert into plan_groups (id, plan_id, kind, label, color, owner_id, position) values (@id, @plan_id, @kind, @label, @color, @owner_id, @position)'
)
const updateGroup = db.prepare(
  'update plan_groups set label = @label, color = @color, owner_id = @owner_id, position = @position where id = @id and plan_id = @plan_id'
)
const insertLine = db.prepare(
  'insert into plan_lines (id, plan_id, kind, label, amount, auto_book, owner_id, group_id, position) values (@id, @plan_id, @kind, @label, @amount, @auto_book, @owner_id, @group_id, @position)'
)
const updateLine = db.prepare(
  'update plan_lines set label = @label, amount = @amount, auto_book = @auto_book, owner_id = @owner_id, group_id = @group_id, position = @position where id = @id and plan_id = @plan_id'
)
const deleteGroup = db.prepare('delete from plan_groups where id = ? and plan_id = ?')
const deleteGroupLines = db.prepare('delete from plan_lines where group_id = ? and plan_id = ?')
// A group goes with its lines, their expenses kept with a NULL line
const deleteGroupWithLines = db.transaction((groupId, planId) => {
  deleteGroupLines.run(groupId, planId)
  deleteGroup.run(groupId, planId)
})
const deleteLine = db.prepare('delete from plan_lines where id = ? and plan_id = ?')
const deletePlan = db.prepare('delete from plans where id = ?')

/**
 * Share code as typed by the person who received it
 * @param {unknown} value
 */
function readCode(value) {
  const code = String(value ?? '')
    .trim()
    .toUpperCase()

  if (!SHARE_CODE_PATTERN.test(code)) {
    fail(400, 'Ce code n’est pas valide.')
  }

  return code
}

// A code nobody else holds; the unique index is the last resort behind these attempts
function newShareCode() {
  let attempt = 0

  while (attempt < CODE_ATTEMPTS) {
    const code = randomShareCode()

    if (!findByCode.get(code)) {
      return code
    }

    attempt += 1
  }

  fail(500, 'Impossible de générer un code de partage.')
}

/**
 * Scope sent by the client, refused when it is neither the common part nor the viewer's own place
 * @param {string} slotId
 * @param {unknown} value
 */
function readOwner(slotId, value) {
  const ownerId = value ?? null

  if (!canEditScope(slotId, ownerId)) {
    fail(403, 'Vous ne pouvez modifier que la partie commune et votre propre partie.')
  }

  return ownerId
}

// An unknown timing falls back to the monthly one, the default of every place
function readTaxTiming(value) {
  if (!TAX_TIMINGS.includes(value)) {
    return 'monthly'
  }

  return value
}

/**
 * Only your own tax may be changed, or that of a free place by the plan creator
 * @param {string} planId
 * @param {string} slotId
 * @param {string} userId
 */
function checkTaxAccess(planId, slotId, userId) {
  const slot = findSlot.get(slotId, planId)

  if (!slot) {
    fail(404, 'Cette place n’existe plus.')
  }

  if (slot.user_id !== userId && (!!slot.user_id || !isPlanCreator(planId, userId))) {
    fail(403, 'Vous ne pouvez modifier que vos propres impôts.')
  }
}

/**
 * Imported rows may only belong to the common part or to a place of the plan
 * @param {Set<string>} slotIds
 * @param {unknown} value
 */
function readImportedOwner(slotIds, value) {
  const ownerId = value ?? null

  if (!!ownerId && !slotIds.has(ownerId)) {
    fail(400, 'Les lignes importées doivent appartenir à une place du plan.')
  }

  return ownerId
}

/**
 * Refuses to touch a row that belongs to another place
 * @param {string} planId
 * @param {string} slotId
 * @param {object} [row]
 */
function requireEditable(planId, slotId, row) {
  if (!row || row.plan_id !== planId) {
    fail(404, 'Cette ligne n’existe plus.')
  }

  readOwner(slotId, row.owner_id)
}

/**
 * Placement columns of a line: inside a sub-group it always shares the sub-group's scope
 * @param {string} planId
 * @param {string} kind
 * @param {unknown} groupId
 * @param {string | null} ownerId
 */
function resolvePlacement(planId, kind, groupId, ownerId) {
  if (!groupId) {
    return { group_id: null, owner_id: ownerId }
  }

  const group = findGroup.get(String(groupId))

  if (!group || group.plan_id !== planId || group.kind !== kind) {
    fail(400, 'Ce groupe n’appartient pas à cette section du plan.')
  }

  return { group_id: group.id, owner_id: group.owner_id }
}

/**
 * Row of a sub-group, rebuilt from the request rather than trusted as sent
 * @param {object} req
 */
function toGroupRow(req) {
  return {
    id: readId(req.body.id),
    plan_id: req.params.planId,
    kind: readKind(req.body.kind),
    label: String(req.body.label ?? ''),
    color: String(req.body.color ?? '1'),
    owner_id: readOwner(req.slotId, req.body.owner_id),
    position: readPosition(req.body.position),
  }
}

/**
 * Row of a line, rebuilt from the request rather than trusted as sent. The scope checked is the
 * resolved one, so a sub-group cannot smuggle a line into somebody else's part.
 * @param {object} req
 */
function toLineRow(req) {
  const planId = req.params.planId
  const kind = readKind(req.body.kind)
  const placement = resolvePlacement(planId, kind, req.body.group_id, req.body.owner_id ?? null)

  return {
    id: readId(req.body.id),
    plan_id: planId,
    kind,
    label: String(req.body.label ?? ''),
    amount: readAmount(req.body.amount),
    auto_book: readFlag(req.body.auto_book),
    position: readPosition(req.body.position),
    ...placement,
    owner_id: readOwner(req.slotId, placement.owner_id),
  }
}

/**
 * Common structure of a published template, with fresh identifiers and no amounts
 * @param {string} planId
 * @param {{ id: string }} template
 */
function copyTemplate(planId, template) {
  const groupIds = {}

  listSharedGroups.all(template.id).forEach((group) => {
    groupIds[group.id] = randomUUID()

    insertGroup.run({
      id: groupIds[group.id],
      plan_id: planId,
      kind: group.kind,
      label: group.label,
      color: group.color,
      owner_id: null,
      position: group.position,
    })
  })

  listSharedLines.all(template.id).forEach((line) => {
    insertLine.run({
      id: randomUUID(),
      plan_id: planId,
      kind: line.kind,
      label: line.label,
      amount: 0,
      // How a line is paid is structure, like its label
      auto_book: line.auto_book,
      owner_id: null,
      group_id: groupIds[line.group_id] ?? null,
      position: line.position,
    })
  })
}

// A plan, its places, the creator's claim on the first one and the copied template go together
const createPlan = db.transaction((plan, slots, template) => {
  insertPlan.run(plan)
  slots.forEach((slot) => insertSlot.run(slot))

  if (!!template) {
    copyTemplate(plan.id, template)
  }
})

// Appends a whole plan read from a JSON file, including the other place's part
const importPlan = db.transaction((planId, payload, slotIds) => {
  payload.groups.forEach((group, index) => {
    insertGroup.run({
      id: readId(group.id),
      plan_id: planId,
      kind: readKind(group.kind),
      label: String(group.label ?? ''),
      color: String(group.color ?? '1'),
      owner_id: readImportedOwner(slotIds, group.owner_id),
      position: readPosition(group.position ?? index),
    })
  })

  payload.lines.forEach((line, index) => {
    const kind = readKind(line.kind)
    const owner = readImportedOwner(slotIds, line.owner_id)

    insertLine.run({
      id: readId(line.id),
      plan_id: planId,
      kind,
      label: String(line.label ?? ''),
      amount: readAmount(line.amount),
      auto_book: readFlag(line.auto_book),
      position: readPosition(line.position ?? index),
      ...resolvePlacement(planId, kind, line.group_id, owner),
    })
  })

  payload.slots.forEach((slot) => {
    const slotId = readImportedOwner(slotIds, slot.slot_id)

    updateFigures.run(readAmount(slot.net_monthly), readAmount(slot.annual_tax), readTaxTiming(slot.tax_timing), slotId, planId)
  })
})

// Plans the person holds a place in
router.get('/', (req, res) => {
  res.json(listPlans.all(req.userId))
})

// Published templates, name only, and never a plan the person already belongs to
router.get('/templates', (req, res) => {
  res.json(listTemplates.all(req.userId))
})

// What a share code opens onto, so the person picks a place before committing to it
router.get('/join/:code', (req, res) => {
  const plan = findByCode.get(readCode(req.params.code))

  if (!plan) {
    fail(404, 'Aucun plan ne correspond à ce code.')
  }

  res.json({
    id: plan.id,
    name: plan.name,
    mine: slotOf(plan.id, req.userId),
    slots: listSlots.all(plan.id).map((slot) => ({
      id: slot.id,
      label: slot.display_name ?? slot.label,
      taken: !!slot.user_id,
    })),
  })
})

// Taking a free place, with a copy of the joiner's income
router.post('/join/:code', (req, res) => {
  const plan = findByCode.get(readCode(req.params.code))

  if (!plan) {
    fail(404, 'Aucun plan ne correspond à ce code.')
  }

  if (!!slotOf(plan.id, req.userId)) {
    fail(409, 'Vous participez déjà à ce plan.')
  }

  const profile = findProfile.get(req.userId)
  // The "user_id is null" clause is what makes two simultaneous claims safe
  const { changes } = claimSlot.run(req.userId, profile.net_monthly, readId(req.body.slotId), plan.id)

  if (!changes) {
    fail(409, 'Cette place vient d’être prise.')
  }

  res.json({ id: plan.id })
})

router.post('/', (req, res) => {
  const name = String(req.body.name ?? '').trim()
  const slotCount = Number(req.body.slotCount)

  if (!name) {
    fail(400, 'Le nom du plan est obligatoire.')
  }

  if (slotCount !== 1 && slotCount !== MAX_SLOTS) {
    fail(400, 'Un plan compte une ou deux places.')
  }

  let template

  if (!!req.body.templateId) {
    template = findTemplate.get(String(req.body.templateId))

    if (!template) {
      fail(404, 'Ce modèle n’existe plus.')
    }
  }

  const profile = findProfile.get(req.userId)
  const plan = {
    id: randomUUID(),
    name,
    share_code: newShareCode(),
    created_by: req.userId,
    created_at: new Date().toISOString(),
  }

  // The creator takes the first place, with a copy of the income from their profile
  const slots = Array.from({ length: slotCount }, (_unused, index) => ({
    id: randomUUID(),
    plan_id: plan.id,
    label: `Personne ${index + 1}`,
    user_id: index === 0 ? req.userId : null,
    net_monthly: index === 0 ? profile.net_monthly : 0,
    annual_tax: 0,
    position: index,
  }))

  createPlan(plan, slots, template)
  res.json({ id: plan.id })
})

// Everything below concerns one plan: a route added under this line is read as a plan id
router.use('/:planId', requireMembership)

router.get('/:planId', (req, res) => {
  const { planId } = req.params

  res.json({
    plan: findPlan.get(planId),
    slots: listSlots.all(planId),
    groups: listGroups.all(planId),
    lines: listLines.all(planId),
  })
})

// Your own tax, or that of a free place for as long as nobody has taken it
router.patch('/:planId/slots/:slotId/tax', (req, res) => {
  const { planId, slotId } = req.params

  checkTaxAccess(planId, slotId, req.userId)
  updateTax.run(readAmount(req.body.annual_tax), slotId, planId)
  res.json({})
})

// Whether that same tax is paid every month or once a year
router.patch('/:planId/slots/:slotId/tax-timing', (req, res) => {
  const { planId, slotId } = req.params
  const taxTiming = String(req.body.tax_timing ?? '')

  if (!TAX_TIMINGS.includes(taxTiming)) {
    fail(400, 'Réglage inconnu.')
  }

  checkTaxAccess(planId, slotId, req.userId)
  updateTaxTiming.run(taxTiming, slotId, planId)
  res.json({})
})

// Opening a solo plan to a second person, the existing lines staying common
router.post('/:planId/slots', (req, res) => {
  const { planId } = req.params

  if (!isPlanCreator(planId, req.userId)) {
    fail(403, 'Seul le créateur du plan peut ajouter une place.')
  }

  const slots = listSlots.all(planId)

  if (slots.length >= MAX_SLOTS) {
    fail(400, 'Un plan compte au plus deux places.')
  }

  insertSlot.run({
    id: randomUUID(),
    plan_id: planId,
    label: `Personne ${slots.length + 1}`,
    user_id: null,
    net_monthly: 0,
    annual_tax: 0,
    position: slots.length,
  })
  res.json({})
})

// Publishing the plan's common structure, so others may start from a copy of it
router.patch('/:planId/template', (req, res) => {
  const { planId } = req.params

  if (!isPlanCreator(planId, req.userId)) {
    fail(403, 'Seul le créateur du plan peut le publier comme modèle.')
  }

  updateTemplate.run(Number(!!req.body.is_template), planId)
  res.json({})
})

router.post('/:planId/groups', (req, res) => {
  insertGroup.run(toGroupRow(req))
  res.json({})
})

// Moving a sub-group to another scope would leave its lines' owner_id stale: update them here too
router.put('/:planId/groups/:id', (req, res) => {
  requireEditable(req.params.planId, req.slotId, findGroup.get(req.params.id))
  updateGroup.run(toGroupRow(req))
  res.json({})
})

router.delete('/:planId/groups/:id', (req, res) => {
  requireEditable(req.params.planId, req.slotId, findGroup.get(req.params.id))
  deleteGroupWithLines(req.params.id, req.params.planId)
  res.json({})
})

router.post('/:planId/lines', (req, res) => {
  insertLine.run(toLineRow(req))
  res.json({})
})

router.put('/:planId/lines/:id', (req, res) => {
  requireEditable(req.params.planId, req.slotId, findLine.get(req.params.id))
  updateLine.run(toLineRow(req))
  res.json({})
})

router.delete('/:planId/lines/:id', (req, res) => {
  requireEditable(req.params.planId, req.slotId, findLine.get(req.params.id))
  deleteLine.run(req.params.id, req.params.planId)
  res.json({})
})

router.post('/:planId/import', (req, res) => {
  const { planId } = req.params

  if (!isPlanCreator(planId, req.userId)) {
    fail(403, 'Seul le créateur du plan peut importer.')
  }

  const slotIds = new Set(listSlots.all(planId).map((slot) => slot.id))

  importPlan(planId, req.body, slotIds)
  res.json({})
})

// Removes the plan for everyone, its slots, lines and expenses following through the cascades
router.delete('/:planId', (req, res) => {
  const { planId } = req.params

  if (!isPlanCreator(planId, req.userId)) {
    fail(403, 'Seul le créateur du plan peut le supprimer.')
  }

  deletePlan.run(planId)
  res.json({})
})

router.use('/:planId/expenses', expensesRouter)
router.use('/:planId/settlements', settlementsRouter)

export default router
