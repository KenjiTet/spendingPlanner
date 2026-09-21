import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { clearSession, hashPassword, setSession, verifyPassword } from '../auth.js'
import { db } from '../db.js'

const MIN_PASSWORD_LENGTH = 6

const router = Router()

const findByEmail = db.prepare('select * from users where email = ?')
const findById = db.prepare('select id, email, display_name from users where id = ?')
const insertUser = db.prepare(
  'insert into users (id, email, display_name, password_hash, created_at) values (?, ?, ?, ?, ?)'
)

/**
 * What the front-end may see of an account, never the password hash
 * @param {object} user
 */
function toPublicUser(user) {
  return { id: user.id, email: user.email, display_name: user.display_name }
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
  const displayName = String(req.body.displayName ?? '').trim()
  const email = String(req.body.email ?? '')
    .trim()
    .toLowerCase()
  const password = String(req.body.password ?? '')

  if (!displayName || !email) {
    res.status(400).json({ error: 'Prénom et email sont obligatoires.' })
    return
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.` })
    return
  }

  if (!!findByEmail.get(email)) {
    res.status(409).json({ error: 'Un compte existe déjà pour cette adresse.' })
    return
  }

  const user = { id: randomUUID(), email, display_name: displayName }

  insertUser.run(user.id, email, displayName, hashPassword(password), new Date().toISOString())
  setSession(res, user.id)
  res.json({ user })
})

router.post('/login', (req, res) => {
  const email = String(req.body.email ?? '')
    .trim()
    .toLowerCase()
  const password = String(req.body.password ?? '')
  const user = findByEmail.get(email)

  // The same message either way, so the form never reveals which accounts exist
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
    return
  }

  setSession(res, user.id)
  res.json({ user: toPublicUser(user) })
})

router.post('/logout', (_req, res) => {
  clearSession(res)
  res.json({})
})

export default router
