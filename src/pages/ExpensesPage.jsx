import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import BudgetGauges from '../components/BudgetGauges.jsx'
import ExpenseHistory from '../components/ExpenseHistory.jsx'
import MonthOverview from '../components/MonthOverview.jsx'
import MonthSwitcher from '../components/MonthSwitcher.jsx'
import QuickAddExpense from '../components/QuickAddExpense.jsx'
import useExpenses from '../hooks/useExpenses.js'
import { buildTracking, daysLeftIn, indexLines, toMonthValue } from '../utils/tracking.js'

// Daily entry and monthly monitoring of the expenses against the plan
export default function ExpensesPage() {
  const { plan, userId } = useOutletContext()
  const [month, setMonth] = useState(() => toMonthValue(new Date()))
  const { expenses, error, addExpense, removeExpense } = useExpenses(plan.id, userId, month)

  const tracking = useMemo(() => buildTracking(plan, expenses, userId), [plan, expenses, userId])
  const lines = useMemo(() => indexLines(plan), [plan])
  const names = Object.fromEntries(plan.people.map((person) => [person.id, person.label]))
  const hasLines = tracking.some((scope) => !!scope.subgroups.length || !!scope.items.length)

  if (!hasLines) {
    return (
      <section className="card empty">
        <h1 className="empty__title">Aucune catégorie de dépense</h1>
        <p className="section__hint">Ajoutez des lignes communes ou personnelles dans le plan pour commencer le suivi.</p>
        <Link to="/plan" className="form__submit">
          Ouvrir le plan
        </Link>
      </section>
    )
  }

  return (
    <>
      <MonthSwitcher month={month} onChange={setMonth} />

      {!!error && <p className="actions__error">{error}</p>}

      <MonthOverview scopes={tracking} daysLeft={daysLeftIn(month, new Date())} />

      <div className="expenses">
        <QuickAddExpense tracking={tracking} onAdd={addExpense} />

        <ExpenseHistory
          expenses={expenses}
          lines={lines}
          names={names}
          userId={userId}
          onRemove={removeExpense}
        />
      </div>

      <BudgetGauges tracking={tracking} />
    </>
  )
}
