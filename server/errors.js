/**
 * Stops a request from anywhere in a handler, the error middleware turning it into a response
 * @param {number} status
 * @param {string} message
 * @returns {never}
 */
export function fail(status, message) {
  const error = new Error(message)

  error.status = status
  throw error
}
