import { useState } from 'react'
import Section from './Section.jsx'
import { isValidPlan, normalizePlan } from '../utils/plan.js'

const EXPORT_FILENAME = 'plan.json'

/**
 * Moves the plan in and out of a JSON file, so it can be frozen in src/data/plan.json
 * @param {object} props
 * @param {object} props.plan
 * @param {(plan: object) => void} props.onImport
 * @param {() => void} props.onReset
 */
export default function PlanActions({ plan, onImport, onReset }) {
  const [error, setError] = useState('')

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

  async function handleImport(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const parsed = JSON.parse(await file.text())

      if (!isValidPlan(parsed)) {
        setError('Ce fichier n\u2019est pas un plan valide.')
        return
      }

      onImport(parsed)
      setError('')
    } catch {
      setError('Fichier illisible, le JSON est invalide.')
    }

    // Lets the same file be picked again right after
    event.target.value = ''
  }

  return (
    <Section title="Données" tone="data">

      <p className="section__hint">
        Le plan est conservé dans ce navigateur. Exportez-le pour le figer dans
        <code> src/data/plan.json</code>.
      </p>

      <div className="actions__buttons">
        <button type="button" className="form__submit" onClick={handleExport}>
          Exporter le JSON
        </button>

        <label className="actions__import">
          <span>Importer un JSON</span>
          <input type="file" accept="application/json,.json" onChange={handleImport} />
        </label>

        <button type="button" className="actions__reset" onClick={onReset}>
          Réinitialiser
        </button>
      </div>

      {!!error && <p className="actions__error">{error}</p>}
    </Section>
  )
}
