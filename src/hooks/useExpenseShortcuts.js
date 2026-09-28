import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'

/**
 * Shortcuts of the signed-in person on the expense form: sub-groups pinned or hidden, and the one-tap expenses
 * @param {string} planId
 */
export default function useExpenseShortcuts(planId) {
  const [pinnedGroupIds, setPinnedGroupIds] = useState([])
  const [hiddenGroupIds, setHiddenGroupIds] = useState([])
  const [presets, setPresets] = useState([])
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    const { data, error: failure } = await api.get(`/plans/${planId}/expenses/shortcuts`)

    // Shortcuts are a convenience: on failure the form simply works without them
    if (!failure) {
      setPinnedGroupIds(data.pinnedGroupIds)
      setHiddenGroupIds(data.hiddenGroupIds)
      setPresets(data.presets.map((preset) => ({ ...preset, amount: Number(preset.amount) })))
    }
  }, [planId])

  useEffect(() => {
    reload()
  }, [reload])

  // A rejected write means the local state is wrong: surface it and resync from the server
  async function persist(request) {
    const { error: failure } = await request

    setError(failure?.message ?? '')

    if (failure) {
      await reload()
    }
  }

  /**
   * @param {string} groupId
   * @param {boolean} pinned
   */
  function pinGroup(groupId, pinned) {
    if (pinned) {
      // Pinning brings back a sub-group taken off the form
      setHiddenGroupIds((current) => current.filter((id) => id !== groupId))
      setPinnedGroupIds((current) => [...current, groupId])
      persist(api.put(`/plans/${planId}/expenses/pins/${groupId}`))
      return
    }

    setPinnedGroupIds((current) => current.filter((id) => id !== groupId))
    persist(api.remove(`/plans/${planId}/expenses/pins/${groupId}`))
  }

  /**
   * Takes a sub-group off the expense form, unpinning it if needed
   * @param {string} groupId
   */
  function hideGroup(groupId) {
    setPinnedGroupIds((current) => current.filter((id) => id !== groupId))
    setHiddenGroupIds((current) => [...current, groupId])
    persist(api.put(`/plans/${planId}/expenses/hidden/${groupId}`))
  }

  /**
   * @param {{ lineId: string, label: string, amount: number }} input
   */
  function addPreset({ lineId, label, amount }) {
    const preset = { id: crypto.randomUUID(), line_id: lineId, label, amount }

    setPresets((current) => [...current, preset])
    persist(api.post(`/plans/${planId}/expenses/presets`, preset))
  }

  /**
   * @param {string} id
   */
  function removePreset(id) {
    setPresets((current) => current.filter((preset) => preset.id !== id))
    persist(api.remove(`/plans/${planId}/expenses/presets/${id}`))
  }

  return { pinnedGroupIds, hiddenGroupIds, presets, error, pinGroup, hideGroup, addPreset, removePreset }
}
