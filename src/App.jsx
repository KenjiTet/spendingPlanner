import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ActivePlan from './components/ActivePlan.jsx'
import Layout from './components/Layout.jsx'
import Tour from './components/Tour.jsx'
import useAuth from './hooks/useAuth.js'
import usePlans from './hooks/usePlans.js'
import DashboardPage from './pages/DashboardPage.jsx'
import ExpensesPage from './pages/ExpensesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import PlanPage from './pages/PlanPage.jsx'
import PlanPicker from './pages/PlanPicker.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SettlementsPage from './pages/SettlementsPage.jsx'

// Routes the visitor through sign-in, then the app itself, always framed by the sidebar
export default function App() {
  const { user, loading, signIn, signUp, updateProfile, updatePreferences, completeTutorial, signOut } = useAuth()
  // The tour replayed from the profile; a new account sees it until it is finished or skipped
  const [replaying, setReplaying] = useState(false)
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
    exportPlan,
    deletePlan,
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

  /**
   * Fills the profile from the onboarding answers, then creates the starter plan, the creator's place reading that income
   * @param {{ firstName: string, income: number, currency: string }} profile
   * @param {object} plan - in the JSON plan shape
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function finishOnboarding(profile, plan) {
    const failure = await updateProfile(profile.firstName, profile.income, profile.currency)

    if (failure) {
      return failure
    }

    return createPlan(plan.name, plan.people.length, undefined, plan)
  }

  /**
   * Same, the partner's plan being joined instead, the place taking a copy of that income
   * @param {{ firstName: string, income: number, currency: string }} profile
   * @param {string} code
   * @param {string} slotId
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function joinFromOnboarding(profile, code, slotId) {
    const failure = await updateProfile(profile.firstName, profile.income, profile.currency)

    if (failure) {
      return failure
    }

    return joinPlan(code, slotId)
  }

  function closeTour() {
    setReplaying(false)

    if (!user.tutorial_done) {
      completeTutorial()
    }
  }

  // A new account answers the onboarding before reaching the app, which ends by creating its first plan
  if (!user.tutorial_done && !plans.length) {
    return <OnboardingPage user={user} onComplete={finishOnboarding} onPreviewJoin={previewJoin} onJoin={joinFromOnboarding} />
  }

  return (
    <>
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
                onExport={exportPlan}
                onDelete={deletePlan}
              />
            }
          />
          <Route
            path="/profil"
            element={
              <ProfilePage
                user={user}
                plans={plans}
                currentPlanId={currentPlan?.id}
                onSelectPlan={selectPlan}
                onSave={updateProfile}
                onSavePreferences={updatePreferences}
                onReplayTutorial={() => setReplaying(true)}
                onSignOut={signOut}
              />
            }
          />

          {/* Pages working on the active plan, remounted when another plan is activated */}
          <Route element={<ActivePlan key={currentPlan?.id} user={user} currentPlan={currentPlan} />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/depenses" element={<ExpensesPage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/remboursements" element={<SettlementsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {(replaying || !user.tutorial_done) && <Tour isDuo={currentPlan?.slot_count > 1} canInvite={!!currentPlan?.free_slots} onClose={closeTour} />}
    </>
  )
}
