import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { loadPreference, savePreference } from '../utils/storage.js'

const CURRENT_PLAN_KEY = 'current-plan'

/**
 * Plans the signed-in person holds a place in, the published templates, and which plan is open
 * @param {string | undefined} userId
 */
export default function usePlans(userId) {
  const [plans, setPlans] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPlanId, setCurrentPlanId] = useState(() => loadPreference(CURRENT_PLAN_KEY))

  // The server only returns the plans the person holds a place in
  const reload = useCallback(async () => {
    if (!userId) {
      setPlans([])
      setTemplates([])
      setLoading(false)
      return
    }

    const [mine, published] = await Promise.all([api.get('/plans'), api.get('/plans/templates')])

    if (!mine.error) {
      setPlans(mine.data)
    }

    if (!published.error) {
      setTemplates(published.data)
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
   * @param {number} slotCount - one or two places
   * @param {string} [templateId] - a published template to copy the common structure from
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function createPlan(name, slotCount, templateId) {
    const { data, error } = await api.post('/plans', { name, slotCount, templateId })

    if (error) {
      return error.message
    }

    await reload()
    selectPlan(data.id)
    return undefined
  }

  /**
   * What a share code opens onto, so the person picks a place before taking it
   * @param {string} code
   * @returns {Promise<{ data?: object, error?: { message: string } }>}
   */
  function previewJoin(code) {
    return api.get(`/plans/join/${code}`)
  }

  /**
   * @param {string} code
   * @param {string} slotId
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function joinPlan(code, slotId) {
    const { data, error } = await api.post(`/plans/join/${code}`, { slotId })

    if (error) {
      return error.message
    }

    await reload()
    selectPlan(data.id)
    return undefined
  }

  /**
   * @param {string} planId
   * @param {boolean} isTemplate
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function publishTemplate(planId, isTemplate) {
    const { error } = await api.patch(`/plans/${planId}/template`, { is_template: isTemplate })

    if (error) {
      return error.message
    }

    await reload()
    return undefined
  }

  // A remembered id pointing to a plan the person no longer belongs to falls back to their first plan
  let currentPlan = undefined

  if (!loading) {
    currentPlan = plans.find((plan) => plan.id === currentPlanId) ?? plans[0]
  }

  return {
    plans,
    templates,
    loading,
    currentPlan,
    selectPlan,
    createPlan,
    previewJoin,
    joinPlan,
    publishTemplate,
  }
}
