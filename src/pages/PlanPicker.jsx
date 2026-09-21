import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Adds an existing account to a plan by email
 * @param {object} props
 * @param {string} props.planId
 * @param {(planId: string, email: string) => Promise<string | undefined>} props.onAddMember
 */
function AddMemberForm({ planId, onAddMember }) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    const error = await onAddMember(planId, email.trim())

    setMessage(error ?? `${email.trim()} a été ajouté au plan.`)

    if (!error) {
      setEmail('')
    }
  }

  return (
    <form className="plan-card__form" onSubmit={handleSubmit}>
      <label className="form__field form__field--grow">
        <span>Ajouter un membre (email de son compte)</span>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>

      <button type="submit" className="form__submit">
        Ajouter
      </button>

      {!!message && <p className="section__hint">{message}</p>}
    </form>
  )
}

/**
 * Lists the plans of the signed-in person, opens one, creates new ones
 * @param {object} props
 * @param {string} props.userId
 * @param {{ id: string, name: string, created_by: string }[]} props.plans
 * @param {string} [props.currentPlanId]
 * @param {(id: string) => void} props.onSelect
 * @param {(name: string) => Promise<string | undefined>} props.onCreate
 * @param {(planId: string, email: string) => Promise<string | undefined>} props.onAddMember
 * @param {() => void} props.onSignOut
 */
export default function PlanPicker({ userId, plans, currentPlanId, onSelect, onCreate, onAddMember, onSignOut }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function open(id) {
    onSelect(id)
    navigate('/depenses')
  }

  async function handleCreate(event) {
    event.preventDefault()

    const failure = await onCreate(name.trim())

    setError(failure ?? '')

    if (!failure) {
      navigate('/plan')
    }
  }

  return (
    <main className="plans">
      <header className="plans__header">
        <h1 className="plans__title">Vos plans</h1>
        <button type="button" className="actions__reset" onClick={onSignOut}>
          Se déconnecter
        </button>
      </header>

      <ul className="plans__list">
        {plans.map((plan, index) => (
          <li key={`plan-${plan.id}-${index}`}>
            <article className="card plan-card">
              <header className="plan-card__header">
                <h2 className="plan-card__title">{plan.name}</h2>
                <button type="button" className="form__submit" onClick={() => open(plan.id)}>
                  {plan.id === currentPlanId && 'Continuer'}
                  {plan.id !== currentPlanId && 'Ouvrir'}
                </button>
              </header>

              {plan.created_by === userId && <AddMemberForm planId={plan.id} onAddMember={onAddMember} />}
            </article>
          </li>
        ))}
      </ul>

      <form className="card plans__create" onSubmit={handleCreate}>
        <label className="form__field form__field--grow">
          <span>Nouveau plan</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Budget 2026" required />
        </label>

        <button type="submit" className="form__submit">
          Créer
        </button>

        {!!error && <p className="actions__error">{error}</p>}
      </form>
    </main>
  )
}
