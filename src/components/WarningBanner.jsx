import { formatAmount } from '../utils/format.js'

/**
 * Sticky alert shown as soon as the plan spends more than it earns
 * @param {object} props
 * @param {number} props.monthlyRemaining
 * @param {number} props.annualRemaining
 */
export default function WarningBanner({ monthlyRemaining, annualRemaining }) {
  const alerts = []

  if (monthlyRemaining < 0) {
    alerts.push({ id: 'monthly', label: 'Par mois', value: monthlyRemaining })
  }

  if (annualRemaining < 0) {
    alerts.push({ id: 'annual', label: 'Par an', value: annualRemaining })
  }

  if (!alerts.length) {
    return undefined
  }

  return (
    <aside className="banner" role="alert">
      <p className="banner__title">Budget dépassé</p>

      <ul className="banner__list">
        {alerts.map((alert, index) => (
          <li key={`alert-${alert.id}-${index}`}>
            {alert.label} : {formatAmount(alert.value)}
          </li>
        ))}
      </ul>
    </aside>
  )
}
