import ProfileCard from '../components/ProfileCard.jsx'
import BudgetSectionsCard from '../components/BudgetSectionsCard.jsx'
import Icon from '../components/Icon.jsx'
import PlansSection from '../components/PlansSection.jsx'

/**
 * The account's own figures and settings, its plans and the account actions
 * @param {object} props
 * @param {{ id: string, username: string, display_name: string, net_monthly: number, main_currency: string, show_savings: number, show_taxes: number }} props.user
 * @param {(displayName: string, netMonthly: string, mainCurrency: string) => Promise<string | undefined>} props.onSave
 * @param {(preferences: { show_savings: boolean, show_taxes: boolean }) => Promise<string | undefined>} props.onSavePreferences
 * @param {object[]} props.plans
 * @param {{ id: string, name: string }[]} props.templates
 * @param {string} [props.currentPlanId]
 * @param {(id: string) => void} props.onSelectPlan
 * @param {(name: string, slotCount: number, templateId?: string, source?: object) => Promise<string | undefined>} props.onCreatePlan
 * @param {(code: string) => Promise<{ data?: object, error?: { message: string } }>} props.onPreviewJoin
 * @param {(code: string, slotId: string) => Promise<string | undefined>} props.onJoinPlan
 * @param {(planId: string, name: string) => Promise<string | undefined>} props.onRenamePlan
 * @param {(planId: string, isTemplate: boolean) => Promise<string | undefined>} props.onPublishTemplate
 * @param {(planId: string) => Promise<string | undefined>} props.onExportPlan
 * @param {(planId: string) => Promise<string | undefined>} props.onDeletePlan
 * @param {() => void} props.onReplayTutorial
 * @param {() => void} props.onSignOut
 */
export default function ProfilePage({
  user,
  onSave,
  onSavePreferences,
  plans,
  templates,
  currentPlanId,
  onSelectPlan,
  onCreatePlan,
  onPreviewJoin,
  onJoinPlan,
  onRenamePlan,
  onPublishTemplate,
  onExportPlan,
  onDeletePlan,
  onReplayTutorial,
  onSignOut,
}) {
  return (
    <section className="profile">
      <div className="profile__grid">
        <div className="profile__column">
          <ProfileCard user={user} onSave={onSave} />
          <BudgetSectionsCard user={user} onSave={onSavePreferences} />
        </div>

        <div className="profile__column">
          <PlansSection
            user={user}
            plans={plans}
            templates={templates}
            currentPlanId={currentPlanId}
            onSelect={onSelectPlan}
            onCreate={onCreatePlan}
            onPreviewJoin={onPreviewJoin}
            onJoin={onJoinPlan}
            onRename={onRenamePlan}
            onPublishTemplate={onPublishTemplate}
            onExport={onExportPlan}
            onDelete={onDeletePlan}
          />

          <section className="card profile__panel">
            <h2 className="plan-card__title">Compte</h2>

            <ul className="profile__menu">
              <li>
                <button type="button" className="profile__action" onClick={onReplayTutorial} data-tour="tour-replay">
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
