import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CreatePlanForm from '../components/CreatePlanForm.jsx'
import Icon from '../components/Icon.jsx'
import JoinPlanForm from '../components/JoinPlanForm.jsx'
import PlanCard from '../components/PlanCard.jsx'
import Sheet from '../components/Sheet.jsx'

/**
 * The plans the account holds a place in, which one is active, and the ways into a new one
 * @param {object} props
 * @param {{ id: string }} props.user
 * @param {object[]} props.plans
 * @param {{ id: string, name: string }[]} props.templates
 * @param {string} [props.currentPlanId]
 * @param {(id: string) => void} props.onSelect
 * @param {(name: string, slotCount: number, templateId?: string, source?: object) => Promise<string | undefined>} props.onCreate
 * @param {(code: string) => Promise<{ data?: object, error?: { message: string } }>} props.onPreviewJoin
 * @param {(code: string, slotId: string) => Promise<string | undefined>} props.onJoin
 * @param {(planId: string, isTemplate: boolean) => Promise<string | undefined>} props.onPublishTemplate
 * @param {(planId: string) => Promise<string | undefined>} props.onExport
 * @param {(planId: string) => Promise<string | undefined>} props.onDelete
 */
export default function PlanPicker({
  user,
  plans,
  templates,
  currentPlanId,
  onSelect,
  onCreate,
  onPreviewJoin,
  onJoin,
  onPublishTemplate,
  onExport,
  onDelete,
}) {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  // The active plan gets its own block, the others are listed below it
  const currentPlan = plans.find((plan) => plan.id === currentPlanId)
  const otherPlans = plans.filter((plan) => plan.id !== currentPlanId)

  // Activating a plan leads back to its overview
  function activate(id) {
    onSelect(id)
    navigate('/')
  }

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
        onActivate={activate}
        onEdit={edit}
        onPublishTemplate={onPublishTemplate}
        onExport={onExport}
        onDelete={onDelete}
      />
    )
  }

  return (
    <section className="plans">
      <header className="plans__header">
        <div className="plans__intro">
          <h1 className="plans__title">Mes plans</h1>
          <p className="section__hint">
            Le plan actif est celui affiché dans l&rsquo;aperçu, les dépenses et le budget.
          </p>
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

      {!plans.length && <p className="section__hint">Vous ne participez encore à aucun plan.</p>}

      {!!currentPlan && (
        <section className="plans__group">
          <h2 className="plans__group-title">Plan actif</h2>
          {renderCard(currentPlan, true)}
        </section>
      )}

      {!!otherPlans.length && (
        <section className="plans__group">
          <h2 className="plans__group-title">Autres plans</h2>

          <ul className="plans__list">
            {otherPlans.map((plan, index) => (
              <li key={`plan-${plan.id}-${index}`}>{renderCard(plan, false)}</li>
            ))}
          </ul>
        </section>
      )}

      <Sheet open={creating} title="Nouveau plan" onClose={() => setCreating(false)}>
        <CreatePlanForm templates={templates} onCreate={onCreate} onCreated={() => navigate('/plan')} />
      </Sheet>

      <Sheet
        open={joining}
        title="Rejoindre un plan"
        description="Saisissez le code de partage reçu d’un autre membre du plan."
        onClose={() => setJoining(false)}>
        <JoinPlanForm onPreview={onPreviewJoin} onJoin={onJoin} onJoined={() => navigate('/')} />
      </Sheet>
    </section>
  )
}
