import { SHARED } from '../utils/plan.js'
import Icon from './Icon.jsx'

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

// Only real sub-groups can be pinned or hidden, not the lines gathered outside any of them
const LOOSE_GROUP_ID = 'loose'

// The pin button says what it does, the pressed state telling whether it is on
function pinLabelOf(pinned) {
  if (pinned) {
    return 'Épinglé'
  }

  return 'Épingler'
}

/**
 * Category chips, each sub-group headed in its budget colour and set apart from the next one
 * @param {object} props
 * @param {{ id: string, label: string, color?: string, scope?: string, lines: { id: string, label: string, autoBook?: boolean }[] }[]} props.groups
 * @param {string | undefined} props.selected
 * @param {(id: string) => void} props.onSelect
 * @param {string[]} [props.pinnedIds] - sub-groups always shown on the expense form
 * @param {(groupId: string, pinned: boolean) => void} [props.onTogglePin] - shows a pin button on each sub-group when given
 * @param {(groupId: string) => void} [props.onHide] - shows a button taking each sub-group off the form when given
 */
export default function CategoryGroups({ groups, selected, onSelect, pinnedIds = [], onTogglePin, onHide }) {
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

            {!!onTogglePin && group.id !== LOOSE_GROUP_ID && (
              <button
                type="button"
                className="categories__pin"
                aria-pressed={pinnedIds.includes(group.id)}
                aria-label={`Épingler ${group.label} sur le formulaire`}
                onClick={() => onTogglePin(group.id, !pinnedIds.includes(group.id))}
              >
                <Icon name="pin" className="icon" />
                <span>{pinLabelOf(pinnedIds.includes(group.id))}</span>
              </button>
            )}

            {!!onHide && group.id !== LOOSE_GROUP_ID && (
              <button
                type="button"
                className="categories__hide"
                aria-label={`Retirer ${group.label} du formulaire`}
                title="Retirer du formulaire, à retrouver dans Autre…"
                onClick={() => onHide(group.id)}
              >
                ×
              </button>
            )}
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
