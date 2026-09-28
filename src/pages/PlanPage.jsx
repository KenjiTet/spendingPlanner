import { useOutletContext } from 'react-router-dom'
import WarningBanner from '../components/WarningBanner.jsx'
import ScopedSection from '../components/ScopedSection.jsx'
import ChartsSection from '../components/ChartsSection.jsx'
import SummarySection from '../components/SummarySection.jsx'
import TaxSection from '../components/TaxSection.jsx'
import UnnamedLinesBanner from '../components/UnnamedLinesBanner.jsx'
import PlanTree from '../components/PlanTree.jsx'
import SavePanel from '../components/SavePanel.jsx'
import { MONTHS_PER_YEAR, SHARED, toAmount, toScopeTree } from '../utils/plan.js'

// The fixed scopes, which drive how the recap splits common from personal amounts
function scopesOf(people, commonLabel, personLabel) {
  const personal = people.map((person) => ({
    id: person.id,
    label: `${personLabel} ${person.label}`,
  }))

  return [{ id: SHARED, label: commonLabel }, ...personal]
}

// Monthly tax of each person, for the charts; nothing leaves the account monthly when it is paid once a year
function taxByPersonOf(people, taxTiming) {
  if (taxTiming !== 'monthly') {
    return {}
  }

  return Object.fromEntries(people.map((person) => [person.id, toAmount(person.annualTax) / MONTHS_PER_YEAR]))
}

/**
 * Places whose tax this person may change: their own, and any free one when they created the plan
 * @param {object} plan
 * @param {string} userId
 */
function editableIdsOf(plan, userId) {
  const canEdit = (person) => person.userId === userId || (!person.userId && plan.createdBy === userId)

  return plan.people.filter(canEdit).map((person) => person.id)
}

// A solo plan has no personal part: its lines all stay common, ready for a second person
function visibleScopesOf(scopes, isSolo) {
  if (isSolo) {
    return scopes.slice(0, 1)
  }

  return scopes
}

// With a single person their column and the household one hold the same figures
function summaryColumnsOf(columns, isSolo) {
  if (isSolo) {
    return columns.slice(-1)
  }

  return columns
}

// The budget editor: everyone sees the whole plan and edits the common part and their own
export default function PlanPage() {
  const {
    plan,
    totals,
    userId,
    slotId,
    updateTax,
    updateSetting,
    addItem,
    updateItem,
    removeItem,
    removeSubgroup,
    saveStatus,
    flush,
    showSavings,
    showTaxes,
  } = useOutletContext()

  const isSolo = plan.people.length < 2
  const expenseScopes = scopesOf(plan.people, 'Dépenses communes', 'Dépenses personnelles')
  const savingScopes = scopesOf(plan.people, 'Épargne commune', 'Épargne')
  const taxByPerson = taxByPersonOf(plan.people, plan.settings.taxTiming)
  const editableScopes = [SHARED, slotId]
  const visibleExpenseScopes = visibleScopesOf(expenseScopes, isSolo)
  const visibleSavingScopes = visibleScopesOf(savingScopes, isSolo)

  // What the outline beside the editor lists, in the order of the page, without the sections turned off in the profile
  const outline = [
    {
      id: 'expenses',
      title: 'Dépenses mensuelles',
      tone: 'expense',
      total: totals.monthlyExpenses,
      scopes: toScopeTree(visibleExpenseScopes, plan.subgroups, plan.categories),
      flat: isSolo,
    },
    {
      id: 'savings',
      title: 'Épargne et investissements',
      tone: 'savings',
      total: totals.monthlySavings,
      scopes: toScopeTree(visibleSavingScopes, plan.savingGroups, plan.savings),
      flat: isSolo,
      visible: showSavings,
    },
  ].filter((section) => section.visible ?? true)
  const extras = [
    { id: 'tax', title: 'Impôts', visible: showTaxes },
    { id: 'summary', title: 'Récapitulatif' },
  ].filter((extra) => extra.visible ?? true)

  return (
    <div className="plan-layout">
      <div className="plan-layout__side">
        <PlanTree sections={outline} extras={extras} />
        <SavePanel status={saveStatus} onSave={flush} />
      </div>

      <div className="plan-layout__main">
        <WarningBanner monthlyRemaining={totals.monthlyRemaining} annualRemaining={totals.annualRemaining} />
        <UnnamedLinesBanner lines={plan.categories} />

        <ScopedSection
          title="Dépenses mensuelles"
          anchor="expenses"
          tone="expense"
          addLabel="Dépense"
          autoBookable
          total={totals.monthlyExpenses}
          scopes={visibleExpenseScopes}
          editableScopes={editableScopes}
          shareCount={plan.people.length}
          flat={isSolo}
          subgroups={plan.subgroups}
          items={plan.categories}
          onAddLine={(line) => addItem('categories', line)}
          onUpdateLine={(id, field, value) => updateItem('categories', id, field, value)}
          onRemoveLine={(id) => removeItem('categories', id)}
          onAddSubgroup={(subgroup) => addItem('subgroups', subgroup)}
          onUpdateSubgroup={(id, field, value) => updateItem('subgroups', id, field, value)}
          onRemoveSubgroup={(id) => removeSubgroup('subgroups', 'categories', id)}
        />

        {showSavings && (
          <ScopedSection
            title="Épargne et investissements"
            anchor="savings"
            tone="savings"
            addLabel="Ligne d’épargne"
            total={totals.monthlySavings}
            annualTotal={totals.annualSavings}
            scopes={visibleSavingScopes}
            editableScopes={editableScopes}
            shareCount={plan.people.length}
            flat={isSolo}
            subgroups={plan.savingGroups}
            items={plan.savings}
            onAddLine={(line) => addItem('savings', line)}
            onUpdateLine={(id, field, value) => updateItem('savings', id, field, value)}
            onRemoveLine={(id) => removeItem('savings', id)}
            onAddSubgroup={(subgroup) => addItem('savingGroups', subgroup)}
            onUpdateSubgroup={(id, field, value) => updateItem('savingGroups', id, field, value)}
            onRemoveSubgroup={(id) => removeSubgroup('savingGroups', 'savings', id)}
          />
        )}

        {showTaxes && (
          <TaxSection
            people={plan.people}
            editableIds={editableIdsOf(plan, userId)}
            taxTiming={plan.settings.taxTiming}
            annualTax={totals.annualTax}
            onUpdateTax={updateTax}
            onUpdateSetting={updateSetting}
          />
        )}

        <ChartsSection
          people={plan.people}
          scopes={expenseScopes}
          subgroups={plan.subgroups}
          categories={plan.categories}
          taxByScope={taxByPerson}
        />

        <SummarySection columns={summaryColumnsOf(totals.columns, isSolo)} />
      </div>
    </div>
  )
}
