// Demo accounts for showing the app: demo1 holds a solo plan, demo2 a plan for two shared with demo2b.
// Re-running it wipes and rebuilds them, the expenses covering the previous month and the current one up to today.
import { randomUUID } from 'node:crypto'
import { hashPassword } from './auth.js'
import { db } from './db.js'
import { randomShareCode } from './shareCode.js'

const DEMO_PASSWORD = 'transtar'

// Days of the settlements already validated in the plan for two: mid previous month, early current month
const SETTLEMENT_DAYS = [{ monthOffset: -1, day: 15 }, { monthOffset: 0, day: 3 }]

/**
 * A plan to build. Groups own their lines; `owner` is the member index of a personal group, undefined for the
 * common part. Each expense recipe books `perMonth` expenses on a line, paid in turn by the members listed in `by`.
 */
const DEMO_PLANS = [
  {
    name: 'Budget de Léa',
    members: [{ username: 'demo1', displayName: 'Léa', netMonthly: 6200, annualTax: 9600 }],
    groups: [
      {
        kind: 'expense', label: 'Logement', color: '1', lines: [
          { key: 'rent', label: 'Loyer', amount: 1650, autoBook: true },
          { key: 'utilities', label: 'Charges et électricité', amount: 120, autoBook: true },
          { key: 'internet', label: 'Internet et mobile', amount: 75, autoBook: true },
        ],
      },
      {
        kind: 'expense', label: 'Santé', color: '2', lines: [
          { key: 'insurance', label: 'Assurance maladie', amount: 390, autoBook: true },
          { key: 'health', label: 'Pharmacie et médecin', amount: 60 },
        ],
      },
      {
        kind: 'expense', label: 'Quotidien', color: '3', lines: [
          { key: 'groceries', label: 'Courses', amount: 550 },
          { key: 'transport', label: 'Transports', amount: 90 },
          { key: 'household', label: 'Hygiène et maison', amount: 50 },
        ],
      },
      {
        kind: 'expense', label: 'Loisirs', color: '5', lines: [
          { key: 'restaurants', label: 'Restaurants', amount: 220 },
          { key: 'outings', label: 'Sorties et culture', amount: 120 },
          { key: 'clothes', label: 'Vêtements', amount: 120 },
        ],
      },
      {
        kind: 'expense', label: 'Abonnements', color: '6', lines: [
          { key: 'netflix', label: 'Netflix', amount: 18.9, autoBook: true },
          { key: 'spotify', label: 'Spotify', amount: 13.95, autoBook: true },
          { key: 'fitness', label: 'Fitness', amount: 69, autoBook: true },
        ],
      },
      {
        kind: 'saving', label: 'Épargne', color: '7', lines: [
          { key: 'emergency', label: 'Fonds d’urgence', amount: 400 },
          { key: 'pillar3', label: '3e pilier', amount: 300 },
          { key: 'holidays', label: 'Vacances', amount: 250 },
        ],
      },
    ],
    expenses: [
      { line: 'groceries', perMonth: 9, min: 20, max: 100, by: [0], notes: ['Migros', 'Coop', 'Lidl', 'Marché', 'Aldi'] },
      { line: 'transport', perMonth: 5, min: 3.8, max: 25, by: [0], notes: ['Billet CFF', 'Bus', 'Mobility'] },
      { line: 'household', perMonth: 2, min: 12, max: 35, by: [0], notes: ['Droguerie', 'Produits ménagers'] },
      { line: 'health', perMonth: 1, min: 25, max: 60, by: [0], notes: ['Pharmacie'] },
      { line: 'restaurants', perMonth: 6, min: 18, max: 65, by: [0], notes: ['Pizzeria', 'Sushi', 'Brunch', 'Thaï', 'Burger'] },
      { line: 'outings', perMonth: 3, min: 15, max: 45, by: [0], notes: ['Cinéma', 'Concert', 'Musée', 'Bar'] },
      { line: 'clothes', perMonth: 1, min: 40, max: 130, by: [0], notes: ['Zalando', 'Chaussures', 'Manor'] },
    ],
    presets: [
      { member: 0, line: 'transport', label: 'Billet de bus', amount: 3.8 },
      { member: 0, line: 'restaurants', label: 'Lunch', amount: 22 },
    ],
  },
  {
    name: 'Budget d’Alex et Sam',
    members: [
      { username: 'demo2', displayName: 'Alex', netMonthly: 5800, annualTax: 8400 },
      { username: 'demo2b', displayName: 'Sam', netMonthly: 4900, annualTax: 6600 },
    ],
    groups: [
      {
        kind: 'expense', label: 'Logement', color: '1', lines: [
          { key: 'rent', label: 'Loyer', amount: 2400, autoBook: true },
          { key: 'utilities', label: 'Charges et électricité', amount: 180, autoBook: true },
          { key: 'internet', label: 'Internet', amount: 65, autoBook: true },
          { key: 'homeInsurance', label: 'Assurance ménage', amount: 35, autoBook: true },
        ],
      },
      {
        kind: 'expense', label: 'Maison', color: '3', lines: [
          { key: 'groceries', label: 'Courses', amount: 900 },
          { key: 'household', label: 'Ménage et maison', amount: 80 },
        ],
      },
      {
        kind: 'expense', label: 'Sorties', color: '5', lines: [
          { key: 'restaurants', label: 'Restaurants', amount: 300 },
          { key: 'weekends', label: 'Week-ends et activités', amount: 250 },
        ],
      },
      {
        kind: 'expense', label: 'Abonnements', color: '6', lines: [
          { key: 'netflix', label: 'Netflix', amount: 22.9, autoBook: true },
          { key: 'spotify', label: 'Spotify Duo', amount: 19.95, autoBook: true },
        ],
      },
      {
        kind: 'expense', label: 'Perso Alex', color: '4', owner: 0, lines: [
          { key: 'alexTransport', label: 'Transports', amount: 120 },
          { key: 'alexClothes', label: 'Vêtements', amount: 100 },
          { key: 'alexClimbing', label: 'Salle d’escalade', amount: 60, autoBook: true },
          { key: 'alexLeisure', label: 'Loisirs', amount: 100 },
        ],
      },
      {
        kind: 'expense', label: 'Perso Sam', color: '8', owner: 1, lines: [
          { key: 'samTransport', label: 'Transports', amount: 90 },
          { key: 'samClothes', label: 'Vêtements', amount: 120 },
          { key: 'samYoga', label: 'Cours de yoga', amount: 85, autoBook: true },
          { key: 'samLeisure', label: 'Loisirs', amount: 80 },
        ],
      },
      {
        kind: 'saving', label: 'Projets communs', color: '7', lines: [
          { key: 'holidays', label: 'Vacances', amount: 500 },
          { key: 'emergency', label: 'Fonds d’urgence', amount: 400 },
        ],
      },
      {
        kind: 'saving', label: 'Épargne Alex', color: '9', owner: 0, lines: [
          { key: 'alexPillar3', label: '3e pilier', amount: 500 },
        ],
      },
      {
        kind: 'saving', label: 'Épargne Sam', color: '11', owner: 1, lines: [
          { key: 'samPillar3', label: '3e pilier', amount: 350 },
        ],
      },
    ],
    // Sam pays most of the common expenses, so Alex (demo2) owes the open balance and can declare a repayment
    expenses: [
      { line: 'groceries', perMonth: 12, min: 35, max: 160, by: [1, 1, 1, 0], notes: ['Migros', 'Coop', 'Aldi', 'Denner', 'Marché'] },
      { line: 'household', perMonth: 2, min: 15, max: 50, by: [1], notes: ['Produits ménagers', 'Ikea', 'Droguerie'] },
      { line: 'restaurants', perMonth: 4, min: 40, max: 95, by: [0], notes: ['Pizzeria', 'Libanais', 'Brunch', 'Ramen', 'Brasserie'] },
      { line: 'weekends', perMonth: 1, min: 120, max: 260, by: [1], notes: ['Week-end à Lucerne', 'Bains thermaux', 'Randonnée et train'] },
      { line: 'alexTransport', perMonth: 6, min: 4, max: 30, by: [0], notes: ['Billet CFF', 'Parking', 'Essence'] },
      { line: 'alexClothes', perMonth: 1, min: 50, max: 150, by: [0], notes: ['Baskets', 'Veste'] },
      { line: 'alexLeisure', perMonth: 2, min: 20, max: 60, by: [0], notes: ['Jeux vidéo', 'Livres', 'Afterwork'] },
      { line: 'samTransport', perMonth: 4, min: 3.8, max: 20, by: [1], notes: ['Bus', 'Billet CFF', 'Vélo en libre-service'] },
      { line: 'samClothes', perMonth: 1, min: 40, max: 140, by: [1], notes: ['Robe', 'Chaussures'] },
      { line: 'samLeisure', perMonth: 2, min: 15, max: 50, by: [1], notes: ['Cinéma', 'Livres', 'Atelier poterie'] },
    ],
    presets: [
      { member: 0, line: 'alexTransport', label: 'Parking', amount: 5 },
      { member: 1, line: 'samTransport', label: 'Billet de bus', amount: 3.8 },
    ],
  },
]

