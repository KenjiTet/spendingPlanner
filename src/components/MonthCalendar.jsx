import { formatAmount, formatDay } from '../utils/format.js'
import { WEEKDAYS, weeksOf } from '../utils/tracking.js'

const STATUS_LABELS = {
  ok: 'Dans le budget',
  warning: 'Proche du budget',
  over: 'Budget dépassé',
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
 * Month grid, each lived day coloured by what was spent against an even share of the budget, with its legend.
 * Hovering a day tells its total
 * @param {object} props
 * @param {{ date: string, day: number, spent: number, status?: string }[]} props.days - from dailySpendingOf
 * @param {number} props.firstWeekday - position of the 1st in a Monday-first week, from firstWeekdayOf
 * @param {number} props.dailyBudget
 * @param {string} props.today - YYYY-MM-DD
 * @param {string | undefined} props.selected - YYYY-MM-DD
 * @param {(date: string) => void} props.onSelect
 * @param {boolean} [props.pastOnly] - days after today cannot be picked
 */
export default function MonthCalendar({ days, firstWeekday, dailyBudget, today, selected, onSelect, pastOnly }) {
  return (
    <>
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
                      className={dayClassOf(day, today, selected)}
                      onClick={() => onSelect(day.date)}
                      disabled={!!pastOnly && day.date > today}
                      aria-pressed={day.date === selected}
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
    </>
  )
}
