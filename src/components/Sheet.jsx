import { useEffect, useRef } from 'react'

// A tall sheet keeps the same height as its content changes
function sheetClassOf(tall) {
  if (tall) {
    return 'sheet sheet--tall'
  }

  return 'sheet'
}

// A fixed body leaves the scrolling to one of its children
function bodyClassOf(fixed) {
  if (fixed) {
    return 'sheet__body sheet__body--fixed'
  }

  return 'sheet__body'
}

/**
 * Modal panel on a native dialog: a bottom sheet on phones, a centred card on computers.
 * Escape, the close button and a click on the backdrop all close it
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {string} [props.description] - one line under the title, above the separation
 * @param {boolean} [props.fixed] - the body never scrolls, a child taking the leftover height scrolling instead
 * @param {boolean} [props.tall] - keeps its full height whatever the content, so a shrinking list never moves the rows
 * @param {() => void} props.onClose
 * @param {import('react').ReactNode} props.children
 */
export default function Sheet({ open, title, description, fixed = false, tall = false, onClose, children }) {
  const dialogRef = useRef(undefined)

  // The dialog is opened through the DOM API, the only way to get the backdrop and the focus trap
  useEffect(() => {
    const dialog = dialogRef.current

    if (open && !dialog.open) {
      dialog.showModal()
    }

    if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // The dialog itself is only hit on the backdrop, its content filling the whole box
  function handleClick(event) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return (
    <dialog ref={dialogRef} className={sheetClassOf(tall)} aria-label={title} onClose={onClose} onClick={handleClick}>
      <header className="sheet__header">
        <hgroup className="sheet__heading">
          <h2 className="sheet__title">{title}</h2>
          {!!description && <p className="sheet__description">{description}</p>}
        </hgroup>
        <button type="button" className="sheet__close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
      </header>

      <div className={bodyClassOf(fixed)}>{open && children}</div>
    </dialog>
  )
}