const deleteUser = db.prepare('delete from users where username = ?')
const insertUser = db.prepare(
  'insert into users (id, username, display_name, password, net_monthly, tutorial_done, created_at) values (?, ?, ?, ?, ?, 1, ?)'
)
const findByCode = db.prepare('select id from plans where share_code = ?')
const insertPlan = db.prepare(
  'insert into plans (id, name, share_code, created_by, created_at) values (?, ?, ?, ?, ?)'
)
const insertSlot = db.prepare(
  'insert into plan_slots (id, plan_id, label, user_id, net_monthly, annual_tax, position) values (?, ?, ?, ?, ?, ?, ?)'
)
const insertGroup = db.prepare(
  'insert into plan_groups (id, plan_id, kind, label, color, owner_id, position) values (?, ?, ?, ?, ?, ?, ?)'
)
const insertLine = db.prepare(
  'insert into plan_lines (id, plan_id, kind, label, amount, auto_book, owner_id, group_id, position) values (?, ?, ?, ?, ?, ?, ?, ?, ?)'
)
const insertExpense = db.prepare(
  'insert into expenses (id, plan_id, line_id, slot_id, amount, spent_on, note, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)'
)
const insertPreset = db.prepare(
  'insert into expense_presets (id, plan_id, slot_id, line_id, label, amount, created_at) values (?, ?, ?, ?, ?, ?, ?)'
)
const insertSettlement = db.prepare(
  "insert into settlements (id, plan_id, debtor_id, creditor_id, amount, status, declared_at, validated_at) values (?, ?, ?, ?, ?, 'validated', ?, ?)"
)
const attachExpense = db.prepare('update expenses set settlement_id = ? where id = ?')

