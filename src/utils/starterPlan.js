// Starter plans built from the onboarding answers: the plan of the bracket picked, amounts derived from the income
import { formatAxisAmount } from './format.js'
import { MONTHS_PER_YEAR, SHARED } from './plan.js'

// Brackets of the starter plans are written in this currency, converted into the main one before being offered
export const TIER_CURRENCY = 'CHF'

// A bracket being typed in the admin page, every bound still empty
export const EMPTY_RANGE = { min: '', max: '', typical: '' }

// Amounts are rounded to this step, and a line never starts below it
const ROUNDING_STEP = 5

// Share of each person's income a starter plan leaves unassigned, the 'rest' lines sharing everything above it
const RESERVE_PERCENT = 5

// Share of each person's income a starter plan sets aside for tax, filled in their place's annual tax
const TAX_PERCENT = 10

// How a line of a starter plan is sized: a share of the income, an amount in TIER_CURRENCY, or a weight in what is left
export const LINE_KINDS = [
  { id: 'percent', label: '% du revenu' },
  { id: 'fixed', label: `Montant ${TIER_CURRENCY}` },
  { id: 'rest', label: 'Part du reste' },
]

const ME = 'me'
const PARTNER = 'partner'
// Name of the partner's place while it is free
const PARTNER_LABEL = 'Partenaire'

// Keeps two significant digits, so a converted bound still reads as a round figure
function roundFigure(value) {
  if (!Number.isFinite(value) || !value) {
    return value
  }

  const magnitude = 10 ** (Math.floor(Math.log10(value)) - 1)

  return Math.round(value / magnitude) * magnitude
}

/**
 * A ceiling converted into the main currency, undefined for an open-ended bracket
 * @param {number | null} max
 * @param {number} rate
 */
function ceilingIn(max, rate) {
  if (!max) {
    return undefined
  }

  return roundFigure(max * rate)
}

/**
 * The brackets offered to one mode, expressed in the main currency, each pointing to its plan
 * @param {object[]} starterPlans - as served by the API, brackets in TIER_CURRENCY
 * @param {boolean} isDuo
 * @param {number} rate - units of the main currency per unit of TIER_CURRENCY
 * @returns {{ id: string, plan: object, min: number, max?: number, typical: number }[]} sorted, max missing when open-ended
 */
export function incomeRangesIn(starterPlans, isDuo, rate) {
  const mode = modeOf(isDuo)

  return starterPlans
    .filter((plan) => plan.mode === mode)
    .flatMap((plan) => plan.ranges.map((range, index) => ({ plan, range, id: `${plan.id}-${index}` })))
    .sort((first, second) => first.range.min - second.range.min)
    .map(({ plan, range, id }) => ({
      id,
      plan,
      min: roundFigure(range.min * rate),
      max: ceilingIn(range.max, rate),
      typical: roundFigure(range.typical * rate),
    }))
}

/**
 * How a bracket reads, open at both ends
 * @param {{ min: number, max?: number }} range
 * @param {string} currency
 */
export function rangeLabelOf(range, currency) {
  if (!range.min) {
    return `Moins de ${formatAxisAmount(range.max)} ${currency}`
  }

  if (!range.max) {
    return `Plus de ${formatAxisAmount(range.min)} ${currency}`
  }

  return `${formatAxisAmount(range.min)} – ${formatAxisAmount(range.max)} ${currency}`
}

/**
 * @param {boolean} isDuo
 * @returns {'solo' | 'duo'}
 */
export function modeOf(isDuo) {
  if (isDuo) {
    return 'duo'
  }

  return 'solo'
}

// Rounds an amount to the step, keeping every line visible unless nothing is left for it
function roundAmount(amount) {
  if (!amount) {
    return 0
  }

  // Rounded to the cent first, so a float such as 127.4999… still lands on the step above
  const cents = Math.round(amount * 100) / 100

  return Math.max(ROUNDING_STEP, Math.round(cents / ROUNDING_STEP) * ROUNDING_STEP)
}

