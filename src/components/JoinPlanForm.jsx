import { useState } from 'react'

/**
 * Joins a plan from its share code: look it up, then take one of its free places
 * @param {object} props
 * @param {(code: string) => Promise<{ data?: object, error?: { message: string } }>} props.onPreview
 * @param {(code: string, slotId: string) => Promise<string | undefined>} props.onJoin
 * @param {() => void} props.onJoined
 */
export default function JoinPlanForm({ onPreview, onJoin, onJoined }) {
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState(undefined)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handlePreview(event) {
    event.preventDefault()
    setBusy(true)

    const { data, error: failure } = await onPreview(code.trim().toUpperCase())

    setError(failure?.message ?? '')
    setPreview(data)
    setBusy(false)
  }

  async function handleJoin(slotId) {
    setBusy(true)

    const failure = await onJoin(code.trim().toUpperCase(), slotId)

    setError(failure ?? '')
    setBusy(false)

    if (!failure) {
      onJoined()
    }
  }

  return (
    <div className="plans__join">
      <form className="plan-card__form" onSubmit={handlePreview}>
        <label className="form__field form__field--grow">
          <span>Code de partage</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="7KQ2M4"
            maxLength={6}
            required
          />
        </label>

        <button type="submit" className="form__submit" disabled={busy}>
          Chercher
        </button>
      </form>

      {!!preview && (
        <>
          <h3 className="plan-card__title">{preview.name}</h3>

          {!!preview.mine && <p className="section__hint">Vous participez déjà à ce plan.</p>}

          {!preview.mine && (
            <ul className="list__items">
              {preview.slots.map((slot, index) => (
                <li key={`slot-${slot.id}-${index}`} className="list__item">
                  <span className="history__label">{slot.label}</span>

                  {slot.taken && <span className="scope__badge">Occupée</span>}

                  {!slot.taken && (
                    <button type="button" className="form__submit" disabled={busy} onClick={() => handleJoin(slot.id)}>
                      Prendre cette place
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {!!error && <p className="actions__error">{error}</p>}
    </div>
  )
}
