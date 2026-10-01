import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { importInto } from '../lib/planImport.js'
import { downloadPlan } from '../utils/planFile.js'
import { rowsToPlan } from '../utils/planMapper.js'
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
   * @param {object} [source] - a plan read from a JSON file, whose lines fill the new plan
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function createPlan(name, slotCount, templateId, source) {
    const { data, error } = await api.post('/plans', { name, slotCount, templateId })

    if (error) {
      return error.message
    }

    let importFailure = undefined

    if (!!source) {
      importFailure = await importInto(data.id, source)
    }

    await reload()
    selectPlan(data.id)

    if (!!importFailure) {
      return `Le plan a été créé, mais l’import a échoué : ${importFailure}`
    }

    return undefined
  }

  /**
   * Downloads a plan as JSON, read in full since the list only carries its summary
   * @param {string} planId
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function exportPlan(planId) {
    const { data, error } = await api.get(`/plans/${planId}`)

    if (error) {
      return error.message
    }

    downloadPlan(rowsToPlan(data))
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

  /**
   * @param {string} planId
   * @param {string} name
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function renamePlan(planId, name) {
    const { error } = await api.patch(`/plans/${planId}/name`, { name })

    if (error) {
      return error.message
    }

    await reload()
    return undefined
  }

  /**
   * Deletes a plan for everyone; the active plan then falls back to the first one left
   * @param {string} planId
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function deletePlan(planId) {
    const { error } = await api.remove(`/plans/${planId}`)

    if (error) {
      return error.message
    }

    if (planId === currentPlanId) {
      selectPlan(undefined)
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
    renamePlan,
    exportPlan,
    deletePlan,
  }
}