// Every line of a starter plan, expenses and savings together
function linesOf(starterPlan) {
  return [...starterPlan.expenses, ...starterPlan.savings].flatMap((group) => group.lines)
}

// A value still being typed counts as nothing, NaN included
function valueOf(line) {
  return Number(line.value) || 0
}

/**
 * A figure of a line that may be left empty, in TIER_CURRENCY
 * @param {number | string | undefined} figure
 * @returns {number | undefined}
 */
function optionalFigureOf(figure) {
  if (figure === undefined || figure === null || figure === '' || !Number.isFinite(Number(figure))) {
    return undefined
  }

  return Number(figure)
}

/**
 * What one person's monthly tax amounts to, the same share of every income
 * @param {number} income
 */
function monthlyTaxOf(income) {
  return income * TAX_PERCENT / 100
}

/**
 * Shares a pool between 'rest' lines by weight, a line reaching its ceiling handing the excess to the others
 * @param {object[]} restLines
 * @param {number} pool
 * @param {(line: object) => number} ceilingOf - Infinity when the line has none
 * @returns {Map<object, number>}
 */
function shareOut(restLines, pool, ceilingOf) {
  const shares = new Map()
  let open = restLines
  let left = pool

  while (open.length) {
    const weight = open.reduce((sum, line) => sum + valueOf(line), 0)

    if (!weight) {
      break
    }

    const capped = open.filter((line) => left * valueOf(line) / weight >= ceilingOf(line))

    if (!capped.length) {
      open.forEach((line) => shares.set(line, left * valueOf(line) / weight))
      break
    }

    capped.forEach((line) => {
      shares.set(line, ceilingOf(line))
      left -= ceilingOf(line)
    })
    open = open.filter((line) => !capped.includes(line))
  }

  return shares
}

/**
 * Sizes the lines of a starter plan for the people of a plan. Each person pays TAX_PERCENT of their income in tax and
 * keeps RESERVE_PERCENT unassigned; percentages of the income and fixed amounts come first (fixed amounts shrinking in
 * proportion when the income cannot cover them), then the 'rest' lines share by weight what is left. A ceiling caps a
 * line for each person, a common line of a pair reaching twice that
 * @param {{ expenses: object[], savings: object[] }} starterPlan
 * @param {{ id: string, netMonthly: number }[]} people
 * @param {number} rate - units of the main currency per unit of TIER_CURRENCY, for fixed amounts and ceilings
 * @returns {(line: object, scopeId: string) => number} the unrounded amount of a line in a scope, SHARED or a person id
 */
function sizerOf(starterPlan, people, rate) {
  const isDuo = people.length > 1
  // Common lines are split equally, so each person must be able to afford half: they follow the lower income
  const reference = people.reduce((lowest, person) => {
    if (person.netMonthly < lowest.netMonthly) {
      return person
    }

    return lowest
  })
  const lines = linesOf(starterPlan)

  // A solo plan keeps every line common
  const isCommon = (line) => !isDuo || line.scope === SHARED

  // The ceiling of a line for one person, in the main currency
  function ceilingOf(line) {
    const ceiling = optionalFigureOf(line.max)

    if (ceiling === undefined) {
      return Infinity
    }

    return ceiling * rate
  }

  /**
   * What one person carries of a percentage or fixed line, their half of a common line in a pair
   * @param {object} line
   * @param {{ netMonthly: number }} person
   */
  function setShareOf(line, person) {
    if (line.kind === 'fixed') {
      if (isCommon(line)) {
        return valueOf(line) * rate / people.length
      }

      return valueOf(line) * rate
    }

    let income = person.netMonthly

    if (isCommon(line)) {
      income = reference.netMonthly
    }

    return Math.min(valueOf(line) * income / 100, ceilingOf(line))
  }

  /**
   * What one person carries of the lines of a kind they take part in
   * @param {{ id: string, netMonthly: number }} person
   * @param {'percent' | 'fixed'} kind
   */
  function spentOf(person, kind) {
    return lines
      .filter((line) => line.kind === kind)
      .reduce((sum, line) => sum + setShareOf(line, person), 0)
  }

  // Per person: how much fixed amounts shrink, and what each 'rest' line takes of what is left
  const fixedFactors = new Map()
  const restShares = new Map()

  people.forEach((person) => {
    const kept = monthlyTaxOf(person.netMonthly) + person.netMonthly * RESERVE_PERCENT / 100
    const available = Math.max(0, person.netMonthly - kept - spentOf(person, 'percent'))
    const fixed = spentOf(person, 'fixed')
    let factor = 1

    if (fixed > available) {
      factor = available / fixed
    }

    fixedFactors.set(person.id, factor)
    restShares.set(person.id, shareOut(lines.filter((line) => line.kind === 'rest'), Math.max(0, available - fixed), ceilingOf))
  })

  return (line, scopeId) => {
    let person = reference
    let count = people.length

    if (scopeId !== SHARED) {
      person = people.find((candidate) => candidate.id === scopeId)
      count = 1
    }

    if (line.kind === 'rest') {
      return (restShares.get(person.id).get(line) ?? 0) * count
    }

    let amount = setShareOf(line, person) * count

    if (line.kind === 'fixed') {
      amount *= fixedFactors.get(person.id)
    }

    return amount
  }
}

