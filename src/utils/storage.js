// Browser persistence for small per-device preferences (current plan, last category), never for shared data

const PREFIX = 'spending-planner.'

/**
 * Reads a stored preference, undefined when missing or when storage is unavailable
 * @param {string} key
 */
export function loadPreference(key) {
  try {
    return window.localStorage.getItem(PREFIX + key) ?? undefined
  } catch {
    // Private mode or blocked storage: behave as if nothing was saved
    return undefined
  }
}

/**
 * Plan saved by the single-user version of the app, offered once for import
 * @returns {object | undefined}
 */
export function loadLegacyPlan() {
  const stored = loadPreference('plan')

  if (!stored) {
    return undefined
  }

  try {
    return JSON.parse(stored)
  } catch {
    return undefined
  }
}

/**
 * Persists a preference, removing it when the value is empty
 * @param {string} key
 * @param {string | undefined} value
 */
export function savePreference(key, value) {
  try {
    if (!value) {
      window.localStorage.removeItem(PREFIX + key)
      return
    }

    window.localStorage.setItem(PREFIX + key, value)
  } catch {
    // Nothing to do, the preference simply is not remembered
  }
}
