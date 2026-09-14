import { useState } from 'react'
import { formatAmount } from '../utils/format.js'
import Section from './Section.jsx'

// The figures shown above the leftover line
const ROWS = [
  { id: 'income', label: 'Revenu net', field: 'income' },
  { id: 'expenses', label: 'Dépenses (impôts inclus)', field: 'expenses' },
  { id: 'savings', label: 'Épargne', field: 'savings' },
]

// Flags the leftover figures so an over-allocated budget is obvious
function toneFor(value) {
  if (value < 0) {
    return 'summary__amount summary__amount--negative'
  }

  return 'summary__amount summary__amount--positive'
}

/**
 * Recap of the plan, one column per person plus the household total
 * @param {object} props
 * @param {{ id: string, label: string, monthly: object, annual: object }[]} props.columns
 */
export default function SummarySection({ columns }) {
  const [period, setPeriod] = useState('monthly')

  const switcher = (
    <span className={`switch switch--${period}`} role="group" aria-label="Période">
      <span className="switch__thumb" aria-hidden="true" />

      <button
        type="button"
        className="switch__option"
        onClick={() => setPeriod('monthly')}
        aria-pressed={period === 'monthly'}
      >
        Par mois
      </button>

      <button
        type="button"
        className="switch__option"
        onClick={() => setPeriod('annual')}
        aria-pressed={period === 'annual'}
      >
        Par an
      </button>
    </span>
  )

  return (
    <Section title="Récapitulatif" tone="summary" actions={switcher}>

      <table className="summary">
        <thead>
          <tr>
            <th scope="col">Poste</th>

            {columns.map((column, index) => (
              <th key={`head-${column.id}-${index}`} scope="col" className="summary__figure">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {ROWS.map((row, rowIndex) => (
            <tr key={`recap-${row.id}-${rowIndex}`}>
              <th scope="row" className={`summary__label summary__label--${row.id}`}>
                {row.label}
              </th>

              {columns.map((column, index) => (
                <td key={`cell-${row.id}-${column.id}-${index}`} className="summary__figure">
                  {formatAmount(column[period][row.field])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr>
            <th scope="row">Reste</th>

            {columns.map((column, index) => (
              <td key={`rest-${column.id}-${index}`} className="summary__figure">
                <strong className={toneFor(column[period].remaining)}>
                  {formatAmount(column[period].remaining)}
                </strong>
              </td>
            ))}
          </tr>
        </tfoot>
      </table>

      <p className="section__hint">
        Les dépenses communes sont partagées à parts égales. Chacun porte ses propres impôts et son
        épargne, plus sa part des lignes communes. Le reste annuel ne dépend pas du décompte des
        impôts.
      </p>
    </Section>
  )
}
