// Single entry point to the server API, the session travelling in an http-only cookie

const BASE = '/api'

/**
 * Calls the API and always answers with the same pair, so callers never deal with exceptions
 * @param {string} method
 * @param {string} path
 * @param {object} [body]
 * @returns {Promise<{ data?: any, error?: { message: string } }>}
 */
async function request(method, path, body) {
  const init = { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } }

  if (!!body) {
    init.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(BASE + path, init)
    const payload = await response.json()

    if (!response.ok) {
      return { error: { message: payload.error ?? 'Erreur inattendue.' } }
    }

    return { data: payload }
  } catch {
    // Network failure or a response that is not JSON at all
    return { error: { message: 'Serveur injoignable.' } }
  }
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  put: (path, body) => request('PUT', path, body),
  remove: (path) => request('DELETE', path),
}
