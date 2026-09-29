import { useState } from 'react'

// A zero amount is only a default: blanked while the field is focused, so typing never starts after it
function shownValueOf(value, cleared) {
  if (cleared) {
    return ''
  }

  return value
}

/**
 * Number field of an amount, emptied on focus while it holds zero; nothing is written until something is typed
 * @param {object} props - any other prop goes to the input
 * @param {number | string} props.value
 * @param {(event: import('react').ChangeEvent<HTMLInputElement>) => void} props.onChange
 */
export default function AmountInput({ value, onChange, ...inputProps }) {
  const [cleared, setCleared] = useState(false)

  function handleFocus() {
    if (!Number(value)) {
      setCleared(true)
    }
  }

  function handleChange(event) {
    setCleared(false)
    onChange(event)
  }

  return (
    <input
      {...inputProps}
      type="number"
      value={shownValueOf(value, cleared)}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={() => setCleared(false)}
    />
  )
}
