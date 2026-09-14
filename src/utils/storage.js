import { isValidPlan } from './plan.js'

// Browser persistence for the plan, isolated so the hook stays readable

const STORAGE_KEY = 'spending-planner.plan'

/**
 * Reads the stored plan, falling back to the given plan when nothing usable is saved
 * @param {object} fallback
 */
export function loadPlan(fallback) {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      return fallback
    }

    const parsed = JSON.parse(stored)

    if (!isValidPlan(parsed)) {
      return fallback
    }

    return parsed
  } catch {
    // Private mode, quota or corrupted content: start from the defaults rather than crash
    return fallback
  }
}

/**
 * Persists the plan, ignoring storage failures
 * @param {object} plan
 */
export function savePlan(plan) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan))
  } catch {
    // Nothing to do, the app keeps working from memory
  }
}