/**
 * Local calendar date as YYYY-MM-DD, the format of the database
 * @param {Date} date
 */
function toDateValue(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * A day of a month counted from the current one
 * @param {Date} today
 * @param {number} monthOffset
 * @param {number} day
 */
function dayOf(today, monthOffset, day) {
  return new Date(today.getFullYear(), today.getMonth() + monthOffset, day)
}

/**
 * Amount between two bounds, rounded to the 5 cents like a Swiss receipt
 * @param {number} min
 * @param {number} max
 */
function randomAmount(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 20) / 20
}

/**
 * @template T
 * @param {T[]} items
 * @returns {T}
 */
function pick(items) {
  return items[Math.floor(Math.random() * items.length)]
}

// A code nobody else holds, the unique index stopping the script in the unlikely case of a collision
function newShareCode() {
  let code = randomShareCode()

  while (!!findByCode.get(code)) {
    code = randomShareCode()
  }

  return code
}

/**
 * Creates the accounts of a plan, wiping any previous run first (their plans go with them by cascade)
 * @param {object[]} members
 * @param {string} createdAt
 */
function createMembers(members, createdAt) {
  return members.map((member) => {
    const id = randomUUID()

    deleteUser.run(member.username)
    insertUser.run(id, member.username, member.displayName, hashPassword(DEMO_PASSWORD), member.netMonthly, createdAt)

    return id
  })
}

/**
 * Inserts the groups and their lines, returning the line ids by key
 * @param {string} planId
 * @param {object[]} groups
 * @param {string[]} slotIds
 */
function createBudget(planId, groups, slotIds) {
  const lineIds = {}

  groups.forEach((group, groupIndex) => {
    const groupId = randomUUID()
    const ownerId = slotIds[group.owner] ?? null

    insertGroup.run(groupId, planId, group.kind, group.label, group.color, ownerId, groupIndex)
    group.lines.forEach((line, lineIndex) => {
      lineIds[line.key] = randomUUID()
      insertLine.run(lineIds[line.key], planId, group.kind, line.label, line.amount, Number(!!line.autoBook), ownerId, groupId, lineIndex)
    })
  })

  return lineIds
}

/**
 * Spreads the expenses of a recipe over a month, fewer of them in the current month as it is not over yet
 * @param {object} recipe
 * @param {Date} monthStart
 * @param {Date} today
 */
