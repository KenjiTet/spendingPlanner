import { sectionAnchor } from '../utils/anchors.js'
import { formatAmount } from '../utils/format.js'
import { MONTHS_PER_YEAR, toAmount } from '../utils/plan.js'
import Section from './Section.jsx'

// Explains what the selected tax timing changes for the monthly cash flow
function taxHintFor(taxTiming) {
  if (taxTiming === 'monthly') {
    return 'Les impôts sont provisionnés chaque mois. Le reste mensuel est donc déjà net d’impôts.'
  }

  return 'Les impôts sont payés en fin d’année. Le reste mensuel est plus élevé, la facture annuelle reste due.'
}

/**
 * The tax of each person of the plan, and whether it is paid every month or once a year
 * @param {object} props
 * @param {{ id: string, label: string, annualTax: number | string }[]} props.people
 * @param {string[]} props.editableIds - places whose tax this person may change
 * @param {'monthly' | 'yearly'} props.taxTiming
 * @param {number} props.annualTax - the household total
 * @param {(id: string, value: string) => void} props.onUpdateTax
 * @param {(key: string, value: string) => void} props.onUpdateSetting
 */
export default function TaxSection({ people, editableIds, taxTiming, annualTax, onUpdateTax, onUpdateSetting }) {
  return (
    <Section
      title="Impôts"
      id={sectionAnchor('tax')}
      tone="tax"
      actions={<span className="section__total">{formatAmount(annualTax)} / an</span>}
    >
      <ul className="list__items">
        {people.map((person, index) => (
          <li key={`tax-${person.id}-${index}`} className="list__item tax__item">
            <label className="form__field form__field--grow">
              <span>Impôts de {person.label} / an</span>
              <input
                type="number"
                min="0"
                step="100"
                value={person.annualTax}
                onChange={(event) => onUpdateTax(person.id, event.target.value)}
                placeholder="0"
                disabled={!editableIds.includes(person.id)}
              />
            </label>

            <span className="tax__monthly">{formatAmount(toAmount(person.annualTax) / MONTHS_PER_YEAR)} / mois</span>
          </li>
        ))}
      </ul>

      <fieldset className="toggle">
        <legend className="toggle__legend">Paiement</legend>

        <label className="toggle__option">
          <input
            type="radio"
            name="taxTiming"
            value="monthly"
            checked={taxTiming === 'monthly'}
            onChange={(event) => onUpdateSetting('taxTiming', event.target.value)}
          />
          <span>Chaque mois</span>
        </label>

        <label className="toggle__option">
          <input
            type="radio"
            name="taxTiming"
            value="yearly"
            checked={taxTiming === 'yearly'}
            onChange={(event) => onUpdateSetting('taxTiming', event.target.value)}
          />
          <span>Une fois par an</span>
        </label>
      </fieldset>

      <p className="section__hint">{taxHintFor(taxTiming)}</p>
    </Section>
  )
}
