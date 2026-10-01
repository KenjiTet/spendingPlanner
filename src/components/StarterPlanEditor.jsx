import { useState } from 'react'
import { formatAmountIn } from '../utils/format.js'
import { EMPTY_RANGE, leftoversOf, LINE_KINDS, lineAmountsOf, TIER_CURRENCY } from '../utils/starterPlan.js'
import ColorPicker from './ColorPicker.jsx'

const DEFAULT_COLOR = '1'

/**
 * Groups of one section, each line sized by a percentage of the income, a fixed amount or a weight in what is left
 * @param {object} props
 * @param {string} props.title
 * @param {{ label: string, color: string, lines: { label: string, kind: string, value: number | string, max?: number | string, shortcut?: number | string, autoBook: boolean, scope?: string }[] }[]} props.groups
 * @param {object} props.plan - the draft, whose mode and typical incomes the amounts shown follow
 * @param {boolean} [props.withShortcuts] - expense lines may come with a shortcut of the expense form
 * @param {(groups: object[]) => void} props.onChange
 */
function GroupsEditor({ title, groups, plan, withShortcuts, onChange }) {
  // Lines of a plan for two tell whether they are common or personal
  const isDuo = plan.mode === 'duo'

  /**
   * @param {number} groupIndex
   * @param {object} patch
   */
  function updateGroup(groupIndex, patch) {
    onChange(groups.map((group, index) => {
      if (index !== groupIndex) {
        return group
      }

      return { ...group, ...patch }
    }))
  }

  /**
   * @param {number} groupIndex
   * @param {number} lineIndex
   * @param {object} patch
   */
  function updateLine(groupIndex, lineIndex, patch) {
    const lines = groups[groupIndex].lines.map((line, index) => {
      if (index !== lineIndex) {
        return line
      }

      return { ...line, ...patch }
    })

    updateGroup(groupIndex, { lines })
  }

  /**
   * A new line is common in a plan for two, as most household costs are
   * @param {number} groupIndex
   */
  function addLine(groupIndex) {
    const line = { label: '', kind: 'fixed', value: '', autoBook: false }

    if (isDuo) {
      line.scope = 'shared'
    }

    updateGroup(groupIndex, { lines: [...groups[groupIndex].lines, line] })
  }

  return (
    <section className="admin__groups">
      <h3 className="admin__subtitle">{title}</h3>

      {groups.map((group, groupIndex) => (
        <fieldset key={`group-${title}-${groupIndex}`} className="admin__group">
          <header className="admin__group-header">
            <ColorPicker color={group.color} title={`Couleur de ${group.label}`} onPick={(color) => updateGroup(groupIndex, { color })} />
            <input className="admin__group-label" value={group.label} placeholder="Nom du groupe" aria-label="Nom du groupe" required onChange={(event) => updateGroup(groupIndex, { label: event.target.value })} />
            <button type="button" className="list__remove" aria-label={`Supprimer le groupe ${group.label}`} onClick={() => onChange(groups.filter((_, index) => index !== groupIndex))}>
              ×
            </button>
          </header>

          <ul className="list__items">
            {group.lines.map((line, lineIndex) => (
              <li key={`line-${groupIndex}-${lineIndex}`} className="list__item list__item--fields">
                <label className="form__field form__field--grow">
                  <span>Ligne</span>
                  <input value={line.label} required onChange={(event) => updateLine(groupIndex, lineIndex, { label: event.target.value })} />
                </label>

                <label className="form__field">
                  <span>Calcul</span>
                  <select value={line.kind} onChange={(event) => updateLine(groupIndex, lineIndex, { kind: event.target.value, max: undefined })}>
                    {LINE_KINDS.map((kind, kindIndex) => (
                      <option key={`kind-${kind.id}-${kindIndex}`} value={kind.id}>
                        {kind.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form__field admin__percent">
                  <span>Valeur</span>
                  <input type="number" min="0" step="0.01" value={line.value} required onChange={(event) => updateLine(groupIndex, lineIndex, { value: event.target.value })} />
                </label>

                {/* A percentage or a share of the rest may be capped, per person */}
                {line.kind !== 'fixed' && (
                  <label className="form__field admin__percent">
                    <span>Plafond {TIER_CURRENCY}</span>
                    <input type="number" min="0" step="0.01" value={line.max ?? ''} onChange={(event) => updateLine(groupIndex, lineIndex, { max: event.target.value })} />
                  </label>
                )}

                {/* The expense form only offers shortcuts on lines typed by hand */}
                {withShortcuts && !line.autoBook && (
                  <label className="form__field admin__percent">
                    <span>Raccourci {TIER_CURRENCY}</span>
                    <input type="number" min="0" step="0.01" value={line.shortcut ?? ''} onChange={(event) => updateLine(groupIndex, lineIndex, { shortcut: event.target.value })} />
                  </label>
                )}

                {isDuo && (
                  <label className="form__field">
                    <span>Part</span>
                    <select value={line.scope} onChange={(event) => updateLine(groupIndex, lineIndex, { scope: event.target.value })}>
                      <option value="shared">Commune</option>
                      <option value="personal">Personnelle</option>
                    </select>
                  </label>
                )}

                <label className="admin__check">
                  <input type="checkbox" checked={!!line.autoBook} onChange={(event) => updateLine(groupIndex, lineIndex, { autoBook: event.target.checked, shortcut: undefined })} />
                  <span>Prélèvement auto</span>
                </label>

                {/* One amount per bracket, at its typical income */}
                <span className="admin__amount">
                  {lineAmountsOf(line, plan).map((amount) => formatAmountIn(amount, TIER_CURRENCY)).join(' · ')}
                </span>

                <button type="button" className="list__remove" aria-label={`Supprimer la ligne ${line.label}`} onClick={() => updateGroup(groupIndex, { lines: group.lines.filter((_, index) => index !== lineIndex) })}>
                  ×
                </button>
              </li>
            ))}
          </ul>

          <button type="button" className="admin__add" onClick={() => addLine(groupIndex)}>
            + Ligne
          </button>
        </fieldset>
      ))}

      <button type="button" className="admin__add" onClick={() => onChange([...groups, { label: '', color: DEFAULT_COLOR, lines: [] }])}>
        + Groupe
      </button>
    </section>
  )
}

/**
 * Tax and what is left unassigned at each typical income, so the admin checks the reserve holds
 * @param {object} draft
 */
function totalsLabelOf(draft) {
  const leftovers = leftoversOf(draft).map(({ income, tax, left }) => `${formatAmountIn(income, TIER_CURRENCY)} : impôts ${formatAmountIn(tax, TIER_CURRENCY)}, reste ${formatAmountIn(left, TIER_CURRENCY)}`)

  return `Par personne — ${leftovers.join(' · ')}`
}

/**
 * Edits one starter plan: its name, its income brackets and its lines, saved as a whole
 * @param {object} props
 * @param {object} props.plan - as served by the API
 * @param {boolean} props.isNew - a plan not saved yet cannot be deleted
 * @param {(plan: object) => Promise<string | undefined>} props.onSave - resolves to an error message, if any
 * @param {() => void} props.onDelete
 * @param {() => void} props.onCancel
 */
export default function StarterPlanEditor({ plan, isNew, onSave, onDelete, onCancel }) {
  const [draft, setDraft] = useState(plan)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  /**
   * @param {number} rangeIndex
   * @param {object} patch
   */
  function updateRange(rangeIndex, patch) {
    const ranges = draft.ranges.map((range, index) => {
      if (index !== rangeIndex) {
        return range
      }

      return { ...range, ...patch }
    })

    setDraft({ ...draft, ranges })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)

    const failure = await onSave(draft)

    setError(failure ?? '')
    setBusy(false)
  }

  return (
    <form className="card admin__editor" onSubmit={handleSubmit}>
      <label className="form__field">
        <span>Nom du plan</span>
        <input value={draft.label} required autoFocus onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
      </label>

      <section className="admin__groups">
        <h3 className="admin__subtitle">Fourchettes de revenu net mensuel ({TIER_CURRENCY})</h3>
        <p className="section__hint">
          Le plan est calculé sur le revenu type de la fourchette choisie. Maximum vide : pas de plafond.
        </p>

        <ul className="list__items">
          {draft.ranges.map((range, rangeIndex) => (
            <li key={`range-${draft.id}-${rangeIndex}`} className="list__item list__item--fields">
              <label className="form__field">
                <span>Minimum</span>
                <input type="number" min="0" value={range.min} required onChange={(event) => updateRange(rangeIndex, { min: event.target.value })} />
              </label>

              <label className="form__field">
                <span>Maximum</span>
                <input type="number" min="0" value={range.max ?? ''} onChange={(event) => updateRange(rangeIndex, { max: event.target.value })} />
              </label>

              <label className="form__field">
                <span>Revenu type</span>
                <input type="number" min="0" value={range.typical} required onChange={(event) => updateRange(rangeIndex, { typical: event.target.value })} />
              </label>

              <button type="button" className="list__remove" aria-label="Supprimer la fourchette" disabled={draft.ranges.length === 1} onClick={() => setDraft({ ...draft, ranges: draft.ranges.filter((_, index) => index !== rangeIndex) })}>
                ×
              </button>
            </li>
          ))}
        </ul>

        <button type="button" className="admin__add" onClick={() => setDraft({ ...draft, ranges: [...draft.ranges, EMPTY_RANGE] })}>
          + Fourchette
        </button>
      </section>

      <GroupsEditor title="Dépenses" groups={draft.expenses} plan={draft} withShortcuts onChange={(expenses) => setDraft({ ...draft, expenses })} />
      <GroupsEditor title="Épargne" groups={draft.savings} plan={draft} onChange={(savings) => setDraft({ ...draft, savings })} />

      <p className="admin__totals">{totalsLabelOf(draft)}</p>

      {!!error && <p className="actions__error">{error}</p>}

      <footer className="actions__buttons">
        <button type="submit" className="form__submit" disabled={busy}>
          Valider
        </button>
        <button type="button" className="admin__secondary" onClick={onCancel} disabled={busy}>
          Annuler
        </button>
        {!isNew && (
          <button type="button" className="actions__reset" onClick={onDelete} disabled={busy}>
            Supprimer
          </button>
        )}
      </footer>
    </form>
  )
}
