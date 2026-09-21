import { formatAmount, formatDay } from '../utils/format.js'

// Groups the expenses (already sorted newest first) by day
function groupByDay(expenses) {
  return expenses.reduce((days, expense) => {
    const last = days[days.length - 1]

    if (last?.day === expense.spent_on) {
      last.items.push(expense)
      return days
    }

    return [...days, { day: expense.spent_on, items: [expense] }]
  }, [])
}

// Swatch class of the category the expense was booked on
function swatchClass(color) {
  if (!color) {
    return 'swatch swatch--neutral'
  }

  return `swatch swatch--${color}`
}

/**
 * Expenses of the month grouped by day, only one's own entries being removable
 * @param {object} props
 * @param {object[]} props.expenses
 * @param {Record<string, { label: string, color?: string }>} props.lines - from indexLines
 * @param {Record<string, string>} props.names - member id to display name
 * @param {string} props.userId
 * @param {(id: string) => void} props.onRemove
 */
export default function ExpenseHistory({ expenses, lines, names, userId, onRemove }) {
  if (!expenses.length) {
    return (
      <section className="card history">
        <h2 className="history__title">Historique</h2>
        <p className="section__hint">Aucune dépense ce mois-ci.</p>
      </section>
    )
  }

  return (
    <section className="card history">
      <h2 className="history__title">Historique</h2>

      <ol className="history__days">
        {groupByDay(expenses).map((group, dayIndex) => (
          <li key={`day-${group.day}-${dayIndex}`} className="history__day">
            <h3 className="history__date">{formatDay(group.day)}</h3>

            <ul className="history__items">
              {group.items.map((expense, index) => {
                const line = lines[expense.line_id]
                const isMine = expense.user_id === userId

                return (
                  <li key={`expense-${expense.id}-${index}`} className="history__item">
                    <span className={swatchClass(line?.color)} aria-hidden="true" />

                    <span className="history__text">
                      <span className="history__label">{line?.label ?? 'Ligne supprimée'}</span>
                      <span className="history__meta">
                        {!isMine && `${names[expense.user_id] ?? 'Autre membre'} · `}
                        {expense.note}
                      </span>
                    </span>

                    <span className="history__amount">{formatAmount(expense.amount)}</span>

                    {isMine && (
                      <button
                        type="button"
                        className="list__remove"
                        onClick={() => onRemove(expense.id)}
                        aria-label={`Supprimer la dépense de ${formatAmount(expense.amount)}`}
                      >
                        ×
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  )
}
