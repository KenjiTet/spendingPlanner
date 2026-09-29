import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import NoLinesNotice from '../components/NoLinesNotice.jsx'
import PresetSheet from '../components/PresetSheet.jsx'
import QuickAddExpense from '../components/QuickAddExpense.jsx'
import useExpenseShortcuts from '../hooks/useExpenseShortcuts.js'
import useExpenseSuggestions from '../hooks/useExpenseSuggestions.js'
import useExpenses from '../hooks/useExpenses.js'
import { hasName, SHARED } from '../utils/plan.js'
import { buildTracking, groupLinesOf, indexLines, rankGroupsByUse, toMonthValue, trackedLinesOf } from '../utils/tracking.js'

// Filter value showing the lines of every part of the plan
const ALL_SCOPES = 'all'

/**
 * Filter options of the expense form: common and personal lines apart, only when the plan has both
 * @param {object} plan
 * @param {string} slotId
 */
function scopeOptionsOf(plan, slotId) {
  if (plan.people.length < 2) {
    return []
  }

  return [
    { id: ALL_SCOPES, label: 'Toutes' },
    { id: SHARED, label: 'Commune' },
    { id: slotId, label: 'Personnelle' },
  ]
}

// Latest entries first, whatever day they were dated
function byCreation(left, right) {
  return right.created_at.localeCompare(left.created_at)
}

// Entry of the expenses as they happen, the monitoring living on the overview
export default function ExpensesPage() {
  const { plan, slotId, settlements } = useOutletContext()
  // Past expenses are browsed from the calendars, this page only records new ones
  const month = useMemo(() => toMonthValue(new Date()), [])
  const { expenses, error, addExpense, removeExpense } = useExpenses(plan.id, slotId, month)
  const usage = useExpenseSuggestions(plan.id)
  const shortcuts = useExpenseShortcuts(plan.id)
  const [managingPresets, setManagingPresets] = useState(false)
  const [scope, setScope] = useState(ALL_SCOPES)

  const tracking = useMemo(() => buildTracking(plan, [], slotId), [plan, slotId])
  // Every line the viewer may book on, grouped as in the budget; a line left unnamed in the budget cannot be picked
  const viewerLines = useMemo(() => trackedLinesOf(tracking).filter(hasName), [tracking])
  // Most used sub-groups and lines first, so the usual choices sit at the top
  const allGroups = useMemo(() => {
    const usesByLine = Object.fromEntries(usage.lines.map((row) => [row.line_id, row.uses]))

    return rankGroupsByUse(groupLinesOf(plan.subgroups, viewerLines), usesByLine)
  }, [plan, viewerLines, usage.lines])
  // Offered are the lines typed by hand only: an automatic debit is already counted every month
  const bookableIds = useMemo(() => new Set(viewerLines.filter((line) => !line.autoBook).map((line) => line.id)), [viewerLines])
  // Among them, only those of the part of the plan chosen in the filter
  const offeredIds = useMemo(() => {
    const scoped = trackedLinesOf(tracking.filter((part) => scope === ALL_SCOPES || part.id === scope))

    return new Set(scoped.map((line) => line.id).filter((id) => bookableIds.has(id)))
  }, [tracking, scope, bookableIds])
  const lines = useMemo(() => indexLines(plan), [plan])
  // Shortcuts can only be made of lines typed by hand, of any part of the plan whatever the filter
  const bookableGroups = useMemo(() => {
    const narrowed = allGroups.map((group) => ({ ...group, lines: group.lines.filter((line) => bookableIds.has(line.id)) }))

    return narrowed.filter((group) => !!group.lines.length)
  }, [allGroups, bookableIds])

  if (!viewerLines.length) {
    return <NoLinesNotice />
  }

  // A successful entry refreshes the habits, so the most used lines move up, and the balance between the members
  async function handleAdd(input) {
    const failure = await addExpense(input)

    if (!failure) {
      usage.reload()
      settlements.reload()
    }

    return failure
  }

  return (
    <div className="expenses">
      {!!error && <p className="actions__error">{error}</p>}
      {!!shortcuts.error && <p className="actions__error">{shortcuts.error}</p>}

      <QuickAddExpense
        plan={plan}
        slotId={slotId}
        scopes={scopeOptionsOf(plan, slotId)}
        scope={scope}
        onScopeChange={setScope}
        groups={allGroups}
        offeredIds={offeredIds}
        lines={lines}
        presets={shortcuts.presets.filter((preset) => bookableIds.has(preset.line_id))}
        onManagePresets={() => setManagingPresets(true)}
        history={expenses.filter((expense) => expense.slot_id === slotId).sort(byCreation)}
        onAdd={handleAdd}
        onRemove={removeExpense}
      />

      {/* Outside the expense form, so its own form is never nested in it */}
      <PresetSheet
        open={managingPresets}
        onClose={() => setManagingPresets(false)}
        presets={shortcuts.presets}
        groups={bookableGroups}
        lines={lines}
        onAdd={shortcuts.addPreset}
        onRemove={shortcuts.removePreset}
      />
    </div>
  )
}
