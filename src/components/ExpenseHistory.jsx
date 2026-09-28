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

// Summary line of the folded history: how many expenses and how much this month
function summaryOf(expenses) {
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  if (!expenses.length) {
    return 'Aucune dépense ce mois-ci'
  }

  if (expenses.length === 1) {
    return `1 dépense · ${formatAmount(total)}`
  }

  return `${expenses.length} dépenses · ${formatAmount(total)}`
}

/**
 * Expenses of the month grouped by day, folded by default, only one's own entries being removable
 * @param {object} props
 * @param {object[]} props.expenses
 * @param {Record<string, { label: string, color?: string }>} props.lines - from indexLines
 * @param {Record<string, string>} props.names - place id to display name
 * @param {string} props.slotId
 * @param {(id: string) => void} props.onRemove
 */
export default function ExpenseHistory({ expenses, lines, names, slotId, onRemove }) {
  return (
    <details className="card history">
      <summary className="history__summary">
        <span className="history__title">Historique du mois</span>
        <span className="history__count">{summaryOf(expenses)}</span>
      </summary>

      {!!expenses.length && (
        <ol className="history__days">
          {groupByDay(expenses).map((group, dayIndex) => (
            <li key={`day-${group.day}-${dayIndex}`} className="history__day">
              <h3 className="history__date">{formatDay(group.day)}</h3>

              <ul className="history__items">
                {group.items.map((expense, index) => {
                  const line = lines[expense.line_id]
                  const isMine = expense.slot_id === slotId

                  return (
                    <li key={`expense-${expense.id}-${index}`} className="history__item">
                      <span className={swatchClass(line?.color)} aria-hidden="true" />

                      <span className="history__text">
                        <span className="history__label">{line?.label ?? 'Ligne supprimée'}</span>
                        <span className="history__meta">
                          {!isMine && `${names[expense.slot_id] ?? 'Autre membre'} · `}
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
      )}
    </details>
  )
}
