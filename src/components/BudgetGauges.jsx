import { useState } from 'react'
import Gauge from './Gauge.jsx'
import { manualGroupsOf } from '../utils/tracking.js'

// Singular or plural count of the lines behind a group gauge
function detailLabelOf(count) {
  if (count === 1) {
    return 'Détail · 1 ligne'
  }

  return `Détail · ${count} lignes`
}

/**
 * Gauge of one sub-group, its lines unfolding on a click
 * @param {object} props
 * @param {{ label: string, color?: string, items: object[], spent: number, budget: number, fill: number, status: string }} props.group
 */
function GaugeCard({ group }) {
  const [open, setOpen] = useState(false)

  return (
    <article className="budget-card">
      {/* The toggle stretches over the whole head, so the group gauge itself is clickable */}
      <div className="budget-card__head">
        <Gauge
          label={group.label}
          spent={group.spent}
          budget={group.budget}
          fill={group.fill}
          status={group.status}
          size="group"
        />

        <button type="button" className="budget-card__toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span>{detailLabelOf(group.items.length)}</span>
          <span className="chevron" aria-hidden="true" />
        </button>
      </div>

      {open && (
        <ul className="budget-card__lines">
          {group.items.map((line, index) => (
            <li key={`gauge-${line.id}-${index}`}>
              <Gauge label={line.label} spent={line.spent} budget={line.budget} fill={line.fill} status={line.status} />
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

/**
 * Budget tracking of each scope, one card per sub-group, automatic debits left out since they need no follow-up
 * @param {object} props
 * @param {object[]} props.tracking - scopes from buildTracking
 * @param {import('react').ReactNode} [props.actions] - controls beside the first title
 * @param {string} [props.note] - one line under the first title
 */
export default function BudgetGauges({ tracking, actions, note }) {
  // A scope made only of automatic debits has nothing left to follow
  const scopes = tracking
    .map((scope) => ({ ...scope, groups: manualGroupsOf(scope) }))
    .filter((scope) => !!scope.groups.length)

  return (
    <>
      {scopes.map((scope, scopeIndex) => (
        <section key={`budget-${scope.id}-${scopeIndex}`} className="budget">
          <header className="budget__head">
            <h2 className="budget__title">{scope.label}</h2>
            {scopeIndex === 0 && actions}
          </header>

          {scopeIndex === 0 && !!note && <p className="section__hint">{note}</p>}

          <ul className="budget__grid">
            {scope.groups.map((group, index) => (
              <li key={`budget-group-${group.id}-${index}`}>
                <GaugeCard group={group} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
