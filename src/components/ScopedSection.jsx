import { useState } from 'react'
import { nodeAnchor, scopeAnchor, sectionAnchor } from '../utils/anchors.js'
import { formatAmount } from '../utils/format.js'
import ColorPicker from './ColorPicker.jsx'
import Section from './Section.jsx'
import { createItem, createSubgroup, GROUP_COLORS, SHARED, toScopeTree } from '../utils/plan.js'

// Name given to a sub-group the moment it is created, before it is renamed
const NEW_SUBGROUP = 'Nouveau sous-groupe'

// Picks the next colour so two sub-groups created in a row do not look alike
function nextColor(count) {
  return GROUP_COLORS[count % GROUP_COLORS.length].id
}

// Class of the automatic debit toggle, lit when the line is booked on its own
function autoClassOf(autoBook) {
  if (autoBook) {
    return 'line__auto is-on'
  }

  return 'line__auto'
}

// Toggles an id inside the set of blocks flipped from their default state
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
 * @param {string} props.anchor - section key used by the element ids the plan outline links to
 * @param {string} props.tone - drives the accent colour of the card
 * @param {string} props.addLabel - wording of the button adding a line
 * @param {boolean} [props.autoBookable] - lines may be flagged as debited automatically every month
 * @param {number} props.total
 * @param {number} [props.annualTotal] - shown beside the monthly total when given
 * @param {{ id: string, label: string }[]} props.scopes - common first, then one per person
 * @param {string[]} [props.editableScopes] - scopes the viewer may change, all of them when omitted
 * @param {number} [props.shareCount] - people the common scope is split between, its per-person amounts shown above one
 * @param {{ id: string, label: string, color: string, scope: string }[]} props.subgroups
 * @param {{ id: string, label: string, amount: number, autoBook?: boolean, parent: string }[]} props.items
 * @param {(line: object) => void} props.onAddLine
 * @param {(id: string, field: string, value: string | boolean) => void} props.onUpdateLine
 * @param {(id: string) => void} props.onRemoveLine
 * @param {(subgroup: object) => void} props.onAddSubgroup
 * @param {(id: string, field: string, value: string) => void} props.onUpdateSubgroup
 * @param {(id: string) => void} props.onRemoveSubgroup
 */
export default function ScopedSection({
  title,
  anchor,
  tone,
  addLabel,
  autoBookable,
  total,
  annualTotal,
  scopes,
  editableScopes,
  shareCount = 1,
  subgroups,
  items,
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
  // Ids of the blocks folded or unfolded by hand, against their default state
  const [toggled, setToggled] = useState([])
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

  /**
   * Scopes and the viewer's own sub-groups start unfolded, the other person's sub-groups folded
   * @param {string} id
   * @param {boolean} [openByDefault]
   */
  function isOpen(id, openByDefault = true) {
    if (toggled.includes(id)) {
      return !openByDefault
    }

    return openByDefault
  }

  function fold(id) {
    setToggled((current) => toggleIn(current, id))
  }

  // Each person's part of a common amount, nothing for a personal scope or a solo plan
  function renderShare(scopeId, amount) {
    if (scopeId !== SHARED || shareCount < 2) {
      return undefined
    }

    return <small className="amount__share">{formatAmount(amount / shareCount)} / pers.</small>
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
      <li key={`line-${item.id}-${index}`} id={nodeAnchor(item.id)} className="line line--locked">
        <span className="line__name">{item.label}</span>
        {autoBookable && item.autoBook && <span className="line__meta">Prélèvement auto</span>}
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
        id={nodeAnchor(item.id)}
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

        {autoBookable && (
          <button
            type="button"
            className={autoClassOf(item.autoBook)}
            onClick={() => onUpdateLine(item.id, 'autoBook', !item.autoBook)}
            aria-pressed={!!item.autoBook}
            title="Prélèvement automatique : compté comme dépensé dès le 1er du mois, sans saisie"
          >
            <span aria-hidden="true">↻</span> Auto
          </button>
        )}

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
      {annualTotal !== undefined && <span className="section__subtotal">{formatAmount(annualTotal)} / an</span>}
    </span>
  )

  return (
    <Section title={title} id={sectionAnchor(anchor)} tone={tone} actions={totals}>
      {tree.map((scope, scopeIndex) => {
        const editable = canEdit(scope.id)

        return (
          <article
            key={`scope-${scope.id}-${scopeIndex}`}
            id={scopeAnchor(anchor, scope.id)}
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
                {formatAmount(scope.total)} / mois
                {renderShare(scope.id, scope.total)}
              </span>
            </header>

            {isOpen(scope.id) && (
              <>
                {scope.subgroups.map((subgroup, index) => (
                  <article
                    key={`subgroup-${subgroup.id}-${index}`}
                    id={nodeAnchor(subgroup.id)}
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
                        aria-expanded={isOpen(subgroup.id, editable)}
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

                      <span className="subgroup__total">
                        {formatAmount(subgroup.total)}
                        {renderShare(scope.id, subgroup.total)}
                      </span>

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

                    {isOpen(subgroup.id, editable) && (
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
