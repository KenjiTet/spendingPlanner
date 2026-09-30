import { Router } from 'express'
import { requireUser } from '../auth.js'
import { fail } from '../errors.js'
import { readCurrency } from '../input.js'

// European Central Bank rates, free and keyless, published once a working day
const RATES_URL = 'https://api.frankfurter.dev/v1/latest'
// The source changes once a day: an hour of cache spares it a call per entry
const CACHE_MS = 60 * 60 * 1000

const router = Router()

// Latest rates per base currency, with the time they were fetched
const cache = new Map()

/**
 * Rates of one base currency, from the cache while it is fresh
 * @param {string} base
 * @returns {Promise<{ base: string, date: string, rates: Record<string, number> }>}
 */
async function ratesOf(base) {
  const cached = cache.get(base)

  if (!!cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    return cached.payload
  }

  const response = await fetch(`${RATES_URL}?base=${base}`)

  if (!response.ok) {
    fail(502, 'Taux de change indisponibles.')
  }

  const { date, rates } = await response.json()
  const payload = { base, date, rates }

  cache.set(base, { payload, fetchedAt: Date.now() })

  return payload
}

// How much one unit of the base currency is worth in every other currency
router.get('/', requireUser, async (req, res) => {
  res.json(await ratesOf(readCurrency(req.query.base)))
})

export default router
