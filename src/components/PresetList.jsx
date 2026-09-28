import { formatAmount } from '../utils/format.js'

// Class carrying the sub-group colour of the budget, neutral for lines outside any sub-group
function chipClassOf(color) {
  if (!color) {
    return 'chip chip--static'
  }

  return `chip chip--static subgroup--${color}`
}

/**
 * The existing shortcuts as compact chips, each with its remove button, so the settings sheet never scrolls
 * @param {object} props
 * @param {{ id: string, line_id: string, label: string, amount: number }[]} props.presets
 * @param {Record<string, { label: string, color?: string }>} props.lines - from indexLines
 * @param {(id: string) => void} props.onRemove
 */
export default function PresetList({ presets, lines, onRemove }) {
  return (
    <ul className="chips">
      {presets.map((preset, index) => (
        <li key={`preset-${preset.id}-${index}`} className={chipClassOf(lines[preset.line_id]?.color)}>
          <span>{lines[preset.line_id]?.label}</span>
          <span className="chip__amount">{formatAmount(preset.amount)}</span>

          <button
            type="button"
            className="chip__remove"
            onClick={() => onRemove(preset.id)}
            aria-label={`Supprimer le raccourci ${lines[preset.line_id]?.label}`}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  )
}
