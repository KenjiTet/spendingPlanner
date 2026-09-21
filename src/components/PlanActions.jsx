import { useState } from 'react'
import Section from './Section.jsx'
import { isValidPlan, normalizePlan, SHARED } from '../utils/plan.js'
import { loadLegacyPlan } from '../utils/storage.js'

const EXPORT_FILENAME = 'plan.json'

/**
 * Default mapping of JSON people to members: same position, the common part when there are more people than members
 * @param {{ id: string }[]} sourcePeople
 * @param {{ id: string }[]} members
 */
function defaultMapping(sourcePeople, members) {
  return sourcePeople.reduce(
    (mapping, person, index) => ({ ...mapping, [person.id]: members[index]?.id ?? SHARED }),
    {}
  )
}

/**
 * Moves the plan in and out of a JSON file; importing appends a file's lines to this plan
 * @param {object} props
 * @param {object} props.plan
 * @param {boolean} props.canImport - only the plan creator may write other members' parts
 * @param {(source: object, scopeByPerson: Record<string, string>) => Promise<string | undefined>} props.onImport
 */
export default function PlanActions({ plan, canImport, onImport }) {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(undefined)
  const [mapping, setMapping] = useState({})
  const [legacyPlan] = useState(loadLegacyPlan)

  // Downloads the current plan as a formatted JSON file
  function handleExport() {
    const content = JSON.stringify(normalizePlan(plan), undefined, 2)
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
    const link = document.createElement('a')

    link.href = url
    link.download = EXPORT_FILENAME
    link.click()
    URL.revokeObjectURL(url)
  }

  // Asks who each person of the source is before importing
  function prepareImport(source) {
    if (!isValidPlan(source)) {
      setError('Ce fichier n’est pas un plan valide.')
      return
    }

    setPending(source)
    setMapping(defaultMapping(source.people, plan.people))
    setError('')
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      prepareImport(JSON.parse(await file.text()))
    } catch {
      setError('Fichier illisible, le JSON est invalide.')
    }

    // Lets the same file be picked again right after
    event.target.value = ''
  }

  async function handleImport(event) {
    event.preventDefault()

    const failure = await onImport(pending, mapping)

    setError(failure ?? '')

    if (!failure) {
      setPending(undefined)
    }
  }

  return (
    <Section title="Données" tone="data">
      <p className="section__hint">
        Exportez le plan en JSON pour le sauvegarder. L’import ajoute les lignes du fichier à ce plan.
      </p>

      <div className="actions__buttons">
        <button type="button" className="form__submit" onClick={handleExport}>
          Exporter le JSON
        </button>

        {canImport && (
          <label className="actions__import">
            <span>Importer un JSON</span>
            <input type="file" accept="application/json,.json" onChange={handleFile} />
          </label>
        )}

        {canImport && !!legacyPlan && (
          <button type="button" className="actions__reset" onClick={() => prepareImport(legacyPlan)}>
            Importer le plan de ce navigateur
          </button>
        )}
      </div>

      {!!pending && (
        <form className="form--inline" onSubmit={handleImport}>
          {pending.people.map((person, index) => (
            <label key={`mapping-${person.id}-${index}`} className="form__field form__field--grow">
              <span>Partie de « {person.label} » attribuée à</span>
              <select
                value={mapping[person.id]}
                onChange={(event) => setMapping({ ...mapping, [person.id]: event.target.value })}
              >
                {plan.people.map((member, memberIndex) => (
                  <option key={`member-${member.id}-${memberIndex}`} value={member.id}>
                    {member.label}
                  </option>
                ))}
                <option value={SHARED}>Partie commune</option>
              </select>
            </label>
          ))}

          <button type="submit" className="form__submit">
            Importer
          </button>

          <button type="button" className="actions__reset" onClick={() => setPending(undefined)}>
            Annuler
          </button>
        </form>
      )}

      {!!error && <p className="actions__error">{error}</p>}
    </Section>
  )
}
