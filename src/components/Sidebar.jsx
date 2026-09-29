import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { initialOf } from '../utils/format.js'
import { loadPreference, savePreference } from '../utils/storage.js'
import Icon from './Icon.jsx'
import PlanSwitcher from './PlanSwitcher.jsx'

const PLAN_GROUP_KEY = 'sidebar-plan-collapsed'

// Top-level menu entries, in display order; the short label fits a cell of the phone bar, the featured one sits at its centre
const LINKS = [
  { to: '/', label: 'Vue d’ensemble', short: 'Vue d’ensemble', icon: 'dashboard', end: true },
  { to: '/depenses', label: 'Dépenses', short: 'Dépenses', icon: 'receipt', featured: true },
]

// Entries folded under "Plan"
const PLAN_LINKS = [
  { to: '/plan', label: 'Budget', short: 'Budget', icon: 'wallet' },
  { to: '/plans', label: 'Mes plans', short: 'Plans', icon: 'layers' },
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

// The featured entry is moved to the centre of the phone bar
function itemClassOf(link) {
  if (link.featured) {
    return 'sidebar__item--featured'
  }

  return undefined
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
 * @param {{ to: string, label: string, short: string, icon: string, end?: boolean, featured?: boolean }} props.link
 * @param {(state: { isActive: boolean }) => string} props.className
 */
function MenuLink({ link, className }) {
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
            <li key={`nav-${link.to}-${index}`} className={itemClassOf(link)}>
              <MenuLink link={link} className={linkClass} />
            </li>
          ))}

          <li className="sidebar__group">
            <button type="button" className="sidebar__link sidebar__toggle" aria-expanded={!collapsed} onClick={toggleGroup}>
              <Icon name="clipboard" className="sidebar__icon" />
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
