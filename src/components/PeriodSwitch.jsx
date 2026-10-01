// Periods a dashboard card can follow
const PERIODS = [
  { id: 'weekly', label: 'Semaine' },
  { id: 'monthly', label: 'Mois' },
  { id: 'annual', label: 'Année' },
]

/**
 * Segmented switch between the week, the month and the year so far
 * @param {object} props
 * @param {'weekly' | 'monthly' | 'annual'} props.period
 * @param {(period: string) => void} props.onChange
 * @param {string} props.label - accessible name of the group
 */
export default function PeriodSwitch({ period, onChange, label }) {
  return (
    <span className="switch switch--segmented switch--small" role="group" aria-label={label}>
      {PERIODS.map((option, index) => (
        <button
          key={`period-${option.id}-${index}`}
          type="button"
          className="switch__option"
          onClick={() => onChange(option.id)}
          aria-pressed={option.id === period}
        >
          {option.label}
        </button>
      ))}
    </span>
  )
}
