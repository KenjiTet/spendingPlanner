import { useEffect, useRef } from 'react'
import Icon from './Icon.jsx'

// How long the confirmation stays at the top of the screen
const TOAST_MS = 2500

/**
 * Green confirmation popping at the top of the screen, then leaving on its own.
 * Shown as a popover, the top layer being the only way to appear above an open sheet
 * @param {object} props
 * @param {string} props.text
 * @param {() => void} props.onDone - called once it has left, to unmount it
 */
export default function Toast({ text, onDone }) {
  const toastRef = useRef(undefined)

  // Mounted once per confirmation (keyed by the parent), so the timer starts with it
  useEffect(() => {
    toastRef.current.showPopover()

    const timer = window.setTimeout(onDone, TOAST_MS)

    return () => window.clearTimeout(timer)
  }, [])

  return (
    <p ref={toastRef} className="toast" role="status" popover="manual">
      <Icon name="check" className="icon" />
      {text}
    </p>
  )
}
