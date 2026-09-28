import { useState } from 'react'
import { formatAmount, formatDay } from '../utils/format.js'
import MonthCalendar from './MonthCalendar.jsx'

/**
 * Month calendar, each lived day coloured by what was spent against an even share of the budget.
 * Hovering a day tells its total, clicking it lists its expenses below the grid, one's own being removable.
 * @param {object} props
 * @param {{ date: string, day: number, spent: number, items: object[], status?: string }[]} props.days - from dailySpendingOf
 * @param {number} props.firstWeekday - position of the 1st in a Monday-first week, from firstWeekdayOf
 * @param {number} props.dailyBudget
 * @param {string} props.today - YYYY-MM-DD
 * @param {Record<string, { label: string, color?: string }>} props.lines - from indexLines
 * @param {string} props.slotId - the place this person holds in the plan
 * @param {(id: string) => void} props.onRemove
 */
export default function SpendingCalendar({ days, firstWeekday, dailyBudget, today, lines, slotId, onRemove }) {
  const [selectedDate, setSelectedDate] = useState(undefined)
  const overCount = days.filter((day) => day.status === 'over').length
  const selected = days.find((day) => day.date === selectedDate)

  // A second click on the open day closes its details
  const toggle = (date) => {
    if (date === selectedDate) {
      setSelectedDate(undefined)
      return
    }

    setSelectedDate(date)
  }

  return (
    <figure className="card calendar">
      <figcaption className="calendar__caption">
        <span className="chart__title">Calendrier des dépenses</span>
        <span className="section__hint">
          Budget journalier {formatAmount(dailyBudget)}, dépassé {overCount} jour{overCount > 1 && 's'}
        </span>
      </figcaption>

      <MonthCalendar
        days={days}
        firstWeekday={firstWeekday}
        dailyBudget={dailyBudget}
        today={today}
        selected={selectedDate}
        onSelect={toggle}
      />

      {!!selected && (
        <section className="calendar__details" aria-live="polite">
          <header className="calendar__details-head">
            <h3 className="history__date">{formatDay(selected.date)}</h3>
            <span className="history__amount">
              {formatAmount(selected.spent)} / {formatAmount(dailyBudget)}
            </span>
          </header>

          {!selected.items.length && <p className="section__hint">Aucune dépense ce jour-là.</p>}

          {!!selected.items.length && (
            <ul className="history__items">
              {selected.items.map((expense, index) => {
                const line = lines[expense.line_id]

                return (
                  <li key={`calendar-expense-${expense.id}-${index}`} className="history__item">
                    <span className={`swatch swatch--${line?.color ?? 'neutral'}`} aria-hidden="true" />

                    <span className="history__text">
                      <span className="history__label">{line?.label}</span>
                      {!!expense.note && <span className="history__meta">{expense.note}</span>}
                    </span>

                    <span className="history__amount">{formatAmount(expense.amount)}</span>

                    {expense.slot_id === slotId && (
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
          )}
        </section>
      )}
    </figure>
  )
}
