import { SHARED } from '../utils/plan.js'

// Class carrying the sub-group colour of the budget, neutral for lines outside any sub-group
function groupClass(color) {
  if (!color) {
    return 'categories__group'
  }

  return `categories__group subgroup--${color}`
}

// Automatic debits are flagged, as on the gauges
function chipLabelOf(line) {
  if (line.autoBook) {
    return `${line.label} ↻`
  }

  return line.label
}

// Part of the plan a sub-group belongs to, telling apart two sub-groups sharing a name
function scopeLabelOf(scope) {
  if (scope === SHARED) {
    return 'Commun'
  }

  return 'Personnel'
}

/**
 * Category chips, each sub-group headed in its budget colour and set apart from the next one
 * @param {object} props
 * @param {{ id: string, label: string, color?: string, scope?: string, lines: { id: string, label: string, autoBook?: boolean }[] }[]} props.groups
 * @param {string | undefined} props.selected
 * @param {(id: string) => void} props.onSelect
 */
export default function CategoryGroups({ groups, selected, onSelect }) {
  // The part of the plan is only worth naming when common and personal sub-groups are mixed
  const scopes = new Set(groups.filter((group) => !!group.scope).map((group) => group.scope))
  const showScope = scopes.size > 1

  return (
    <ul className="categories">
      {groups.map((group, groupIndex) => (
        <li key={`category-group-${group.id}-${groupIndex}`} className={groupClass(group.color)}>
          <p className="categories__head">
            <span className="categories__label">{group.label}</span>
            {showScope && !!group.scope && <span className="scope__badge">{scopeLabelOf(group.scope)}</span>}
          </p>

          <ul className="chips">
            {group.lines.map((line, index) => (
              <li key={`chip-${line.id}-${index}`}>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={selected === line.id}
                  onClick={() => onSelect(line.id)}
                >
                  {chipLabelOf(line)}
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}
