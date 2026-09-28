import { useState } from 'react'
import { nodeAnchor, scopeAnchor, sectionAnchor } from '../utils/anchors.js'
import { formatAmount } from '../utils/format.js'

// Label of a line still left blank in the editor
const UNNAMED = 'Sans nom'

/**
 * Case-insensitive match of a label against the filter, an empty filter matching everything
 * @param {string} label
 * @param {string} query - already trimmed and lowercased
 */
function matches(label, query) {
  return !query || (label ?? '').toLowerCase().includes(query)
}

/**
 * Keeps the branches holding a match: a matching sub-group or scope keeps all its lines
 * @param {object[]} scopes - from toScopeTree
 * @param {string} query
 */
function filterScopes(scopes, query) {
  if (!query) {
    return scopes
  }

  return scopes
    .map((scope) => {
      if (matches(scope.label, query)) {
        return scope
      }

      const subgroups = scope.subgroups
        .map((subgroup) => {
          if (matches(subgroup.label, query)) {
            return subgroup
          }

          return { ...subgroup, items: subgroup.items.filter((line) => matches(line.label, query)) }
        })
        .filter((subgroup) => !!subgroup.items.length || matches(subgroup.label, query))

      return { ...scope, subgroups, items: scope.items.filter((line) => matches(line.label, query)) }
    })
    .filter((scope) => !!scope.subgroups.length || !!scope.items.length || matches(scope.label, query))
}

/**
 * One line of the plan, a leaf of the tree
 * @param {object} props
 * @param {{ id: string, label: string, amount: number, autoBook?: boolean }} props.line
 */
function LineLeaf({ line }) {
  return (
    <li>
      <a href={`#${nodeAnchor(line.id)}`} className="tree__link tree__link--leaf">
        <span className="tree__label">{line.label || UNNAMED}</span>
        {line.autoBook && (
          <span className="tree__auto" title="Prélèvement automatique">
            ↻
          </span>
        )}
        <span className="tree__amount">{formatAmount(line.amount)}</span>
      </a>
    </li>
  )
}

/**
 * A foldable node: its chevron folds the children, its label jumps to the block in the editor
 * @param {object} props
 * @param {string} props.href
 * @param {string} props.label
 * @param {number} props.total
 * @param {boolean} props.open
 * @param {() => void} props.onToggle
 * @param {string} [props.color] - sub-group colour, shown as a dot
 * @param {number} [props.count] - lines inside, shown next to the label
 * @param {import('react').ReactNode} props.children
 */
function Branch({ href, label, total, open, onToggle, color, count, children }) {
  return (
    <li className="tree__branch">
      <div className="tree__row">
        <button
          type="button"
          className="tree__toggle"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`Replier ${label}`}
        >
          <span className="chevron" aria-hidden="true" />
        </button>

        <a href={href} className="tree__link">
          {!!color && <span className={`tree__dot swatch--${color}`} aria-hidden="true" />}
          <span className="tree__label">{label}</span>
          {count !== undefined && <span className="tree__count">{count}</span>}
          <span className="tree__amount">{formatAmount(total)}</span>
        </a>
      </div>

      {open && <ul className="tree__children">{children}</ul>}
    </li>
  )
}

/**
 * Outline of the plan shown beside the editor, to see the structure and jump to any block
 * @param {object} props
 * @param {{ id: string, title: string, tone: string, total: number, scopes: object[] }[]} props.sections
 * @param {{ id: string, title: string }[]} props.extras - sections without sub-structure
 */
export default function PlanTree({ sections, extras }) {
  // Ids whose branch was flipped from its default state
  const [toggled, setToggled] = useState([])
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()

  /**
   * Scopes start unfolded and sub-groups folded; while filtering, every branch opens so the matches are visible
   * @param {string} id
   * @param {boolean} openByDefault
   */
  function isOpen(id, openByDefault) {
    if (!!needle) {
      return true
    }

    if (toggled.includes(id)) {
      return !openByDefault
    }

    return openByDefault
  }

  function toggle(id) {
    setToggled((current) => {
      if (current.includes(id)) {
        return current.filter((candidate) => candidate !== id)
      }

      return [...current, id]
    })
  }

  return (
    <aside className="plan-tree" aria-label="Structure du plan">
      <header className="plan-tree__header">
        <h2 className="plan-tree__title">Structure</h2>
        <input
          type="search"
          className="plan-tree__search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher une ligne…"
          aria-label="Rechercher dans le plan"
        />
      </header>

      <nav>
        <ul className="tree">
          {sections.map((section, sectionIndex) => (
            <li key={`tree-section-${section.id}-${sectionIndex}`} className={`tree__section tree__section--${section.tone}`}>
              <a href={`#${sectionAnchor(section.id)}`} className="tree__link tree__link--section">
                <span className="tree__label">{section.title}</span>
                <span className="tree__amount">{formatAmount(section.total)}</span>
              </a>

              <ul className="tree__children">
                {filterScopes(section.scopes, needle).map((scope, scopeIndex) => (
                  <Branch
                    key={`tree-scope-${section.id}-${scope.id}-${scopeIndex}`}
                    href={`#${scopeAnchor(section.id, scope.id)}`}
                    label={scope.label}
                    total={scope.total}
                    open={isOpen(`${section.id}-${scope.id}`, true)}
                    onToggle={() => toggle(`${section.id}-${scope.id}`)}
                  >
                    {scope.subgroups.map((subgroup, index) => (
                      <Branch
                        key={`tree-subgroup-${subgroup.id}-${index}`}
                        href={`#${nodeAnchor(subgroup.id)}`}
                        label={subgroup.label}
                        total={subgroup.total}
                        color={subgroup.color}
                        count={subgroup.items.length}
                        open={isOpen(subgroup.id, false)}
                        onToggle={() => toggle(subgroup.id)}
                      >
                        {subgroup.items.map((line, lineIndex) => (
                          <LineLeaf key={`tree-line-${line.id}-${lineIndex}`} line={line} />
                        ))}
                      </Branch>
                    ))}

                    {scope.items.map((line, lineIndex) => (
                      <LineLeaf key={`tree-line-${line.id}-${lineIndex}`} line={line} />
                    ))}
                  </Branch>
                ))}
              </ul>
            </li>
          ))}

          {extras.map((extra, index) => (
            <li key={`tree-extra-${extra.id}-${index}`} className="tree__section">
              <a href={`#${sectionAnchor(extra.id)}`} className="tree__link tree__link--section">
                <span className="tree__label">{extra.title}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
