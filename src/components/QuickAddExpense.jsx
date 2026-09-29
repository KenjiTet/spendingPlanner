import { useRef, useState } from 'react'
import { formatAmount, formatShortDay, parseAmount } from '../utils/format.js'
import { toDateValue } from '../utils/tracking.js'
import CategoryGroups from './CategoryGroups.jsx'
import DatePicker from './DatePicker.jsx'
import Icon from './Icon.jsx'
import Sheet from './Sheet.jsx'
import Toast from './Toast.jsx'

// Class carrying the sub-group colour of the budget, neutral for lines outside any sub-group
function toneClass(base, color) {
  if (!color) {
    return base
  }

  return `${base} subgroup--${color}`
}

/**
 * The sub-groups narrowed to the offered lines, the selected one joining them so a corrected expense stays in sight
 * @param {{ id: string, lines: { id: string }[] }[]} groups
 * @param {Set<string>} offeredIds
 * @param {string | undefined} selected
 */
function shownGroupsOf(groups, offeredIds, selected) {
  return groups
    .map((group) => ({ ...group, lines: group.lines.filter((line) => offeredIds.has(line.id) || line.id === selected) }))
    .filter((group) => !!group.lines.length)
}

/**
 * The viewer's expenses of the month in a sheet, latest entry first, each one correctable or removable
 * @param {object} props
 * @param {{ id: string, line_id: string, amount: number, spent_on: string }[]} props.history
 * @param {Record<string, { label: string }>} props.lines - from indexLines
 * @param {(expense: object) => void} props.onEdit
 * @param {(id: string) => void} props.onRemove
 */
