import { Router } from 'express'
import { fail } from '../errors.js'
import { deleteStarterPlan, readStarterPlans, saveStarterPlan } from '../starterPlans.js'

// Loopback addresses, IPv4 and IPv6, as Node reports them
const LOCAL_ADDRESSES = ['127.0.0.1', '::1', '::ffff:127.0.0.1']

const router = Router()

/**
 * Lets through only requests made on the machine itself: a request relayed by the hosting proxy carries
 * X-Forwarded-For, so production never reaches the edits
 */
function requireLocal(req, _res, next) {
  if (!LOCAL_ADDRESSES.includes(req.socket.remoteAddress) || !!req.headers['x-forwarded-for']) {
    fail(403, 'Administration accessible en local uniquement.')
  }

  next()
}

// Read by the onboarding and the admin page alike: nothing private, the same plans being offered to every new account
router.get('/', (_req, res) => {
  res.json({ plans: readStarterPlans() })
})

router.put('/:id', requireLocal, (req, res) => {
  res.json({ plans: saveStarterPlan(req.params.id, req.body) })
})

router.delete('/:id', requireLocal, (req, res) => {
  res.json({ plans: deleteStarterPlan(req.params.id) })
})

export default router
