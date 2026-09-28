import { useState } from 'react'

const SLOT_CHOICES = [
  { value: 1, label: 'Une personne' },
  { value: 2, label: 'Deux personnes' },
]

/**
 * Creates a plan: its name, how many people share it, and an optional template to start from
 * @param {object} props
 * @param {{ id: string, name: string }[]} props.templates
 * @param {(name: string, slotCount: number, templateId?: string) => Promise<string | undefined>} props.onCreate
 * @param {() => void} props.onCreated
 */
export default function CreatePlanForm({ templates, onCreate, onCreated }) {
  const [name, setName] = useState('')
  const [slotCount, setSlotCount] = useState(2)
  const [templateId, setTemplateId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)

    // The empty option means starting from scratch, which the server reads as no template at all
    let template = undefined

    if (!!templateId) {
      template = templateId
    }

    const failure = await onCreate(name.trim(), slotCount, template)

    setError(failure ?? '')
    setBusy(false)

    if (!failure) {
      onCreated()
    }
  }

  return (
    <form className="card plans__create" onSubmit={handleSubmit}>
      <label className="form__field form__field--grow">
        <span>Nouveau plan</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Budget 2026" required />
      </label>

      <fieldset className="toggle">
        <legend className="toggle__legend">Qui partage ce plan</legend>

        {SLOT_CHOICES.map((choice, index) => (
          <label key={`slot-choice-${choice.value}-${index}`} className="toggle__option">
            <input
              type="radio"
              name="slotCount"
              value={choice.value}
              checked={slotCount === choice.value}
              onChange={() => setSlotCount(choice.value)}
            />
            <span>{choice.label}</span>
          </label>
        ))}
      </fieldset>

      {!!templates.length && (
        <label className="form__field form__field--grow">
          <span>Partir d&rsquo;un modèle</span>
          <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            <option value="">Partir de zéro</option>
            {templates.map((template, index) => (
              <option key={`template-${template.id}-${index}`} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <button type="submit" className="form__submit" disabled={busy}>
        Créer
      </button>

      <p className="section__hint">
        À deux, les dépenses communes sont partagées et chacun garde sa partie personnelle. Seule la structure d&rsquo;un
        modèle est copiée, jamais les montants.
      </p>

      {!!error && <p className="actions__error">{error}</p>}
    </form>
  )
}
