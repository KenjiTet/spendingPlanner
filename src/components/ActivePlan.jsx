import { Link, Outlet, useOutletContext } from 'react-router-dom'
import usePlan from '../hooks/usePlan.js'

/**
 * Loads the active plan once and hands it to the pages through the outlet context
 * @param {object} props
 * @param {{ id: string, show_savings: number, show_taxes: number }} props.user
 * @param {{ id: string }} props.currentPlan
 */
function OpenPlan({ user, currentPlan }) {
  const planState = usePlan(currentPlan.id)
  // Repayments between the two places, loaded by the layout
  const { settlements } = useOutletContext()
  // The place this person holds in the plan, which is what every scope is keyed by
  const mySlot = planState.plan?.people.find((person) => person.userId === user.id)

  return (
    <>
      {!!planState.error && (
        <p className="banner" role="alert">
          <span className="banner__title">{planState.error}</span>
          <button type="button" className="list__remove" onClick={planState.dismissError} aria-label="Fermer">
            ×
          </button>
        </p>
      )}

      {!planState.plan && !planState.error && <p className="section__hint">Chargement du plan…</p>}

      {!!planState.plan && (
        <Outlet
          context={{
            ...planState,
            userId: user.id,
            settlements,
            slotId: mySlot?.id,
            showSavings: !!user.show_savings,
            showTaxes: !!user.show_taxes,
            mainCurrency: user.main_currency,
          }}
        />
      )}
    </>
  )
}

/**
 * Gate of the pages working on a plan, pointing to the plans page while none is active
 * @param {object} props
 * @param {{ id: string, show_savings: number, show_taxes: number }} props.user
 * @param {{ id: string }} [props.currentPlan]
 */
export default function ActivePlan({ user, currentPlan }) {
  if (!currentPlan) {
    return (
      <section className="card empty">
        <h1 className="empty__title">Aucun plan actif</h1>
        <p className="section__hint">Créez un plan ou rejoignez celui de quelqu&rsquo;un avec son code.</p>
        <Link to="/plans" className="form__submit">
          Voir les plans
        </Link>
      </section>
    )
  }

  return <OpenPlan user={user} currentPlan={currentPlan} />
}
