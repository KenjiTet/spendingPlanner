import { formatAmount } from '../utils/format.js'
import { toGauge } from '../utils/tracking.js'

// Time frame of the remaining amount: the days left in the current month, the whole month otherwise
function remainingHintOf(daysLeft) {
  if (daysLeft === 1) {
    return 'dernier jour'
  }

  return `${daysLeft} jours restants`
}

// Red once the month is over budget
function cardClassOf(remaining) {
  if (remaining < 0) {
    return 'card month-budget month-budget--over'
  }

  return 'card month-budget'
}

/**
 * Where the viewer's month stands in one card: what is left, what it allows per day, and the spent share of the budget
 * @param {object} props
 * @param {number} props.spent
 * @param {number} props.budget
 * @param {number} [props.daysLeft] - undefined when the month shown is not the current one
 */
export default function MonthBudget({ spent, budget, daysLeft }) {
  const remaining = budget - spent
  const { fill, status } = toGauge(spent, budget)

  return (
    <section className={cardClassOf(remaining)} aria-label="Budget du mois" data-tour="month-budget">
      <header className="month-budget__head">
        <p className="month-budget__main">
          <span className="kpi__label">Reste à dépenser</span>
          <strong className="month-budget__value">{formatAmount(remaining)}</strong>
        </p>

        {daysLeft !== undefined && (
          <p className="month-budget__daily">
            <strong className="month-budget__daily-value">{formatAmount(Math.max(remaining, 0) / daysLeft)}</strong>
            <span>par jour · {remainingHintOf(daysLeft)}</span>
          </p>
        )}
      </header>

      <div className={`gauge gauge--${status} gauge--group`}>
        <meter className="gauge__meter" min="0" max="1" value={fill} aria-label="Part du budget dépensée" />

        <p className="month-budget__figures">
          <span>
            <strong>{formatAmount(spent)}</strong> dépensés
          </span>
          <span>sur {formatAmount(budget)} prévus</span>
        </p>
      </div>
    </section>
  )
}
