import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { createExamplePlan, EXAMPLE_INCOME } from '../lib/planImport.js'

// Session of the signed-in person, held by the server in an http-only cookie
export default function useAuth() {
  const [user, setUser] = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/auth/session').then(({ data }) => {
      setUser(data?.user ?? undefined)
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
      setUser(data.user)
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
    const profile = await api.patch('/auth/profile', { display_name: data.user.display_name, net_monthly: EXAMPLE_INCOME })

    // A failed example leaves a working, empty account: the sign-up itself succeeded
    await createExamplePlan()
    setUser(profile.data?.user ?? data.user)

    return undefined
  }

  /**
   * The income every plan reads, and the name shown to the other person
   * @param {string} displayName
   * @param {number | string} netMonthly
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function updateProfile(displayName, netMonthly) {
    const { data, error } = await api.patch('/auth/profile', { display_name: displayName, net_monthly: netMonthly })

    if (!error) {
      setUser(data.user)
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
      setUser(data.user)
    }

    return error?.message
  }

  // The guided tour was finished or skipped, so it no longer opens on its own
  async function completeTutorial() {
    const { data, error } = await api.post('/auth/tutorial')

    if (!error) {
      setUser(data.user)
    }
  }

  async function signOut() {
    await api.post('/auth/logout')
    setUser(undefined)
  }

  return { user, loading, signIn, signUp, updateProfile, updatePreferences, completeTutorial, signOut }
}
