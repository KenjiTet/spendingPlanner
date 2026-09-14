import { useEffect, useRef, useState } from 'react'
import { GROUP_COLORS } from '../utils/plan.js'

/**
 * Colour dot that opens the palette when clicked
 * @param {object} props
 * @param {string} props.color - id of the currently selected colour
 * @param {string} props.title - what the colour applies to, used by assistive tech
 * @param {(color: string) => void} props.onPick
 */
export default function ColorPicker({ color, title, onPick }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(undefined)

  // Clicking elsewhere or pressing Escape closes the palette
  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handleDocument(event) {
      if (event.key === 'Escape' || !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocument)
    document.addEventListener('keydown', handleDocument)

    return () => {
      document.removeEventListener('mousedown', handleDocument)
      document.removeEventListener('keydown', handleDocument)
    }
  }, [open])

  function pick(id) {
    onPick(id)
    setOpen(false)
  }

  return (
    <span className="picker" ref={rootRef}>
      <button
        type="button"
        className={`picker__toggle swatch swatch--${color}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={title}
      />

      {open && (
        <ul className="picker__menu">
          {GROUP_COLORS.map((option, index) => (
            <li key={`color-${option.id}-${index}`}>
              <button
                type="button"
                className={`picker__option swatch--${option.id}`}
                onClick={() => pick(option.id)}
                aria-pressed={option.id === color}
                aria-label={option.label}
              />
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
