import { useState } from 'react'

// The chosen option is tinted in the list
function optionClassOf(isSelected) {
  if (isSelected) {
    return 'dropdown__option is-active'
  }

  return 'dropdown__option'
}

/**
 * Small dropdown in the look of the site, for a short list of plain options
 * @param {object} props
 * @param {{ id: string, label: string }[]} props.options
 * @param {string} props.value - id of the chosen option
 * @param {(id: string) => void} props.onChange
 * @param {string} props.label - accessible name of the list
 */
export default function Dropdown({ options, value, onChange, label }) {
  const [open, setOpen] = useState(false)
  const chosen = options.find((option) => option.id === value)

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

  function handleKeyDown(event) {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="dropdown" onBlur={handleBlur} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className="dropdown__trigger"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label} : ${chosen?.label ?? ''}`}
      >
        {chosen?.label}
        <span className="chevron" aria-hidden="true" />
      </button>

      {open && (
        <ul className="dropdown__panel" role="listbox" aria-label={label}>
          {options.map((option, index) => (
            <li key={`dropdown-${option.id}-${index}`}>
              <button
                type="button"
                role="option"
                className={optionClassOf(option.id === value)}
                aria-selected={option.id === value}
                onClick={() => pick(option.id)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
