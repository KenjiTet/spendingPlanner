import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

// Offered right after the reference currency, whatever their alphabetical place
const LIKELY_CURRENCIES = ['CHF', 'EUR']

/**
 * Latest exchange rates against the reference currency, to convert amounts typed in another one
 * @param {string} base - the reference currency of the account
 */
export default function useExchangeRates(base) {
  const [rates, setRates] = useState({})

  useEffect(() => {
    api.get(`/rates?base=${base}`).then(({ data, error }) => {
      // Without rates, only the reference currency is offered: amounts are still typed, just never converted
      if (error) {
        setRates({})
        return
      }

      setRates(data.rates)
    })
  }, [base])

  // The reference currency first, then the likeliest ones among those with a rate, the others in alphabetical order
  const likely = [base, ...LIKELY_CURRENCIES.filter((currency) => currency !== base && !!rates[currency])]
  const currencies = [...likely, ...Object.keys(rates).filter((currency) => !likely.includes(currency)).sort()]

  /**
   * An amount typed in another currency, expressed in the reference one and rounded to the cent
   * @param {number} amount
   * @param {string} currency
   * @returns {number | undefined} undefined when the currency has no known rate
   */
  function toBase(amount, currency) {
    if (currency === base) {
      return amount
    }

    if (!rates[currency]) {
      return undefined
    }

    return Math.round((amount / rates[currency]) * 100) / 100
  }

  return { currencies, likelyCount: likely.length, toBase }
}
