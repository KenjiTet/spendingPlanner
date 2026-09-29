import { useState } from 'react'

// The default name is only a stand-in: blanked while the field is focused, so typing never starts after it
function shownValueOf(value, cleared) {
  if (cleared) {
    return ''
  }

  return value
}

/**
 * Name field prefilled with a default name, emptied on focus while it still holds it, and given it back when left
 * blank; nothing is written until something is typed
 * @param {object} props - any other prop goes to the input
 * @param {string} props.value
 * @param {string} props.defaultName
 * @param {(value: string) => void} props.onChange
 */
export default function NameInput({ value, defaultName, onChange, ...inputProps }) {
  const [cleared, setCleared] = useState(false)

  function handleFocus() {
    if (value === defaultName || !value?.trim()) {
      setCleared(true)
    }
  }

  function handleChange(event) {
    setCleared(false)
    onChange(event.target.value)
  }

  // A name erased by hand falls back to the default one rather than staying blank
  function handleBlur() {
    setCleared(false)

    if (!value?.trim()) {
      onChange(defaultName)
    }
  }

  return (
    <input
      {...inputProps}
      value={shownValueOf(value, cleared)}
      placeholder={defaultName}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  )
}
