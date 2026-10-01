import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CreatePlanForm from './CreatePlanForm.jsx'
import Icon from './Icon.jsx'
import JoinPlanForm from './JoinPlanForm.jsx'
import PlanCard from './PlanCard.jsx'
import Sheet from './Sheet.jsx'

/**
 * The plans the account holds a place in, which one is active, and the ways into a new one
 * @param {object} props
 * @param {{ id: string }} props.user
 * @param {object[]} props.plans
 * @param {string} [props.currentPlanId]
 * @param {(id: string) => void} props.onSelect
 * @param {(name: string, slotCount: number, source?: object) => Promise<string | undefined>} props.onCreate
 * @param {(code: string) => Promise<{ data?: object, error?: { message: string } }>} props.onPreviewJoin
 * @param {(code: string, slotId: string) => Promise<string | undefined>} props.onJoin
 * @param {(planId: string, name: string) => Promise<string | undefined>} props.onRename
 * @param {(planId: string) => Promise<string | undefined>} props.onExport
 * @param {(planId: string) => Promise<string | undefined>} props.onDelete
 */
export default function PlansSection({
  user,
  plans,
  currentPlanId,
  onSelect,
  onCreate,
  onPreviewJoin,
  onJoin,
  onRename,
  onExport,
  onDelete,
}) {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  // The active plan comes first, the others below it
  const currentPlan = plans.find((plan) => plan.id === currentPlanId)
  const otherPlans = plans.filter((plan) => plan.id !== currentPlanId)

  // Editing a plan makes it the active one and opens its budget
  function edit(id) {
    onSelect(id)
    navigate('/plan')
  }

  // Every card shares the same callbacks, only the plan and its status change
  function renderCard(plan, isCurrent) {
    return (
      <PlanCard
        plan={plan}
        isCurrent={isCurrent}
        isCreator={plan.created_by === user.id}
        onActivate={onSelect}
        onEdit={edit}
        onRename={onRename}
        onExport={onExport}
        onDelete={onDelete}
      />
    )
  }

  return (
    <section className="card plans">
      <header className="plans__header" data-tour="profile-plans">
        <div className="plans__intro">
          <h2 className="profile__title">Mes plans</h2>
          <p className="section__hint">Le plan actif est celui affiché dans l&rsquo;aperçu, les dépenses et le budget.</p>
        </div>

        <div className="plans__toolbar">
          <button type="button" className="plans__action" onClick={() => setJoining(true)}>
            <Icon name="user-plus" className="icon" />
            <span>Rejoindre</span>
          </button>

          <button type="button" className="plans__action plans__action--primary" onClick={() => setCreating(true)}>
            <Icon name="plus" className="icon" />
            <span>Nouveau plan</span>
          </button>
        </div>
      </header>

      {!plans.length && (
        <section className="plans__group">
          <p className="section__hint">Vous ne participez encore à aucun plan.</p>
        </section>
      )}

      {!!currentPlan && (
        <section className="plans__group">
          <h3 className="plans__group-title">Plan actif</h3>
          {renderCard(currentPlan, true)}
        </section>
      )}

      {!!otherPlans.length && (
        <section className="plans__group">
          <h3 className="plans__group-title">Autres plans</h3>

          <ul className="plans__list">
            {otherPlans.map((plan, index) => (
              <li key={`plan-${plan.id}-${index}`}>{renderCard(plan, false)}</li>
            ))}
          </ul>
        </section>
      )}

      <Sheet open={creating} title="Nouveau plan" onClose={() => setCreating(false)}>
        <CreatePlanForm onCreate={onCreate} onCreated={() => navigate('/plan')} />
      </Sheet>

      <Sheet
        open={joining}
        title="Rejoindre un plan"
        description="Saisissez le code pour rejoindre le plan, reçu d’un autre membre."
        onClose={() => setJoining(false)}>
        <JoinPlanForm onPreview={onPreviewJoin} onJoin={onJoin} onJoined={() => navigate('/')} />
      </Sheet>
    </section>
  )
}
