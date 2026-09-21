import { useState } from 'react'

// Wording and browser hints that differ between both modes
const MODES = {
  signIn: { submit: 'Se connecter', autoComplete: 'current-password' },
  signUp: { submit: 'Créer le compte', autoComplete: 'new-password' },
}

/**
 * Sign-in and sign-up form, switching between both modes
 * @param {object} props
 * @param {(email: string, password: string) => Promise<string | undefined>} props.onSignIn
 * @param {(name: string, email: string, password: string) => Promise<string | undefined>} props.onSignUp
 */
export default function LoginPage({ onSignIn, onSignUp }) {
  const [mode, setMode] = useState('signIn')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const isSignUp = mode === 'signUp'

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')

    if (isSignUp) {
      setMessage((await onSignUp(name.trim(), email.trim(), password)) ?? '')
    }

    if (!isSignUp) {
      setMessage((await onSignIn(email.trim(), password)) ?? '')
    }

    setBusy(false)
  }

  return (
    <main className="auth">
      <section className="card auth__card">
        <header className="auth__header">
          <h1 className="auth__title">Budget du ménage</h1>
          <p className="section__hint">Planifiez à deux, suivez vos dépenses chacun de votre côté.</p>
        </header>

        <nav className="switch auth__switch" aria-label="Mode">
          <button type="button" className="switch__option" aria-pressed={!isSignUp} onClick={() => setMode('signIn')}>
            Connexion
          </button>
          <button type="button" className="switch__option" aria-pressed={isSignUp} onClick={() => setMode('signUp')}>
            Créer un compte
          </button>
        </nav>

        <form className="auth__form" onSubmit={handleSubmit}>
          {isSignUp && (
            <label className="form__field">
              <span>Prénom</span>
              <input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="given-name" />
            </label>
          )}

          <label className="form__field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="form__field">
            <span>Mot de passe</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete={MODES[mode].autoComplete}
            />
          </label>

          <button type="submit" className="form__submit" disabled={busy}>
            {MODES[mode].submit}
          </button>

          {!!message && <p className="auth__message">{message}</p>}
        </form>
      </section>
    </main>
  )
}
