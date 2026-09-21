import { useOutletContext } from 'react-router-dom'
import WarningBanner from '../components/WarningBanner.jsx'
import IncomeSection from '../components/IncomeSection.jsx'
import ScopedSection from '../components/ScopedSection.jsx'
import ChartsSection from '../components/ChartsSection.jsx'
import SummarySection from '../components/SummarySection.jsx'
import PlanActions from '../components/PlanActions.jsx'
import { SHARED } from '../utils/plan.js'

// The fixed scopes, which drive how the recap splits common from personal amounts
function scopesOf(people, commonLabel, personLabel) {
  const personal = people.map((person) => ({
    id: person.id,
    label: `${personLabel} ${person.label}`,
  }))

  return [{ id: SHARED, label: commonLabel }, ...personal]
}

// Each person carries their own tax, shown inside their personal scope
function taxByScopeOf(people, monthlyTax, annualTax) {
  if (!monthlyTax) {
    return {}
  }

  return people.reduce(
    (byScope, person) => ({
      ...byScope,
      [person.id]: (Number(person.annualTax) / annualTax) * monthlyTax,
    }),
    {}
  )
}

// The budget editor: everyone sees the whole plan and edits the common part and their own
export default function PlanPage() {
  const {
    plan,
    totals,
    userId,
    updatePerson,
    updateSetting,
    addItem,
    updateItem,
    removeItem,
    removeSubgroup,
    importPlan,
  } = useOutletContext()

  const expenseScopes = scopesOf(plan.people, 'Dépenses communes', 'Dépenses personnelles')
  const savingScopes = scopesOf(plan.people, 'Épargne commune', 'Épargne')
  const taxByScope = taxByScopeOf(plan.people, totals.monthlyTax, totals.annualTax)
  const editableScopes = [SHARED, userId]

  return (
    <>
      <WarningBanner monthlyRemaining={totals.monthlyRemaining} annualRemaining={totals.annualRemaining} />

      <IncomeSection
        people={plan.people}
        currentUserId={userId}
        taxTiming={plan.settings.taxTiming}
        monthlyNetIncome={totals.monthlyNetIncome}
        annualTax={totals.annualTax}
        onUpdatePerson={updatePerson}
        onUpdateSetting={updateSetting}
      />

      <ScopedSection
        title="Dépenses mensuelles"
        tone="expense"
        addLabel="Dépense"
        total={totals.monthlyExpenses}
        annualTotal={totals.annualExpenses}
        scopes={expenseScopes}
        editableScopes={editableScopes}
        subgroups={plan.subgroups}
        items={plan.categories}
        lockedByScope={taxByScope}
        lockedLabel="Impôts"
        onAddLine={(line) => addItem('categories', line)}
        onUpdateLine={(id, field, value) => updateItem('categories', id, field, value)}
        onRemoveLine={(id) => removeItem('categories', id)}
        onAddSubgroup={(subgroup) => addItem('subgroups', subgroup)}
        onUpdateSubgroup={(id, field, value) => updateItem('subgroups', id, field, value)}
        onRemoveSubgroup={(id) => removeSubgroup('subgroups', 'categories', id)}
      />

      <ScopedSection
        title="Épargne et investissements"
        tone="savings"
        addLabel="Ligne d’épargne"
        total={totals.monthlySavings}
        annualTotal={totals.annualSavings}
        scopes={savingScopes}
        editableScopes={editableScopes}
        subgroups={plan.savingGroups}
        items={plan.savings}
        onAddLine={(line) => addItem('savings', line)}
        onUpdateLine={(id, field, value) => updateItem('savings', id, field, value)}
        onRemoveLine={(id) => removeItem('savings', id)}
        onAddSubgroup={(subgroup) => addItem('savingGroups', subgroup)}
        onUpdateSubgroup={(id, field, value) => updateItem('savingGroups', id, field, value)}
        onRemoveSubgroup={(id) => removeSubgroup('savingGroups', 'savings', id)}
      />

      <ChartsSection
        people={plan.people}
        scopes={expenseScopes}
        subgroups={plan.subgroups}
        categories={plan.categories}
        taxByScope={taxByScope}
      />

      <SummarySection columns={totals.columns} />

      <PlanActions plan={plan} canImport={plan.createdBy === userId} onImport={importPlan} />
    </>
  )
}
