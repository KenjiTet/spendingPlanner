import { useState } from 'react'

// The optional budget sections, all included until turned off
const SECTIONS = [
  { field: 'show_savings', label: 'Épargne et investissements' },
  { field: 'show_taxes', label: 'Impôts' },
]

// Word shown beside the switch, so the state reads without relying on its colour
function stateLabelOf(included) {
  if (included) {
    return 'Inclus'
  }

  return 'Désactivé'
}

/**
 * Budget sections the account works with, saved as soon as one is toggled
 * @param {object} props
 * @param {{ show_savings: number, show_taxes: number }} props.user
 * @param {(preferences: { show_savings: boolean, show_taxes: boolean }) => Promise<string | undefined>} props.onSave
 */
export default function BudgetSectionsCard({ user, onSave }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  /**
   * @param {'show_savings' | 'show_taxes'} field
   */
  async function handleToggle(field) {
    setBusy(true)

    const failure = await onSave({ show_savings: !!user.show_savings, show_taxes: !!user.show_taxes, [field]: !user[field] })

    setMessage(failure ?? '')
    setBusy(false)
  }

  return (
    <section className="card options">
      <h2 className="plan-card__title">Désactiver des options</h2>
      <p className="section__hint">Une option désactivée est masquée du budget de tous vos plans.</p>

      <ul className="options__list">
        {SECTIONS.map((section, index) => {
          const included = !!user[section.field]

          return (
            <li key={`option-${section.field}-${index}`} className="options__item">
              <span id={`option-${section.field}`}>{section.label}</span>

              <button
                type="button"
                role="switch"
                className="onoff"
                aria-checked={included}
                aria-labelledby={`option-${section.field}`}
                disabled={busy}
                onClick={() => handleToggle(section.field)}
              >
                <span className="onoff__state">{stateLabelOf(included)}</span>
                <span className="onoff__track" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>

      {!!message && <p className="section__hint">{message}</p>}
    </section>
  )
}
