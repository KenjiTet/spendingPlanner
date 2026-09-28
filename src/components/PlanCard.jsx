import { useState } from 'react'
import Icon from './Icon.jsx'
import Sheet from './Sheet.jsx'

/**
 * Hint shown next to the share code, depending on whether a place is still free
 * @param {number} freeSlots
 */
function codeHintFor(freeSlots) {
  if (!freeSlots) {
    return 'Toutes les places sont prises : le code ne donne plus accès au plan.'
  }

  return 'Donnez ce code à la personne qui prend la place libre.'
}

// The active plan is outlined so it stands out in the list
function cardClassOf(isCurrent) {
  if (isCurrent) {
    return 'card plan-card plan-card--active'
  }

  return 'card plan-card'
}

// The copy button confirms for a moment that the code is in the clipboard
function copyLabelOf(copied) {
  if (copied) {
    return 'Copié'
  }

  return 'Copier'
}

/**
 * One plan of the list: editing or activating it, its share code, and a sheet for the rarer actions
 * @param {object} props
 * @param {{ id: string, name: string, created_by: string, share_code: string, is_template: number, free_slots: number }} props.plan
 * @param {boolean} props.isCurrent
 * @param {boolean} props.isCreator
 * @param {(id: string) => void} props.onActivate
 * @param {(id: string) => void} props.onEdit
 * @param {(planId: string, isTemplate: boolean) => Promise<string | undefined>} props.onPublishTemplate
 * @param {(planId: string) => Promise<string | undefined>} props.onExport
 * @param {(planId: string) => Promise<string | undefined>} props.onDelete
 */
export default function PlanCard({ plan, isCurrent, isCreator, onActivate, onEdit, onPublishTemplate, onExport, onDelete }) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  // Closing the sheet also drops a pending deletion, so it is never confirmed by surprise later
  function closeSheet() {
    setOpen(false)
    setConfirming(false)
    setError('')
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
      <header className="plan-card__header">
        <h2 className="plan-card__title">{plan.name}</h2>
        {isCurrent && <span className="plan-card__badge">Plan actif</span>}
        {!!plan.is_template && <span className="scope__badge">Modèle</span>}

        <button
          type="button"
          className="plan-card__more"
          onClick={() => setOpen(true)}
          aria-label={`Options de ${plan.name}`}
        >
          <Icon name="more" className="icon" />
        </button>
      </header>

      <p className="plan-card__share">
        <code className="plan-card__code">{plan.share_code}</code>

        <button type="button" className="plan-card__copy" onClick={handleCopy}>
          <Icon name="copy" className="icon" />
          <span>{copyLabelOf(copied)}</span>
        </button>

        <span className="section__hint">{codeHintFor(plan.free_slots)}</span>
      </p>

      <footer className="plan-card__actions">
        {!isCurrent && (
          <button type="button" className="plan-card__button" onClick={() => onActivate(plan.id)}>
            Définir comme actif
          </button>
        )}

        <button type="button" className="form__submit plan-card__edit" onClick={() => onEdit(plan.id)}>
          <Icon name="pencil" className="icon" />
          <span>Éditer</span>
        </button>
      </footer>

      <Sheet open={open} title={plan.name} onClose={closeSheet}>
        <div className="plan-card__sheet">
          {isCreator && (
            <section className="plan-card__group">
              <h3 className="plan-card__group-title">Modèle</h3>

              <label className="plan-card__toggle">
                <input
                  type="checkbox"
                  checked={!!plan.is_template}
                  onChange={(event) => onPublishTemplate(plan.id, event.target.checked)}
                />
                <span>Publier la structure commune comme modèle, copiable par d&rsquo;autres</span>
              </label>
            </section>
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
    </article>
  )
}
