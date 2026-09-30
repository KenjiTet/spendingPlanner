import { sectionAnchor } from '../utils/anchors.js'
import { formatAmount } from '../utils/format.js'
import { monthlyTaxOf, toAmount } from '../utils/plan.js'
import AmountInput from './AmountInput.jsx'
import Section from './Section.jsx'

// The two ways of paying the tax, offered to each person
const TIMINGS = [
  { id: 'monthly', label: 'Par mois' },
  { id: 'yearly', label: 'Par an' },
]

// Editable rows read as a budget line, the others as a locked one
function lineClassOf(editable) {
  if (editable) {
    return 'line tax__line'
  }

  return 'line line--locked'
}

// Label of the timing a person chose, monthly unless set otherwise
function timingLabelOf(person) {
  const chosen = TIMINGS.find((timing) => timing.id === person.taxTiming)

  return (chosen ?? TIMINGS[0]).label
}

/**
 * What leaves the account, and when, for one person
 * @param {{ annualTax: number | string, taxTiming?: string }} person
 */
function paymentOf(person) {
  if (person.taxTiming === 'yearly') {
    return `${formatAmount(toAmount(person.annualTax))} en une fois`
  }

  return `${formatAmount(monthlyTaxOf(person))} / mois`
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
  return (
    <Section
      title="Impôts"
      id={sectionAnchor('tax')}
      tone="tax"
      actions={<span className="section__total">{formatAmount(annualTax)} / an</span>}
    >
      <ul className="tax__people">
        {people.map((person, index) => {
          const editable = editableIds.includes(person.id)

          return (
            <li key={`tax-${person.id}-${index}`} className="tax__person">
              {/* Name, payment timing and yearly amount on a single row */}
              <div className={lineClassOf(editable)}>
                <span className="line__name">{person.label}</span>

                {editable && (
                  <span className="switch switch--segmented" role="group" aria-label={`Paiement des impôts de ${person.label}`}>
                    {TIMINGS.map((timing, timingIndex) => (
                      <button
                        key={`timing-${person.id}-${timing.id}-${timingIndex}`}
                        type="button"
                        className="switch__option"
                        onClick={() => onUpdateTaxTiming(person.id, timing.id)}
                        aria-pressed={(person.taxTiming ?? 'monthly') === timing.id}
                      >
                        {timing.label}
                      </button>
                    ))}
                  </span>
                )}

                {/* The other person's choice is only shown, never offered as a control */}
                {!editable && <span className="tax__timing">{timingLabelOf(person)}</span>}

                {/* The yearly amount, with what it takes and when right under it */}
                <span className="tax__figure">
                  {editable && (
                    <AmountInput
                      className="line__amount"
                      min="0"
                      step="100"
                      value={person.annualTax}
                      onChange={(event) => onUpdateTax(person.id, event.target.value)}
                      placeholder="0"
                      aria-label={`Impôts de ${person.label} par an`}
                    />
                  )}

                  {!editable && <span className="line__total">{formatAmount(toAmount(person.annualTax))}</span>}
                  <small className="tax__payment">{paymentOf(person)}</small>
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
