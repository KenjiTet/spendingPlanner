import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import AccountBalance from '../components/AccountBalance.jsx'
import BudgetGauges from '../components/BudgetGauges.jsx'
import MonthBudget from '../components/MonthBudget.jsx'
import MonthSwitcher from '../components/MonthSwitcher.jsx'
import NoLinesNotice from '../components/NoLinesNotice.jsx'
import SpendingCalendar from '../components/SpendingCalendar.jsx'
import SpendingPace from '../components/SpendingPace.jsx'
import useExpenses from '../hooks/useExpenses.js'
import { accountBalanceOf, buildTracking, dailyBudgetOf, dailySpendingOf, daysLeftIn, firstWeekdayOf, indexLines, spendingPaceOf, toDateValue, toMonthValue, viewerExpensesOf, viewerShareOf } from '../utils/tracking.js'

// Landing page: where the month stands against the plan, at a glance
export default function DashboardPage() {
  const { plan, slotId } = useOutletContext()
  const [month, setMonth] = useState(() => toMonthValue(new Date()))
  const { expenses, error, removeExpense } = useExpenses(plan.id, slotId, month)

  const tracking = useMemo(() => buildTracking(plan, expenses, slotId), [plan, expenses, slotId])
  const lines = useMemo(() => indexLines(plan), [plan])
  const hasLines = tracking.some((scope) => !!scope.subgroups.length || !!scope.items.length)

  if (!hasLines) {
    return <NoLinesNotice />
  }

  const today = new Date()
  // Every headline figure is the viewer's part, so they all add up with the account balance
  const { spent, budget } = viewerShareOf(plan, tracking, slotId)
  const daysLeft = daysLeftIn(month, today)
  const balance = accountBalanceOf(plan, { spent, budget }, slotId)
  const dailyBudget = dailyBudgetOf(plan, slotId, month)
  const days = dailySpendingOf(viewerExpensesOf(plan, expenses, lines), month, today, dailyBudget)

  return (
    <>
      <MonthSwitcher month={month} onChange={setMonth} />

      {!!error && <p className="actions__error">{error}</p>}

      <MonthBudget spent={spent} budget={budget} daysLeft={daysLeft} />

      {!!balance && <AccountBalance balance={balance} />}

      <div className="dashboard__charts">
        <SpendingCalendar
          days={days}
          firstWeekday={firstWeekdayOf(month)}
          dailyBudget={dailyBudget}
          today={toDateValue(today)}
          lines={lines}
          slotId={slotId}
          onRemove={removeExpense}
        />

        <SpendingPace points={spendingPaceOf(days, dailyBudget)} />
      </div>

      <BudgetGauges tracking={tracking} />
    </>
  )
}
