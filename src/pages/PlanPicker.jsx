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

  return (
    <section className="plans">
      {!plans.length && <p className="section__hint">Vous ne participez encore à aucun plan.</p>}

      <ul className="plans__list">
        {plans.map((plan, index) => (
          <li key={`plan-${plan.id}-${index}`}>
            <PlanCard
              plan={plan}
              isCurrent={plan.id === currentPlanId}
              isCreator={plan.created_by === user.id}
              onActivate={activate}
              onEdit={edit}
              onPublishTemplate={onPublishTemplate}
              onExport={onExport}
              onDelete={onDelete}
            />
          </li>
        ))}
      </ul>

      <button type="button" className="plans__new" onClick={() => setCreating(true)}>
        <Icon name="plus" className="icon" />
        <span>Nouveau plan</span>
      </button>

      <JoinPlanForm onPreview={onPreviewJoin} onJoin={onJoin} onJoined={() => navigate('/')} />

      <Sheet open={creating} title="Nouveau plan" onClose={() => setCreating(false)}>
        <CreatePlanForm templates={templates} onCreate={onCreate} onCreated={() => navigate('/plan')} />
      </Sheet>
    </section>
  )
}