function datesOf(recipe, monthStart, today) {
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate()
  let elapsedDays = daysInMonth

  if (monthStart.getMonth() === today.getMonth()) {
    elapsedDays = today.getDate()
  }

  const count = Math.round((recipe.perMonth * elapsedDays) / daysInMonth)

  // One slice of the elapsed days per expense, so they never pile up on the same week
  return Array.from({ length: count }, (_unused, index) => {
    const day = Math.floor(((index + Math.random()) * elapsedDays) / count) + 1

    return new Date(monthStart.getFullYear(), monthStart.getMonth(), day)
  })
}

/**
 * Books the expenses of every recipe over the previous month and the current one
 * @param {string} planId
 * @param {object[]} recipes
 * @param {Record<string, string>} lineIds
 * @param {string[]} slotIds
 * @param {Date} today
 */
function createExpenses(planId, recipes, lineIds, slotIds, today) {
  const months = [dayOf(today, -1, 1), dayOf(today, 0, 1)]

  recipes.forEach((recipe) => {
    const dates = months.flatMap((monthStart) => datesOf(recipe, monthStart, today))

    dates.forEach((date, index) => {
      const slotId = slotIds[recipe.by[index % recipe.by.length]]
      const spentOn = toDateValue(date)

      // Entered on the evening of the purchase, which orders it against the settlements
      insertExpense.run(randomUUID(), planId, lineIds[recipe.line], slotId, randomAmount(recipe.min, recipe.max), spentOn, pick(recipe.notes), `${spentOn}T18:00:00.000Z`)
    })
  })
}

/**
 * Validated repayments covering the common expenses entered before each settlement day, the rest staying open
 * @param {string} planId
 * @param {string[]} slotIds
 * @param {Date} today
 */
function createSettlements(planId, slotIds, today) {
  const listOpenBefore = db.prepare(`
    select e.id, e.slot_id, e.amount from expenses e join plan_lines l on l.id = e.line_id
    where e.plan_id = ? and e.settlement_id is null and l.owner_id is null and e.created_at < ?
  `)
  const days = SETTLEMENT_DAYS.map(({ monthOffset, day }) => dayOf(today, monthOffset, day)).filter((date) => date <= today)

  days.forEach((date) => {
    const declaredAt = `${toDateValue(date)}T19:00:00.000Z`
    const expenses = listOpenBefore.all(planId, declaredAt)
    const [first, second] = slotIds.map((slotId) => expenses.filter((expense) => expense.slot_id === slotId).reduce((sum, expense) => sum + expense.amount, 0))
    const amount = Math.round((Math.abs(first - second) / 2) * 100) / 100

    if (!amount) {
      return
    }

    // The one who paid less repays half of the difference
    let [debtorId, creditorId] = slotIds

    if (first > second) {
      ;[creditorId, debtorId] = slotIds
    }

    const id = randomUUID()
    const validatedAt = `${toDateValue(dayOf(date, 0, date.getDate() + 1))}T08:30:00.000Z`

    insertSettlement.run(id, planId, debtorId, creditorId, amount, declaredAt, validatedAt)
    expenses.forEach((expense) => attachExpense.run(id, expense.id))
  })
}

/**
 * Builds one demo plan and its accounts from scratch
 * @param {object} definition
 * @param {Date} today
 */
function createDemoPlan(definition, today) {
  const createdAt = dayOf(today, -2, 25).toISOString()
  const userIds = createMembers(definition.members, createdAt)
  const planId = randomUUID()
  const slotIds = definition.members.map(() => randomUUID())

  insertPlan.run(planId, definition.name, newShareCode(), userIds[0], createdAt)
  definition.members.forEach((member, index) => {
    insertSlot.run(slotIds[index], planId, `Personne ${index + 1}`, userIds[index], member.netMonthly, member.annualTax, index)
  })

  const lineIds = createBudget(planId, definition.groups, slotIds)

  createExpenses(planId, definition.expenses, lineIds, slotIds, today)
  definition.presets.forEach((preset) => {
    insertPreset.run(randomUUID(), planId, slotIds[preset.member], lineIds[preset.line], preset.label, preset.amount, createdAt)
  })

  // Repayments only exist between the two places of a plan for two
  if (slotIds.length === 2) {
    createSettlements(planId, slotIds, today)
  }
}

const seed = db.transaction(() => {
  const today = new Date()

  DEMO_PLANS.forEach((definition) => createDemoPlan(definition, today))
})

seed()
console.log(`Demo accounts ready: ${DEMO_PLANS.flatMap((plan) => plan.members.map((member) => member.username)).join(', ')}`)
