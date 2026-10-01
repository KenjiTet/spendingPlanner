import { useState } from 'react'
import CurrencySelect from '../components/CurrencySelect.jsx'
import JoinPlanForm from '../components/JoinPlanForm.jsx'
import SuccessTick from '../components/SuccessTick.jsx'
import useExchangeRates from '../hooks/useExchangeRates.js'
import useStarterPlans from '../hooks/useStarterPlans.js'
import { buildStarterPlan, incomeRangesIn, rangeLabelOf, TIER_CURRENCY } from '../utils/starterPlan.js'

// The questions in order, the last screen announcing the plan prepared from the answers; the mode comes before the
// income, each mode offering brackets of its own
const STEPS = ['name', 'currency', 'mode', 'income', 'ready']

// The pressed choice is highlighted
function choiceClassOf(isSelected) {
  if (isSelected) {
    return 'onboarding__choice is-active'
  }

  return 'onboarding__choice'
}

/**
 * Units of the main currency per unit of the tier currency, 1 while the rates are unknown
 * @param {(amount: number, currency: string) => number | undefined} toBase
 * @param {string} currency
 */
function rateOf(toBase, currency) {
  const reference = toBase(1000, currency)

  if (!reference) {
    return 1
  }

  return 1000 / reference
}

// What the answers write into the profile
function profileOf(answers, currency) {
  return { firstName: answers.firstName, income: answers.income, currency }
}

/**
 * First steps of a new account: a few questions filling the profile, then a starter plan sized on the income, or
 * the partner's plan joined with its code
 * @param {object} props
 * @param {{ main_currency: string }} props.user
 * @param {(profile: { firstName: string, income: number, currency: string }, plan: object) => Promise<string | undefined>} props.onComplete
 * @param {(code: string) => Promise<{ data?: object, error?: { message: string } }>} props.onPreviewJoin
 * @param {(profile: { firstName: string, income: number, currency: string }, code: string, slotId: string) => Promise<string | undefined>} props.onJoin
 */
