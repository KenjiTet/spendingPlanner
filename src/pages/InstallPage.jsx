import Icon from '../components/Icon.jsx'
import { isIOS } from '../utils/device.js'

// The path to the home screen, as drawn by Safari on iOS and by Chrome on Android
const STEPS = {
  ios: [
    { text: 'Touchez le bouton « … » de Safari, en bas à droite.', icon: 'more', label: '' },
    { text: 'Touchez « Partager ».', icon: 'share', label: 'Partager' },
    { text: 'Faites défiler puis touchez « Sur l’écran d’accueil ».', icon: 'square-plus', label: 'Sur l’écran d’accueil' },
    { text: 'Touchez « Ajouter », puis ouvrez SpendingPlanner depuis votre écran d’accueil.', icon: 'plus', label: 'Ajouter' },
  ],
  android: [
    { text: 'Touchez le menu « ⋮ » de Chrome, en haut à droite.', icon: 'more-vertical', label: '' },
    { text: 'Touchez « Ajouter à l’écran d’accueil ».', icon: 'square-plus', label: 'Ajouter à l’écran d’accueil' },
    { text: 'Touchez « Installer », puis ouvrez SpendingPlanner depuis votre écran d’accueil.', icon: 'plus', label: 'Installer' },
  ],
}

/**
 * Shown to phone visitors in the browser instead of the sign-in: how to install the app on the home screen
 * @param {object} props
 * @param {() => void} props.onContinue - goes on to the sign-in in the browser anyway
 */
export default function InstallPage({ onContinue }) {
  const steps = isIOS() ? STEPS.ios : STEPS.android

  return (
    <main className="auth">
      <section className="card auth__card">
        <header className="auth__header">
          <h1 className="auth__title">Installez l’application</h1>
          <p className="auth__message">
            Pour utiliser SpendingPlanner, il est recommandé de l’ajouter à votre écran d’accueil : il s’ouvre alors en
            plein écran, comme une vraie application.
          </p>
        </header>

        <ol className="install__steps">
          {steps.map((step, index) => (
            <li key={`install-step-${step.icon}-${index}`} className="install__step">
              <span className="install__number">{index + 1}</span>
              <p className="install__text">{step.text}</p>

              {/* A drawing of the button to look for on screen */}
              <figure className="install__shot" aria-hidden="true">
                <Icon name={step.icon} className="icon" />
                {!!step.label && <span>{step.label}</span>}
              </figure>
            </li>
          ))}
        </ol>

        <button type="button" className="install__skip" onClick={onContinue}>
          Continuer dans le navigateur
        </button>
      </section>
    </main>
  )
}
