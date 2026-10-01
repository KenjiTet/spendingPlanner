import { NavLink } from 'react-router-dom'
import { initialOf } from '../utils/format.js'
import Icon from './Icon.jsx'
import PlanSwitcher from './PlanSwitcher.jsx'

const SETTLEMENTS_LINK = { to: '/remboursements', label: 'Remboursements', short: 'Rembours.', icon: 'transfer' }

// Menu entries, in display order; the short label fits a cell of the phone bar, where the featured one sits at the
// centre and the trailing one after it, the repayments then taking the cell before the "+"
const LINKS = [
  { to: '/', label: 'Vue d’ensemble', short: 'Vue d’ensemble', icon: 'dashboard', end: true },
  { to: '/depenses', label: 'Dépenses', short: 'Dépenses', icon: 'receipt', featured: true },
  { to: '/plan', label: 'Budget', short: 'Budget', icon: 'wallet', trailing: true },
  SETTLEMENTS_LINK,
]

// Highlights the menu entry of the current page
function linkClass({ isActive }) {
  if (isActive) {
    return 'sidebar__link is-active'
  }

  return 'sidebar__link'
}

// Same, for the profile button of the footer
function profileClass({ isActive }) {
  if (isActive) {
    return 'sidebar__profile is-active'
  }

  return 'sidebar__profile'
}

// The featured entry is moved to the centre of the phone bar, the trailing one right after it
function itemClassOf(link) {
  if (link.featured) {
    return 'sidebar__item--featured'
  }

  if (link.trailing) {
    return 'sidebar__item--trailing'
  }

  return undefined
}

/**
 * One menu entry, icon then label
 * @param {object} props
 * @param {{ to: string, label: string, short: string, icon: string, end?: boolean, featured?: boolean, trailing?: boolean }} props.link
 * @param {(state: { isActive: boolean }) => string} props.className
 * @param {boolean} [props.badge] - an action awaits the viewer behind this entry
 */
function MenuLink({ link, className, badge }) {
  return (
    <NavLink to={link.to} end={link.end} className={className} aria-label={link.label}>
      <Icon name={link.icon} className="sidebar__icon" />
      {/* The featured entry swaps its icon for a green "+" button in the phone bar */}
      {link.featured && (
        <span className="sidebar__fab" aria-hidden="true">
          <Icon name="plus" className="sidebar__icon" />
        </span>
      )}
      <span className="sidebar__label">{link.label}</span>
      {badge && <span className="sidebar__badge" aria-label="Action en attente" />}
      <span className="sidebar__tab" aria-hidden="true">
        {link.short}
      </span>
    </NavLink>
  )
}

/**
 * Main navigation, a side column on desktop and a bottom bar on phones
 * @param {object} props
 * @param {{ id: string, name: string }[]} props.plans
 * @param {string} [props.currentPlanId]
 * @param {string} props.userName
 * @param {{ action?: string }} [props.settlements] - repayments of the active plan, for the badge
 * @param {(id: string) => void} props.onSelectPlan
 * @param {() => void} props.onSignOut
 */
export default function Sidebar({ plans, currentPlanId, userName, settlements, onSelectPlan, onSignOut }) {
  const hasAction = !!settlements?.action

  return (
    <aside className="sidebar">
      <PlanSwitcher plans={plans} currentPlanId={currentPlanId} onSelect={onSelectPlan} />

      <nav className="sidebar__nav" aria-label="Menu principal">
        <ul className="sidebar__list">
          {LINKS.map((link, index) => (
            <li key={`nav-${link.to}-${index}`} className={itemClassOf(link)}>
              <MenuLink link={link} className={linkClass} badge={hasAction && link === SETTLEMENTS_LINK} />
            </li>
          ))}
        </ul>
      </nav>

      <footer className="sidebar__footer">
        <NavLink to="/profil" className={profileClass} title="Voir le profil">
          <span className="sidebar__avatar" aria-hidden="true">
            {initialOf(userName)}
          </span>
          {/* The phone bar shows a plain icon, like the other cells */}
          <Icon name="user" className="sidebar__icon sidebar__profile-icon" />
          <span className="sidebar__who">
            <span className="sidebar__user">{userName}</span>
            <span className="sidebar__eyebrow">Voir le profil</span>
          </span>
          {/* The phone bar names every cell, the profile included */}
          <span className="sidebar__tab" aria-hidden="true">
            Profil
          </span>
        </NavLink>

        <button type="button" className="sidebar__signout" onClick={onSignOut}>
          Déconnexion
        </button>
      </footer>
    </aside>
  )
}
