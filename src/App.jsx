import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import useAuth from './hooks/useAuth.js'
import usePlans from './hooks/usePlans.js'
import ExpensesPage from './pages/ExpensesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import PlanPage from './pages/PlanPage.jsx'
import PlanPicker from './pages/PlanPicker.jsx'

// Routes the visitor through sign-in, plan choice, then the app itself
export default function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  const { plans, loading: plansLoading, currentPlan, selectPlan, createPlan, addMember } = usePlans(user?.id)

  if (loading || (!!user && plansLoading)) {
    return <p className="splash">Chargement…</p>
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage onSignIn={signIn} onSignUp={signUp} />} />
      </Routes>
    )
  }

  const picker = (
    <PlanPicker
      userId={user.id}
      plans={plans}
      currentPlanId={currentPlan?.id}
      onSelect={selectPlan}
      onCreate={createPlan}
      onAddMember={addMember}
      onSignOut={signOut}
    />
  )

  if (!currentPlan) {
    return (
      <Routes>
        <Route path="/plans" element={picker} />
        <Route path="*" element={<Navigate to="/plans" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/plans" element={picker} />
      <Route element={<Layout key={currentPlan.id} user={user} currentPlan={currentPlan} onSignOut={signOut} />}>
        <Route path="/depenses" element={<ExpensesPage />} />
        <Route path="/plan" element={<PlanPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/depenses" replace />} />
    </Routes>
  )
}
