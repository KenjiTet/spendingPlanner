import { useState } from 'react'
import { formatAmount, formatDay } from '../utils/format.js'

const WEEKDAYS = [
  { short: 'L', long: 'lundi' },
  { short: 'M', long: 'mardi' },
  { short: 'M', long: 'mercredi' },
  { short: 'J', long: 'jeudi' },
  { short: 'V', long: 'vendredi' },
  { short: 'S', long: 'samedi' },
  { short: 'D', long: 'dimanche' },
]

const STATUS_LABELS = {
  ok: 'Dans le budget',
  warning: 'Proche du budget',
  over: 'Budget dépassé',
}

// Splits the days into Monday-first weeks, blank cells padding the first and last ones
function weeksOf(days, firstWeekday) {
  const cells = [...Array(firstWeekday).fill(undefined), ...days]

  while (cells.length % WEEKDAYS.length) {
    cells.push(undefined)
  }

  return Array.from({ length: cells.length / WEEKDAYS.length }, (_unused, index) =>
    cells.slice(index * WEEKDAYS.length, (index + 1) * WEEKDAYS.length)
  )
}

// Class of a day cell, coloured by its status once lived, outlined when it is today or selected
function dayClassOf(day, today, selectedDate) {
  const classes = ['calendar__day']

  if (!!day.status) {
    classes.push(`calendar__day--${day.status}`)
  }

  if (day.date === today) {
    classes.push('calendar__day--today')
  }

  if (day.date === selectedDate) {
    classes.push('calendar__day--selected')
  }

  return classes.join(' ')
}

/**
 * Month calendar, each lived day coloured by what was spent against an even share of the budget.
 * Hovering a day tells its total, clicking it lists its expenses below the grid.
 * @param {object} props
 * @param {{ date: string, day: number, spent: number, items: object[], status?: string }[]} props.days - from dailySpendingOf
 * @param {number} props.firstWeekday - position of the 1st in a Monday-first week, from firstWeekdayOf
 * @param {number} props.dailyBudget
 * @param {string} props.today - YYYY-MM-DD
 * @param {Record<string, { label: string, color?: string }>} props.lines - from indexLines
 */
export default function SpendingCalendar({ days, firstWeekday, dailyBudget, today, lines }) {
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

      <table className="calendar__table">
        <thead>
          <tr>
            {WEEKDAYS.map((weekday, index) => (
              <th key={`calendar-weekday-${weekday.long}-${index}`} scope="col" abbr={weekday.long} className="calendar__weekday">
                {weekday.short}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {weeksOf(days, firstWeekday).map((week, weekIndex) => (
            <tr key={`calendar-week-${weekIndex}`}>
              {week.map((day, index) => {
                if (!day) {
                  return <td key={`calendar-blank-${weekIndex}-${index}`} />
                }

                return (
                  <td key={`calendar-day-${day.date}-${index}`} className="calendar__cell">
                    <button
                      type="button"
                      className={dayClassOf(day, today, selectedDate)}
                      onClick={() => toggle(day.date)}
                      aria-pressed={day.date === selectedDate}
                      aria-label={`${formatDay(day.date)} : ${formatAmount(day.spent)}`}
                    >
                      {day.day}
                    </button>

                    <span className="calendar__tooltip" role="tooltip">
                      <strong>{formatAmount(day.spent)}</strong>
                      <span>sur {formatAmount(dailyBudget)}</span>
                      {!!day.status && <span>{STATUS_LABELS[day.status]}</span>}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="calendar__legend">
        <li className="calendar__key">
          <span className="calendar__swatch calendar__swatch--ok" aria-hidden="true" />
          Dans le budget
        </li>
        <li className="calendar__key">
          <span className="calendar__swatch calendar__swatch--warning" aria-hidden="true" />
          Proche
        </li>
        <li className="calendar__key">
          <span className="calendar__swatch calendar__swatch--over" aria-hidden="true" />
          Dépassé
        </li>
      </ul>

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
