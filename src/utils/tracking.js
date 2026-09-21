// Pure maths of the monthly expense tracking, kept apart from the hooks and the components
import { scopeOf, SHARED, toAmount, toScopeTree } from './plan.js'

// Share of the budget from which a gauge warns that the limit is close
export const WARNING_RATIO = 0.8

/**
 * Local calendar date as YYYY-MM-DD, the format of date inputs and of the database
 * @param {Date} date
 */
export function toDateValue(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * The month of a date as YYYY-MM
 * @param {Date} date
 */
export function toMonthValue(date) {
  return toDateValue(date).slice(0, 7)
}

/**
 * Moves a YYYY-MM month by a number of months
 * @param {string} month
 * @param {number} delta
 */
export function shiftMonth(month, delta) {
  const [year, index] = month.split('-').map(Number)

  return toMonthValue(new Date(year, index - 1 + delta, 1))
}

/**
 * First and last day of a YYYY-MM month
 * @param {string} month
 */
export function monthRange(month) {
  const [year, index] = month.split('-').map(Number)

  return { from: `${month}-01`, to: toDateValue(new Date(year, index, 0)) }
}

/**
 * Days left in the month including today, undefined when the month is not the current one
 * @param {string} month
 * @param {Date} today
 */
export function daysLeftIn(month, today) {
  if (toMonthValue(today) !== month) {
    return undefined
  }

  const { to } = monthRange(month)

  return Number(to.slice(8)) - today.getDate() + 1
}

/**
 * @param {number} spent
 * @param {number} budget
 * @returns {'ok' | 'warning' | 'over'}
 */
export function gaugeStatus(spent, budget) {
  if (spent > budget) {
    return 'over'
  }

  if (budget > 0 && spent / budget >= WARNING_RATIO) {
    return 'warning'
  }

  return 'ok'
}

// Everything a gauge needs, the fill being capped at a full bar
function toGauge(spent, budget) {
  let fill = 0

  if (budget > 0) {
    fill = Math.min(spent / budget, 1)
  }

  if (budget <= 0 && spent > 0) {
    fill = 1
  }

  return { spent, budget, fill, status: gaugeStatus(spent, budget) }
}

/**
 * Totals the expenses per plan line
 * @param {{ line_id: string, amount: number }[]} expenses
 */
export function sumSpentByLine(expenses) {
  return expenses.reduce(
    (totals, expense) => ({ ...totals, [expense.line_id]: (totals[expense.line_id] ?? 0) + toAmount(expense.amount) }),
    {}
  )
}

/**
 * Expense lines tracked by the signed-in person: the common scope and their own, with gauges at every level
 * @param {object} plan
 * @param {object[]} expenses
 * @param {string} userId
 */
export function buildTracking(plan, expenses, userId) {
  const spentByLine = sumSpentByLine(expenses)
  const scopes = [
    { id: SHARED, label: 'Commun' },
    { id: userId, label: 'Personnel' },
  ]

  const trackLine = (line) => ({
    ...line,
    ...toGauge(spentByLine[line.id] ?? 0, toAmount(line.amount)),
  })

  const sumGauges = (gauges) => ({
    spent: gauges.reduce((sum, gauge) => sum + gauge.spent, 0),
    budget: gauges.reduce((sum, gauge) => sum + gauge.budget, 0),
  })

  return toScopeTree(scopes, plan.subgroups, plan.categories).map((scope) => {
    const items = scope.items.map(trackLine)
    const subgroups = scope.subgroups.map((subgroup) => {
      const lines = subgroup.items.map(trackLine)
      const { spent, budget } = sumGauges(lines)

      return { ...subgroup, items: lines, ...toGauge(spent, budget) }
    })
    const looseSum = sumGauges(items)
    const { spent, budget } = sumGauges([...items, ...subgroups])

    // Lines outside any sub-group get their own card, shaped like a sub-group
    const loose = {
      id: `${scope.id}-loose`,
      label: 'Autres',
      color: undefined,
      items,
      ...toGauge(looseSum.spent, looseSum.budget),
    }

    return { ...scope, items, subgroups, loose, ...toGauge(spent, budget) }
  })
}

/**
 * Looks up the label, colour and scope of every expense line, for the history
 * @param {object} plan
 */
export function indexLines(plan) {
  return plan.categories.reduce((index, line) => {
    const subgroup = plan.subgroups.find((candidate) => candidate.id === line.parent)

    return {
      ...index,
      [line.id]: { label: line.label, color: subgroup?.color, scope: scopeOf(plan.subgroups, line) },
    }
  }, {})
}
