import { useState } from 'react'
import { formatAmount } from '../utils/format.js'
import ColorPicker from './ColorPicker.jsx'
import Section from './Section.jsx'
import { createItem, createSubgroup, GROUP_COLORS, toScopeTree } from '../utils/plan.js'

// Name given to a sub-group the moment it is created, before it is renamed
const NEW_SUBGROUP = 'Nouveau sous-groupe'

// Picks the next colour so two sub-groups created in a row do not look alike
function nextColor(count) {
  return GROUP_COLORS[count % GROUP_COLORS.length].id
}

// Toggles an id inside the set of folded blocks
function toggleIn(ids, id) {
  if (ids.includes(id)) {
    return ids.filter((candidate) => candidate !== id)
  }

  return [...ids, id]
}

/**
 * Budget lines arranged under fixed scopes, each holding sub-groups and loose lines
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.tone - drives the accent colour of the card
 * @param {string} props.addLabel - wording of the button adding a line
 * @param {number} props.total
 * @param {number} props.annualTotal
 * @param {{ id: string, label: string }[]} props.scopes - common first, then one per person
 * @param {string[]} [props.editableScopes] - scopes the viewer may change, all of them when omitted
 * @param {{ id: string, label: string, color: string, scope: string }[]} props.subgroups
 * @param {{ id: string, label: string, amount: number, parent: string }[]} props.items
 * @param {Record<string, number>} [props.lockedByScope] - derived amounts shown but not editable
 * @param {string} [props.lockedLabel]
 * @param {(line: object) => void} props.onAddLine
 * @param {(id: string, field: string, value: string) => void} props.onUpdateLine
 * @param {(id: string) => void} props.onRemoveLine
 * @param {(subgroup: object) => void} props.onAddSubgroup
 * @param {(id: string, field: string, value: string) => void} props.onUpdateSubgroup
 * @param {(id: string) => void} props.onRemoveSubgroup
 */
