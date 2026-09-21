import { useRef, useState } from 'react'
import { formatAmount } from '../utils/format.js'
import { loadPreference, savePreference } from '../utils/storage.js'
import { toDateValue } from '../utils/tracking.js'

const LAST_LINE_KEY = 'last-line'

// Accepts both "12.50" and "12,50", the Swiss keyboard habit
function parseAmount(value) {
  const amount = Number(value.replace(',', '.'))

  if (!Number.isFinite(amount)) {
    return 0
  }

  return amount
}

// Colour class of a category chip, neutral for lines outside any sub-group
function chipClass(color) {
  if (!color) {
    return 'chip'
  }

  return `chip subgroup--${color}`
}

/**
 * Category chips of one scope, grouped by sub-group
 * @param {object} props
 * @param {object} props.scope - a scope of the tracking tree
 * @param {string | undefined} props.selected
 * @param {(id: string) => void} props.onSelect
 */
function ScopeChips({ scope, selected, onSelect }) {
  return (
    <fieldset className="quick-add__scope">
      <legend className="quick-add__legend">{scope.label}</legend>

      {[...scope.subgroups, scope.loose]
        .filter((group) => !!group.items.length)
        .map((group, groupIndex) => (
          <ul key={`chips-${group.id}-${groupIndex}`} className="chips">
            {group.items.map((line, index) => (
              <li key={`chip-${line.id}-${index}`}>
                <label className={chipClass(group.color)}>
                  <input
                    type="radio"
                    name="line"
                    value={line.id}
                    checked={selected === line.id}
                    onChange={() => onSelect(line.id)}
                    required
                  />
                  <span>{line.label}</span>
                </label>
              </li>
            ))}
          </ul>
        ))}
    </fieldset>
  )
}

/**
 * Fast entry of an expense: amount, category, date, optional note
 * @param {object} props
 * @param {object[]} props.tracking - scopes from buildTracking
 * @param {(input: { lineId: string, amount: number, spentOn: string, note: string }) => Promise<string | undefined>} props.onAdd
 */
export default function QuickAddExpense({ tracking, onAdd }) {
  const amountRef = useRef(undefined)
  const [amount, setAmount] = useState('')
  const [lineId, setLineId] = useState(() => loadPreference(LAST_LINE_KEY))
  const [spentOn, setSpentOn] = useState(() => toDateValue(new Date()))
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')

  function selectLine(id) {
    setLineId(id)
    savePreference(LAST_LINE_KEY, id)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const value = parseAmount(amount)

    if (value <= 0) {
      setMessage('Saisissez un montant supérieur à zéro.')
      amountRef.current.focus()
      return
    }

    const error = await onAdd({ lineId, amount: value, spentOn, note: note.trim() })

    setMessage(error ?? `${formatAmount(value)} ajouté.`)

    // Amount and note are cleared, category and date kept: several receipts are often typed in a row
    if (!error) {
      setAmount('')
      setNote('')
      amountRef.current.focus()
    }
  }

  return (
    <form className="card quick-add" onSubmit={handleSubmit}>
      <h2 className="quick-add__title">Nouvelle dépense</h2>

      <label className="quick-add__amount">
        <span className="quick-add__currency">CHF</span>
        <input
          ref={amountRef}
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          aria-label="Montant"
          autoFocus
        />
      </label>

      {tracking.map((scope, index) => (
        <ScopeChips key={`chips-scope-${scope.id}-${index}`} scope={scope} selected={lineId} onSelect={selectLine} />
      ))}

      <div className="quick-add__details">
        <label className="form__field">
          <span>Date</span>
          <input type="date" value={spentOn} onChange={(event) => setSpentOn(event.target.value)} required />
        </label>

        <label className="form__field form__field--grow">
          <span>Note</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Migros, cinéma…" />
        </label>

        <button type="submit" className="form__submit quick-add__submit">
          Ajouter
        </button>
      </div>

      {!!message && (
        <p className="quick-add__message" role="status">
          {message}
        </p>
      )}
    </form>
  )
}
