import { useState } from 'react'
import useExchangeRates from '../hooks/useExchangeRates.js'
import AmountInput from './AmountInput.jsx'
import CurrencySelect from './CurrencySelect.jsx'

/**
 * The account's name, income and reference currency, read by every plan it takes a place in
 * @param {object} props
 * @param {{ username: string, display_name: string, net_monthly: number, main_currency: string }} props.user
 * @param {(displayName: string, netMonthly: string, mainCurrency: string) => Promise<string | undefined>} props.onSave
 */
export default function ProfileCard({ user, onSave }) {
  const [displayName, setDisplayName] = useState(user.display_name)
  const [netMonthly, setNetMonthly] = useState(user.net_monthly)
  const [mainCurrency, setMainCurrency] = useState(user.main_currency)
  // The currencies with a known rate, the current one first
  const { currencies, likelyCount } = useExchangeRates(user.main_currency)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)

    const failure = await onSave(displayName.trim(), netMonthly, mainCurrency)

    setMessage(failure ?? 'Profil enregistré.')
    setBusy(false)
  }

  return (
    <form className="card profile__panel profile__form" onSubmit={handleSubmit}>
      <header className="profile__panel-intro">
        <h2 className="plan-card__title">Informations personnelles</h2>
        <p className="section__hint">Ce salaire alimente les revenus de tous vos plans.</p>
      </header>

      <label className="form__field">
        <span>Nom affiché</span>
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
      </label>

      <label className="form__field">
        <span>Salaire net / mois</span>
        <AmountInput
          min="0"
          step="any"
          value={netMonthly}
          onChange={(event) => setNetMonthly(event.target.value)}
          placeholder="0"
        />
      </label>

      {/* Amounts typed in another currency are converted into this one; those already saved are left as they are */}
      <div className="form__field">
        <span>Devise principale</span>
        <CurrencySelect variant="field" currencies={currencies} pinned={likelyCount} value={mainCurrency} onChange={setMainCurrency} />
      </div>

      <button type="submit" className="form__submit" disabled={busy}>
        Enregistrer
      </button>

      {!!message && <p className="section__hint">{message}</p>}
    </form>
  )
}
