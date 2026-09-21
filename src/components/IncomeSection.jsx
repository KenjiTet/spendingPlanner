import { formatAmount } from '../utils/format.js'
import Section from './Section.jsx'

// Explains what the selected tax timing changes for the monthly cash flow
function taxHintFor(taxTiming) {
  if (taxTiming === 'monthly') {
    return 'Les impôts sont provisionnés chaque mois. Le reste mensuel est donc déjà net d\u2019impôts.'
  }

  return 'Les impôts sont payés en fin d\u2019année. Le reste mensuel est plus élevé, la facture annuelle reste due.'
}

/**
 * Net income of each person, their annual tax, and when the tax is deducted
 * @param {object} props
 * @param {{ id: string, label: string, netMonthly: number, annualTax: number }[]} props.people
 * @param {string} props.currentUserId - only this person's figures are editable, names come from the accounts
 * @param {'monthly' | 'yearly'} props.taxTiming
 * @param {number} props.monthlyNetIncome
 * @param {number} props.annualTax
 * @param {(id: string, field: string, value: string) => void} props.onUpdatePerson
 * @param {(key: string, value: string) => void} props.onUpdateSetting
 */
export default function IncomeSection({
  people,
  currentUserId,
  taxTiming,
  monthlyNetIncome,
  annualTax,
  onUpdatePerson,
  onUpdateSetting,
}) {
  return (
    <Section
      title="Revenus"
      tone="income"
      actions={<span className="section__total">{formatAmount(monthlyNetIncome)} / mois</span>}
    >

      <ul className="list__items">
        {people.map((person, index) => (
          <li key={`person-${person.id}-${index}`} className="list__item list__item--fields">
            <label className="form__field form__field--grow">
              <span>Personne</span>
              <input value={person.label} disabled />
            </label>

            <label className="form__field">
              <span>Salaire net / mois</span>
              <input
                type="number"
                min="0"
                step="10"
                value={person.netMonthly}
                onChange={(event) => onUpdatePerson(person.id, 'netMonthly', event.target.value)}
                placeholder="0"
                disabled={person.id !== currentUserId}
              />
            </label>

            <label className="form__field">
              <span>Impôts / an</span>
              <input
                type="number"
                min="0"
                step="100"
                value={person.annualTax}
                onChange={(event) => onUpdatePerson(person.id, 'annualTax', event.target.value)}
                placeholder="0"
                disabled={person.id !== currentUserId}
              />
            </label>
          </li>
        ))}
      </ul>

      <fieldset className="toggle">
        <legend className="toggle__legend">Décompte des impôts ({formatAmount(annualTax)} / an)</legend>

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
          <span>En fin d&rsquo;année</span>
        </label>
      </fieldset>

      <p className="section__hint">{taxHintFor(taxTiming)}</p>
    </Section>
  )
}
