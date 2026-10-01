import { useState } from 'react'
import Icon from './Icon.jsx'
import Sheet from './Sheet.jsx'
import Toast from './Toast.jsx'

// The active plan is outlined so it stands out in the list
function cardClassOf(isCurrent) {
  if (isCurrent) {
    return 'plan-card plan-card--active'
  }

  return 'plan-card'
}

// The copy button confirms for a moment that the code is in the clipboard
function copyLabelOf(copied) {
  if (copied) {
    return 'Copié'
  }

  return 'Copier'
}

/**
 * One plan of the list: activating or editing it, its invitation code while a place is free, and a sheet for the rarer
 * actions
 * @param {object} props
 * @param {{ id: string, name: string, created_by: string, share_code: string, free_slots: number }} props.plan
 * @param {boolean} props.isCurrent
 * @param {boolean} props.isCreator
 * @param {(id: string) => void} props.onActivate
 * @param {(id: string) => void} props.onEdit
 * @param {(planId: string, name: string) => Promise<string | undefined>} props.onRename
 * @param {(planId: string) => Promise<string | undefined>} props.onExport
 * @param {(planId: string) => Promise<string | undefined>} props.onDelete
 */
export default function PlanCard({ plan, isCurrent, isCreator, onActivate, onEdit, onRename, onExport, onDelete }) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [copied, setCopied] = useState(false)
  const [name, setName] = useState(plan.name)
  const [error, setError] = useState('')
  // Confirmation of the last rename, its id restarting the animation on each one
  const [toast, setToast] = useState(undefined)

  // Opening the sheet starts from the current name, closing it drops a pending deletion so it is never confirmed by surprise
  function openSheet() {
    setName(plan.name)
    setOpen(true)
  }

  function closeSheet() {
    setOpen(false)
    setConfirming(false)
    setError('')
  }

  async function handleRename(event) {
    event.preventDefault()

    const failure = await onRename(plan.id, name.trim())

    setError(failure ?? '')

    if (!failure) {
      setToast({ id: crypto.randomUUID(), tone: 'success', text: `Plan renommé en « ${name.trim()} »` })
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(plan.share_code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard refused: the code stays readable on the card
    }
  }

  async function handleExport() {
    const failure = await onExport(plan.id)

    setError(failure ?? '')
  }

  async function handleDelete() {
    const failure = await onDelete(plan.id)

    setError(failure ?? '')
  }

  return (
    <article className={cardClassOf(isCurrent)}>
      <div className="plan-card__main">
        <header className="plan-card__header">
          <h3 className="plan-card__title">{plan.name}</h3>
        </header>

        {!!plan.free_slots && (
          <p className="plan-card__share">
            <span>Code d&rsquo;invitation</span>
            <code className="plan-card__code">{plan.share_code}</code>

            <button type="button" className="plan-card__copy" onClick={handleCopy}>
              <Icon name="copy" className="icon" />
              <span>{copyLabelOf(copied)}</span>
            </button>
          </p>
        )}
      </div>

      <footer className="plan-card__actions">
        {!isCurrent && (
          <button type="button" className="plan-card__action plan-card__action--accent" onClick={() => onActivate(plan.id)}>
            <Icon name="check" className="icon" />
            <span>Activer</span>
          </button>
        )}

        <button type="button" className="plan-card__action" onClick={() => onEdit(plan.id)}>
          <Icon name="pencil" className="icon" />
          <span>Budget</span>
        </button>

        <button
          type="button"
          className="plan-card__more"
          onClick={openSheet}
          aria-label={`Options de ${plan.name}`}
        >
          <Icon name="more" className="icon" />
        </button>
      </footer>

      <Sheet open={open} title={plan.name} onClose={closeSheet}>
        <div className="plan-card__sheet">
          {isCreator && (
            <form className="plan-card__group" onSubmit={handleRename}>
              <h3 className="plan-card__group-title">Nom</h3>

              <label className="form__field">
                <span>Nom du plan</span>
                <input value={name} onChange={(event) => setName(event.target.value)} required />
              </label>

              <button type="submit" className="plan-card__button" disabled={!name.trim() || name.trim() === plan.name}>
                Renommer
              </button>
            </form>
          )}

          <section className="plan-card__group">
            <h3 className="plan-card__group-title">Sauvegarde</h3>
            <p className="section__hint">Le fichier JSON peut être réimporté dans un nouveau plan.</p>

            <button type="button" className="plan-card__button" onClick={handleExport}>
              Exporter le JSON
            </button>
          </section>

          {isCreator && (
            <section className="plan-card__group">
              <h3 className="plan-card__group-title">Suppression</h3>

              {!confirming && (
                <button
                  type="button"
                  className="plan-card__button plan-card__button--danger"
                  onClick={() => setConfirming(true)}
                >
                  Supprimer le plan
                </button>
              )}

              {confirming && (
                <>
                  <p className="actions__error">
                    Le plan, ses lignes et toutes ses dépenses seront supprimés pour chaque membre.
                  </p>

                  <div className="plan-card__actions">
                    <button type="button" className="plan-card__button" onClick={() => setConfirming(false)}>
                      Annuler
                    </button>

                    <button type="button" className="plan-card__button plan-card__button--confirm" onClick={handleDelete}>
                      Supprimer définitivement
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {!!error && <p className="actions__error">{error}</p>}
        </div>
      </Sheet>

      {/* Outside the sheet, so closing it right away never cuts the confirmation short */}
      {!!toast && <Toast key={toast.id} text={toast.text} tone={toast.tone} onDone={() => setToast(undefined)} />}
    </article>
  )
}
