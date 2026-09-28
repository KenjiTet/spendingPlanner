import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

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
   * Creates the account and opens the session right away
   * @param {string} username
   * @param {string} password
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function signUp(username, password) {
    const { data, error } = await api.post('/auth/signup', { username, password })

    if (!error) {
      setUser(data.user)
    }

    return error?.message
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

  async function signOut() {
    await api.post('/auth/logout')
    setUser(undefined)
  }

  return { user, loading, signIn, signUp, updateProfile, signOut }
}
