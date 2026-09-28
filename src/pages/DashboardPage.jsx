import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import AccountBalance from '../components/AccountBalance.jsx'
import Gauge from '../components/Gauge.jsx'
import MonthOverview from '../components/MonthOverview.jsx'
import MonthSwitcher from '../components/MonthSwitcher.jsx'
import NoLinesNotice from '../components/NoLinesNotice.jsx'
import PieChart from '../components/PieChart.jsx'
import SpendingCalendar from '../components/SpendingCalendar.jsx'
import useExpenses from '../hooks/useExpenses.js'
import { formatAmount } from '../utils/format.js'
import { SHARED } from '../utils/plan.js'
import { accountBalanceOf, buildTracking, dailySpendingOf, daysLeftIn, firstWeekdayOf, indexLines, monthRange, toDateValue, toMonthValue, trackedLinesOf, viewerExpensesOf, viewerShareOf } from '../utils/tracking.js'

/**
 * Money spent per sub-group this month, the common ones flagged when a personal scope is shown too
 * @param {object[]} tracking - scopes from buildTracking
 */
function slicesOf(tracking) {
  const isShared = tracking.length > 1

  return tracking.flatMap((scope) => {
    let suffix = ''

    if (isShared && scope.id === SHARED) {
      suffix = ' (commun)'
    }

    return [...scope.subgroups, scope.loose].map((group) => ({
      id: group.id,
      label: `${group.label}${suffix}`,
      value: group.spent,
      tone: group.color ?? 'neutral',
    }))
  })
}

// Share of the budget consumed, spending on an unbudgeted line counting in full
function usageOf(line) {
  if (!line.budget) {
    return line.spent
  }

  return line.spent / line.budget
}

// Lines close to or above their budget, the most consumed first
function attentionLinesOf(tracking) {
  return trackedLinesOf(tracking)
    .filter((line) => line.status !== 'ok')
    .sort((left, right) => usageOf(right) - usageOf(left))
}

// Time frame of the remaining amount: the days left in the current month, the whole month otherwise
function remainingHintOf(daysLeft) {
  if (daysLeft === undefined) {
    return 'sur le mois'
  }

  if (daysLeft === 1) {
    return 'dernier jour'
  }

  return `${daysLeft} jours restants`
}

// Tone of the remaining amount tile, red once the month is over budget
function remainingClassOf(remaining) {
  if (remaining < 0) {
    return 'kpi kpi--over'
  }

  return 'kpi'
}

// Landing page: where the month stands against the plan, at a glance
export default function DashboardPage() {
  const { plan, slotId } = useOutletContext()
  const [month, setMonth] = useState(() => toMonthValue(new Date()))
  const { expenses, error } = useExpenses(plan.id, slotId, month)

  const tracking = useMemo(() => buildTracking(plan, expenses, slotId), [plan, expenses, slotId])
  const lines = useMemo(() => indexLines(plan), [plan])
  const hasLines = tracking.some((scope) => !!scope.subgroups.length || !!scope.items.length)

  if (!hasLines) {
    return <NoLinesNotice />
  }

  const today = new Date()
  // Every headline figure is the viewer's part, so they all add up with the account balance
  const { spent, budget, committed } = viewerShareOf(plan, tracking, slotId)
  const remaining = budget - spent
  const daysLeft = daysLeftIn(month, today)
  const lastDay = Number(monthRange(month).to.slice(8))
  const attention = attentionLinesOf(tracking)
  const balance = accountBalanceOf(plan, { spent, budget }, slotId)
  // Automatic debits land on the 1st on their own, so each day is weighed against an even share of the rest
  const dailyBudget = Math.max(budget - committed, 0) / lastDay

  return (
    <>
      <h1 className="plans__title">Vue d&rsquo;ensemble</h1>

      <MonthSwitcher month={month} onChange={setMonth} />

      {!!error && <p className="actions__error">{error}</p>}

      <ul className="kpis">
        <li className="kpi">
          <span className="kpi__label">Dépensé</span>
          <strong className="kpi__value">{formatAmount(spent)}</strong>
          <span className="kpi__hint">sur {formatAmount(budget)} prévus</span>
        </li>

        <li className={remainingClassOf(remaining)}>
          <span className="kpi__label">Reste à dépenser</span>
          <strong className="kpi__value">{formatAmount(remaining)}</strong>
          <span className="kpi__hint">{remainingHintOf(daysLeft)}</span>
        </li>

        {daysLeft !== undefined && (
          <li className="kpi">
            <span className="kpi__label">Par jour</span>
            <strong className="kpi__value">{formatAmount(Math.max(remaining, 0) / daysLeft)}</strong>
            <span className="kpi__hint">jusqu&rsquo;à la fin du mois</span>
          </li>
        )}
      </ul>

      {!!balance && <AccountBalance balance={balance} />}

      <MonthOverview scopes={tracking} />

      <div className="dashboard__charts">
        <SpendingCalendar
          days={dailySpendingOf(viewerExpensesOf(plan, expenses, lines), month, today, dailyBudget)}
          firstWeekday={firstWeekdayOf(month)}
          dailyBudget={dailyBudget}
          today={toDateValue(today)}
          lines={lines}
        />

        <div className="card">
          <PieChart title="Répartition des dépenses" slices={slicesOf(tracking)} />
        </div>
      </div>

      <section className="card attention">
        <h2 className="budget__title">Points d&rsquo;attention</h2>

        {!attention.length && <p className="section__hint">Toutes les catégories sont dans leur budget.</p>}

        {!!attention.length && (
          <ul className="attention__list">
            {attention.map((line, index) => (
              <li key={`attention-${line.id}-${index}`}>
                <Gauge label={line.label} spent={line.spent} budget={line.budget} fill={line.fill} status={line.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
