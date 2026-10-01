import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import BudgetGauges from '../components/BudgetGauges.jsx'
import MonthBudget from '../components/MonthBudget.jsx'
import MonthSwitcher from '../components/MonthSwitcher.jsx'
import NoLinesNotice from '../components/NoLinesNotice.jsx'
import PullIndicator from '../components/PullIndicator.jsx'
import SpendingCalendar from '../components/SpendingCalendar.jsx'
import SpendingPace from '../components/SpendingPace.jsx'
import SpentBreakdown from '../components/SpentBreakdown.jsx'
import useExpenses from '../hooks/useExpenses.js'
import usePullToRefresh from '../hooks/usePullToRefresh.js'
import useYearExpenses from '../hooks/useYearExpenses.js'
import { formatMonth, formatShortDay } from '../utils/format.js'
import { loadPreference, savePreference } from '../utils/storage.js'
import { buildTracking, dailyBudgetOf, dailySpendingOf, daysLeftIn, firstWeekdayOf, indexLines, shareCountOf, spendingPaceOf, spentSlicesOf, toDateValue, toMonthValue, viewerExpensesOf, viewerShareOf, weekRangeOf, weekTrackingOf, yearToDateTrackingOf } from '../utils/tracking.js'

const PERIOD_KEY = 'dashboard-gauges-period'

// Periods the category gauges can follow
const PERIODS = [
  { id: 'weekly', label: 'Semaine' },
  { id: 'monthly', label: 'Mois' },
  { id: 'annual', label: 'Année' },
]

// Months covered by the yearly gauges, from January to the month shown
function yearNoteOf(month) {
  if (month.endsWith('-01')) {
    return `Budget et dépenses de ${formatMonth(month)}`
  }

  return `Budget et dépenses cumulés de janvier à ${formatMonth(month)}`
}

// Days covered by the weekly gauges
function weekNoteOf(week) {
  if (week.from === week.to) {
    return `Budget et dépenses du ${formatShortDay(week.from)}`
  }

  return `Budget et dépenses du ${formatShortDay(week.from)} au ${formatShortDay(week.to)}`
}

// Landing page: where the month stands against the plan, at a glance
export default function DashboardPage() {
  const { plan, slotId, settlements, reload: reloadPlan } = useOutletContext()
  const [month, setMonth] = useState(() => toMonthValue(new Date()))
  // The category gauges follow the week, the month or the year so far, a choice remembered on the device
  const [period, setPeriod] = useState(() => loadPreference(PERIOD_KEY) ?? 'monthly')
  const isAnnual = period === 'annual'
  const { expenses, error, reload: reloadExpenses, removeExpense } = useExpenses(plan.id, slotId, month)
  const yearExpenses = useYearExpenses(plan.id, month.slice(0, 4), isAnnual)

  // Pulling the page down fetches what the other member of the plan may have changed
  const { indicatorRef, refreshing } = usePullToRefresh(() => Promise.all([reloadPlan(), reloadExpenses(), yearExpenses.reload(), settlements.reload()]))

  const tracking = useMemo(() => buildTracking(plan, expenses, slotId), [plan, expenses, slotId])
  const yearTracking = useMemo(() => yearToDateTrackingOf(plan, yearExpenses.expenses, slotId, month), [plan, yearExpenses.expenses, slotId, month])
  const lines = useMemo(() => indexLines(plan), [plan])
  const hasLines = tracking.some((scope) => !!scope.subgroups.length || !!scope.items.length)

  if (!hasLines) {
    return <NoLinesNotice />
  }

  const today = new Date()
  // Every headline figure is the viewer's part, so the breakdown adds up to the spent amount
  const { spent, budget } = viewerShareOf(plan, tracking, slotId)
  const daysLeft = daysLeftIn(month, today)
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

  if (period === 'weekly') {
    const week = weekRangeOf(month, today)

    gaugeTracking = weekTrackingOf(plan, expenses, slotId, month, week)
    gaugeNote = weekNoteOf(week)
  }

  if (isAnnual) {
    gaugeTracking = yearTracking
    gaugeNote = yearNoteOf(month)
  }

  const periodSwitch = (
    <span className="switch switch--segmented switch--small" role="group" aria-label="Période des jauges">
      {PERIODS.map((option, index) => (
        <button
          key={`period-${option.id}-${index}`}
          type="button"
          className="switch__option"
          onClick={() => changePeriod(option.id)}
          aria-pressed={option.id === period}
        >
          {option.label}
        </button>
      ))}
    </span>
  )

  return (
    <>
      <PullIndicator indicatorRef={indicatorRef} refreshing={refreshing} />

      <MonthSwitcher month={month} onChange={setMonth} />

      {!!error && <p className="actions__error">{error}</p>}

      {isAnnual && !!yearExpenses.error && <p className="actions__error">{yearExpenses.error}</p>}

      <MonthBudget spent={spent} budget={budget} daysLeft={daysLeft} />

      <SpentBreakdown slices={spentSlicesOf(plan, tracking, slotId)} shareCount={shareCountOf(plan)} />

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
