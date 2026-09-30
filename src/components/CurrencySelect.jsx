import { useState } from 'react'

// Full names of the currencies, in French, from the browser rather than a list of our own
const currencyNames = new Intl.DisplayNames('fr', { type: 'currency' })

// The chosen currency is tinted in the list
function optionClassOf(isSelected) {
  if (isSelected) {
    return 'currency-select__option is-active'
  }

  return 'currency-select__option'
}

// A rule sets the likeliest currencies apart from the rest of the list
function itemClassOf(index, pinned) {
  if (index !== pinned) {
    return undefined
  }

  return 'currency-select__rest'
}

// A form field spans its column and unfolds downwards, the amount field's one stays compact and unfolds upwards
function rootClassOf(variant) {
  if (variant === 'field') {
    return 'currency-select currency-select--field'
  }

  return 'currency-select'
}

/**
 * Currency dropdown: the code as trigger, a short list of about five rows, the likeliest first
 * @param {object} props
 * @param {'inline' | 'field'} [props.variant] - inline inside the amount field, or as a form field of its own
 * @param {string[]} props.currencies - the likeliest first
 * @param {number} props.pinned - how many of them lead the list, set apart from the others
 * @param {string} props.value
 * @param {(currency: string) => void} props.onChange
 */
export default function CurrencySelect({ variant = 'inline', currencies, pinned, value, onChange }) {
  const [open, setOpen] = useState(false)

  function pick(currency) {
    onChange(currency)
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
    <div className={rootClassOf(variant)} onBlur={handleBlur} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className="currency-select__trigger"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Devise : ${value}`}
      >
        {value}
        <span className="chevron" aria-hidden="true" />
      </button>

      {open && (
        <ul className="currency-select__panel" role="listbox" aria-label="Devises">
          {currencies.map((currency, index) => (
            <li key={`currency-${currency}-${index}`} className={itemClassOf(index, pinned)}>
              <button
                type="button"
                role="option"
                className={optionClassOf(currency === value)}
                aria-selected={currency === value}
                onClick={() => pick(currency)}
              >
                <span className="currency-select__code">{currency}</span>
                <span className="currency-select__name">{currencyNames.of(currency)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
