import Gauge from './Gauge.jsx'

// Colour class of a card, neutral for the lines outside any sub-group
function cardClass(color) {
  if (!color) {
    return 'budget-card'
  }

  return `budget-card subgroup--${color}`
}

/**
 * Gauges of every line of one sub-group, headed by the sub-group total
 * @param {object} props
 * @param {{ label: string, color?: string, items: object[], spent: number, budget: number, fill: number, status: string }} props.group
 */
function GaugeCard({ group }) {
  return (
    <article className={cardClass(group.color)}>
      <Gauge
        label={group.label}
        spent={group.spent}
        budget={group.budget}
        fill={group.fill}
        status={group.status}
        size="group"
      />

      <ul className="budget-card__lines">
        {group.items.map((line, index) => (
          <li key={`gauge-${line.id}-${index}`}>
            <Gauge label={line.label} spent={line.spent} budget={line.budget} fill={line.fill} status={line.status} />
          </li>
        ))}
      </ul>
    </article>
  )
}

/**
 * Budget tracking of each scope, one card per sub-group
 * @param {object} props
 * @param {object[]} props.tracking - scopes from buildTracking
 */
export default function BudgetGauges({ tracking }) {
  return (
    <>
      {tracking.map((scope, scopeIndex) => (
        <section key={`budget-${scope.id}-${scopeIndex}`} className="budget">
          <h2 className="budget__title">{scope.label}</h2>

          <ul className="budget__grid">
            {[...scope.subgroups, scope.loose]
              .filter((group) => !!group.items.length)
              .map((group, index) => (
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
