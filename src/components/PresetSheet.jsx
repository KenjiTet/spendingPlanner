import { useState } from 'react'
import { formatAmount, parseAmount } from '../utils/format.js'
import CategorySelect from './CategorySelect.jsx'
import PresetList from './PresetList.jsx'
import Sheet from './Sheet.jsx'
import Toast from './Toast.jsx'

/**
 * Form of a new shortcut, mounted with the sheet so it always opens blank, no category chosen in advance
 * @param {object} props
 * @param {{ id: string, label: string, color?: string, lines: { id: string, label: string }[] }[]} props.groups
 * @param {Record<string, { label: string }>} props.lines - from indexLines
 * @param {(input: { lineId: string, label: string, amount: number }) => void} props.onAdd
 */
function PresetForm({ groups, lines, onAdd }) {
  const [amount, setAmount] = useState('')
  const [lineId, setLineId] = useState(undefined)
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    const value = parseAmount(amount)

    if (!lineId) {
      setError('Choisissez une catégorie.')
      return
    }

    if (value <= 0) {
      setError('Saisissez un montant supérieur à zéro.')
      return
    }

    // A shortcut is named after its category, which also becomes the note of its expenses
    onAdd({ lineId, label: lines[lineId].label, amount: value })
    setAmount('')
    setLineId(undefined)
    setError('')
  }

  return (
    <form className="presets__form" onSubmit={handleSubmit}>
      <h3 className="quick-add__legend">Nouveau raccourci</h3>

      <div className="form__field presets__category">
        <span>Catégorie</span>
        <CategorySelect groups={groups} value={lineId} onChange={setLineId} />
      </div>

      <label className="form__field presets__amount">
        <span>Montant (CHF)</span>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="2.00"
          required
        />
      </label>

      <button type="submit" className="form__submit quick-add__submit">
        Créer le raccourci
      </button>

      {!!error && <p className="actions__error">{error}</p>}
    </form>
  )
}

/**
 * Creates and deletes the one-tap expenses: a category and a fixed amount, short enough never to scroll
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {{ id: string, line_id: string, label: string, amount: number }[]} props.presets
 * @param {{ id: string, label: string, color?: string, lines: { id: string, label: string }[] }[]} props.groups - bookable lines only
 * @param {Record<string, { label: string, color?: string }>} props.lines - from indexLines
 * @param {(input: { lineId: string, label: string, amount: number }) => void} props.onAdd
 * @param {(id: string) => void} props.onRemove
 */
export default function PresetSheet({ open, onClose, presets, groups, lines, onAdd, onRemove }) {
  // Confirmation of the last shortcut created, its id restarting the animation on each one
  const [toast, setToast] = useState(undefined)

  // Creates the shortcut and confirms it with the same pill as a booked expense
  function add(input) {
    onAdd(input)
    setToast({ id: crypto.randomUUID(), text: `Raccourci ${input.label} ${formatAmount(input.amount)} créé` })
  }

  return (
    <>
      <Sheet open={open} title="Raccourcis" fixed onClose={onClose}>
        <div className="presets">
          {!!presets.length && (
            <section className="quick-add__block" aria-label="Raccourcis existants">
              <h3 className="quick-add__legend">Mes raccourcis</h3>
              <PresetList presets={presets} lines={lines} onRemove={onRemove} />
            </section>
          )}

          <PresetForm groups={groups} lines={lines} onAdd={add} />
        </div>
      </Sheet>

      {/* Outside the sheet, so closing it right away never cuts the confirmation short */}
      {!!toast && <Toast key={toast.id} text={toast.text} onDone={() => setToast(undefined)} />}
    </>
  )
}
