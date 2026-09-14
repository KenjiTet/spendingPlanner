import { formatAmount, formatShare } from '../utils/format.js'

const RADIUS = 70
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Donut chart with its legend, drawn as plain SVG so the app keeps no chart dependency
 * @param {object} props
 * @param {string} props.title
 * @param {{ id: string, label: string, value: number, tone: string }[]} props.slices
 */
export default function PieChart({ title, slices }) {
  const visible = slices.filter((slice) => slice.value > 0)
  const total = visible.reduce((sum, slice) => sum + slice.value, 0)

  if (!total) {
    return (
      <figure className="chart">
        <figcaption className="chart__title">{title}</figcaption>
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
      <figcaption className="chart__title">{title}</figcaption>

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

      <ul className="legend">
        {segments.map((segment, index) => (
          <li key={`legend-${segment.id}-${index}`} className="legend__item">
            <span className={`swatch swatch--${segment.tone}`} aria-hidden="true" />
            <span className="legend__label">{segment.label}</span>
            <span className="legend__share">{formatShare(segment.share)}</span>
            <span className="legend__value">{formatAmount(segment.value)}</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}
