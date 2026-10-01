// Pure budget maths, kept out of the hook and the components so it stays trivial to reason about

export const MONTHS_PER_YEAR = 12

// Scope of a line that belongs to the household rather than to one person
export const SHARED = 'shared'

/**
 * Whether a budget line was given a name, blank spaces not counting
 * @param {{ label?: string }} line
 */
export function hasName(line) {
  return !!line.label?.trim()
}

// Colours given in turn to new sub-groups, far enough apart for two neighbours never to look alike
export const AUTO_COLORS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20']

// Shades of each hue, from the lightest to the deepest, matching the `--chart-<id>` tokens
const SHADES = ['pâle', 'clair', 'vif', 'foncé']

// Every colour a sub-group can take, hue after hue around the colour wheel so the picker reads as a gradient
export const COLOR_HUES = [
  { label: 'Rouge', ids: ['21', '22', '10', '23'] },
  { label: 'Orange', ids: ['24', '12', '2', '25'] },
  { label: 'Ambre', ids: ['26', '27', '5', '19'] },
  { label: 'Citron', ids: ['28', '29', '8', '17'] },
  { label: 'Émeraude', ids: ['30', '14', '3', '31'] },
  { label: 'Turquoise', ids: ['32', '33', '11', '34'] },
  { label: 'Cyan', ids: ['35', '36', '7', '37'] },
  { label: 'Azur', ids: ['38', '16', '39', '40'] },
  { label: 'Bleu', ids: ['41', '42', '1', '43'] },
  { label: 'Indigo', ids: ['44', '45', '46', '9'] },
  { label: 'Violet', ids: ['47', '13', '4', '48'] },
  { label: 'Pourpre', ids: ['49', '50', '51', '18'] },
  { label: 'Fuchsia', ids: ['52', '53', '15', '54'] },
  { label: 'Rose', ids: ['55', '56', '6', '57'] },
  { label: 'Ardoise', ids: ['58', '59', '20', '60'] },
]

// The palette flattened in gradient order, each colour named after its hue and shade
export const GROUP_COLORS = COLOR_HUES.flatMap((hue) =>
  hue.ids.map((id, index) => ({ id, label: `${hue.label} ${SHADES[index]}` }))
)


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
 * What a person's tax takes each month: a tax paid once a year does not leave the account month by month
 * @param {{ annualTax: number | string, taxTiming?: string }} person
 */
export function monthlyTaxOf(person) {
  if (person.taxTiming === 'yearly') {
    return 0
  }

  return toAmount(person.annualTax) / MONTHS_PER_YEAR
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
      tax: figures.tax,
      savings: figures.savings,
      remaining: figures.income - figures.expenses - figures.tax - figures.savings,
    },
    annual: {
      income: figures.annualIncome,
      expenses: figures.annualExpenses,
      tax: figures.annualTax,
      savings: figures.annualSavings,
      remaining: figures.annualIncome - figures.annualExpenses - figures.annualTax - figures.annualSavings,
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

  // Spreading the tax over the year is each person's cash-flow choice, it never changes the annual result
  const monthlyTax = plan.people.reduce((sum, person) => sum + monthlyTaxOf(person), 0)

  // The tax is a flow of its own, kept out of the expense totals
  const monthlyExpenses = monthlyCategories
  const annualExpenses = monthlyCategories * MONTHS_PER_YEAR
  const annualSavings = monthlySavings * MONTHS_PER_YEAR
  const annualNetIncome = monthlyNetIncome * MONTHS_PER_YEAR

  // One recap column per person, then the household one, each in both periods
  const columns = plan.people.map((person) => {
    // Common lines are split equally, personal ones count for their owner only
    const netMonthly = toAmount(person.netMonthly)
    const share = (expensesByScope[SHARED] ?? 0) / shareCount
    const expenses = share + (expensesByScope[person.id] ?? 0)
    const savings = (savingsByScope[SHARED] ?? 0) / shareCount + (savingsByScope[person.id] ?? 0)

    return toColumn(person.id, person.label, {
      income: netMonthly,
      expenses,
      tax: monthlyTaxOf(person),
      savings,
      annualIncome: netMonthly * MONTHS_PER_YEAR,
      annualExpenses: expenses * MONTHS_PER_YEAR,
      annualTax: toAmount(person.annualTax),
      annualSavings: savings * MONTHS_PER_YEAR,
    })
  })

  columns.push(
    toColumn('household', 'Total', {
      income: monthlyNetIncome,
      expenses: monthlyExpenses,
      tax: monthlyTax,
      savings: monthlySavings,
      annualIncome: annualNetIncome,
      annualExpenses,
      annualTax,
      annualSavings,
    })
  )

  return {
    monthlyNetIncome,
    monthlyTax,
    monthlyCategories,
    monthlyExpenses,
    monthlySavings,
    monthlyRemaining: monthlyNetIncome - monthlyExpenses - monthlyTax - monthlySavings,
    annualNetIncome,
    annualTax,
    annualExpenses,
    annualSavings,
    annualRemaining: annualNetIncome - annualExpenses - annualTax - annualSavings,
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
