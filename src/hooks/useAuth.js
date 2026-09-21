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
   * @param {string} email
   * @param {string} password
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function signIn(email, password) {
    const { data, error } = await api.post('/auth/login', { email, password })

    if (!error) {
      setUser(data.user)
    }

    return error?.message
  }

  /**
   * Creates the account and opens the session right away
   * @param {string} displayName
   * @param {string} email
   * @param {string} password
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function signUp(displayName, email, password) {
    const { data, error } = await api.post('/auth/signup', { displayName, email, password })

    if (!error) {
      setUser(data.user)
    }

    return error?.message
  }

  async function signOut() {
    await api.post('/auth/logout')
    setUser(undefined)
  }

  return { user, loading, signIn, signUp, signOut }
}
