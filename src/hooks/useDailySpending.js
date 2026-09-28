import { useMemo } from 'react'
import { dailyBudgetOf, dailySpendingOf, indexLines, viewerExpensesOf } from '../utils/tracking.js'
import useExpenses from './useExpenses.js'

/**
 * The viewer's spending on each day of a month against the daily budget, as on the overview calendar
 * @param {object} plan
 * @param {string} slotId - the place this person holds in the plan
 * @param {string} month - YYYY-MM
 */
export default function useDailySpending(plan, slotId, month) {
  const { expenses } = useExpenses(plan.id, slotId, month)
  const lines = useMemo(() => indexLines(plan), [plan])
  const dailyBudget = dailyBudgetOf(plan, slotId, month)
  const viewerExpenses = useMemo(() => viewerExpensesOf(plan, expenses, lines), [plan, expenses, lines])
  const days = useMemo(() => dailySpendingOf(viewerExpenses, month, new Date(), dailyBudget), [viewerExpenses, month, dailyBudget])

  return { days, dailyBudget }
}
