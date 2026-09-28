import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import NoLinesNotice from '../components/NoLinesNotice.jsx'
import PresetSheet from '../components/PresetSheet.jsx'
import QuickAddExpense from '../components/QuickAddExpense.jsx'
import useExpenseShortcuts from '../hooks/useExpenseShortcuts.js'
import useExpenseSuggestions from '../hooks/useExpenseSuggestions.js'
import useExpenses from '../hooks/useExpenses.js'
import { hasName } from '../utils/plan.js'
import { buildTracking, groupLinesOf, indexLines, rankGroupsByUse, suggestedLinesOf, toMonthValue, trackedLinesOf } from '../utils/tracking.js'

// Latest entries first, whatever day they were dated
function byCreation(left, right) {
  return right.created_at.localeCompare(left.created_at)
}

// Entry of the expenses as they happen, the monitoring living on the overview
export default function ExpensesPage() {
  const { plan, slotId } = useOutletContext()
  // Past expenses are browsed from the calendars, this page only records new ones
  const month = useMemo(() => toMonthValue(new Date()), [])
  const { expenses, error, addExpense, removeExpense } = useExpenses(plan.id, slotId, month)
  const usage = useExpenseSuggestions(plan.id)
  const shortcuts = useExpenseShortcuts(plan.id)
  const [managingPresets, setManagingPresets] = useState(false)

  // Every line the viewer may book on, grouped as in the budget; a line left unnamed in the budget cannot be picked
  const viewerLines = useMemo(() => trackedLinesOf(buildTracking(plan, [], slotId)).filter(hasName), [plan, slotId])
  // Most used sub-groups and lines first, so the usual choices sit at the top
  const groups = useMemo(() => {
    const usesByLine = Object.fromEntries(usage.lines.map((row) => [row.line_id, row.uses]))

    return rankGroupsByUse(groupLinesOf(plan.subgroups, viewerLines), usesByLine)
  }, [plan, viewerLines, usage.lines])
  // Put forward are the lines typed by hand only: an automatic debit is already counted every month
  const bookableIds = useMemo(() => new Set(viewerLines.filter((line) => !line.autoBook).map((line) => line.id)), [viewerLines])
  const lines = useMemo(() => indexLines(plan), [plan])
  // Shortcuts can only be made of lines typed by hand, grouped as in the category picker
  const bookableGroups = useMemo(() => {
    const narrowed = groups.map((group) => ({ ...group, lines: group.lines.filter((line) => bookableIds.has(line.id)) }))

    return narrowed.filter((group) => !!group.lines.length)
  }, [groups, bookableIds])

  if (!viewerLines.length) {
    return <NoLinesNotice />
  }

  // The most used lines once there are habits, every line typed by hand before that
  const featured = suggestedLinesOf(groups, bookableIds, usage.lines, shortcuts.hiddenGroupIds)

  // A successful entry refreshes the habits, so favourites and suggestions follow along
  async function handleAdd(input) {
    const failure = await addExpense(input)

    if (!failure) {
      usage.reload()
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
        groups={groups}
        lines={lines}
        bookableIds={bookableIds}
        featured={featured}
        pinnedIds={shortcuts.pinnedGroupIds}
        hiddenIds={shortcuts.hiddenGroupIds}
        onTogglePin={shortcuts.pinGroup}
        onHideGroup={shortcuts.hideGroup}
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
