import { useState } from 'react'
import { isValidPlan } from '../utils/plan.js'
import { loadLegacyPlan } from '../utils/storage.js'

const SLOT_CHOICES = [
  { value: 1, label: 'Une personne' },
  { value: 2, label: 'Deux personnes' },
]

// An imported plan keeps as many places as it has people, within what a plan allows
function slotCountOf(source) {
  if (source.people.length < 2) {
    return 1
  }

  return 2
}

/**
 * Creates a plan: its name, how many people share it, and an optional template or JSON file to start from
 * @param {object} props
 * @param {{ id: string, name: string }[]} props.templates
 * @param {(name: string, slotCount: number, templateId?: string, source?: object) => Promise<string | undefined>} props.onCreate
 * @param {() => void} props.onCreated
 */
export default function CreatePlanForm({ templates, onCreate, onCreated }) {
  const [name, setName] = useState('')
  const [slotCount, setSlotCount] = useState(2)
  const [templateId, setTemplateId] = useState('')
  const [source, setSource] = useState(undefined)
  const [sourceName, setSourceName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [legacyPlan] = useState(loadLegacyPlan)

  // Starts from a plan read from a file or from this browser, its people deciding the number of places
  function pickSource(candidate, label) {
    if (!isValidPlan(candidate)) {
      setError('Ce fichier n’est pas un plan valide.')
      return
    }

    setSource(candidate)
    setSourceName(label)
    setSlotCount(slotCountOf(candidate))
    setError('')

    if (!name && !!candidate.name) {
      setName(candidate.name)
    }
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      pickSource(JSON.parse(await file.text()), file.name)
    } catch {
      setError('Fichier illisible, le JSON est invalide.')
    }

    // Lets the same file be picked again right after
    event.target.value = ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)

    // The empty option means starting from scratch, and an imported file replaces the template
    let template = undefined

    if (!!templateId && !source) {
      template = templateId
    }

    const failure = await onCreate(name.trim(), slotCount, template, source)

    setError(failure ?? '')
    setBusy(false)

    if (!failure) {
      onCreated()
    }
  }

  return (
    <form className="plans__create" onSubmit={handleSubmit}>
      <label className="form__field form__field--grow">
        <span>Nom du plan</span>
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

      {!source && !!templates.length && (
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

      {!source && (
        <div className="actions__buttons">
          <label className="actions__import">
            <span>Importer un plan (JSON)</span>
            <input type="file" accept="application/json,.json" onChange={handleFile} />
          </label>

          {!!legacyPlan && (
            <button
              type="button"
              className="actions__reset"
              onClick={() => pickSource(legacyPlan, 'Plan de ce navigateur')}
            >
              Reprendre le plan de ce navigateur
            </button>
          )}
        </div>
      )}

      {!!source && (
        <p className="plans__source">
          <span>Importé depuis « {sourceName} »</span>
          <button type="button" className="actions__reset" onClick={() => setSource(undefined)}>
            Retirer
          </button>
        </p>
      )}

      <button type="submit" className="form__submit" disabled={busy}>
        Créer
      </button>

      <p className="section__hint">
        À deux, le budget commun est partagé et chacun garde sa partie personnelle. Seule la structure d&rsquo;un
        modèle est copiée, jamais les montants. Un plan importé reprend toutes les lignes du fichier.
      </p>

      {!!error && <p className="actions__error">{error}</p>}
    </form>
  )
}
