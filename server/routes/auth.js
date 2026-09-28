import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { clearSession, hashPassword, requireUser, setSession, verifyPassword } from '../auth.js'
import { db } from '../db.js'
import { readAmount } from '../input.js'

const MIN_PASSWORD_LENGTH = 6
const MAX_USERNAME_LENGTH = 32

const router = Router()

const findByUsername = db.prepare('select * from users where username = ?')
const findById = db.prepare(
  'select id, username, display_name, net_monthly from users where id = ?'
)
const insertUser = db.prepare(
  'insert into users (id, username, display_name, password, created_at) values (?, ?, ?, ?, ?)'
)
const updateProfile = db.prepare(
  'update users set display_name = ?, net_monthly = ? where id = ?'
)

/**
 * What the front-end may see of an account, never the password
 * @param {object} user
 */
function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    net_monthly: user.net_monthly,
  }
}

// Who is signed in, used once when the app boots
router.get('/session', (req, res) => {
  if (!req.userId) {
    res.json({})
    return
  }

  res.json({ user: findById.get(req.userId) })
})

router.post('/signup', (req, res) => {
  const username = String(req.body.username ?? '').trim()
  const password = String(req.body.password ?? '')

  if (!username || username.length > MAX_USERNAME_LENGTH) {
    res.status(400).json({ error: `Le nom d’utilisateur fait au plus ${MAX_USERNAME_LENGTH} caractères.` })
    return
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.` })
    return
  }

  if (!!findByUsername.get(username)) {
    res.status(409).json({ error: 'Ce nom d’utilisateur est déjà pris.' })
    return
  }

  const id = randomUUID()

  // The display name starts as the username, the profile renames it afterwards
  insertUser.run(id, username, username, hashPassword(password), new Date().toISOString())
  setSession(res, id)
  res.json({ user: findById.get(id) })
})

router.post('/login', (req, res) => {
  const username = String(req.body.username ?? '').trim()
  const password = String(req.body.password ?? '')
  const user = findByUsername.get(username)

  // The same message either way, so the form never reveals which accounts exist
  if (!user || !verifyPassword(password, user.password)) {
    res.status(401).json({ error: 'Nom d’utilisateur ou mot de passe incorrect.' })
    return
  }

  setSession(res, user.id)
  res.json({ user: toPublicUser(user) })
})

// The name and income every plan reads, guarded on its own: /session stays anonymous
router.patch('/profile', requireUser, (req, res) => {
  const displayName = String(req.body.display_name ?? '').trim()

  if (!displayName) {
    res.status(400).json({ error: 'Le nom affiché est obligatoire.' })
    return
  }

  updateProfile.run(displayName, readAmount(req.body.net_monthly), req.userId)
  res.json({ user: findById.get(req.userId) })
})

router.post('/logout', (_req, res) => {
  clearSession(res)
  res.json({})
})

export default router
