import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'sp_session'
const SESSION_MS = 30 * 24 * 60 * 60 * 1000
const KEY_LENGTH = 64
const secret = process.env.SESSION_SECRET

// Fail fast: without a secret any visitor could forge a session
if (!secret) {
  throw new Error('SESSION_SECRET must be set')
}

/**
 * Salted hash stored in the users table
 * @param {string} password
 */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')

  return `${salt}:${scryptSync(password, salt, KEY_LENGTH).toString('hex')}`
}

/**
 * Compares a password with a stored hash, in constant time
 * @param {string} password
 * @param {string} stored
 */
export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const candidate = scryptSync(password, salt, KEY_LENGTH)

  return timingSafeEqual(Buffer.from(hash, 'hex'), candidate)
}

/**
 * Signs a cookie payload so it cannot be tampered with
 * @param {string} payload
 */
function sign(payload) {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Reads the signed cookie, undefined when missing, forged or expired
 * @param {string} [header] - the raw Cookie header
 */
function readSession(header) {
  const cookie = (header ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))

  if (!cookie) {
    return undefined
  }

  const [userId, expiresAt, signature] = decodeURIComponent(cookie.slice(COOKIE_NAME.length + 1)).split('.')

  if (sign(`${userId}.${expiresAt}`) !== signature) {
    return undefined
  }

  if (Number(expiresAt) < Date.now()) {
    return undefined
  }

  return userId
}

/**
 * Opens a session for a person
 * @param {import('express').Response} res
 * @param {string} userId
 */
export function setSession(res, userId) {
  const expiresAt = Date.now() + SESSION_MS
  const payload = `${userId}.${expiresAt}`

  res.cookie(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MS,
  })
}

/**
 * @param {import('express').Response} res
 */
export function clearSession(res) {
  res.clearCookie(COOKIE_NAME)
}

// Puts the signed-in person on the request, without requiring one
export function attachUser(req, _res, next) {
  req.userId = readSession(req.headers.cookie)
  next()
}

// Guards every route that needs an account
export function requireUser(req, res, next) {
  if (!req.userId) {
    res.status(401).json({ error: 'Session expirée, reconnectez-vous.' })
    return
  }

  next()
}