export default function ScopedSection({
  title,
  tone,
  addLabel,
  total,
  annualTotal,
  scopes,
  editableScopes,
  subgroups,
  items,
  lockedByScope = {},
  lockedLabel,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
  onAddSubgroup,
  onUpdateSubgroup,
  onRemoveSubgroup,
}) {
  const [focusId, setFocusId] = useState(undefined)
  const [armedId, setArmedId] = useState(undefined)
  const [dragId, setDragId] = useState(undefined)
  const [overId, setOverId] = useState(undefined)
  const [folded, setFolded] = useState([])
  const tree = toScopeTree(scopes, subgroups, items)

  // Adds an empty line under a scope or a sub-group, ready to be typed into
  function addLine(parent) {
    const line = createItem('', 0, parent)

    onAddLine(line)
    setFocusId(line.id)
  }

  function addSubgroup(scopeId) {
    const subgroup = createSubgroup(NEW_SUBGROUP, nextColor(subgroups.length), scopeId)

    onAddSubgroup(subgroup)
    setFocusId(subgroup.id)
  }

  function endDrag() {
    setArmedId(undefined)
    setDragId(undefined)
    setOverId(undefined)
  }

  function canEdit(scopeId) {
    if (!editableScopes) {
      return true
    }

    return editableScopes.includes(scopeId)
  }

  // Lines move between scopes and sub-groups by being dropped on one of them, read-only scopes accept nothing
  function dropProps(targetId, editable) {
    if (!editable) {
      return {}
    }

    return {
      onDragOver: (event) => {
        event.preventDefault()
        event.stopPropagation()
        setOverId(targetId)
      },
      onDragLeave: (event) => {
        event.stopPropagation()
        setOverId(undefined)
      },
      onDrop: (event) => {
        event.preventDefault()
        event.stopPropagation()
        onUpdateLine(event.dataTransfer.getData('text/plain'), 'parent', targetId)
        endDrag()
      },
    }
  }

  function isOpen(id) {
    return !folded.includes(id)
  }

  function fold(id) {
    setFolded((current) => toggleIn(current, id))
  }

  // Highlights whatever the dragged line is hovering
  function blockClass(base, id) {
    if (!!dragId && overId === id) {
      return `${base} is-drop-target`
    }

    return base
  }

  // Dims the line while it is being carried
  function lineClass(id) {
    if (dragId === id) {
      return 'line is-dragging'
    }

    return 'line'
  }

  // Another person's line, shown as plain text
  function renderReadOnlyLine(item, index) {
    return (
      <li key={`line-${item.id}-${index}`} className="line line--locked">
        <span className="line__name">{item.label}</span>
        <span className="line__total">{formatAmount(item.amount)}</span>
      </li>
    )
  }

  // Picks the line renderer matching the viewer's rights on the scope
  function lineRenderer(editable) {
    if (!editable) {
      return renderReadOnlyLine
    }

    return renderLine
  }

  function renderLine(item, index) {
    return (
      <li
        key={`line-${item.id}-${index}`}
        className={lineClass(item.id)}
        draggable={armedId === item.id}
        onDragStart={(event) => {
          event.dataTransfer.setData('text/plain', item.id)
          event.dataTransfer.effectAllowed = 'move'
          setDragId(item.id)
        }}
        onDragEnd={endDrag}
      >
        <span
          className="line__grip"
          onMouseDown={() => setArmedId(item.id)}
          onMouseUp={() => setArmedId(undefined)}
          aria-hidden="true"
        >
          ⠿
        </span>

        <input
          className="line__name"
          value={item.label}
          onChange={(event) => onUpdateLine(item.id, 'label', event.target.value)}
          placeholder={addLabel}
          aria-label={addLabel}
          autoFocus={item.id === focusId}
        />

        <input
          className="line__amount"
          type="number"
          min="0"
          step="10"
          value={item.amount}
          onChange={(event) => onUpdateLine(item.id, 'amount', event.target.value)}
          placeholder="0"
          aria-label="Montant par mois"
        />

        <button
          type="button"
          className="list__remove"
          onClick={() => onRemoveLine(item.id)}
          aria-label={`Supprimer ${item.label}`}
        >
          ×
        </button>
      </li>
    )
  }

  const totals = (
    <span className="section__totals">
      <span className="section__total">{formatAmount(total)} / mois</span>
      <span className="section__subtotal">{formatAmount(annualTotal)} / an</span>
    </span>
  )

  return (
    <Section title={title} tone={tone} actions={totals}>
      <p className="section__hint">
        Glissez une ligne par sa poignée pour la déposer dans un autre groupe ou sous-groupe.
      </p>

      {tree.map((scope, scopeIndex) => {
        const editable = canEdit(scope.id)

        return (
          <article
            key={`scope-${scope.id}-${scopeIndex}`}
            className={blockClass('scope', scope.id)}
            {...dropProps(scope.id, editable)}
          >
            <header className="scope__header">
              <button
                type="button"
                className="scope__toggle"
                onClick={() => fold(scope.id)}
                aria-expanded={isOpen(scope.id)}
              >
                <span className="chevron" aria-hidden="true" />
                <h3 className="scope__title">{scope.label}</h3>
              </button>

              {!editable && <span className="scope__badge">Lecture seule</span>}

              <span className="scope__total">
                {formatAmount(scope.total + (lockedByScope[scope.id] ?? 0))} / mois
              </span>
            </header>

            {isOpen(scope.id) && (
              <>
                {scope.subgroups.map((subgroup, index) => (
                  <article
                    key={`subgroup-${subgroup.id}-${index}`}
                    className={blockClass(`subgroup subgroup--${subgroup.color}`, subgroup.id)}
                    {...dropProps(subgroup.id, editable)}
                  >
                    <header className="subgroup__header">
                      {editable && (
                        <ColorPicker
                          color={subgroup.color}
                          title={`Couleur du sous-groupe ${subgroup.label}`}
                          onPick={(color) => onUpdateSubgroup(subgroup.id, 'color', color)}
                        />
                      )}

                      {!editable && <span className={`swatch swatch--${subgroup.color}`} aria-hidden="true" />}

                      <button
                        type="button"
                        className="subgroup__toggle"
                        onClick={() => fold(subgroup.id)}
                        aria-expanded={isOpen(subgroup.id)}
                        aria-label={`Replier ${subgroup.label}`}
                      >
                        <span className="chevron" aria-hidden="true" />
                      </button>

                      {editable && (
                        <input
                          className="subgroup__name"
                          value={subgroup.label}
                          onChange={(event) =>
                            onUpdateSubgroup(subgroup.id, 'label', event.target.value)
                          }
                          aria-label="Nom du sous-groupe"
                          autoFocus={subgroup.id === focusId}
                        />
                      )}

                      {!editable && <h4 className="subgroup__name">{subgroup.label}</h4>}

                      <span className="subgroup__total">{formatAmount(subgroup.total)}</span>

                      {editable && (
                        <button
                          type="button"
                          className="list__remove"
                          onClick={() => onRemoveSubgroup(subgroup.id)}
                          aria-label={`Supprimer le sous-groupe ${subgroup.label}`}
                        >
                          ×
                        </button>
                      )}
                    </header>

                    {isOpen(subgroup.id) && (
                      <>
                        <ul className="lines">{subgroup.items.map(lineRenderer(editable))}</ul>

                        {editable && (
                          <button type="button" className="add" onClick={() => addLine(subgroup.id)}>
                            + {addLabel}
                          </button>
                        )}
                      </>
                    )}
                  </article>
                ))}

                <ul className="lines">{scope.items.map(lineRenderer(editable))}</ul>

                {!!lockedByScope[scope.id] && (
                  <p className="line line--locked">
                    <span className="line__name">{lockedLabel}</span>
                    <span className="line__meta">Calculé depuis les revenus</span>
                    <span className="line__total">{formatAmount(lockedByScope[scope.id])}</span>
                  </p>
                )}

                {editable && (
                  <footer className="scope__actions">
                    <button type="button" className="add" onClick={() => addLine(scope.id)}>
                      + {addLabel}
                    </button>

                    <button type="button" className="add" onClick={() => addSubgroup(scope.id)}>
                      + Sous-groupe
                    </button>
                  </footer>
                )}
              </>
            )}
          </article>
        )
      })}
    </Section>
  )
}
