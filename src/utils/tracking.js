// Pure maths of the monthly expense tracking, kept apart from the hooks and the components
import { MONTHS_PER_YEAR, scopeOf, SHARED, sumByScope, toAmount, toScopeTree } from './plan.js'

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

/**
 * Everything a gauge needs, the fill being capped at a full bar
 * @param {number} spent
 * @param {number} budget
 * @param {number} [committed] - automatic debits, expected in full, so the warning only looks at the rest
 */
export function toGauge(spent, budget, committed = 0) {
  let fill = 0

  if (budget > 0) {
    fill = Math.min(spent / budget, 1)
  }

  if (budget <= 0 && spent > 0) {
    fill = 1
  }

  return { spent, budget, committed, fill, status: gaugeStatus(spent - committed, budget - committed) }
}

/**
 * Amount of a line debited on its own every month, zero for a line booked by hand
 * @param {{ amount: number, autoBook?: boolean }} line
 */
export function committedOf(line) {
  if (!line.autoBook) {
    return 0
  }

  return toAmount(line.amount)
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

// Alone, the common scope is simply the budget: calling it common would mean nothing
function sharedLabelOf(isSolo) {
  if (isSolo) {
    return 'Budget par catégorie'
  }

  return 'Commun'
}

/**
 * Expense lines tracked by the signed-in person: the common scope and their own, with gauges at every level
 * @param {object} plan
 * @param {object[]} expenses
 * @param {string} slotId - the place this person holds in the plan
 */
export function buildTracking(plan, expenses, slotId) {
  const spentByLine = sumSpentByLine(expenses)
  const isSolo = plan.people.length < 2
  const scopes = [{ id: SHARED, label: sharedLabelOf(isSolo) }]

  // A solo plan keeps everything common, so it has no personal scope to track
  if (!isSolo) {
    scopes.push({ id: slotId, label: 'Personnel' })
  }

  // An automatic debit counts as spent from the first day, on top of anything booked by hand
  const trackLine = (line) => {
    const committed = committedOf(line)

    return { ...line, ...toGauge((spentByLine[line.id] ?? 0) + committed, toAmount(line.amount), committed) }
  }

  const sumGauges = (gauges) => ({
    spent: gauges.reduce((sum, gauge) => sum + gauge.spent, 0),
    budget: gauges.reduce((sum, gauge) => sum + gauge.budget, 0),
    committed: gauges.reduce((sum, gauge) => sum + gauge.committed, 0),
  })

  return toScopeTree(scopes, plan.subgroups, plan.categories).map((scope) => {
    const items = scope.items.map(trackLine)
    const subgroups = scope.subgroups.map((subgroup) => {
      const lines = subgroup.items.map(trackLine)
      const { spent, budget, committed } = sumGauges(lines)

      return { ...subgroup, items: lines, ...toGauge(spent, budget, committed) }
    })
    const looseSum = sumGauges(items)
    const { spent, budget, committed } = sumGauges([...items, ...subgroups])

    // Lines outside any sub-group get their own card, shaped like a sub-group
    const loose = {
      id: `${scope.id}-loose`,
      label: 'Autres',
      color: undefined,
      items,
      ...toGauge(looseSum.spent, looseSum.budget, looseSum.committed),
    }

    return { ...scope, items, subgroups, loose, ...toGauge(spent, budget, committed) }
  })
}

/**
 * Tracking from January to the end of a month: each line's budget and automatic debit count once per month elapsed,
 * against every expense booked over those months
 * @param {object} plan
 * @param {{ line_id: string, amount: number, spent_on: string }[]} expenses - of the whole year
 * @param {string} slotId - the place this person holds in the plan
 * @param {string} month - YYYY-MM, the last month counted
 */
export function yearToDateTrackingOf(plan, expenses, slotId, month) {
  const months = Number(month.slice(5, 7))
  const { to } = monthRange(month)
  const categories = plan.categories.map((line) => ({ ...line, amount: toAmount(line.amount) * months }))

  return buildTracking({ ...plan, categories }, expenses.filter((expense) => expense.spent_on <= to), slotId)
}

/**
 * Share of the budget consumed, spending without any budget counting in full
 * @param {{ spent: number, budget: number }} gauge
 */
export function usageOf(gauge) {
  if (!gauge.budget) {
    return gauge.spent
  }

  return gauge.spent / gauge.budget
}

/**
 * Groups of a tracked scope reduced to their lines booked by hand, totals included, groups and lines most consumed first;
 * groups left empty are dropped
 * @param {object} scope - one scope from buildTracking
 */
export function manualGroupsOf(scope) {
  return [...scope.subgroups, scope.loose]
    .map((group) => {
      const items = group.items
        .filter((line) => !line.autoBook)
        .sort((left, right) => usageOf(right) - usageOf(left))
      const spent = items.reduce((sum, line) => sum + line.spent, 0)
      const budget = items.reduce((sum, line) => sum + line.budget, 0)

      return { ...group, items, ...toGauge(spent, budget) }
    })
    .filter((group) => !!group.items.length)
    .sort((left, right) => usageOf(right) - usageOf(left))
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

/**
 * Days of the month already lived: all of a past month, up to today for the current one, none for a future one
 * @param {string} month - YYYY-MM
 * @param {Date} today
 */
export function elapsedDaysIn(month, today) {
  const lastDay = Number(monthRange(month).to.slice(8))
  const daysLeft = daysLeftIn(month, today)

  if (month > toMonthValue(today)) {
    return 0
  }

  if (daysLeft === undefined) {
    return lastDay
  }

  return lastDay - daysLeft + 1
}

/**
 * Money spent on each day of the month against an even share of the budget, days still to come having no status
 * @param {{ spent_on: string, amount: number }[]} expenses
 * @param {string} month - YYYY-MM
 * @param {Date} today
 * @param {number} dailyBudget - what can be spent per day for the month to land on its budget
 * @returns {{ date: string, day: number, spent: number, items: object[], status?: 'ok' | 'warning' | 'over' }[]}
 */
export function dailySpendingOf(expenses, month, today, dailyBudget) {
  const itemsByDay = expenses.reduce((groups, expense) => {
    const day = Number(expense.spent_on.slice(8, 10))

    return { ...groups, [day]: [...(groups[day] ?? []), expense] }
  }, {})
  const elapsed = elapsedDaysIn(month, today)
  const lastDay = Number(monthRange(month).to.slice(8))

  return Array.from({ length: lastDay }, (_unused, index) => {
    const day = index + 1
    const items = itemsByDay[day] ?? []
    const spent = items.reduce((sum, expense) => sum + toAmount(expense.amount), 0)
    let status

    if (day <= elapsed) {
      status = gaugeStatus(spent, dailyBudget)
    }

    return { date: `${month}-${String(day).padStart(2, '0')}`, day, spent, items, status }
  })
}

/**
 * Running total of the month against the even pace of the daily budget, the total stopping at the last lived day
 * @param {{ date: string, day: number, spent: number, status?: string }[]} days - from dailySpendingOf
 * @param {number} dailyBudget
 * @returns {{ date: string, day: number, spent?: number, planned: number }[]}
 */
export function spendingPaceOf(days, dailyBudget) {
  let total = 0

  return days.map((day) => {
    total += day.spent

    // Days still to come carry a status only once lived
    let spent = undefined

    if (!!day.status) {
      spent = total
    }

    return { date: day.date, day: day.day, spent, planned: dailyBudget * day.day }
  })
}

/**
 * Position of the first day of a YYYY-MM month in a week starting on Monday, 0 to 6
 * @param {string} month
 */
export function firstWeekdayOf(month) {
  const [year, index] = month.split('-').map(Number)

  return (new Date(year, index - 1, 1).getDay() + 6) % 7
}

// Days of a Monday-first week, for the calendars
export const WEEKDAYS = [
  { short: 'L', long: 'lundi' },
  { short: 'M', long: 'mardi' },
  { short: 'M', long: 'mercredi' },
  { short: 'J', long: 'jeudi' },
  { short: 'V', long: 'vendredi' },
  { short: 'S', long: 'samedi' },
  { short: 'D', long: 'dimanche' },
]

/**
 * Splits the days into Monday-first weeks, blank cells padding the first and last ones
 * @template T
 * @param {T[]} days
 * @param {number} firstWeekday - from firstWeekdayOf
 * @returns {(T | undefined)[][]}
 */
export function weeksOf(days, firstWeekday) {
  const cells = [...Array(firstWeekday).fill(undefined), ...days]

  while (cells.length % WEEKDAYS.length) {
    cells.push(undefined)
  }

  return Array.from({ length: cells.length / WEEKDAYS.length }, (_unused, index) =>
    cells.slice(index * WEEKDAYS.length, (index + 1) * WEEKDAYS.length)
  )
}

/**
 * The day before a date, as YYYY-MM-DD
 * @param {Date} date
 */
export function dayBefore(date) {
  return toDateValue(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1))
}

/**
 * Every tracked expense line of every scope, sub-grouped or not
 * @param {object[]} tracking - scopes from buildTracking
 */
export function trackedLinesOf(tracking) {
  return tracking.flatMap((scope) => [...scope.subgroups.flatMap((subgroup) => subgroup.items), ...scope.items])
}

/**
 * Number of people the common part is split between, as in the plan's recap
 * @param {object} plan
 */
export function shareCountOf(plan) {
  return plan.people.length || 1
}

/**
 * The viewer's part of each expense, a common one being split equally; expenses on removed lines are left out
 * @param {object} plan
 * @param {{ line_id: string, amount: number }[]} expenses
 * @param {object} lines - from indexLines
 */
export function viewerExpensesOf(plan, expenses, lines) {
  return expenses
    .filter((expense) => !!lines[expense.line_id])
    .map((expense) => {
      let amount = toAmount(expense.amount)

      if (lines[expense.line_id].scope === SHARED) {
        amount = amount / shareCountOf(plan)
      }

      return { ...expense, amount }
    })
}

/**
 * The viewer's part of the month: all of their own scope and an equal share of the common one
 * @param {object} plan
 * @param {object[]} tracking - scopes from buildTracking, automatic debits included
 * @param {string} slotId - the place this person holds in the plan
 * @returns {{ spent: number, budget: number, committed: number }}
 */
export function viewerShareOf(plan, tracking, slotId) {
  const shareCount = shareCountOf(plan)
  const common = tracking.find((scope) => scope.id === SHARED)
  const own = tracking.find((scope) => scope.id === slotId)
  const shareOf = (key) => (common?.[key] ?? 0) / shareCount + (own?.[key] ?? 0)

  return { spent: shareOf('spent'), budget: shareOf('budget'), committed: shareOf('committed') }
}

/**
 * What the viewer can spend per day for the month to land on its budget. Automatic debits land on the 1st on their
 * own, so each day is weighed against an even share of the rest
 * @param {object} plan
 * @param {string} slotId - the place this person holds in the plan
 * @param {string} month - YYYY-MM
 */
export function dailyBudgetOf(plan, slotId, month) {
  const { budget, committed } = viewerShareOf(plan, buildTracking(plan, [], slotId), slotId)
  const lastDay = Number(monthRange(month).to.slice(8))

  return Math.max(budget - committed, 0) / lastDay
}

/**
 * What is left on the viewer's account this month, split into what the budget still plans to spend and what no
 * budget line uses
 * @param {object} plan
 * @param {{ spent: number, budget: number }} share - the viewer's part, from viewerShareOf
 * @param {string} slotId - the place this person holds in the plan
 * @returns {{ income: number, tax: number, savings: number, spent: number, remaining: number, unbudgeted: number, available: number } | undefined}
 */
export function accountBalanceOf(plan, share, slotId) {
  const person = plan.people.find((candidate) => candidate.id === slotId)

  if (!person) {
    return undefined
  }

  const savingsByScope = sumByScope(plan.savingGroups, plan.savings)
  const income = toAmount(person.netMonthly)
  const savings = (savingsByScope[SHARED] ?? 0) / shareCountOf(plan) + (savingsByScope[slotId] ?? 0)

  // A tax paid at the end of the year does not leave the account month by month
  let tax = 0

  if (plan.settings.taxTiming === 'monthly') {
    tax = toAmount(person.annualTax) / MONTHS_PER_YEAR
  }

  const remaining = share.budget - share.spent
  const unbudgeted = income - tax - savings - share.budget

  return { income, tax, savings, spent: share.spent, remaining, unbudgeted, available: remaining + unbudgeted }
}

/**
 * Lines arranged under their sub-group in plan order, lines outside any sub-group gathered last
 * @param {{ id: string, label: string, color: string, scope: string }[]} subgroups
 * @param {{ id: string, parent: string }[]} lines
 * @returns {{ id: string, label: string, color?: string, scope?: string, lines: object[] }[]}
 */
export function groupLinesOf(subgroups, lines) {
  const grouped = subgroups.map((subgroup) => ({
    id: subgroup.id,
    label: subgroup.label,
    color: subgroup.color,
    scope: subgroup.scope,
    lines: lines.filter((line) => line.parent === subgroup.id),
  }))
  const loose = lines.filter((line) => !subgroups.some((subgroup) => subgroup.id === line.parent))

  return [...grouped, { id: 'loose', label: 'Divers', color: undefined, lines: loose }].filter((group) => !!group.lines.length)
}

/**
 * Sub-groups ordered by how often they are used, and their lines likewise; ties keep the plan order
 * @param {{ lines: { id: string }[] }[]} groups - from groupLinesOf
 * @param {Record<string, number>} usesByLine
 */
export function rankGroupsByUse(groups, usesByLine) {
  const usesOf = (line) => usesByLine[line.id] ?? 0

  return groups
    .map((group) => ({
      ...group,
      lines: [...group.lines].sort((left, right) => usesOf(right) - usesOf(left)),
      uses: group.lines.reduce((sum, line) => sum + usesOf(line), 0),
    }))
    .sort((left, right) => right.uses - left.uses)
}
