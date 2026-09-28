import ProfileCard from '../components/ProfileCard.jsx'

/**
 * The account's own figures, feeding the income of every plan it belongs to
 * @param {object} props
 * @param {{ username: string, display_name: string, net_monthly: number }} props.user
 * @param {(displayName: string, netMonthly: string) => Promise<string | undefined>} props.onSave
 * @param {() => void} props.onSignOut
 */
export default function ProfilePage({ user, onSave, onSignOut }) {
  return (
    <section className="profile">
      <header className="profile__header">
        <h1 className="plans__title">Profil</h1>
        <span className="section__hint">@{user.username}</span>
      </header>

      <ProfileCard user={user} onSave={onSave} />

      {/* The sidebar footer is hidden on phones, so signing out is also offered here */}
      <button type="button" className="actions__reset profile__signout" onClick={onSignOut}>
        Se déconnecter
      </button>
    </section>
  )
}
