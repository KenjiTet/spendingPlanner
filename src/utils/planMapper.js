import { SHARED, toAmount } from './plan.js'

// Translates between the server rows and the in-memory plan shape the components already use.
// The database stores "no owner" as SQL NULL, so null is used at this boundary only.

// Which API resource and kind back each list of the in-memory plan
export const LISTS = {
  categories: { resource: 'lines', kind: 'expense', groupKey: 'subgroups' },
  savings: { resource: 'lines', kind: 'saving', groupKey: 'savingGroups' },
  subgroups: { resource: 'groups', kind: 'expense' },
  savingGroups: { resource: 'groups', kind: 'saving' },
}

/**
 * Scope id used by the components for an owner column
 * @param {string | null} ownerId
 */
function scopeOfOwner(ownerId) {
  return ownerId ?? SHARED
}

/**
 * Owner column for a scope id
 * @param {string} scope
 */
function ownerOfScope(scope) {
  if (scope === SHARED) {
    return null
  }

  return scope
}

/**
 * Builds the plan shape expected by computeTotals and the plan components
 * @param {{ plan: object, members: object[], groups: object[], lines: object[] }} rows
 */
export function rowsToPlan({ plan, members, groups, lines }) {
  const toGroup = (group) => ({
    id: group.id,
    label: group.label,
    color: group.color,
    scope: scopeOfOwner(group.owner_id),
  })

  const toLine = (line) => ({
    id: line.id,
    label: line.label,
    amount: Number(line.amount),
    parent: line.group_id ?? scopeOfOwner(line.owner_id),
  })

  return {
    id: plan.id,
    name: plan.name,
    createdBy: plan.created_by,
    settings: { taxTiming: plan.tax_timing },
    people: members.map((member) => ({
      id: member.user_id,
      label: member.display_name,
      netMonthly: Number(member.net_monthly),
      annualTax: Number(member.annual_tax),
    })),
    subgroups: groups.filter((group) => group.kind === 'expense').map(toGroup),
    savingGroups: groups.filter((group) => group.kind === 'saving').map(toGroup),
    categories: lines.filter((line) => line.kind === 'expense').map(toLine),
    savings: lines.filter((line) => line.kind === 'saving').map(toLine),
  }
}

/**
 * Resolves a line parent (scope or sub-group id) into its database columns
 * @param {string} parent
 * @param {{ id: string, scope: string }[]} groups
 */
function parentToColumns(parent, groups) {
  const group = groups.find((candidate) => candidate.id === parent)

  if (!!group) {
    return { group_id: group.id, owner_id: ownerOfScope(group.scope) }
  }

  return { group_id: null, owner_id: ownerOfScope(parent) }
}

/**
 * Database row of one item of the in-memory plan
 * @param {object} plan
 * @param {keyof LISTS} listKey
 * @param {object} item
 */
export function itemToRow(plan, listKey, item) {
  const { resource, kind, groupKey } = LISTS[listKey]
  const position = plan[listKey].findIndex((candidate) => candidate.id === item.id)
  const base = { id: item.id, plan_id: plan.id, kind, label: item.label, position }

  if (resource === 'groups') {
    return { ...base, color: item.color, owner_id: ownerOfScope(item.scope) }
  }

  return { ...base, amount: toAmount(item.amount), ...parentToColumns(item.parent, plan[groupKey]) }
}

/**
 * Turns a JSON plan into the import_plan payload, each JSON person being mapped to a member or to the common part
 * @param {object} source - a plan read from a JSON file, defaults already applied
 * @param {Record<string, string>} scopeByPerson - JSON person id to member id or SHARED
 */
export function toImportPayload(source, scopeByPerson) {
  const groupIds = {}

  // JSON ids are free text, the database needs fresh uuids
  const resolveScope = (scope) => ownerOfScope(scopeByPerson[scope] ?? SHARED)

  const toGroups = (groups, kind) =>
    groups.map((group, index) => {
      groupIds[group.id] = crypto.randomUUID()

      return {
        id: groupIds[group.id],
        kind,
        label: group.label,
        color: group.color,
        owner_id: resolveScope(group.scope),
        position: index,
      }
    })

  const toLines = (lines, kind) =>
    lines.map((line, index) => ({
      id: crypto.randomUUID(),
      kind,
      label: line.label,
      amount: toAmount(line.amount),
      group_id: groupIds[line.parent] ?? null,
      owner_id: resolveScope(line.parent),
      position: index,
    }))

  const groups = [...toGroups(source.subgroups, 'expense'), ...toGroups(source.savingGroups, 'saving')]
  const lines = [...toLines(source.categories, 'expense'), ...toLines(source.savings, 'saving')]

  const members = source.people
    .filter((person) => !!scopeByPerson[person.id] && scopeByPerson[person.id] !== SHARED)
    .map((person) => ({
      user_id: scopeByPerson[person.id],
      net_monthly: toAmount(person.netMonthly),
      annual_tax: toAmount(person.annualTax),
    }))

  return { groups, lines, members, tax_timing: source.settings.taxTiming }
}
