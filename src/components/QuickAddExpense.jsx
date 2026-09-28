import { useEffect, useRef, useState } from 'react'
import { formatAmount, formatShortDay, parseAmount } from '../utils/format.js'
import { toDateValue } from '../utils/tracking.js'
import CategoryGroups from './CategoryGroups.jsx'
import DatePicker from './DatePicker.jsx'
import Icon from './Icon.jsx'
import Sheet from './Sheet.jsx'

// Class carrying the sub-group colour of the budget, neutral for lines outside any sub-group
function toneClass(base, color) {
  if (!color) {
    return base
  }

  return `${base} subgroup--${color}`
}

/**
 * Pinned sub-groups first, the rest keeping its order
 * @param {{ id: string }[]} groups
 * @param {string[]} pinnedIds
 */
function pinnedFirst(groups, pinnedIds) {
  return [
    ...groups.filter((group) => pinnedIds.includes(group.id)),
    ...groups.filter((group) => !pinnedIds.includes(group.id)),
  ]
}

// How long the confirmation stays at the top of the screen
const TOAST_MS = 2500

/**
 * The sub-groups narrowed to the featured lines, the selected one joining them so the current choice stays in sight.
 * A pinned sub-group shows all its lines typed by hand, and comes first; a hidden one shows only a line picked from it
 * @param {{ id: string, lines: { id: string }[] }[]} groups
 * @param {string[]} featured
 * @param {string | undefined} selected
 * @param {string[]} pinnedIds
 * @param {string[]} hiddenIds
 * @param {Set<string>} bookableIds
 */
function visibleGroupsOf(groups, featured, selected, pinnedIds, hiddenIds, bookableIds) {
  const isShown = (group, line) => {
    if (line.id === selected) {
      return true
    }

    if (hiddenIds.includes(group.id)) {
      return false
    }

    return featured.includes(line.id) || (pinnedIds.includes(group.id) && bookableIds.has(line.id))
  }
  const visible = groups
    .map((group) => ({ ...group, lines: group.lines.filter((line) => isShown(group, line)) }))
    .filter((group) => !!group.lines.length)

  return pinnedFirst(visible, pinnedIds)
}

/**
 * "Autre…": every line, automatic debits included, in a sheet where sub-groups are pinned
 * @param {object} props
 * @param {object[]} props.groups - from groupLinesOf
 * @param {string | undefined} props.selected
 * @param {(id: string) => void} props.onSelect
 * @param {string[]} props.pinnedIds
 * @param {(groupId: string, pinned: boolean) => void} props.onTogglePin
 */
function OtherCategory({ groups, selected, onSelect, pinnedIds, onTogglePin }) {
  const [open, setOpen] = useState(false)

  function pick(id) {
    onSelect(id)
    setOpen(false)
  }

  return (
    <>
      <button type="button" className="chip chip--other" onClick={() => setOpen(true)}>
        Autre…
      </button>

      <Sheet
        open={open}
        title="Toutes les catégories"
        description="Épinglez un sous-groupe pour afficher toutes ses catégories sur le formulaire."
        onClose={() => setOpen(false)}
      >
        <CategoryGroups
          groups={pinnedFirst(groups, pinnedIds)}
          selected={selected}
          onSelect={pick}
          pinnedIds={pinnedIds}
          onTogglePin={onTogglePin}
        />
      </Sheet>
    </>
  )
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
      <button
        type="button"
        className="quick-add__history"
        onClick={() => setOpen(true)}
        aria-label="Historique des dépenses"
      >
        <Icon name="history" className="icon" />
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
 * Fast entry of an expense: amount and date on top, the choices scrolling in the middle, the button always in sight
 * @param {object} props
 * @param {object} props.plan - for the calendar of the date picker
 * @param {string} props.slotId - the place this person holds in the plan
 * @param {{ id: string, label: string, color?: string, lines: object[] }[]} props.groups - every bookable line, most used first
 * @param {Record<string, { label: string, color?: string }>} props.lines - from indexLines
 * @param {Set<string>} props.bookableIds - lines typed by hand, automatic debits left out
 * @param {string[]} props.featured - line ids put forward as chips
 * @param {string[]} props.pinnedIds - sub-groups whose lines are always shown
 * @param {string[]} props.hiddenIds - sub-groups taken off the form
 * @param {(groupId: string, pinned: boolean) => void} props.onTogglePin
 * @param {(groupId: string) => void} props.onHideGroup
 * @param {{ id: string, line_id: string, label: string, amount: number }[]} props.presets - one-tap expenses
 * @param {() => void} props.onManagePresets
 * @param {(input: { id?: string, lineId: string, amount: number, spentOn: string, note: string }) => Promise<string | undefined>} props.onAdd
 * @param {object[]} props.history - the viewer's expenses of the month, latest entry first
 * @param {(id: string) => void} props.onRemove
 */
export default function QuickAddExpense({
  plan,
  slotId,
  groups,
  lines,
  bookableIds,
  featured,
  pinnedIds,
  hiddenIds,
  onTogglePin,
  onHideGroup,
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

  // The confirmation leaves on its own
  useEffect(() => {
    if (!toast) {
      return undefined
    }

    const timer = window.setTimeout(() => setToast(undefined), TOAST_MS)

    return () => window.clearTimeout(timer)
  }, [toast])

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
      </div>

      {/* One tap books a shortcut; the last pill opens the sheet where they are created and removed */}
      <section className="quick-add__block" aria-label="Raccourcis">
        <h3 className="quick-add__legend">Raccourcis</h3>

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

      {/* Only this part scrolls, so the shortcuts, "Autre…" and the button never leave the screen */}
      <div className="quick-add__scroll">
        <section className="quick-add__block" aria-label="Catégorie">
          <h3 className="quick-add__legend">Catégorie</h3>

          <CategoryGroups
            groups={visibleGroupsOf(groups, featured, lineId, pinnedIds, hiddenIds, bookableIds)}
            selected={lineId}
            onSelect={setLineId}
            onHide={onHideGroup}
          />
        </section>
      </div>

      <footer className="quick-add__footer">
        <OtherCategory
          groups={groups}
          selected={lineId}
          onSelect={setLineId}
          pinnedIds={pinnedIds}
          onTogglePin={onTogglePin}
        />

        {!!message && (
          <p className="quick-add__message" role="alert">
            {message}
          </p>
        )}

        <div className="quick-add__actions">
          <button type="submit" className="form__submit quick-add__submit">
            Ajouter
          </button>

          <ExpenseHistorySheet history={history} lines={lines} onEdit={edit} onRemove={onRemove} />
        </div>
      </footer>

      {!!toast && (
        <p key={toast.id} className="toast" role="status">
          <Icon name="check" className="icon" />
          {toast.text}
        </p>
      )}
    </form>
  )
}
