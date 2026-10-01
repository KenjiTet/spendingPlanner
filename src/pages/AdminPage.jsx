import { useState } from 'react'
import ConfirmSheet from '../components/ConfirmSheet.jsx'
import StarterPlanEditor from '../components/StarterPlanEditor.jsx'
import useStarterPlans from '../hooks/useStarterPlans.js'
import { EMPTY_RANGE, rangeLabelOf, TIER_CURRENCY } from '../utils/starterPlan.js'

const MODES = [
  { id: 'solo', title: 'Seul' },
  { id: 'duo', title: 'À deux' },
]

/**
 * A fresh identifier, prefixed by the mode so the file stays readable
 * @param {string} mode
 */
function newIdOf(mode) {
  return `${mode}-${crypto.randomUUID().slice(0, 8)}`
}

/**
 * @param {string} mode
 */
function blankPlanOf(mode) {
  return { id: newIdOf(mode), mode, label: '', ranges: [EMPTY_RANGE], expenses: [], savings: [] }
}

/**
 * A copy to start a new plan from, its brackets to be changed before it can be saved
 * @param {object} plan
 */
function copyOf(plan) {
  return { ...structuredClone(plan), id: newIdOf(plan.mode), label: `${plan.label} (copie)` }
}

/**
 * Local administration of the plans proposed after signing up: solo and duo plans, each with its income brackets.
 * A saved plan is offered at once to new accounts; the server refuses any write not made from the machine itself
 */
export default function AdminPage() {
  const { plans, loading, error, savePlan, deletePlan } = useStarterPlans()
  // The plan open in the editor, with whether it exists yet
  const [editing, setEditing] = useState(undefined)
  const [deleting, setDeleting] = useState(undefined)
  const [deleteError, setDeleteError] = useState('')

  /**
   * Saves the draft and closes the editor when the server accepts it
   * @param {object} plan
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function save(plan) {
    const failure = await savePlan(plan)

    if (!failure) {
      setEditing(undefined)
    }

    return failure
  }

  async function confirmDelete() {
    const failure = await deletePlan(deleting.id)

    setDeleteError(failure ?? '')
    setDeleting(undefined)

    if (!failure) {
      setEditing(undefined)
    }
  }

  /**
   * The editor for a plan, its key resetting the draft whenever another plan is opened
   * @param {object} plan
   * @param {boolean} isNew
   */
  function editorOf(plan, isNew) {
    return (
      <StarterPlanEditor
        key={`editor-${plan.id}`}
        plan={plan}
        isNew={isNew}
        onSave={save}
        onDelete={() => setDeleting(plan)}
        onCancel={() => setEditing(undefined)}
      />
    )
  }

  if (loading) {
    return <p className="splash">Chargement…</p>
  }

  return (
    <main className="admin">
      <header className="admin__header">
        <h1 className="auth__title">Plans proposés à l&rsquo;inscription</h1>
        <p className="section__hint">
          Chaque ligne prend un pourcentage du revenu, un montant fixe en CHF ou une part du reste : les lignes « part du
          reste » se partagent, au prorata de leur valeur, ce qui reste une fois 5 % du revenu mis de côté. À deux, le
          revenu du partenaire est supposé égal à celui de la personne inscrite : une ligne commune se calcule sur le
          revenu du ménage (le double), une ligne personnelle sur celui de chacun. Un plan validé est proposé tout de
          suite aux nouveaux comptes de ce serveur.
        </p>
      </header>

      {!!error && <p className="actions__error">{error}</p>}
      {!!deleteError && <p className="actions__error">{deleteError}</p>}

      {MODES.map((mode, modeIndex) => {
        const modePlans = plans.filter((plan) => plan.mode === mode.id)

        return (
          <section key={`mode-${mode.id}-${modeIndex}`} className="admin__mode">
            <header className="plans__header">
              <h2 className="section__title">{mode.title}</h2>
              <button type="button" className="form__submit" disabled={!!editing} onClick={() => setEditing({ plan: blankPlanOf(mode.id), isNew: true })}>
                Nouveau plan
              </button>
            </header>

            {editing?.isNew && editing.plan.mode === mode.id && editorOf(editing.plan, true)}

            <ul className="admin__plans">
              {modePlans.map((plan, planIndex) => (
                <li key={`plan-${plan.id}-${planIndex}`}>
                  {editing?.plan.id === plan.id && editorOf(plan, false)}

                  {editing?.plan.id !== plan.id && (
                    <article className="card admin__plan">
                      <header className="admin__plan-header">
                        <h3 className="admin__subtitle">{plan.label}</h3>
                      </header>

                      <ul className="admin__ranges">
                        {plan.ranges.map((range, rangeIndex) => (
                          <li key={`range-${plan.id}-${rangeIndex}`} className="scope__badge">
                            {rangeLabelOf(range, TIER_CURRENCY)} · type {range.typical}
                          </li>
                        ))}
                      </ul>

                      <footer className="actions__buttons">
                        <button type="button" className="admin__secondary" disabled={!!editing} onClick={() => setEditing({ plan, isNew: false })}>
                          Modifier
                        </button>
                        <button type="button" className="admin__secondary" disabled={!!editing} onClick={() => setEditing({ plan: copyOf(plan), isNew: true })}>
                          Dupliquer
                        </button>
                      </footer>
                    </article>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      <ConfirmSheet
        open={!!deleting}
        title="Supprimer ce plan ?"
        message={`« ${deleting?.label ?? ''} » ne sera plus proposé aux nouveaux comptes.`}
        confirmLabel="Supprimer"
        onConfirm={confirmDelete}
        onClose={() => setDeleting(undefined)}
      />
    </main>
  )
}
