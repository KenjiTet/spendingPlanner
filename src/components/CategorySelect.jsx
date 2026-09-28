import { useState } from 'react'

// Colour dot of a sub-group, neutral for lines outside any of them
function dotClassOf(color) {
  return `category-select__dot swatch--${color ?? 'neutral'}`
}

/**
 * Finds the chosen line and its sub-group, undefined while nothing is chosen
 * @param {{ label: string, color?: string, lines: { id: string, label: string }[] }[]} groups
 * @param {string | undefined} value
 */
function selectionOf(groups, value) {
  for (const group of groups) {
    const line = group.lines.find((candidate) => candidate.id === value)

    if (!!line) {
      return { line, group }
    }
  }

  return undefined
}

/**
 * Category dropdown in the look of the site: a field-like button unfolding the categories under their sub-group.
 * The list opens in the flow rather than floating, so a sheet around it is never clipped
 * @param {object} props
 * @param {{ id: string, label: string, color?: string, lines: { id: string, label: string }[] }[]} props.groups
 * @param {string | undefined} props.value - line id
 * @param {(id: string) => void} props.onChange
 */
export default function CategorySelect({ groups, value, onChange }) {
  const [open, setOpen] = useState(false)
  const selection = selectionOf(groups, value)

  function pick(id) {
    onChange(id)
    setOpen(false)
  }

  // Focus leaving the whole dropdown folds it, as a click elsewhere would
  function handleBlur(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false)
    }
  }

  // Escape folds the list without closing the sheet around it
  function handleKeyDown(event) {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="category-select" onBlur={handleBlur} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className="category-select__trigger"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {!selection && <span className="category-select__placeholder">Choisir une catégorie…</span>}

        {!!selection && (
          <span className="category-select__value">
            <span className={dotClassOf(selection.group.color)} aria-hidden="true" />
            <span>{selection.line.label}</span>
            <span className="category-select__group">{selection.group.label}</span>
          </span>
        )}

        <span className="chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="category-select__panel" role="listbox" aria-label="Catégories">
          {groups.map((group, groupIndex) => (
            <section key={`select-group-${group.id}-${groupIndex}`} className="category-select__section">
              <h4 className="category-select__heading">
                <span className={dotClassOf(group.color)} aria-hidden="true" />
                {group.label}
              </h4>

              <ul className="category-select__options">
                {group.lines.map((line, index) => (
                  <li key={`select-line-${line.id}-${index}`}>
                    <button
                      type="button"
                      role="option"
                      className="category-select__option"
                      aria-selected={line.id === value}
                      onClick={() => pick(line.id)}
                    >
                      {line.label}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
