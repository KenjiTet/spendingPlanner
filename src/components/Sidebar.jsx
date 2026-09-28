import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { initialOf } from '../utils/format.js'
import { loadPreference, savePreference } from '../utils/storage.js'
import PlanSwitcher from './PlanSwitcher.jsx'

const PLAN_GROUP_KEY = 'sidebar-plan-collapsed'

// Top-level menu entries, in display order
const LINKS = [
  { to: '/', label: 'Vue d’ensemble', icon: '◈', end: true },
  { to: '/depenses', label: 'Dépenses', icon: '◔' },
]

// Entries folded under "Plan"
const PLAN_LINKS = [
  { to: '/plan', label: 'Budget', icon: '☰' },
  { to: '/plans', label: 'Mes plans', icon: '▦' },
]

// Highlights the menu entry of the current page
function linkClass({ isActive }) {
  if (isActive) {
    return 'sidebar__link is-active'
  }

  return 'sidebar__link'
}

// Same, for the entries of the "Plan" group
function subLinkClass({ isActive }) {
  if (isActive) {
    return 'sidebar__link sidebar__link--sub is-active'
  }

  return 'sidebar__link sidebar__link--sub'
}

// Same, for the profile button of the footer
function profileClass({ isActive }) {
  if (isActive) {
    return 'sidebar__profile is-active'
  }

  return 'sidebar__profile'
}

// The collapsed state only hides the group on desktop, the phone bar always lists its entries
function subListClassOf(collapsed) {
  if (collapsed) {
    return 'sidebar__sublist is-collapsed'
  }

  return 'sidebar__sublist'
}

/**
 * One menu entry, icon then label
 * @param {object} props
 * @param {{ to: string, label: string, icon: string, end?: boolean }} props.link
 * @param {(state: { isActive: boolean }) => string} props.className
 */
function MenuLink({ link, className }) {
  return (
    <NavLink to={link.to} end={link.end} className={className}>
      <span className="sidebar__icon" aria-hidden="true">
        {link.icon}
      </span>
      <span>{link.label}</span>
    </NavLink>
  )
}

/**
 * Main navigation, a side column on desktop and a bottom bar on phones
 * @param {object} props
 * @param {{ id: string, name: string }[]} props.plans
 * @param {string} [props.currentPlanId]
 * @param {string} props.userName
 * @param {(id: string) => void} props.onSelectPlan
 * @param {() => void} props.onSignOut
 */
export default function Sidebar({ plans, currentPlanId, userName, onSelectPlan, onSignOut }) {
  const [collapsed, setCollapsed] = useState(() => loadPreference(PLAN_GROUP_KEY) === 'true')

  function toggleGroup() {
    setCollapsed(!collapsed)
    savePreference(PLAN_GROUP_KEY, String(!collapsed))
  }

  return (
    <aside className="sidebar">
      <PlanSwitcher plans={plans} currentPlanId={currentPlanId} onSelect={onSelectPlan} />

      <nav className="sidebar__nav" aria-label="Menu principal">
        <ul className="sidebar__list">
          {LINKS.map((link, index) => (
            <li key={`nav-${link.to}-${index}`}>
              <MenuLink link={link} className={linkClass} />
            </li>
          ))}

          <li className="sidebar__group">
            <button type="button" className="sidebar__link sidebar__toggle" aria-expanded={!collapsed} onClick={toggleGroup}>
              <span className="sidebar__icon" aria-hidden="true">
                ☰
              </span>
              <span>Plan</span>
              <span className="chevron" aria-hidden="true" />
            </button>

            <ul className={subListClassOf(collapsed)}>
              {PLAN_LINKS.map((link, index) => (
                <li key={`nav-plan-${link.to}-${index}`}>
                  <MenuLink link={link} className={subLinkClass} />
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>

      <footer className="sidebar__footer">
        <NavLink to="/profil" className={profileClass} title="Voir le profil">
          <span className="sidebar__avatar" aria-hidden="true">
            {initialOf(userName)}
          </span>
          <span className="sidebar__who">
            <span className="sidebar__user">{userName}</span>
            <span className="sidebar__eyebrow">Voir le profil</span>
          </span>
        </NavLink>

        <button type="button" className="sidebar__signout" onClick={onSignOut}>
          Déconnexion
        </button>
      </footer>
    </aside>
  )
}
