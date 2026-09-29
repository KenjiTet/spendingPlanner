import { Outlet } from 'react-router-dom'
import useSettlements from '../hooks/useSettlements.js'
import Sidebar from './Sidebar.jsx'

/**
 * Shell of the signed-in app: the sidebar stays reachable on every page
 * @param {object} props
 * @param {{ id: string, display_name: string }} props.user
 * @param {{ id: string, name: string }[]} props.plans
 * @param {{ id: string, name: string }} [props.currentPlan]
 * @param {(id: string) => void} props.onSelectPlan
 * @param {() => void} props.onSignOut
 */
export default function Layout({ user, plans, currentPlan, onSelectPlan, onSignOut }) {
  // Loaded here, so the menu badge and the plan pages share the same state
  const settlements = useSettlements(currentPlan?.id)

  return (
    <div className="layout">
      <Sidebar
        plans={plans}
        currentPlanId={currentPlan?.id}
        userName={user.display_name}
        settlements={settlements.data}
        onSelectPlan={onSelectPlan}
        onSignOut={onSignOut}
      />

      <main className="layout__main">
        <Outlet context={{ settlements }} />
      </main>
    </div>
  )
}