function ExpenseHistorySheet({ history, lines, onEdit, onRemove }) {
  const [open, setOpen] = useState(false)

  function edit(expense) {
    setOpen(false)
    onEdit(expense)
  }

  return (
    <>
      <button type="button" className="quick-add__history" onClick={() => setOpen(true)}>
        <Icon name="history" className="icon" />
        Historique des dépenses
      </button>

      <Sheet
        open={open}
        title="Historique"
        description="Vos dépenses de ce mois, les dernières saisies en premier."
        tall
        onClose={() => setOpen(false)}
      >
        {!history.length && <p className="section__hint">Aucune dépense ce mois-ci.</p>}

        {!!history.length && (
          <ul className="recent__list">
            {history.map((expense, index) => (
              <li key={`history-${expense.id}-${index}`} className="recent__item">
                <span className="recent__label">
                  {lines[expense.line_id]?.label ?? 'Ligne supprimée'}
                  <span className="recent__date"> · {formatShortDay(expense.spent_on)}</span>
                </span>
                <span className="recent__amount">{formatAmount(expense.amount)}</span>

                {!!lines[expense.line_id] && (
                  <button type="button" className="recent__action" onClick={() => edit(expense)}>
                    Modifier
                  </button>
                )}

                <button
                  type="button"
                  className="recent__action recent__action--delete"
                  onClick={() => onRemove(expense.id)}
                  aria-label={`Supprimer ${lines[expense.line_id]?.label ?? ''} ${formatAmount(expense.amount)}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  )
}

/**
 * Fast entry of an expense: the filter on top, the choices scrolling in the middle, the amount and the button at the
 * bottom, under the thumb
 * @param {object} props
 * @param {object} props.plan - for the calendar of the date picker
 * @param {string} props.slotId - the place this person holds in the plan
 * @param {{ id: string, label: string }[]} props.scopes - parts of the plan to filter the categories on, none on a solo plan
 * @param {string} props.scope - the part shown
 * @param {(scope: string) => void} props.onScopeChange
 * @param {{ id: string, label: string, color?: string, lines: object[] }[]} props.groups - every line of the viewer, most used first
 * @param {Set<string>} props.offeredIds - lines shown as categories: typed by hand and in the part of the plan filtered on
 * @param {Record<string, { label: string, color?: string }>} props.lines - from indexLines
 * @param {{ id: string, line_id: string, label: string, amount: number }[]} props.presets - one-tap expenses
 * @param {() => void} props.onManagePresets
 * @param {(input: { id?: string, lineId: string, amount: number, spentOn: string, note: string }) => Promise<string | undefined>} props.onAdd
 * @param {object[]} props.history - the viewer's expenses of the month, latest entry first
 * @param {(id: string) => void} props.onRemove
 */
export default function QuickAddExpense({
  plan,
  slotId,
  scopes,
  scope,
  onScopeChange,
  groups,
  offeredIds,
  lines,
  presets,
  onManagePresets,
  history,
  onAdd,
  onRemove,
}) {
  const amountRef = useRef(undefined)
  const [amount, setAmount] = useState('')
  // No category is chosen in advance: a wrong default would be booked without a second look
  const [lineId, setLineId] = useState(undefined)
  const [spentOn, setSpentOn] = useState(() => toDateValue(new Date()))
  const [message, setMessage] = useState('')
  // Confirmation shown at the top of the screen, its id restarting the animation on each entry
  const [toast, setToast] = useState(undefined)

  // Books an expense and confirms it at the top of the screen
  async function book(input) {
    const id = crypto.randomUUID()
    const error = await onAdd({ ...input, id, spentOn, note: input.note ?? '' })

    setMessage(error ?? '')

    if (!error) {
      setToast({ id, text: `${lines[input.lineId].label} ${formatAmount(input.amount)} a été ajouté` })
    }

    return error
  }

  // A shortcut books right away on the chosen date, the form itself left untouched
  function bookPreset(preset) {
    book({ lineId: preset.line_id, amount: preset.amount, note: lines[preset.line_id].label })
  }

  // Correcting an expense takes it back into the form, to be fixed and added again
  function edit(expense) {
    onRemove(expense.id)
    setAmount(expense.amount.toFixed(2))
    setLineId(expense.line_id)
    setSpentOn(expense.spent_on)
    setMessage('')
    amountRef.current.focus()
  }

  // A category of another part of the plan would stay selected out of sight
  function changeScope(next) {
    setLineId(undefined)
    onScopeChange(next)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const value = parseAmount(amount)

    if (value <= 0) {
      setMessage('Saisissez un montant supérieur à zéro.')
      amountRef.current.focus()
      return
    }

    if (!lineId) {
      setMessage('Choisissez une catégorie.')
      return
    }

    const error = await book({ lineId, amount: value })

    // The form starts over, the date kept: several receipts of the same day are often typed in a row
    if (!error) {
      setAmount('')
      setLineId(undefined)
    }
  }

  return (
    <form className="card quick-add" onSubmit={handleSubmit}>
      <header className="quick-add__header">
        <ExpenseHistorySheet history={history} lines={lines} onEdit={edit} onRemove={onRemove} />
      </header>

      <section className="quick-add__categories" aria-label="Catégorie">
        {/* The filter sits beside the title, outside the scrolling part so it stays in sight */}
        <header className="quick-add__heading">
          <h3 className="quick-add__title">Catégorie</h3>

          {!!scopes.length && (
            <span className="switch switch--segmented switch--small" role="group" aria-label="Catégories affichées">
              {scopes.map((option, index) => (
                <button
                  key={`scope-${option.id}-${index}`}
                  type="button"
                  className="switch__option"
                  onClick={() => changeScope(option.id)}
                  aria-pressed={option.id === scope}
                >
                  {option.label}
                </button>
              ))}
            </span>
          )}
        </header>

        {/* Only this part scrolls, so the shortcuts, the amount and the button never leave the screen */}
        <div className="quick-add__scroll">
          <CategoryGroups groups={shownGroupsOf(groups, offeredIds, lineId)} selected={lineId} onSelect={setLineId} />
        </div>
      </section>

      {/* One tap books a shortcut; the last pill opens the sheet where they are created and removed */}
      <section className="quick-add__block" aria-label="Raccourcis">
        <h3 className="quick-add__title">Raccourcis</h3>

        <ul className="chips">
          {presets.map((preset, index) => (
            <li key={`preset-chip-${preset.id}-${index}`}>
              <button
                type="button"
                className={toneClass('chip', lines[preset.line_id].color)}
                onClick={() => bookPreset(preset)}
              >
                {lines[preset.line_id].label}
                <span className="chip__amount">{formatAmount(preset.amount)}</span>
              </button>
            </li>
          ))}

          <li>
            <button type="button" className="chip chip--other" onClick={onManagePresets}>
              + Ajouter
            </button>
          </li>
        </ul>
      </section>

      <footer className="quick-add__footer">
        {!!message && (
          <p className="quick-add__message" role="alert">
            {message}
          </p>
        )}

        {/* Date, amount and button on one row at the bottom, within reach of the thumb */}
        <div className="quick-add__amount">
          <DatePicker plan={plan} slotId={slotId} value={spentOn} onChange={setSpentOn} />

          <label className="quick-add__field">
            <span className="quick-add__currency">CHF</span>
            <input
              ref={amountRef}
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              aria-label="Montant"
            />
          </label>

          <button type="submit" className="form__submit quick-add__submit">
            Ajouter
          </button>
        </div>
      </footer>

      {!!toast && <Toast key={toast.id} text={toast.text} onDone={() => setToast(undefined)} />}
    </form>
  )
}
