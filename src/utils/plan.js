// Pure budget maths, kept out of the hook and the components so it stays trivial to reason about

const MONTHS_PER_YEAR = 12

// Scope of a line that belongs to the household rather than to one person
export const SHARED = 'shared'

// The colours a sub-group can take, matching the chart tones
export const GROUP_COLORS = [
  { id: '1', label: 'Océan' },
  { id: '2', label: 'Corail' },
  { id: '3', label: 'Émeraude' },
  { id: '4', label: 'Violet' },
  { id: '5', label: 'Ambre' },
  { id: '6', label: 'Rose' },
  { id: '7', label: 'Cyan' },
  { id: '8', label: 'Citron' },
  { id: '9', label: 'Indigo' },
  { id: '10', label: 'Rubis' },
  { id: '11', label: 'Turquoise' },
  { id: '12', label: 'Mandarine' },
  { id: '13', label: 'Lavande' },
  { id: '14', label: 'Menthe' },
  { id: '15', label: 'Fuchsia' },
  { id: '16', label: 'Azur' },
  { id: '17', label: 'Olive' },
  { id: '18', label: 'Prune' },
  { id: '19', label: 'Brique' },
  { id: '20', label: 'Ardoise' },
]


// Turns any user input into a usable number, empty fields counting as zero
export function toAmount(value) {
  const amount = Number(value)

  if (!Number.isFinite(amount)) {
    return 0
  }

  return amount
}

// Sums the `amount` field of a list of lines
function sumAmounts(items) {
  return items.reduce((sum, item) => sum + toAmount(item.amount), 0)
}

// Sums one numeric field across the people
function sumPeople(people, field) {
  return people.reduce((sum, person) => sum + toAmount(person[field]), 0)
}

/**
 * Builds a budget line with a generated id
 * @param {string} label
 * @param {number} amount
 * @param {string} parent - the scope or sub-group holding the line
 */
export function createItem(label, amount, parent) {
  return { id: crypto.randomUUID(), label, amount, parent }
}

/**
 * Builds a sub-group with a generated id
 * @param {string} label
 * @param {string} color
 * @param {string} scope
 */
export function createSubgroup(label, color, scope) {
  return { id: crypto.randomUUID(), label, color, scope }
}

/**
 * Resolves which scope a line belongs to, following its sub-group when it has one
 * @param {{ id: string, scope: string }[]} subgroups
 * @param {{ parent: string }} line
 */
export function scopeOf(subgroups, line) {
  const subgroup = subgroups.find((candidate) => candidate.id === line.parent)

  return subgroup?.scope ?? line.parent
}

/**
 * Totals the lines per scope, so the recap can split common from personal amounts
 * @param {{ id: string, scope: string }[]} subgroups
 * @param {{ amount: number, parent: string }[]} items
 */
export function sumByScope(subgroups, items) {
  return items.reduce((totals, line) => {
    const scope = scopeOf(subgroups, line)

    return { ...totals, [scope]: (totals[scope] ?? 0) + toAmount(line.amount) }
  }, {})
}

/**
 * Arranges lines under their scope, each scope holding its sub-groups and its loose lines
 * @param {{ id: string, label: string }[]} scopes
 * @param {{ id: string, label: string, color: string, scope: string }[]} subgroups
 * @param {{ id: string, label: string, amount: number, parent: string }[]} items
 */
export function toScopeTree(scopes, subgroups, items) {
  return scopes.map((scope) => {
    const blocks = subgroups
      .filter((subgroup) => subgroup.scope === scope.id)
      .map((subgroup) => {
        const owned = items.filter((line) => line.parent === subgroup.id)

        return { ...subgroup, items: owned, total: sumAmounts(owned) }
      })

    const loose = items.filter((line) => line.parent === scope.id)

    return {
      ...scope,
      subgroups: blocks,
      items: loose,
      total: sumAmounts(loose) + blocks.reduce((sum, block) => sum + block.total, 0),
    }
  })
}

/**
 * Fills in what plans saved before a feature existed do not carry yet
 * @param {object} plan
 */
export function withDefaults(plan) {
  return {
    ...plan,
    subgroups: plan.subgroups ?? [],
    savingGroups: plan.savingGroups ?? [],
    categories: plan.categories.map((line) => ({ ...line, parent: line.parent ?? SHARED })),
    savings: plan.savings.map((line) => ({
      ...line,
      parent: line.parent ?? line.owner ?? SHARED,
      owner: undefined,
    })),
  }
}

/**
 * Shapes one recap column, the leftover being derived in both periods
 * @param {string} id
 * @param {string} label
 * @param {object} figures
 */
