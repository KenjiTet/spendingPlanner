import { Link } from 'react-router-dom'
import ProfileCard from '../components/ProfileCard.jsx'
import BudgetSectionsCard from '../components/BudgetSectionsCard.jsx'
import Icon from '../components/Icon.jsx'

/**
 * The account's own figures, feeding the income of every plan it belongs to
 * @param {object} props
 * @param {{ username: string, display_name: string, net_monthly: number, show_savings: number, show_taxes: number }} props.user
 * @param {(displayName: string, netMonthly: string) => Promise<string | undefined>} props.onSave
 * @param {(preferences: { show_savings: boolean, show_taxes: boolean }) => Promise<string | undefined>} props.onSavePreferences
 * @param {() => void} props.onReplayTutorial
 * @param {() => void} props.onSignOut
 */
export default function ProfilePage({ user, onSave, onSavePreferences, onReplayTutorial, onSignOut }) {
  return (
    <section className="profile">
      <p className="section__hint profile__header">@{user.username}</p>

      {/* On phones, "Mes plans" gives its cell of the bar to the repayments */}
      <Link to="/plans" className="actions__reset profile__tour">
        <Icon name="layers" className="icon" />
        <span>Mes plans</span>
      </Link>

      <ProfileCard user={user} onSave={onSave} />
      <BudgetSectionsCard user={user} onSave={onSavePreferences} />

      <button type="button" className="actions__reset profile__tour" onClick={onReplayTutorial}>
        <Icon name="history" className="icon" />
        <span>Revoir le tutoriel</span>
      </button>

      {/* The sidebar footer is hidden on phones, so signing out is also offered here */}
      <button type="button" className="actions__reset profile__signout" onClick={onSignOut}>
        Se déconnecter
      </button>
    </section>
  )
}