/**
 * The people a bracket is previewed for: the person signing up, and in a pair a partner earning as much
 * @param {{ mode: string }} starterPlan
 * @param {number} income
 */
function previewPeopleOf(starterPlan, income) {
  const people = [{ id: ME, netMonthly: income }]

  if (starterPlan.mode === 'duo') {
    people.push({ id: PARTNER, netMonthly: income })
  }

  return people
}

// Typical incomes of the brackets, a bracket still being typed having none yet
function typicalIncomesOf(starterPlan) {
  return starterPlan.ranges
    .filter((range) => range.typical !== '' && Number.isFinite(Number(range.typical)))
    .map((range) => Number(range.typical))
}

// The scope a line of a starter plan lands in for the person signing up
function previewScopeOf(line, starterPlan) {
  if (starterPlan.mode === 'duo' && line.scope !== SHARED) {
    return ME
  }

  return SHARED
}

/**
 * What a line of a starter plan amounts to at the typical income of each of its brackets, as the onboarding builds it
 * @param {{ kind: string, value: number | string, max?: number | string, scope?: string }} line
 * @param {{ mode: string, ranges: { typical: number | string }[], expenses: object[], savings: object[] }} starterPlan
 * @returns {number[]} one amount per bracket whose typical income is set, in TIER_CURRENCY
 */
export function lineAmountsOf(line, starterPlan) {
  return typicalIncomesOf(starterPlan).map((income) => {
    const amountOf = sizerOf(starterPlan, previewPeopleOf(starterPlan, income), 1)

    return roundAmount(amountOf(line, previewScopeOf(line, starterPlan)))
  })
}

/**
 * What the person signing up pays in tax and keeps unassigned at the typical income of each bracket, their half of the
 * common lines counted
 * @param {{ mode: string, ranges: { typical: number | string }[], expenses: object[], savings: object[] }} starterPlan
 * @returns {{ income: number, tax: number, left: number }[]} in TIER_CURRENCY
 */
export function leftoversOf(starterPlan) {
  return typicalIncomesOf(starterPlan).map((income) => {
    const people = previewPeopleOf(starterPlan, income)
    const amountOf = sizerOf(starterPlan, people, 1)
    const tax = monthlyTaxOf(income)

    const spent = linesOf(starterPlan).reduce((sum, line) => {
      const scopeId = previewScopeOf(line, starterPlan)
      const amount = roundAmount(amountOf(line, scopeId))

      if (scopeId === SHARED) {
        return sum + amount / people.length
      }

      return sum + amount
    }, 0)

    return { income, tax: Math.round(tax), left: Math.round(income - tax - spent) }
  })
}

