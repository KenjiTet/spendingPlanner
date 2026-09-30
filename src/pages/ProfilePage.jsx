import { Link } from 'react-router-dom'
import ProfileCard from '../components/ProfileCard.jsx'
import BudgetSectionsCard from '../components/BudgetSectionsCard.jsx'
import Icon from '../components/Icon.jsx'

// The active plan is tinted so it stands out in the list
function planItemClassOf(isCurrent) {
  if (isCurrent) {
    return 'profile__plan is-active'
  }

  return 'profile__plan'
}

// Status shown under a plan's name: active first, then a free place waiting for someone
function planStatusOf(plan, isCurrent) {
  if (isCurrent) {
    return 'Plan actif'
  }

  if (!!plan.free_slots) {
    return 'Une place libre'
  }

  return 'Activer ce plan'
}

/**
 * The account's own figures and settings, its plans and the account actions
 * @param {object} props
 * @param {{ username: string, display_name: string, net_monthly: number, main_currency: string, show_savings: number, show_taxes: number }} props.user
 * @param {{ id: string, name: string, is_template: number, free_slots: number }[]} props.plans
 * @param {string} [props.currentPlanId]
 * @param {(id: string) => void} props.onSelectPlan
 * @param {(displayName: string, netMonthly: string, mainCurrency: string) => Promise<string | undefined>} props.onSave
 * @param {(preferences: { show_savings: boolean, show_taxes: boolean }) => Promise<string | undefined>} props.onSavePreferences
 * @param {() => void} props.onReplayTutorial
 * @param {() => void} props.onSignOut
 */
export default function ProfilePage({ user, plans, currentPlanId, onSelectPlan, onSave, onSavePreferences, onReplayTutorial, onSignOut }) {
  return (
    <section className="profile">
      <div className="profile__grid">
        <div className="profile__column">
          <ProfileCard user={user} onSave={onSave} />
          <BudgetSectionsCard user={user} onSave={onSavePreferences} />
        </div>

        <div className="profile__column">
          <section className="card profile__panel">
            <header className="profile__panel-header">
              <h2 className="plan-card__title">Mes plans</h2>
              <Link to="/plans" className="profile__more">
                <span>Gérer</span>
                <Icon name="arrow-right" className="icon" />
              </Link>
            </header>

            {!plans.length && <p className="section__hint">Vous ne participez encore à aucun plan.</p>}

            {!!plans.length && (
              <ul className="profile__menu">
                {plans.map((plan, index) => {
                  const isCurrent = plan.id === currentPlanId

                  return (
                    <li key={`profile-plan-${plan.id}-${index}`}>
                      <button
                        type="button"
                        className={planItemClassOf(isCurrent)}
                        aria-pressed={isCurrent}
                        onClick={() => onSelectPlan(plan.id)}
                      >
                        <Icon name="layers" className="icon profile__menu-icon" />
                        <span className="profile__menu-text">
                          <span className="profile__menu-label">{plan.name}</span>
                          <span className="section__hint">{planStatusOf(plan, isCurrent)}</span>
                        </span>
                        {!!plan.is_template && <span className="scope__badge">Modèle</span>}
                        {isCurrent && <Icon name="check" className="icon profile__check" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="card profile__panel">
            <h2 className="plan-card__title">Compte</h2>

            <ul className="profile__menu">
              <li>
                <button type="button" className="profile__action" onClick={onReplayTutorial}>
                  <Icon name="history" className="icon profile__menu-icon" />
                  <span className="profile__menu-label">Revoir le tutoriel</span>
                  <Icon name="arrow-right" className="icon profile__chevron" />
                </button>
              </li>
              <li>
                {/* The sidebar footer is hidden on phones, so signing out is also offered here */}
                <button type="button" className="profile__action profile__action--danger" onClick={onSignOut}>
                  <Icon name="log-out" className="icon profile__menu-icon" />
                  <span className="profile__menu-label">Se déconnecter</span>
                </button>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </section>
  )
}
