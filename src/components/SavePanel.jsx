/**
 * Save button of the plan, always in sight under the outline; it sends the pending edits right away
 * @param {object} props
 * @param {'saving' | 'pending' | 'saved'} props.status
 * @param {() => void} props.onSave
 */
export default function SavePanel({ status, onSave }) {
  return (
    <footer className="save">
      <button type="button" className="form__submit save__button" onClick={onSave} disabled={status === 'saving'}>
        Sauvegarder
      </button>
    </footer>
  )
}