function toColumn(id, label, figures) {
  return {
    id,
    label,
    monthly: {
      income: figures.income,
      expenses: figures.expenses,
      savings: figures.savings,
      remaining: figures.income - figures.expenses - figures.savings,
    },
    annual: {
      income: figures.annualIncome,
      expenses: figures.annualExpenses,
      savings: figures.annualSavings,
      remaining: figures.annualIncome - figures.annualExpenses - figures.annualSavings,
    },
  }
}

/**
 * Derives every figure shown in the app from the plan
 * @param {{ people: object[], categories: object[], savings: object[], settings: object }} plan
 */
export function computeTotals(plan) {
  const shareCount = plan.people.length || 1
  const monthlyNetIncome = sumPeople(plan.people, 'netMonthly')
  const annualTax = sumPeople(plan.people, 'annualTax')
  const monthlyCategories = sumAmounts(plan.categories)
  const monthlySavings = sumAmounts(plan.savings)
  const expensesByScope = sumByScope(plan.subgroups, plan.categories)
  const savingsByScope = sumByScope(plan.savingGroups, plan.savings)

  // Spreading the tax over the year is a cash-flow choice, it never changes the annual result
  let monthlyTax = 0

  if (plan.settings.taxTiming === 'monthly') {
    monthlyTax = annualTax / MONTHS_PER_YEAR
  }

  // The tax is shown as a monthly expense, so it is part of the expense totals
  const monthlyExpenses = monthlyCategories + monthlyTax
  const annualExpenses = monthlyCategories * MONTHS_PER_YEAR + annualTax
  const annualSavings = monthlySavings * MONTHS_PER_YEAR
  const annualNetIncome = monthlyNetIncome * MONTHS_PER_YEAR

  // One recap column per person, then the household one, each in both periods
  const columns = plan.people.map((person) => {
    let personTax = 0

    if (plan.settings.taxTiming === 'monthly') {
      personTax = toAmount(person.annualTax) / MONTHS_PER_YEAR
    }

    // Common lines are split equally, personal ones count for their owner only
    const netMonthly = toAmount(person.netMonthly)
    const share = (expensesByScope[SHARED] ?? 0) / shareCount
    const expenses = share + (expensesByScope[person.id] ?? 0) + personTax
    const savings = (savingsByScope[SHARED] ?? 0) / shareCount + (savingsByScope[person.id] ?? 0)

    return toColumn(person.id, person.label, {
      income: netMonthly,
      expenses,
      savings,
      annualIncome: netMonthly * MONTHS_PER_YEAR,
      annualExpenses: (expenses - personTax) * MONTHS_PER_YEAR + toAmount(person.annualTax),
      annualSavings: savings * MONTHS_PER_YEAR,
    })
  })

  columns.push(
    toColumn('household', 'Total', {
      income: monthlyNetIncome,
      expenses: monthlyExpenses,
      savings: monthlySavings,
      annualIncome: annualNetIncome,
      annualExpenses,
      annualSavings,
    })
  )

  return {
    monthlyNetIncome,
    monthlyTax,
    monthlyCategories,
    monthlyExpenses,
    monthlySavings,
    monthlyRemaining: monthlyNetIncome - monthlyExpenses - monthlySavings,
    annualNetIncome,
    annualTax,
    annualExpenses,
    annualSavings,
    annualRemaining: annualNetIncome - annualExpenses - annualSavings,
    columns,
  }
}

/**
 * Guards data coming from storage or an imported file before it reaches the state
 * @param {unknown} value
 */
export function isValidPlan(value) {
  if (!value || typeof value !== 'object') {
    return false
  }

  const lists = [value.people, value.categories, value.savings]

  if (!lists.every(Array.isArray)) {
    return false
  }

  return !!value.settings && typeof value.settings === 'object'
}

// Coerces one budget line to a clean, serializable shape
function normalizeItem(item) {
  return { ...item, amount: toAmount(item.amount) }
}

/**
 * Turns the typed values back into numbers, so an exported file stays clean and hand-editable
 * @param {object} plan
 */
export function normalizePlan(plan) {
  return {
    ...plan,
    people: plan.people.map((person) => ({
      ...person,
      netMonthly: toAmount(person.netMonthly),
      annualTax: toAmount(person.annualTax),
    })),
    categories: plan.categories.map(normalizeItem),
    savings: plan.savings.map(normalizeItem),
    subgroups: plan.subgroups ?? [],
    savingGroups: plan.savingGroups ?? [],
  }
}
