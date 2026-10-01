import { formatAmount, formatShare } from '../utils/format.js'

const RADIUS = 70
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Headings splitting each legend, used only when the plan is shared
const LEGEND_GROUPS = [
  { id: 'common', label: 'Part commune' },
  { id: 'own', label: 'Personnel' },
]

/**
 * Legend headings for a plan split between a number of people: a solo plan has nothing to split, its legend stays a
 * single list
 * @param {number} shareCount
 */
export function legendGroupsOf(shareCount) {
  if (shareCount < 2) {
    return undefined
  }

  return LEGEND_GROUPS
}

/**
 * The legend split under its headings, empty groups left out; a single untitled list without groups
 * @param {{ group?: string, value: number }[]} segments
 * @param {{ id: string, label: string }[] | undefined} groups
 */
function legendsOf(segments, groups) {
  if (!groups) {
    return [{ id: 'all', label: '', segments, total: 0 }]
  }

  return groups
    .map((group) => {
      const members = segments.filter((segment) => segment.group === group.id)

      return { ...group, segments: members, total: members.reduce((sum, segment) => sum + segment.value, 0) }
    })
    .filter((legend) => !!legend.segments.length)
}

/**
 * Donut chart with its legend, drawn as plain SVG so the app keeps no chart dependency
 * @param {object} props
 * @param {string} props.title
 * @param {{ id: string, label: string, value: number, tone: string, group?: string, note?: string }[]} props.slices - note: one short line under the label
 * @param {{ id: string, label: string }[]} [props.groups] - headings splitting the legend, matched on each slice's group
 * @param {boolean} [props.showTotal] - the sum of the slices written under the donut
 * @param {import('react').ReactNode} [props.actions] - controls beside the title
 */
export default function PieChart({ title, slices, groups, showTotal, actions }) {
  const visible = slices.filter((slice) => slice.value > 0)
  const total = visible.reduce((sum, slice) => sum + slice.value, 0)

  // The title, with its controls when the chart has some
  const caption = (
    <figcaption className="chart__head">
      <span className="chart__title">{title}</span>
      {actions}
    </figcaption>
  )

  if (!total) {
    return (
      <figure className="chart">
        {caption}
        <p className="section__hint">Rien à afficher pour le moment.</p>
      </figure>
    )
  }

  // Each arc starts where the previous one stopped
  let start = 0

  const segments = visible.map((slice) => {
    const share = slice.value / total
    const segment = { ...slice, share, offset: -start * CIRCUMFERENCE }

    start += share

    return segment
  })

  return (
    <figure className="chart">
      {caption}

      <svg className="chart__svg" viewBox="0 0 200 200" role="img" aria-label={title}>
        <g transform="rotate(-90 100 100)">
          <circle className="chart__track" cx="100" cy="100" r={RADIUS} />

          {segments.map((segment, index) => (
            <circle
              key={`slice-${segment.id}-${index}`}
              className={`chart__slice chart__slice--${segment.tone}`}
              cx="100"
              cy="100"
              r={RADIUS}
              strokeDasharray={`${segment.share * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={segment.offset}
            />
          ))}
        </g>
      </svg>

      {showTotal && (
        <p className="chart__total">
          Total <strong className="chart__total-value">{formatAmount(total)}</strong>
        </p>
      )}

      <div className="chart__legends">
        {legendsOf(segments, groups).map((legend, legendIndex) => (
          <section key={`legend-${legend.id}-${legendIndex}`} className={`legend legend--${legend.id}`}>
            {!!legend.label && (
              <header className="legend__header">
                <h4 className="legend__title">{legend.label}</h4>
                <span className="legend__subtotal">{formatAmount(legend.total)}</span>
              </header>
            )}

            <ul className="legend__list">
              {legend.segments.map((segment, index) => (
                <li key={`legend-item-${segment.id}-${index}`} className="legend__item">
                  <span className={`swatch swatch--${segment.tone}`} aria-hidden="true" />
                  <span className="legend__label">
                    {segment.label}
                    {!!segment.note && <small className="legend__note">{segment.note}</small>}
                  </span>
                  <span className="legend__share">{formatShare(segment.share)}</span>
                  <span className="legend__value">{formatAmount(segment.value)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </figure>
  )
}
