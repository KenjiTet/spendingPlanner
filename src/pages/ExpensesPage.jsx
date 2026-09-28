import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import BudgetGauges from '../components/BudgetGauges.jsx'
import ExpenseHistory from '../components/ExpenseHistory.jsx'
import MonthOverview from '../components/MonthOverview.jsx'
import MonthSwitcher from '../components/MonthSwitcher.jsx'
import NoLinesNotice from '../components/NoLinesNotice.jsx'
import QuickAddExpense from '../components/QuickAddExpense.jsx'
import useExpenses from '../hooks/useExpenses.js'
import { buildTracking, daysLeftIn, indexLines, toMonthValue } from '../utils/tracking.js'

// Daily entry and monthly monitoring of the expenses against the plan
export default function ExpensesPage() {
  const { plan, slotId } = useOutletContext()
  const [month, setMonth] = useState(() => toMonthValue(new Date()))
  const { expenses, error, addExpense, removeExpense } = useExpenses(plan.id, slotId, month)

  const tracking = useMemo(() => buildTracking(plan, expenses, slotId), [plan, expenses, slotId])
  const lines = useMemo(() => indexLines(plan), [plan])
  const names = Object.fromEntries(plan.people.map((person) => [person.id, person.label]))
  const hasLines = tracking.some((scope) => !!scope.subgroups.length || !!scope.items.length)

  if (!hasLines) {
    return <NoLinesNotice />
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
          slotId={slotId}
          onRemove={removeExpense}
        />
      </div>

      <BudgetGauges tracking={tracking} />
    </>
  )
}
