// Single place where amounts are turned into display strings
const formatter = new Intl.NumberFormat('fr-CH', {
  style: 'currency',
  currency: 'CHF',
})

// Formats an amount as currency, falling back to zero for unusable input
export function formatAmount(amount) {
  const value = Number(amount)

  if (!Number.isFinite(value)) {
    return formatter.format(0)
  }

  return formatter.format(value)
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
