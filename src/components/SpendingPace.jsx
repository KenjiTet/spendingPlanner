import { useState } from 'react'
import { formatAmount, formatAxisAmount, formatShortDay } from '../utils/format.js'

// Drawing box of the SVG, the text scaling with the card width
const WIDTH = 360
const HEIGHT = 210
const PAD = { top: 12, right: 12, bottom: 26, left: 44 }
const PLOT_WIDTH = WIDTH - PAD.left - PAD.right
const PLOT_HEIGHT = HEIGHT - PAD.top - PAD.bottom

// Rounds the top of the axis up to a readable value: 3299 becomes 3500
function niceCeil(value) {
  const magnitude = 10 ** Math.floor(Math.log10(value))

  return (Math.ceil((value / magnitude) * 2) / 2) * magnitude
}

// Where the month stands against its pace on the last lived day
function statusOf(point) {
  if (!point) {
    return 'Le mois n’a pas encore commencé.'
  }

  const gap = point.spent - point.planned

  if (gap > 0) {
    return `${formatAmount(gap)} au-dessus du rythme prévu`
  }

  return `${formatAmount(Math.abs(gap))} sous le rythme prévu`
}

// SVG path through the given points, moving to the first one then drawing to the others
function pathOf(points) {
  const [first, ...rest] = points

  return [`M${first.x},${first.y}`, ...rest.map((point) => `L${point.x},${point.y}`)].join(' ')
}

/**
 * Burn-up chart of the month: the running total of the expenses against the even pace of the daily budget.
 * Hovering or tapping a day reads its figures above the plot
 * @param {object} props
 * @param {{ date: string, day: number, spent?: number, planned: number }[]} props.points - from spendingPaceOf
 */
export default function SpendingPace({ points }) {
  const lived = points.filter((point) => point.spent !== undefined)
  const lastLived = lived[lived.length - 1]
  const [hoveredIndex, setHoveredIndex] = useState(undefined)

  const top = niceCeil(Math.max(points[points.length - 1].planned, ...lived.map((point) => point.spent), 1))
  const xOf = (index) => PAD.left + (index / (points.length - 1)) * PLOT_WIDTH
  const yOf = (value) => PAD.top + PLOT_HEIGHT - (value / top) * PLOT_HEIGHT
  const baseline = yOf(0)

  const plannedPath = pathOf([
    { x: xOf(0), y: yOf(points[0].planned) },
    { x: xOf(points.length - 1), y: yOf(points[points.length - 1].planned) },
  ])
  // Nothing to draw for the spending of a month still to come
  let spentPath = ''
  let areaPath = ''

  if (!!lived.length) {
    spentPath = pathOf(lived.map((point, index) => ({ x: xOf(index), y: yOf(point.spent) })))
    areaPath = `${spentPath} L${xOf(lived.length - 1)},${baseline} L${xOf(0)},${baseline} Z`
  }

  const ticks = [0, top / 2, top]
  const dayTicks = [1, 8, 15, 22, points.length]

  // The readout follows the pointer, and rests on the last lived day otherwise
  let readIndex = hoveredIndex

  if (readIndex === undefined) {
    readIndex = Math.max(lived.length - 1, 0)
  }

  const read = points[readIndex]

  // Maps the pointer to the nearest day of the plot
  function handlePointer(event) {
    const box = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - box.left) / box.width) * WIDTH
    const index = Math.round(((x - PAD.left) / PLOT_WIDTH) * (points.length - 1))

    setHoveredIndex(Math.min(Math.max(index, 0), points.length - 1))
  }

  return (
    <figure className="card pace">
      <figcaption className="calendar__caption">
        <span className="chart__title">Rythme du mois</span>
        <span className="section__hint">{statusOf(lastLived)}</span>
      </figcaption>

      <p className="pace__readout" aria-live="polite">
        <span className="pace__date">{formatShortDay(read.date)}</span>

        {read.spent !== undefined && (
          <span>
            Dépensé <strong>{formatAmount(read.spent)}</strong>
          </span>
        )}

        <span>
          Prévu <strong>{formatAmount(read.planned)}</strong>
        </span>
      </p>

      <svg
        className="pace__svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Dépenses cumulées du mois face au rythme prévu : ${statusOf(lastLived)}`}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setHoveredIndex(undefined)}
      >
        {ticks.map((tick, index) => (
          <g key={`pace-tick-${tick}-${index}`}>
            <line className="pace__grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={yOf(tick)} y2={yOf(tick)} />
            <text className="pace__axis" x={PAD.left - 6} y={yOf(tick)} textAnchor="end" dominantBaseline="middle">
              {formatAxisAmount(tick)}
            </text>
          </g>
        ))}

        {dayTicks.map((day, index) => (
          <text
            key={`pace-day-${day}-${index}`}
            className="pace__axis"
            x={xOf(day - 1)}
            y={HEIGHT - 8}
            textAnchor="middle"
          >
            {day}
          </text>
        ))}

        <path className="pace__planned" d={plannedPath} />

        {!!lived.length && <path className="pace__area" d={areaPath} />}
        {!!lived.length && <path className="pace__spent" d={spentPath} />}

        <line className="pace__cursor" x1={xOf(readIndex)} x2={xOf(readIndex)} y1={PAD.top} y2={baseline} />

        {read.spent !== undefined && (
          <circle className="pace__dot" cx={xOf(readIndex)} cy={yOf(read.spent)} r="4.5" />
        )}
      </svg>

      <ul className="pace__legend">
        <li className="pace__key">
          <span className="pace__swatch" aria-hidden="true" />
          Dépensé (cumulé)
        </li>
        <li className="pace__key">
          <span className="pace__swatch pace__swatch--planned" aria-hidden="true" />
          Rythme prévu
        </li>
      </ul>
    </figure>
  )
}
