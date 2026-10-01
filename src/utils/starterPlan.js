// Starter plans built from the onboarding answers: a structure picked by income tier, amounts derived from the income
import { SHARED } from './plan.js'

// Tier thresholds are written in this currency, an income in another one being converted before it is compared
export const TIER_CURRENCY = 'CHF'

// Living together costs less than twice living alone: the common lines of a pair are trimmed accordingly
const DUO_SHARED_RATIO = 0.85

// Amounts are rounded to this step, and a line never starts below it
const ROUNDING_STEP = 5

const ME = 'me'
const PARTNER = 'partner'
// Name of the partner's place while it is free
const PARTNER_LABEL = 'Partenaire'

/**
 * Structures by monthly income per person, the first whose ceiling is above the income applying.
 * Each line takes a share of the income; `duo` tells where it goes in a plan for two, a solo plan keeping all in common
 * @type {{ id: string, label: string, ceiling: number, expenses: object[], savings: object[] }[]}
 */
const TIERS = [
  {
    id: 'student',
    label: 'Petit budget',
    ceiling: 1000,
    expenses: [
      {
        label: 'Logement',
        color: '1',
        lines: [{ label: 'Loyer ou colocation', share: 0.3, autoBook: true, duo: SHARED }],
      },
      {
        label: 'Quotidien',
        color: '3',
        lines: [
          { label: 'Courses', share: 0.2, duo: SHARED },
          { label: 'Téléphone', share: 0.04, autoBook: true, duo: 'personal' },
        ],
      },
      {
        label: 'Transports',
        color: '16',
        lines: [{ label: 'Abonnement de transport', share: 0.05, autoBook: true, duo: 'personal' }],
      },
      {
        label: 'Études',
        color: '9',
        lines: [{ label: 'Matériel et livres', share: 0.04, duo: 'personal' }],
      },
      {
        label: 'Loisirs',
        color: '5',
        lines: [{ label: 'Sorties', share: 0.1, duo: 'personal' }],
      },
      {
        label: 'Abonnements',
        color: '6',
        lines: [{ label: 'Streaming et musique', share: 0.02, autoBook: true, duo: SHARED }],
      },
    ],
    savings: [
      {
        label: 'Épargne',
        color: '7',
        lines: [{ label: 'Mettre de côté', share: 0.05, duo: 'personal' }],
      },
    ],
  },
  {
    id: 'starter',
    label: 'Premier budget',
    ceiling: 3000,
    expenses: [
      {
        label: 'Logement',
        color: '1',
        lines: [
          { label: 'Loyer', share: 0.3, autoBook: true, duo: SHARED },
          { label: 'Charges et électricité', share: 0.03, autoBook: true, duo: SHARED },
        ],
      },
      {
        label: 'Quotidien',
        color: '3',
        lines: [
          { label: 'Courses', share: 0.12, duo: SHARED },
          { label: 'Téléphone et internet', share: 0.03, autoBook: true, duo: 'personal' },
          { label: 'Assurances', share: 0.06, autoBook: true, duo: 'personal' },
        ],
      },
      {
        label: 'Transports',
        color: '16',
        lines: [{ label: 'Abonnement de transport', share: 0.06, autoBook: true, duo: 'personal' }],
      },
      {
        label: 'Loisirs',
        color: '5',
        lines: [
          { label: 'Sorties et restaurants', share: 0.08, duo: SHARED },
          { label: 'Sport', share: 0.02, duo: 'personal' },
        ],
      },
      {
        label: 'Abonnements',
        color: '6',
        lines: [{ label: 'Streaming et musique', share: 0.02, autoBook: true, duo: SHARED }],
      },
    ],
    savings: [
      {
        label: 'Épargne',
        color: '7',
        lines: [
          { label: 'Fonds d’urgence', share: 0.05, duo: SHARED },
          { label: 'Vacances', share: 0.04, duo: SHARED },
        ],
      },
    ],
  },
  {
    id: 'established',
    label: 'Budget installé',
    ceiling: Infinity,
    expenses: [
      {
        label: 'Logement',
        color: '1',
        lines: [
          { label: 'Loyer', share: 0.3, autoBook: true, duo: SHARED },
          { label: 'Charges et électricité', share: 0.03, autoBook: true, duo: SHARED },
        ],
      },
      {
        label: 'Quotidien',
        color: '3',
        lines: [
          { label: 'Courses', share: 0.1, duo: SHARED },
          { label: 'Téléphone et internet', share: 0.02, autoBook: true, duo: 'personal' },
          { label: 'Assurances', share: 0.07, autoBook: true, duo: 'personal' },
        ],
      },
      {
        label: 'Voiture',
        color: '20',
        lines: [
          { label: 'Leasing et assurance', share: 0.06, autoBook: true, duo: 'personal' },
          { label: 'Carburant et entretien', share: 0.04, duo: 'personal' },
        ],
      },
      {
        label: 'Loisirs',
        color: '5',
        lines: [
          { label: 'Restaurants', share: 0.05, duo: SHARED },
          { label: 'Sorties', share: 0.03, duo: SHARED },
          { label: 'Sport', share: 0.02, duo: 'personal' },
        ],
      },
      {
        label: 'Abonnements',
        color: '6',
        lines: [{ label: 'Streaming et musique', share: 0.02, autoBook: true, duo: SHARED }],
      },
    ],
    savings: [
      {
        label: 'Épargne',
        color: '7',
        lines: [
          { label: 'Fonds d’urgence', share: 0.06, duo: SHARED },
          { label: 'Voyages', share: 0.05, duo: SHARED },
          { label: 'Projets', share: 0.04, duo: 'personal' },
        ],
      },
    ],
  },
]

