import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'

/**
 * Entry habits of the signed-in person on a plan: how often each line is used
 * @param {string} planId
 */
export default function useExpenseSuggestions(planId) {
  const [usage, setUsage] = useState({ lines: [] })

  const reload = useCallback(async () => {
    const { data, error } = await api.get(`/plans/${planId}/expenses/suggestions`)

    // Suggestions are a convenience: on failure the form simply works without them
    if (!error) {
      setUsage({ lines: data.lines })
    }
  }, [planId])

  useEffect(() => {
    reload()
  }, [reload])

  return { ...usage, reload }
}
