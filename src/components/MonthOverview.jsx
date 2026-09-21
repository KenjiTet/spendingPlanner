import Gauge from './Gauge.jsx'

/**
 * One big gauge per tracked scope (common, personal), plus the days left in the month
 * @param {object} props
 * @param {{ id: string, label: string, spent: number, budget: number, fill: number, status: string }[]} props.scopes
 * @param {number} [props.daysLeft]
 */
export default function MonthOverview({ scopes, daysLeft }) {
  return (
    <section className="overview" aria-label="Vue d’ensemble du mois">
      <ul className="overview__list">
        {scopes.map((scope, index) => (
          <li key={`overview-${scope.id}-${index}`} className="card overview__card">
            <Gauge
              label={scope.label}
              spent={scope.spent}
              budget={scope.budget}
              fill={scope.fill}
              status={scope.status}
              size="group"
            />
          </li>
        ))}
      </ul>

      {daysLeft !== undefined && (
        <p className="section__hint">
          {daysLeft} jour{daysLeft > 1 && 's'} restant{daysLeft > 1 && 's'} ce mois-ci
        </p>
      )}
    </section>
  )
}