// Brackets offered at the income step, in TIER_CURRENCY: the plan is sized on the typical income of the bracket
const INCOME_RANGES = [
  { max: 1000, typical: 800 },
  { max: 2000, typical: 1500 },
  { max: 3000, typical: 2500 },
  { max: 5000, typical: 4000 },
  { max: 8000, typical: 6500 },
  { max: Infinity, typical: 10000 },
]

// Keeps two significant digits, so a converted bound still reads as a round figure
function roundFigure(value) {
  if (!Number.isFinite(value) || !value) {
    return value
  }

  const magnitude = 10 ** (Math.floor(Math.log10(value)) - 1)

  return Math.round(value / magnitude) * magnitude
}

/**
 * The income brackets expressed in the main currency
 * @param {number} rate - units of the main currency per unit of TIER_CURRENCY
 * @returns {{ id: string, min: number, max: number, typical: number }[]} the first starting at 0, the last ending at Infinity
 */
export function incomeRangesIn(rate) {
  return INCOME_RANGES.map((range, index) => ({
    id: `range-${index}`,
    min: roundFigure((INCOME_RANGES[index - 1]?.max ?? 0) * rate),
    max: roundFigure(range.max * rate),
    typical: roundFigure(range.typical * rate),
  }))
}

// Rounds an amount to the step, keeping every line visible
function roundAmount(amount) {
  return Math.max(ROUNDING_STEP, Math.round(amount / ROUNDING_STEP) * ROUNDING_STEP)
}

/**
 * The structure matching a monthly income per person
 * @param {number} referenceIncome - expressed in TIER_CURRENCY
 */
export function tierOf(referenceIncome) {
  return TIERS.find((tier) => referenceIncome < tier.ceiling)
}

/**
 * Turns the groups of a tier into sub-groups and lines of the plan shape, one copy per scope holding lines
 * @param {object[]} groups
 * @param {{ id: string, netMonthly: number }[]} people
 * @param {'expense' | 'saving'} section - prefixes the ids, which the import resolves across both sections at once
 */
function buildSection(groups, people, section) {
  const isDuo = people.length > 1
  // Common lines are split equally, so each person must be able to afford half: they follow the lower income
  const sharedBase = Math.min(...people.map((person) => person.netMonthly)) * people.length
  const scopes = [{ id: SHARED, base: sharedBase }]

  if (isDuo) {
    scopes[0].base = sharedBase * DUO_SHARED_RATIO
    scopes.push(...people.map((person) => ({ id: person.id, base: person.netMonthly })))
  }

  const subgroups = []
  const lines = []

  groups.forEach((group, groupIndex) => {
    scopes.forEach((scope) => {
      // A solo plan keeps every line common; a pair splits them between the common part and each person
      const scopeLines = group.lines.filter((line) => {
        if (!isDuo) {
          return scope.id === SHARED
        }

        if (line.duo === SHARED) {
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
        lines.push({
          id: `${subgroupId}-${lineIndex}`,
          label: line.label,
          amount: roundAmount(line.share * scope.base),
          autoBook: !!line.autoBook,
          parent: subgroupId,
        })
      })
    })
  })

  return { subgroups, lines }
}

/**
 * Builds the plan proposed at the end of the onboarding, in the JSON plan shape the import reads
 * @param {object} answers
 * @param {string} answers.firstName
 * @param {number} answers.income - monthly, in the main currency
 * @param {boolean} answers.isDuo
 * @param {(amount: number) => number | undefined} toReference - converts an amount into TIER_CURRENCY
 * @returns {{ tier: object, plan: object }}
 */
export function buildStarterPlan(answers, toReference) {
  const people = [{ id: ME, label: answers.firstName, netMonthly: answers.income, annualTax: 0 }]

  if (answers.isDuo) {
    // Nothing is asked about the partner: their income is assumed equal to the viewer's, their profile replacing
    // both name and income once they join
    people.push({ id: PARTNER, label: PARTNER_LABEL, netMonthly: answers.income, annualTax: 0 })
  }

  // The structure follows the average income of the household; without a rate, the amount is compared as typed
  const averageIncome = people.reduce((sum, person) => sum + person.netMonthly, 0) / people.length
  const tier = tierOf(toReference(averageIncome) ?? averageIncome)
  const expenses = buildSection(tier.expenses, people, 'expense')
  const savings = buildSection(tier.savings, people, 'saving')

  let name = `Budget de ${answers.firstName}`

  if (answers.isDuo) {
    name = `Budget à deux de ${answers.firstName}`
  }

  return {
    tier,
    plan: {
      name,
      people,
      subgroups: expenses.subgroups,
      categories: expenses.lines,
      savingGroups: savings.subgroups,
      savings: savings.lines,
      settings: { taxTiming: 'monthly' },
    },
  }
}
