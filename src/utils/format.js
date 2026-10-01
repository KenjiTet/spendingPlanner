// Reference currency of the account, every stored amount being expressed in it
export const DEFAULT_CURRENCY = 'CHF'

/**
 * Currency formatter of a given code
 * @param {string} currency
 */
function currencyFormatter(currency) {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency })
}

// Single place where amounts are turned into display strings, in the reference currency of the signed-in account
let mainCurrency = DEFAULT_CURRENCY
let formatter = currencyFormatter(mainCurrency)

/**
 * Switches the currency amounts are shown in, set from the profile as soon as the account is known
 * @param {string | undefined} currency
 */
export function setMainCurrency(currency) {
  const next = currency ?? DEFAULT_CURRENCY

  if (next === mainCurrency) {
    return
  }

  mainCurrency = next
  formatter = currencyFormatter(next)
}

// The currency amounts are currently shown in
export function getMainCurrency() {
  return mainCurrency
}

// Formats an amount as currency, falling back to zero for unusable input
export function formatAmount(amount) {
  const value = Number(amount)

  if (!Number.isFinite(value)) {
    return formatter.format(0)
  }

  return formatter.format(value)
}

/**
 * Formats an amount in a currency other than the reference one, e.g. the one a receipt was paid in
 * @param {number} amount
 * @param {string} currency
 */
export function formatAmountIn(amount, currency) {
  return currencyFormatter(currency).format(amount)
}

/**
 * Reads an amount typed by hand, accepting both "12.50" and "12,50", the Swiss keyboard habit
 * @param {string} value
 * @returns {number} zero when the text is not a number
 */
export function parseAmount(value) {
  const amount = Number(value.replace(',', '.'))

  if (!Number.isFinite(amount)) {
    return 0
  }

  return amount
}

const axisFormatter = new Intl.NumberFormat('fr-CH', { maximumFractionDigits: 0 })

// Formats an amount without currency nor cents, for chart axes and round figures
export function formatAxisAmount(amount) {
  const value = Number(amount)

  if (!Number.isFinite(value)) {
    return axisFormatter.format(0)
  }

  return axisFormatter.format(value)
}

// Shares are shown next to the chart legends
const shareFormatter = new Intl.NumberFormat('fr-CH', {
  style: 'percent',
  maximumFractionDigits: 1,
})

// Formats a 0 to 1 ratio as a percentage
export function formatShare(share) {
  const value = Number(share)

  if (!Number.isFinite(value)) {
    return shareFormatter.format(0)
  }

  return shareFormatter.format(value)
}

const monthFormatter = new Intl.DateTimeFormat('fr-CH', { month: 'long', year: 'numeric' })
const dayFormatter = new Intl.DateTimeFormat('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' })

// Parses YYYY-MM or YYYY-MM-DD as a local date, avoiding the UTC shift of new Date('YYYY-MM-DD')
function toLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number)

  return new Date(year, month - 1, day ?? 1)
}

// Formats a YYYY-MM month, e.g. "septembre 2026"
export function formatMonth(month) {
  return monthFormatter.format(toLocalDate(month))
}

// Formats a YYYY-MM-DD day, e.g. "lundi 14 septembre"
export function formatDay(day) {
  return dayFormatter.format(toLocalDate(day))
}

const shortDayFormatter = new Intl.DateTimeFormat('fr-CH', { weekday: 'short', day: 'numeric', month: 'short' })

// Formats a YYYY-MM-DD day compactly, e.g. "lun. 14 sept."
export function formatShortDay(day) {
  return shortDayFormatter.format(toLocalDate(day))
}

// First letter of a name, shown in the round badges of the sidebar
export function initialOf(name) {
  return (name ?? '').trim().charAt(0).toUpperCase()
}
