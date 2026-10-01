import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

/**
 * The plans proposed at the end of the onboarding, solo and duo, each with its income brackets.
 * Saving and deleting are refused by the server unless the request comes from the machine itself
 */
export default function useStarterPlans() {
  const [plans, setPlans] = useState(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/starter-plans').then(({ data, error: failure }) => {
      setError(failure?.message ?? '')
      setPlans(data?.plans ?? [])
    })
  }, [])

  /**
   * Applies the plans list sent back by a write
   * @param {Promise<{ data?: { plans: object[] }, error?: { message: string } }>} call
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function apply(call) {
    const { data, error: failure } = await call

    if (failure) {
      return failure.message
    }

    setPlans(data.plans)
    return undefined
  }

  /**
   * Creates or replaces a plan, offered at once to new accounts
   * @param {object} plan
   */
  function savePlan(plan) {
    return apply(api.put(`/starter-plans/${plan.id}`, plan))
  }

  /**
   * @param {string} id
   */
  function deletePlan(id) {
    return apply(api.remove(`/starter-plans/${id}`))
  }

  return { plans, loading: !plans, error, savePlan, deletePlan }
}
