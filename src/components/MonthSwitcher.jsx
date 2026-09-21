import { formatMonth } from '../utils/format.js'
import { shiftMonth } from '../utils/tracking.js'

/**
 * Previous / next month navigation
 * @param {object} props
 * @param {string} props.month - YYYY-MM
 * @param {(month: string) => void} props.onChange
 */
export default function MonthSwitcher({ month, onChange }) {
  return (
    <nav className="month" aria-label="Mois affiché">
      <button
        type="button"
        className="month__step"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Mois précédent"
      >
        ‹
      </button>

      <h1 className="month__label">{formatMonth(month)}</h1>

      <button
        type="button"
        className="month__step"
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label="Mois suivant"
      >
        ›
      </button>
    </nav>
  )
}
