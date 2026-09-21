import { Outlet } from 'react-router-dom'
import usePlan from '../hooks/usePlan.js'
import Sidebar from './Sidebar.jsx'

/**
 * Shell of the signed-in app: loads the open plan once and hands it to the pages through the outlet context
 * @param {object} props
 * @param {{ id: string, display_name: string, email: string }} props.user
 * @param {{ id: string, name: string }} props.currentPlan
 * @param {() => void} props.onSignOut
 */
export default function Layout({ user, currentPlan, onSignOut }) {
  const planState = usePlan(currentPlan.id)
  const userName = user.display_name ?? user.email

  return (
    <div className="layout">
      <Sidebar planName={currentPlan.name} userName={userName} onSignOut={onSignOut} />

      <main className="layout__main">
        {!!planState.error && (
          <p className="banner" role="alert">
            <span className="banner__title">{planState.error}</span>
            <button type="button" className="list__remove" onClick={planState.dismissError} aria-label="Fermer">
              ×
            </button>
          </p>
        )}

        {!planState.plan && !planState.error && <p className="section__hint">Chargement du plan…</p>}

        {!!planState.plan && <Outlet context={{ ...planState, userId: user.id }} />}
      </main>
    </div>
  )
}
