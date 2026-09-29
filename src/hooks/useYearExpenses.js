import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'

/**
 * Expenses of a whole year of a plan, read-only, fetched only while enabled. The server hides the other place's
 * personal expenses, as for a month
 * @param {string} planId
 * @param {string} year - YYYY
 * @param {boolean} enabled
 */
export default function useYearExpenses(planId, year, enabled) {
  const [expenses, setExpenses] = useState([])
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!enabled) {
      return
    }

    const { data, error: failure } = await api.get(`/plans/${planId}/expenses?year=${year}`)

    if (failure) {
      setError(failure.message)
      return
    }

    setError('')
    setExpenses(data.map((expense) => ({ ...expense, amount: Number(expense.amount) })))
  }, [planId, year, enabled])

  useEffect(() => {
    reload()
  }, [reload])

  return { expenses, error, reload }
}