/**
 * Turns the groups of a starter plan into sub-groups and lines of the plan shape, one copy per scope holding lines,
 * with the shortcuts of their lines for each person who books on them
 * @param {object[]} groups
 * @param {{ id: string, netMonthly: number }[]} people
 * @param {(line: object, scopeId: string) => number} amountOf - from sizerOf
 * @param {number} rate - units of the main currency per unit of TIER_CURRENCY, for the shortcuts
 * @param {'expense' | 'saving'} section - prefixes the ids, which the import resolves across both sections at once
 */
function buildSection(groups, people, amountOf, rate, section) {
  const isDuo = people.length > 1
  const scopes = [{ id: SHARED }]

  if (isDuo) {
    scopes.push(...people.map((person) => ({ id: person.id })))
  }

  const subgroups = []
  const lines = []
  const presets = []

  groups.forEach((group, groupIndex) => {
    scopes.forEach((scope) => {
      // A solo plan keeps every line common; a pair splits them between the common part and each person
      const scopeLines = group.lines.filter((line) => {
        if (!isDuo) {
          return scope.id === SHARED
        }

        if (line.scope === SHARED) {
          return scope.id === SHARED
        }

        return scope.id !== SHARED
      })

      if (!scopeLines.length) {
        return
      }

      const subgroupId = `${section}-${scope.id}-${groupIndex}`

      subgroups.push({ id: subgroupId, label: group.label, color: group.color, scope: scope.id })
      scopeLines.forEach((line, lineIndex) => {
        const lineId = `${subgroupId}-${lineIndex}`
        const shortcut = optionalFigureOf(line.shortcut)

        lines.push({
          id: lineId,
          label: line.label,
          amount: roundAmount(amountOf(line, scope.id)),
          autoBook: !!line.autoBook,
          parent: subgroupId,
        })

        if (!shortcut) {
          return
        }

        // Everyone booking on a common line gets the shortcut, a personal line only its owner
        people
          .filter((person) => scope.id === SHARED || scope.id === person.id)
          .forEach((person) => presets.push({ line: lineId, person: person.id, label: line.label, amount: Math.round(shortcut * rate * 100) / 100 }))
      })
    })
  })

  return { subgroups, lines, presets }
}

/**
 * Builds the plan proposed at the end of the onboarding, in the JSON plan shape the import reads, with the shortcuts
 * of the expense form
 * @param {object} answers
 * @param {string} answers.firstName
 * @param {number} answers.income - monthly, in the main currency
 * @param {boolean} answers.isDuo
 * @param {object} starterPlan - the plan of the bracket picked
 * @param {number} rate - units of the main currency per unit of TIER_CURRENCY, for fixed amounts, ceilings and shortcuts
 * @returns {object}
 */
export function buildStarterPlan(answers, starterPlan, rate) {
  const annualTax = Math.round(monthlyTaxOf(answers.income) * MONTHS_PER_YEAR)
  const people = [{ id: ME, label: answers.firstName, netMonthly: answers.income, annualTax }]

  if (answers.isDuo) {
    // Nothing is asked about the partner: their income is assumed equal to the viewer's, their profile replacing
    // both name and income once they join
    people.push({ id: PARTNER, label: PARTNER_LABEL, netMonthly: answers.income, annualTax })
  }

  const amountOf = sizerOf(starterPlan, people, rate)
  const expenses = buildSection(starterPlan.expenses, people, amountOf, rate, 'expense')
  const savings = buildSection(starterPlan.savings, people, amountOf, rate, 'saving')

  let name = `Budget de ${answers.firstName}`

  if (answers.isDuo) {
    name = `Budget à deux de ${answers.firstName}`
  }

  return {
    name,
    people,
    subgroups: expenses.subgroups,
    categories: expenses.lines,
    savingGroups: savings.subgroups,
    savings: savings.lines,
    presets: expenses.presets,
    settings: { taxTiming: 'monthly' },
  }
}
