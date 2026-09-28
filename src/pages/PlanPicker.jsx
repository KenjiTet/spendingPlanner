import { useNavigate } from 'react-router-dom'
import CreatePlanForm from '../components/CreatePlanForm.jsx'
import JoinPlanForm from '../components/JoinPlanForm.jsx'
import PlanCard from '../components/PlanCard.jsx'

/**
 * The plans the account holds a place in, which one is active, and the ways into a new one
 * @param {object} props
 * @param {{ id: string }} props.user
 * @param {object[]} props.plans
 * @param {{ id: string, name: string }[]} props.templates
 * @param {string} [props.currentPlanId]
 * @param {(id: string) => void} props.onSelect
 * @param {(name: string, slotCount: number, templateId?: string) => Promise<string | undefined>} props.onCreate
 * @param {(code: string) => Promise<{ data?: object, error?: { message: string } }>} props.onPreviewJoin
 * @param {(code: string, slotId: string) => Promise<string | undefined>} props.onJoin
 * @param {(planId: string, isTemplate: boolean) => Promise<string | undefined>} props.onPublishTemplate
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
}) {
  const navigate = useNavigate()

  // Activating a plan leads back to its overview
  function activate(id) {
    onSelect(id)
    navigate('/')
  }

  return (
    <section className="plans">
      <h1 className="plans__title">Vos plans</h1>

      {!plans.length && <p className="section__hint">Vous ne participez encore à aucun plan.</p>}

      <ul className="plans__list">
        {plans.map((plan, index) => (
          <li key={`plan-${plan.id}-${index}`}>
            <PlanCard
              plan={plan}
              isCurrent={plan.id === currentPlanId}
              isCreator={plan.created_by === user.id}
              onActivate={activate}
              onPublishTemplate={onPublishTemplate}
            />
          </li>
        ))}
      </ul>

      <CreatePlanForm templates={templates} onCreate={onCreate} onCreated={() => navigate('/plan')} />

      <JoinPlanForm onPreview={onPreviewJoin} onJoin={onJoin} onJoined={() => navigate('/')} />
    </section>
  )
}