export default function OnboardingPage({ user, onComplete, onPreviewJoin, onJoin }) {
  const [index, setIndex] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [currency, setCurrency] = useState(user.main_currency)
  const [rangeId, setRangeId] = useState('')
  const [isDuo, setIsDuo] = useState(false)
  // The second person of a pair joining an existing plan instead of creating one, once their bracket is picked
  const [joining, setJoining] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  // Brackets are set in one currency: the rates express them in the chosen one and bring the income back for the tier
  const { currencies, likelyCount, toBase } = useExchangeRates(TIER_CURRENCY)
  const { plans: starterPlans, error: plansError } = useStarterPlans()
  const rate = rateOf(toBase, currency)
  const ranges = incomeRangesIn(starterPlans ?? [], isDuo, rate)
  const selectedRange = ranges.find((range) => range.id === rangeId)
  const step = STEPS[index]

  const answers = {
    firstName: firstName.trim(),
    income: selectedRange?.typical ?? 0,
    isDuo,
  }

  // Each question is a form of its own, so Enter moves on and the browser checks the field
  function next(event) {
    event.preventDefault()
    setIndex(index + 1)
  }

  // Going back always leaves the join path, the mode being asked again
  function previous() {
    setMessage('')
    setJoining(false)
    setIndex(index - 1)
  }

  /**
   * Picks a mode: the brackets differ from one to the other, so the one picked before is dropped
   * @param {boolean} duo
   */
  function chooseMode(duo) {
    setIsDuo(duo)
    setRangeId('')
  }

  // The second person of a pair still gives their bracket, then joins with the code instead of creating a plan
  function startJoining() {
    setJoining(true)
    setIndex(index + 1)
  }

  // Saves the profile and creates the plan; on success the app leaves the onboarding for the guided tour
  async function start() {
    setBusy(true)
    setMessage('')

    const failure = await onComplete(profileOf(answers, currency), buildStarterPlan(answers, selectedRange.plan, rate))

    if (failure) {
      setMessage(failure)
      setBusy(false)
    }
  }

  return (
    <main className="auth onboarding">
      <section className="card auth__card onboarding__card" aria-live="polite">
        {step !== 'ready' && (
          <header className="onboarding__header">
            <span className="onboarding__count">
              Étape {index + 1} sur {STEPS.length - 1}
            </span>
            <progress className="onboarding__progress" max={STEPS.length - 1} value={index + 1} />
          </header>
        )}

        {step === 'name' && (
          <form className="onboarding__form" onSubmit={next}>
            <h1 className="auth__title">Bienvenue ! Comment vous appelez-vous ?</h1>
            <p className="section__hint">Quelques questions pour préparer un budget à votre mesure.</p>

            <label className="form__field">
              <span>Prénom</span>
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} required autoFocus autoComplete="given-name" />
            </label>

            <footer className="onboarding__footer">
              <button type="submit" className="form__submit">
                Continuer
              </button>
            </footer>
          </form>
        )}

        {step === 'currency' && (
          <form className="onboarding__form" onSubmit={next}>
            <h1 className="auth__title">Dans quelle devise gérez-vous votre budget ?</h1>
            <p className="section__hint">Tous les montants seront tenus dans cette devise. Une dépense dans une autre sera convertie.</p>

            <div className="form__field">
              <span>Devise principale</span>
              <CurrencySelect variant="field" currencies={currencies} pinned={likelyCount} value={currency} onChange={setCurrency} />
            </div>

            <footer className="onboarding__footer">
              <button type="button" className="actions__reset onboarding__back" onClick={previous}>
                Retour
              </button>
              <button type="submit" className="form__submit">
                Continuer
              </button>
            </footer>
          </form>
        )}

        {/* Not a form: nothing is required here */}
        {step === 'mode' && (
          <section className="onboarding__form">
            <h1 className="auth__title">Vous gérez votre budget…</h1>

            <ul className="onboarding__choices">
              <li>
                <button type="button" className={choiceClassOf(!isDuo)} aria-pressed={!isDuo} onClick={() => chooseMode(false)}>
                  <span className="onboarding__choice-title">Seul</span>
                  <span className="section__hint">Un budget pour vous, vos dépenses et votre épargne.</span>
                </button>
              </li>
              <li>
                <button type="button" className={choiceClassOf(isDuo)} aria-pressed={isDuo} onClick={() => chooseMode(true)}>
                  <span className="onboarding__choice-title">À deux</span>
                  <span className="section__hint">Des dépenses communes partagées, et une part personnelle chacun.</span>
                </button>
              </li>
            </ul>

            {/* The second person of a pair joins the plan the first one created, rather than starting another */}
            {isDuo && (
              <button type="button" className="onboarding__link" onClick={startJoining}>
                Votre partenaire a déjà créé votre plan ? Rejoignez-le avec son code
              </button>
            )}

            <footer className="onboarding__footer">
              <button type="button" className="actions__reset onboarding__back" onClick={previous}>
                Retour
              </button>
              <button type="button" className="form__submit" onClick={() => setIndex(index + 1)}>
                Continuer
              </button>
            </footer>
          </section>
        )}

        {/* Not a form either: the brackets are buttons, and the join form shown in it brings its own */}
        {step === 'income' && (
          <section className="onboarding__form">
            <h1 className="auth__title">Combien gagnez-vous par mois, environ ?</h1>
            <p className="section__hint">
              Revenu net : salaire, bourse, allocations, activité indépendante… Une fourchette suffit, le montant exact se
              règle ensuite dans votre profil.
            </p>

            {!starterPlans && <p className="section__hint">Chargement…</p>}

            {!!plansError && <p className="auth__message">{plansError}</p>}

            <ul className="onboarding__choices onboarding__choices--compact" aria-label="Revenu net mensuel">
              {ranges.map((range, rangeIndex) => (
                <li key={`income-${range.id}-${rangeIndex}`}>
                  <button type="button" className={choiceClassOf(range.id === rangeId)} aria-pressed={range.id === rangeId} onClick={() => setRangeId(range.id)}>
                    {rangeLabelOf(range, currency)}
                  </button>
                </li>
              ))}
            </ul>

            {joining && !!selectedRange && (
              <JoinPlanForm onPreview={onPreviewJoin} onJoin={(code, slotId) => onJoin(profileOf(answers, currency), code, slotId)} onJoined={() => {}} />
            )}

            <footer className="onboarding__footer">
              <button type="button" className="actions__reset onboarding__back" onClick={previous}>
                Retour
              </button>
              {!joining && (
                <button type="button" className="form__submit" disabled={!selectedRange} onClick={() => setIndex(index + 1)}>
                  Continuer
                </button>
              )}
            </footer>
          </section>
        )}

        {step === 'ready' && (
          <section className="onboarding__form onboarding__ready">
            <SuccessTick />

            <h1 className="auth__title">Tout est prêt, {answers.firstName} !</h1>
            <p className="section__hint">
              Nous avons préparé un plan personnalisé pour que vous puissiez partir d&rsquo;une base, à modifier selon vos
              besoins.
            </p>

            <footer className="onboarding__footer onboarding__footer--stacked">
              <button type="button" className="form__submit" onClick={start} disabled={busy}>
                Découvrir mon plan
              </button>
              <button type="button" className="onboarding__link" onClick={previous} disabled={busy}>
                Modifier mes réponses
              </button>
            </footer>

            {!!message && <p className="auth__message">{message}</p>}
          </section>
        )}
      </section>
    </main>
  )
}
