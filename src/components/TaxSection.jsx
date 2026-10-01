import { useState } from 'react'
import { sectionAnchor } from '../utils/anchors.js'
import { formatAmount } from '../utils/format.js'
import { MONTHS_PER_YEAR, toAmount } from '../utils/plan.js'
import AmountInput from './AmountInput.jsx'
import Dropdown from './Dropdown.jsx'
import Section from './Section.jsx'

// The two ways of paying the tax, offered to whoever edits it
const TIMINGS = [
  { id: 'monthly', label: 'Mensuel' },
  { id: 'yearly', label: 'Annuel' },
]

// Monthly unless set otherwise
function timingOf(person) {
  return person.taxTiming ?? 'monthly'
}

// Two decimals at most, so a third of a franc never shows in the field
function roundCents(value) {
  return Math.round(value * 100) / 100
}

/**
 * Yearly amount stored from what was typed in the field, read in the period chosen
 * @param {string} typed
 * @param {boolean} monthly
 */
function annualFromTyped(typed, monthly) {
  if (!typed || !monthly) {
    return typed
  }

  return String(Number(typed) * MONTHS_PER_YEAR)
}

/**
 * The tax of one place this person may edit, typed in the period they pay it, the other period under it
 * @param {object} props
 * @param {{ id: string, label: string, annualTax: number | string, taxTiming?: string }} props.person
 * @param {(id: string, value: string) => void} props.onUpdateTax
 */
function EditableTax({ person, onUpdateTax }) {
  // What is being typed, kept as is so a decimal point survives the monthly ↔ yearly conversion
  const [draft, setDraft] = useState(undefined)
  const monthly = timingOf(person) === 'monthly'
  const annual = toAmount(person.annualTax)
  const amountId = `tax-amount-${person.id}`

  // The field shows the chosen period, the hint the other one
  let shown = person.annualTax
  let unit = '/ an'
  let hint = `${formatAmount(annual / MONTHS_PER_YEAR)} / mois`

  if (monthly) {
    shown = roundCents(annual / MONTHS_PER_YEAR)
    unit = '/ mois'
    hint = `${formatAmount(annual)} / an`
  }

  function handleChange(event) {
    setDraft(event.target.value)
    onUpdateTax(person.id, annualFromTyped(event.target.value, monthly))
  }

  return (
    <div className="line tax__line">
      <label className="line__name" htmlFor={amountId}>{person.label}</label>

      {/* The amount in the chosen period, the other period in small right under it */}
      <span className="tax__figure">
        <span className="tax__amount">
          <AmountInput
            id={amountId}
            className="line__amount"
            min="0"
            step="any"
            value={draft ?? shown}
            onChange={handleChange}
            onBlur={() => setDraft(undefined)}
            placeholder="0"
          />
          <span className="tax__unit">{unit}</span>
        </span>
        <small className="tax__hint">{hint}</small>
      </span>
    </div>
  )
}

/**
 * The yearly tax of each person of the plan, each paying it every month or once a year
 * @param {object} props
 * @param {{ id: string, label: string, annualTax: number | string, taxTiming?: string }[]} props.people
 * @param {string[]} props.editableIds - places whose tax this person may change
 * @param {number} props.annualTax - the household total
 * @param {(id: string, value: string) => void} props.onUpdateTax
 * @param {(id: string, value: string) => void} props.onUpdateTaxTiming
 */
export default function TaxSection({ people, editableIds, annualTax, onUpdateTax, onUpdateTaxTiming }) {
  const editablePeople = people.filter((person) => editableIds.includes(person.id))

  // One choice for every place this person edits, read from the first of them
  function handleTimingChange(timing) {
    editablePeople.forEach((person) => onUpdateTaxTiming(person.id, timing))
  }

  return (
    <Section
      title="Impôts"
      id={sectionAnchor('tax')}
      tone="tax"
      actions={<span className="section__total">{formatAmount(annualTax)} / an</span>}
    >
      {!!editablePeople.length && (
        <div className="tax__timing">
          <span>Type de paiement</span>
          <Dropdown options={TIMINGS} value={timingOf(editablePeople[0])} onChange={handleTimingChange} label="Type de paiement" />
        </div>
      )}

      <ul className="tax__people">
        {people.map((person, index) => {
          const editable = editableIds.includes(person.id)

          return (
            <li key={`tax-${person.id}-${index}`}>
              {editable && <EditableTax person={person} onUpdateTax={onUpdateTax} />}

              {/* The other person's yearly amount only: how they pay it is theirs */}
              {!editable && (
                <div className="line line--locked">
                  <span className="line__name">{person.label}</span>
                  <span className="line__total">{formatAmount(toAmount(person.annualTax))} / an</span>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
