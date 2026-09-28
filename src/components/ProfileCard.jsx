import { useState } from 'react'

/**
 * The account's name and income, read by every plan it takes a place in
 * @param {object} props
 * @param {{ username: string, display_name: string, net_monthly: number }} props.user
 * @param {(displayName: string, netMonthly: string) => Promise<string | undefined>} props.onSave
 */
export default function ProfileCard({ user, onSave }) {
  const [displayName, setDisplayName] = useState(user.display_name)
  const [netMonthly, setNetMonthly] = useState(user.net_monthly)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)

    const failure = await onSave(displayName.trim(), netMonthly)

    setMessage(failure ?? 'Profil enregistré.')
    setBusy(false)
  }

  return (
    <form className="card profile__form" onSubmit={handleSubmit}>
      <h2 className="plan-card__title">Revenus</h2>

      <label className="form__field form__field--grow">
        <span>Nom affiché</span>
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
      </label>

      <label className="form__field">
        <span>Salaire net / mois</span>
        <input
          type="number"
          min="0"
          step="10"
          value={netMonthly}
          onChange={(event) => setNetMonthly(event.target.value)}
          placeholder="0"
        />
      </label>

      <button type="submit" className="form__submit" disabled={busy}>
        Enregistrer
      </button>

      <p className="section__hint">
        Ce salaire alimente les revenus de tous les plans auxquels vous participez. Les impôts se règlent dans le
        budget de chaque plan.
      </p>

      {!!message && <p className="section__hint">{message}</p>}
    </form>
  )
}
