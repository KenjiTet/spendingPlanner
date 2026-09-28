import { randomUUID } from 'node:crypto'
import { LEGACY_HASH_PREFIX } from './auth.js'
import { randomShareCode } from './shareCode.js'

// Tables of the first schema, where plan_members tied accounts straight to plans
const MEMBER_TABLES = ['users', 'plans', 'plan_members', 'plan_groups', 'plan_lines', 'expenses']
// Their indexes follow a renamed table, and would stop schema.sql from creating the new ones
const MEMBER_INDEXES = ['plan_groups_plan_idx', 'plan_lines_plan_idx', 'expenses_plan_month_idx']

/**
 * Moves a database from members to slots: every membership becomes a taken slot, and the
 * owner_id / user_id columns pointing at accounts are rewritten to point at those slots.
 * Runs once, in a single transaction, before schema.sql.
 * @param {import('better-sqlite3').Database} db
 * @param {string} schema - the content of schema.sql
 */
export function migrateMembersToSlots(db, schema) {
  const hasMembers = db.prepare("select 1 from sqlite_master where type = 'table' and name = 'plan_members'").get()

  if (!hasMembers) {
    return
  }

  // Tables are rebuilt one after the other, references only hold again once all are copied
  db.pragma('foreign_keys = OFF')

  db.transaction(() => {
    // A boot that crashed on the old columns may have left an empty plan_slots, bound to the tables renamed below
    db.exec('drop table if exists plan_slots')
    MEMBER_INDEXES.forEach((index) => db.exec(`drop index if exists ${index}`))
    MEMBER_TABLES.forEach((table) => db.exec(`alter table ${table} rename to legacy_${table}`))
    db.exec(schema)

    copyUsers(db)
    copyPlans(db)
    copySlots(db)
    copyPlanContent(db)

    MEMBER_TABLES.forEach((table) => db.exec(`drop table legacy_${table}`))

    // Fail fast: a dangling reference rolls the whole migration back
    const violations = db.pragma('foreign_key_check')

    if (!!violations.length) {
      throw new Error(`Migration to slots left broken references: ${JSON.stringify(violations)}`)
    }
  })()

  db.pragma('foreign_keys = ON')
}

// The email becomes the username, the income moves from the latest membership to the profile
function copyUsers(db) {
  db.prepare(`
    insert into users (id, username, display_name, password, net_monthly, created_at)
    select u.id, u.email, u.display_name, ? || u.password_hash,
           coalesce((select m.net_monthly from legacy_plan_members m
                     where m.user_id = u.id order by m.joined_at desc limit 1), 0),
           u.created_at
    from legacy_users u
  `).run(LEGACY_HASH_PREFIX)
}

// Every plan receives a share code, none is a template yet
function copyPlans(db) {
  const insertPlan = db.prepare(`
    insert into plans (id, name, tax_timing, share_code, created_by, created_at)
    select id, name, tax_timing, ?, created_by, created_at from legacy_plans where id = ?
  `)
  const codes = new Set()

  db.prepare('select id from legacy_plans').all().forEach((plan) => {
    let code = randomShareCode()

    while (codes.has(code)) {
      code = randomShareCode()
    }

    codes.add(code)
    insertPlan.run(code, plan.id)
  })
}

// One taken slot per member, in the order they joined
function copySlots(db) {
  const insertSlot = db.prepare(`
    insert into plan_slots (id, plan_id, label, user_id, net_monthly, annual_tax, position)
    values (?, ?, ?, ?, ?, ?, ?)
  `)
  const members = db.prepare('select * from legacy_plan_members order by plan_id, joined_at').all()
  const positions = new Map()

  members.forEach((member) => {
    const position = positions.get(member.plan_id) ?? 0

    positions.set(member.plan_id, position + 1)
    insertSlot.run(randomUUID(), member.plan_id, `Personne ${position + 1}`, member.user_id, member.net_monthly, member.annual_tax, position)
  })
}

// Owners are resolved to their slot; rows of someone no longer in the plan have nowhere to go and are dropped
function copyPlanContent(db) {
  db.exec(`
    insert into plan_groups (id, plan_id, kind, label, color, owner_id, position)
    select g.id, g.plan_id, g.kind, g.label, g.color, s.id, g.position
    from legacy_plan_groups g
    left join plan_slots s on s.plan_id = g.plan_id and s.user_id = g.owner_id
    where g.owner_id is null or s.id is not null;

    insert into plan_lines (id, plan_id, kind, label, amount, owner_id, group_id, position)
    select l.id, l.plan_id, l.kind, l.label, l.amount, s.id,
           (select g.id from plan_groups g where g.id = l.group_id), l.position
    from legacy_plan_lines l
    left join plan_slots s on s.plan_id = l.plan_id and s.user_id = l.owner_id
    where l.owner_id is null or s.id is not null;

    insert into expenses (id, plan_id, line_id, slot_id, amount, spent_on, note, created_at)
    select e.id, e.plan_id, (select l.id from plan_lines l where l.id = e.line_id), s.id,
           e.amount, e.spent_on, e.note, e.created_at
    from legacy_expenses e
    join plan_slots s on s.plan_id = e.plan_id and s.user_id = e.user_id;
  `)
}
