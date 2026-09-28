import { useState } from 'react'
import useDailySpending from '../hooks/useDailySpending.js'
import { formatMonth, formatShortDay } from '../utils/format.js'
import { dayBefore, firstWeekdayOf, shiftMonth, toDateValue, toMonthValue } from '../utils/tracking.js'
import Icon from './Icon.jsx'
import MonthCalendar from './MonthCalendar.jsx'
import Sheet from './Sheet.jsx'

// Class of a quick choice, highlighted when it holds the current date
function optionClass(isActive) {
  if (!isActive) {
    return 'date-picker__option'
  }

  return 'date-picker__option date-picker__option--active'
}

// The calendar button stands out once the expense is dated another day than today
function triggerClassOf(isToday) {
  if (isToday) {
    return 'date-trigger'
  }

  return 'date-trigger date-trigger--set'
}

// Short name of a date other than today, shown on the calendar button
function shortLabelOf(value, yesterday) {
  if (value === yesterday) {
    return 'Hier'
  }

  return formatShortDay(value)
}

/**
 * The overview calendar of one month, loaded only while the sheet is open
 * @param {object} props
 * @param {object} props.plan
 * @param {string} props.slotId
 * @param {string} props.value - YYYY-MM-DD
 * @param {(date: string) => void} props.onPick
 */
function DateCalendar({ plan, slotId, value, onPick }) {
  const now = new Date()
  const [month, setMonth] = useState(() => value.slice(0, 7))
  const { days, dailyBudget } = useDailySpending(plan, slotId, month)

  return (
    <section className="calendar">
      <nav className="calendar__nav" aria-label="Mois">
        <button type="button" className="month__step" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mois précédent">
          <svg className="month__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>

        <h3 className="month__label">{formatMonth(month)}</h3>

        <button
          type="button"
          className="month__step"
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={month >= toMonthValue(now)}
          aria-label="Mois suivant"
        >
          <svg className="month__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </nav>

      <MonthCalendar
        days={days}
        firstWeekday={firstWeekdayOf(month)}
        dailyBudget={dailyBudget}
        today={toDateValue(now)}
        selected={value}
        onSelect={onPick}
        pastOnly
      />
    </section>
  )
}

/**
 * Date of an expense behind a calendar button: today by default, yesterday in one tap, any past day from the calendar.
 * The button names the date only once it is not today, keeping the amount row short
 * @param {object} props
 * @param {object} props.plan
 * @param {string} props.slotId - the place this person holds in the plan
 * @param {string} props.value - YYYY-MM-DD
 * @param {(date: string) => void} props.onChange
 */
export default function DatePicker({ plan, slotId, value, onChange }) {
  const now = new Date()
  const today = toDateValue(now)
  const yesterday = dayBefore(now)
  const [open, setOpen] = useState(false)

  function pick(date) {
    onChange(date)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        className={triggerClassOf(value === today)}
        onClick={() => setOpen(true)}
        aria-label={`Date de la dépense : ${formatShortDay(value)}`}
      >
        <Icon name="calendar" className="icon" />
        {value !== today && <span>{shortLabelOf(value, yesterday)}</span>}
      </button>

      <Sheet open={open} title="Date de la dépense" onClose={() => setOpen(false)}>
        <div className="date-sheet">
          <div className="date-picker" role="group" aria-label="Raccourcis de date">
            <button type="button" className={optionClass(value === today)} aria-pressed={value === today} onClick={() => pick(today)}>
              Aujourd&rsquo;hui
            </button>

            <button
              type="button"
              className={optionClass(value === yesterday)}
              aria-pressed={value === yesterday}
              onClick={() => pick(yesterday)}
            >
              Hier
            </button>
          </div>

          <DateCalendar plan={plan} slotId={slotId} value={value} onPick={pick} />
        </div>
      </Sheet>
    </>
  )
}
