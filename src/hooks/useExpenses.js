import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'

// Newest first, the order of the history
function byNewest(left, right) {
  if (left.spent_on !== right.spent_on) {
    return right.spent_on.localeCompare(left.spent_on)
  }

  return right.created_at.localeCompare(left.created_at)
}

/**
 * Expenses of one month of a plan. The server already hides other members' personal expenses
 * @param {string} planId
 * @param {string} userId
 * @param {string} month - YYYY-MM
 */
export default function useExpenses(planId, userId, month) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    const { data, error: failure } = await api.get(`/plans/${planId}/expenses?month=${month}`)

    if (failure) {
      setError(failure.message)
    }

    if (!failure) {
      setExpenses(data.map((expense) => ({ ...expense, amount: Number(expense.amount) })).sort(byNewest))
    }

    setLoading(false)
  }, [planId, month])

  useEffect(() => {
    setLoading(true)
    reload()
  }, [reload])

  /**
   * Records an expense, shown immediately when it falls in the displayed month
   * @param {{ lineId: string, amount: number, spentOn: string, note: string }} input
   * @returns {Promise<string | undefined>} an error message, if any
   */
  async function addExpense({ lineId, amount, spentOn, note }) {
    const expense = {
      id: crypto.randomUUID(),
      line_id: lineId,
      user_id: userId,
      amount,
      spent_on: spentOn,
      note,
      created_at: new Date().toISOString(),
    }

    if (spentOn.startsWith(month)) {
      setExpenses((current) => [expense, ...current].sort(byNewest))
    }

    const { error: failure } = await api.post(`/plans/${planId}/expenses`, expense)

    if (failure) {
      setExpenses((current) => current.filter((candidate) => candidate.id !== expense.id))
      return failure.message
    }

    return undefined
  }

  /**
   * @param {string} id
   */
  async function removeExpense(id) {
    setExpenses((current) => current.filter((expense) => expense.id !== id))

    const { error: failure } = await api.remove(`/plans/${planId}/expenses/${id}`)

    if (failure) {
      setError(failure.message)
      reload()
    }
  }

  return { expenses, loading, error, addExpense, removeExpense }
}
