import { formatAmount } from '../utils/format.js'

// Short sentence telling how much is left, or by how much the budget is exceeded
function hintOf(spent, budget) {
  if (spent > budget) {
    return `Dépassé de ${formatAmount(spent - budget)}`
  }

  return `Reste ${formatAmount(budget - spent)}`
}

/**
 * Budget gauge coloured by how close the spending is to the limit
 * @param {object} props
 * @param {string} props.label
 * @param {number} props.spent
 * @param {number} props.budget
 * @param {number} props.fill - 0 to 1
 * @param {'ok' | 'warning' | 'over'} props.status
 * @param {'line' | 'group'} [props.size]
 */
export default function Gauge({ label, spent, budget, fill, status, size = 'line' }) {
  return (
    <div className={`gauge gauge--${status} gauge--${size}`}>
      <p className="gauge__head">
        <span className="gauge__label">{label}</span>
        <span className="gauge__figures">
          {formatAmount(spent)} <span className="gauge__budget">/ {formatAmount(budget)}</span>
        </span>
      </p>

      <meter className="gauge__meter" min="0" max="1" value={fill} aria-label={`${label} : ${hintOf(spent, budget)}`} />

      <span className="gauge__hint">{hintOf(spent, budget)}</span>
    </div>
  )
}
