// A home-screen app on iOS resumes the page kept in memory instead of reloading it, so a new deploy
// is only picked up by comparing the fingerprinted entry bundle whenever the app comes back to the foreground

const ENTRY_SELECTOR = 'script[type="module"][src]'

/**
 * The entry bundle path of a document, its Vite hash acting as the version.
 * @param {Document} doc
 * @returns {string | undefined}
 */
const entryOf = (doc) => {
  return doc.querySelector(ENTRY_SELECTOR)?.getAttribute('src') ?? undefined
}

// Reloads the page when the deployed shell points to another bundle than the running one
const checkForUpdate = async () => {
  try {
    const response = await fetch('/', { cache: 'no-store' })
    if (!response.ok) {
      return
    }

    const html = await response.text()
    const deployed = entryOf(new DOMParser().parseFromString(html, 'text/html'))
    if (!!deployed && deployed !== entryOf(document)) {
      window.location.reload()
    }
  } catch {
    // Offline or unreachable: the next return to the foreground will try again
  }
}

// Checks for a new version each time the app becomes visible again; the dev server has no bundle to compare
export const watchForUpdates = () => {
  if (import.meta.env.DEV) {
    return
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdate()
    }
  })
}
