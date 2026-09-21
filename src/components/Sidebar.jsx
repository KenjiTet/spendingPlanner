import { Link, NavLink } from 'react-router-dom'

// Menu entries of the app, in display order
const LINKS = [
  { to: '/depenses', label: 'Dépenses', icon: '◔' },
  { to: '/plan', label: 'Plan', icon: '☰' },
]

// Highlights the menu entry of the current page
function linkClass({ isActive }) {
  if (isActive) {
    return 'sidebar__link is-active'
  }

  return 'sidebar__link'
}

/**
 * Main navigation, a side column on desktop and a bottom bar on phones
 * @param {object} props
 * @param {string} props.planName
 * @param {string} props.userName
 * @param {() => void} props.onSignOut
 */
export default function Sidebar({ planName, userName, onSignOut }) {
  return (
    <aside className="sidebar">
      <Link to="/plans" className="sidebar__plan" title="Changer de plan">
        <span className="sidebar__eyebrow">Plan</span>
        <span className="sidebar__plan-name">{planName}</span>
      </Link>

      <nav className="sidebar__nav" aria-label="Menu principal">
        {LINKS.map((link, index) => (
          <NavLink key={`nav-${link.to}-${index}`} to={link.to} className={linkClass}>
            <span className="sidebar__icon" aria-hidden="true">
              {link.icon}
            </span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <footer className="sidebar__footer">
        <span className="sidebar__user">{userName}</span>
        <button type="button" className="sidebar__signout" onClick={onSignOut}>
          Déconnexion
        </button>
      </footer>
    </aside>
  )
}
