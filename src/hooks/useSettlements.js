import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'

/**
 * Repayments between the two places of a plan: the open sequence, the pending declaration and the history.
 * Reloaded whenever the app comes back to the foreground, which is how the other member's actions show up
 * @param {string} [planId] - none while no plan is active
 */
export default function useSettlements(planId) {
  const [data, setData] = useState(undefined)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!planId) {
      setData(undefined)
      return
    }

    const { data: payload, error: failure } = await api.get(`/plans/${planId}/settlements`)

    if (failure) {
      setError(failure.message)
      return
    }

    setError('')
    setData(payload)
  }, [planId])

  useEffect(() => {
    reload()

    function reloadWhenVisible() {
      if (document.visibilityState === 'visible') {
        reload()
      }
    }

    document.addEventListener('visibilitychange', reloadWhenVisible)

    return () => document.removeEventListener('visibilitychange', reloadWhenVisible)
  }, [reload])

  /**
   * Runs a change then reloads, the server holding every rule and the amounts
   * @param {Promise<{ error?: { message: string } }>} call
   */
  async function applyAndReload(call) {
    const { error: failure } = await call

    if (failure) {
      setError(failure.message)
    }

    await reload()
  }

  // The debtor declares having repaid the open sequence
  function declare() {
    return applyAndReload(api.post(`/plans/${planId}/settlements`, { id: crypto.randomUUID() }))
  }

  /**
   * The creditor confirms having received the repayment
   * @param {string} id
   */
  function validate(id) {
    return applyAndReload(api.post(`/plans/${planId}/settlements/${id}/validate`))
  }

  /**
   * Cancelled by the debtor or refused by the creditor, the expenses going back to the open sequence
   * @param {string} id
   */
  function cancel(id) {
    return applyAndReload(api.remove(`/plans/${planId}/settlements/${id}`))
  }

  /**
   * Deletes one of the viewer's own expenses not yet covered, the amount owed being recomputed
   * @param {string} id
   */
  function removeExpense(id) {
    return applyAndReload(api.remove(`/plans/${planId}/expenses/${id}`))
  }

  return { data, error, reload, declare, validate, cancel, removeExpense, dismissError: () => setError('') }
}
