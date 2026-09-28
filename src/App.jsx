import { Navigate, Route, Routes } from 'react-router-dom'
import ActivePlan from './components/ActivePlan.jsx'
import Layout from './components/Layout.jsx'
import useAuth from './hooks/useAuth.js'
import usePlans from './hooks/usePlans.js'
import DashboardPage from './pages/DashboardPage.jsx'
import ExpensesPage from './pages/ExpensesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import PlanPage from './pages/PlanPage.jsx'
import PlanPicker from './pages/PlanPicker.jsx'
import ProfilePage from './pages/ProfilePage.jsx'

// Routes the visitor through sign-in, then the app itself, always framed by the sidebar
export default function App() {
  const { user, loading, signIn, signUp, updateProfile, signOut } = useAuth()
  const {
    plans,
    templates,
    loading: plansLoading,
    currentPlan,
    selectPlan,
    createPlan,
    previewJoin,
    joinPlan,
    publishTemplate,
  } = usePlans(user?.id)

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

  return (
    <Routes>
      <Route
        element={
          <Layout user={user} plans={plans} currentPlan={currentPlan} onSelectPlan={selectPlan} onSignOut={signOut} />
        }
      >
        <Route
          path="/plans"
          element={
            <PlanPicker
              user={user}
              plans={plans}
              templates={templates}
              currentPlanId={currentPlan?.id}
              onSelect={selectPlan}
              onCreate={createPlan}
              onPreviewJoin={previewJoin}
              onJoin={joinPlan}
              onPublishTemplate={publishTemplate}
            />
          }
        />
        <Route path="/profil" element={<ProfilePage user={user} onSave={updateProfile} onSignOut={signOut} />} />

        {/* Pages working on the active plan, remounted when another plan is activated */}
        <Route element={<ActivePlan key={currentPlan?.id} user={user} currentPlan={currentPlan} />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/depenses" element={<ExpensesPage />} />
          <Route path="/plan" element={<PlanPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
