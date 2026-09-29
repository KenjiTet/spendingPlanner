import Sheet from './Sheet.jsx'

/**
 * Asks before an action that cannot be undone, such as a deletion
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {string} props.message
 * @param {string} props.confirmLabel
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onClose
 */
export default function ConfirmSheet({ open, title, message, confirmLabel, onConfirm, onClose }) {
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <p className="confirm__message">{message}</p>

      <footer className="confirm__actions">
        <button type="button" className="confirm__button" onClick={onClose}>
          Annuler
        </button>

        <button type="button" className="confirm__button confirm__button--danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </footer>
    </Sheet>
  )
}
