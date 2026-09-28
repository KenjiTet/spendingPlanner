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

/**
 * One plan of the list: making it the active one, its share code, and whether it is published as a template
 * @param {object} props
 * @param {{ id: string, name: string, created_by: string, share_code: string, is_template: number, free_slots: number }} props.plan
 * @param {boolean} props.isCurrent
 * @param {boolean} props.isCreator
 * @param {(id: string) => void} props.onActivate
 * @param {(planId: string, isTemplate: boolean) => Promise<string | undefined>} props.onPublishTemplate
 */
export default function PlanCard({ plan, isCurrent, isCreator, onActivate, onPublishTemplate }) {
  return (
    <article className={cardClassOf(isCurrent)}>
      <header className="plan-card__header">
        <h2 className="plan-card__title">{plan.name}</h2>
        {isCurrent && <span className="plan-card__badge">Plan actif</span>}

        {!isCurrent && (
          <button type="button" className="form__submit" onClick={() => onActivate(plan.id)}>
            Définir comme actif
          </button>
        )}
      </header>

      <p className="plan-card__share">
        <code className="plan-card__code">{plan.share_code}</code>
        <span className="section__hint">{codeHintFor(plan.free_slots)}</span>
      </p>

      {isCreator && (
        <label className="plan-card__toggle">
          <input
            type="checkbox"
            checked={!!plan.is_template}
            onChange={(event) => onPublishTemplate(plan.id, event.target.checked)}
          />
          <span>Publier la structure commune comme modèle, copiable par d&rsquo;autres</span>
        </label>
      )}
    </article>
  )
}
