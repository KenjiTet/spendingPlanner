import { useState } from 'react'
import { sectionAnchor } from '../utils/anchors.js'
import { formatAmount } from '../utils/format.js'
import Section from './Section.jsx'

// The figures shown above the leftover line
const ROWS = [
  { id: 'income', label: 'Revenu net', field: 'income' },
  { id: 'expenses', label: 'Budget', field: 'expenses' },
  { id: 'tax', label: 'Impôts', field: 'tax' },
  { id: 'savings', label: 'Épargne', field: 'savings' },
]

// Flags the leftover figures so an over-allocated budget is obvious
function toneFor(value) {
  if (value < 0) {
    return 'summary__amount summary__amount--negative'
  }

  return 'summary__amount summary__amount--positive'
}

// On a phone only the chosen column stays visible, the others being set aside
function figureClassOf(columnId, shownId) {
  if (columnId !== shownId) {
    return 'summary__figure summary__figure--aside'
  }

  return 'summary__figure'
}

/**
 * Recap of the plan, one column per person plus the household total, a single chosen one on phones
 * @param {object} props
 * @param {{ id: string, label: string, monthly: object, annual: object }[]} props.columns
 */
export default function SummarySection({ columns }) {
  const [period, setPeriod] = useState('monthly')
  // The household total is shown first on a phone
  const [shownId, setShownId] = useState(columns[columns.length - 1].id)

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
    <Section title="Récapitulatif" id={sectionAnchor('summary')} tone="summary" actions={switcher}>
      {columns.length > 1 && (
        <span className="switch switch--segmented summary__columns" role="group" aria-label="Colonne affichée">
          {columns.map((column, index) => (
            <button
              key={`column-${column.id}-${index}`}
              type="button"
              className="switch__option"
              onClick={() => setShownId(column.id)}
              aria-pressed={column.id === shownId}
            >
              {column.label}
            </button>
          ))}
        </span>
      )}

      {/* Scrolls sideways on a phone rather than squeezing the figures of every column */}
      <div className="summary__scroll">
        <table className="summary">
          <thead>
            <tr>
              <th scope="col">Poste</th>

              {columns.map((column, index) => (
                <th key={`head-${column.id}-${index}`} scope="col" className={figureClassOf(column.id, shownId)}>
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
                  <td key={`cell-${row.id}-${column.id}-${index}`} className={figureClassOf(column.id, shownId)}>
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
                <td key={`rest-${column.id}-${index}`} className={figureClassOf(column.id, shownId)}>
                  <strong className={toneFor(column[period].remaining)}>
                    {formatAmount(column[period].remaining)}
                  </strong>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </Section>
  )
}
