import PieChart, { legendGroupsOf } from './PieChart.jsx'
import { formatAmount } from '../utils/format.js'

// Tells how much of a sub-group was counted on its own, nothing when everything was booked by hand
function autoNoteOf(slice) {
  if (!slice.committed) {
    return undefined
  }

  if (slice.value > slice.committed) {
    return `↻ dont ${formatAmount(slice.committed)} en comptage auto`
  }

  return '↻ comptage automatique'
}

/**
 * What the spent amount of the month is made of, in the donut of the plan's breakdown
 * @param {object} props
 * @param {{ id: string, label: string, value: number, committed: number, tone: string, group: string }[]} props.slices - from spentSlicesOf
 * @param {number} props.shareCount - how many people split the common part
 */
export default function SpentBreakdown({ slices, shareCount }) {
  return (
    <section className="card spent-breakdown" aria-label="Détail des dépenses">
      <PieChart
        title="Détail des dépenses"
        slices={slices.map((slice) => ({ ...slice, note: autoNoteOf(slice) }))}
        groups={legendGroupsOf(shareCount)}
      />
    </section>
  )
}
