import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { loadPreference, savePreference } from '../utils/storage.js'

const CURRENT_PLAN_KEY = 'current-plan'

/**
 * Plans the signed-in person belongs to, and which one is currently open
 * @param {string | undefined} userId
 */
export default function usePlans(userId) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPlanId, setCurrentPlanId] = useState(() => loadPreference(CURRENT_PLAN_KEY))

  // The server only returns the plans the person is a member of
  const reload = useCallback(async () => {
    if (!userId) {
      setPlans([])
      setLoading(false)
      return
    }

    const { data, error } = await api.get('/plans')

    if (!error) {
      setPlans(data)
    }

    setLoading(false)
  }, [userId])

  // A new session must not be routed before its plans are known
  useEffect(() => {
    setLoading(true)
    reload()
  }, [reload])

  /**
   * @param {string | undefined} id
   */
  function selectPlan(id) {
    setCurrentPlanId(id)
    savePreference(CURRENT_PLAN_KEY, id)
  }

  /**
   * @param {string} name
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function createPlan(name) {
    const { data, error } = await api.post('/plans', { name })

    if (error) {
      return error.message
    }

    await reload()
    selectPlan(data.id)
    return undefined
  }

  /**
   * @param {string} planId
   * @param {string} email
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function addMember(planId, email) {
    const { error } = await api.post(`/plans/${planId}/members`, { email })

    return error?.message
  }

  // A remembered id pointing to a plan the person no longer belongs to is ignored
  let currentPlan = undefined

  if (!loading) {
    currentPlan = plans.find((plan) => plan.id === currentPlanId)
  }

  return { plans, loading, currentPlan, selectPlan, createPlan, addMember }
}
