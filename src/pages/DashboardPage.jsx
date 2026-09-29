import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import AccountBalance from '../components/AccountBalance.jsx'
import BudgetGauges from '../components/BudgetGauges.jsx'
import MonthBudget from '../components/MonthBudget.jsx'
import MonthSwitcher from '../components/MonthSwitcher.jsx'
import NoLinesNotice from '../components/NoLinesNotice.jsx'
import PullIndicator from '../components/PullIndicator.jsx'
import SpendingCalendar from '../components/SpendingCalendar.jsx'
import SpendingPace from '../components/SpendingPace.jsx'
import useExpenses from '../hooks/useExpenses.js'
import usePullToRefresh from '../hooks/usePullToRefresh.js'
import useYearExpenses from '../hooks/useYearExpenses.js'
import { formatMonth } from '../utils/format.js'
import { loadPreference, savePreference } from '../utils/storage.js'
import { accountBalanceOf, buildTracking, dailyBudgetOf, dailySpendingOf, daysLeftIn, firstWeekdayOf, indexLines, spendingPaceOf, toDateValue, toMonthValue, viewerExpensesOf, viewerShareOf, yearToDateTrackingOf } from '../utils/tracking.js'

const PERIOD_KEY = 'dashboard-gauges-period'

// Months covered by the yearly gauges, from January to the month shown
function yearNoteOf(month) {
  if (month.endsWith('-01')) {
    return `Budget et dépenses de ${formatMonth(month)}`
  }

  return `Budget et dépenses cumulés de janvier à ${formatMonth(month)}`
}

// Landing page: where the month stands against the plan, at a glance
export default function DashboardPage() {
  const { plan, slotId, reload: reloadPlan } = useOutletContext()
  const [month, setMonth] = useState(() => toMonthValue(new Date()))
  // The category gauges follow the month or the year so far, a choice remembered on the device
  const [period, setPeriod] = useState(() => loadPreference(PERIOD_KEY) ?? 'monthly')
  const isAnnual = period === 'annual'
  const { expenses, error, reload: reloadExpenses, removeExpense } = useExpenses(plan.id, slotId, month)
  const yearExpenses = useYearExpenses(plan.id, month.slice(0, 4), isAnnual)

  // Pulling the page down fetches what the other member of the plan may have changed
  const { indicatorRef, refreshing } = usePullToRefresh(() => Promise.all([reloadPlan(), reloadExpenses(), yearExpenses.reload()]))

  const tracking = useMemo(() => buildTracking(plan, expenses, slotId), [plan, expenses, slotId])
  const yearTracking = useMemo(() => yearToDateTrackingOf(plan, yearExpenses.expenses, slotId, month), [plan, yearExpenses.expenses, slotId, month])
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

  // The yearly gauges count the removed expense too
  async function removeAndRecount(id) {
    await removeExpense(id)
    yearExpenses.reload()
  }

  function changePeriod(next) {
    setPeriod(next)
    savePreference(PERIOD_KEY, next)
  }

  let gaugeTracking = tracking
  let gaugeNote = undefined

  if (isAnnual) {
    gaugeTracking = yearTracking
    gaugeNote = yearNoteOf(month)
  }

  const periodSwitch = (
    <span className={`switch switch--small switch--${period}`} role="group" aria-label="Période des jauges">
      <span className="switch__thumb" aria-hidden="true" />

      <button type="button" className="switch__option" onClick={() => changePeriod('monthly')} aria-pressed={!isAnnual}>
        Mois
      </button>

      <button type="button" className="switch__option" onClick={() => changePeriod('annual')} aria-pressed={isAnnual}>
        Année
      </button>
    </span>
  )

  return (
    <>
      <PullIndicator indicatorRef={indicatorRef} refreshing={refreshing} />

      <MonthSwitcher month={month} onChange={setMonth} />

      {!!error && <p className="actions__error">{error}</p>}

      {isAnnual && !!yearExpenses.error && <p className="actions__error">{yearExpenses.error}</p>}

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
          onRemove={removeAndRecount}
        />

        <SpendingPace points={spendingPaceOf(days, dailyBudget)} />
      </div>

      <BudgetGauges tracking={gaugeTracking} actions={periodSwitch} note={gaugeNote} />
    </>
  )
}
