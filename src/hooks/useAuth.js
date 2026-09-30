import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { createExamplePlan, EXAMPLE_INCOME } from '../lib/planImport.js'
import { setMainCurrency } from '../utils/format.js'

// Session of the signed-in person, held by the server in an http-only cookie
export default function useAuth() {
  const [user, setUser] = useState(undefined)
  const [loading, setLoading] = useState(true)

  // The amounts switch to the account's currency before anything renders with it
  function applyUser(next) {
    setMainCurrency(next?.main_currency)
    setUser(next)
  }

  useEffect(() => {
    api.get('/auth/session').then(({ data }) => {
      applyUser(data?.user ?? undefined)
      setLoading(false)
    })
  }, [])

  /**
   * @param {string} username
   * @param {string} password
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function signIn(username, password) {
    const { data, error } = await api.post('/auth/login', { username, password })

    if (!error) {
      applyUser(data.user)
    }

    return error?.message
  }

  /**
   * Creates the account and opens the session on a filled-in example plan, ready for the guided tour
   * @param {string} username
   * @param {string} password
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function signUp(username, password) {
    const { data, error } = await api.post('/auth/signup', { username, password })

    if (error) {
      return error.message
    }

    // Set up before the session is exposed, so the plans list loads with the example already in it
    const profile = await api.patch('/auth/profile', { display_name: data.user.display_name, net_monthly: EXAMPLE_INCOME, main_currency: data.user.main_currency })

    // A failed example leaves a working, empty account: the sign-up itself succeeded
    await createExamplePlan()
    applyUser(profile.data?.user ?? data.user)

    return undefined
  }

  /**
   * The income every plan reads, the name shown to the other person and the currency amounts are converted into
   * @param {string} displayName
   * @param {number | string} netMonthly
   * @param {string} mainCurrency
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function updateProfile(displayName, netMonthly, mainCurrency) {
    const { data, error } = await api.patch('/auth/profile', { display_name: displayName, net_monthly: netMonthly, main_currency: mainCurrency })

    if (!error) {
      applyUser(data.user)
    }

    return error?.message
  }

  /**
   * Budget sections the account works with, the others being hidden from the budget editor
   * @param {{ show_savings: boolean, show_taxes: boolean }} preferences
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function updatePreferences(preferences) {
    const { data, error } = await api.patch('/auth/preferences', preferences)

    if (!error) {
      applyUser(data.user)
    }

    return error?.message
  }

  // The guided tour was finished or skipped, so it no longer opens on its own
  async function completeTutorial() {
    const { data, error } = await api.post('/auth/tutorial')

    if (!error) {
      applyUser(data.user)
    }
  }

  async function signOut() {
    await api.post('/auth/logout')
    applyUser(undefined)
  }

  return { user, loading, signIn, signUp, updateProfile, updatePreferences, completeTutorial, signOut }
}
