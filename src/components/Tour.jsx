import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'
import Sheet from './Sheet.jsx'

// One step per page, opened behind the sheet; a feature is marked with the icon, symbol or control the page itself shows
const STEPS = [
  {
    to: '/',
    title: 'Bienvenue !',
    intro: 'Un plan d’exemple, rempli pour une personne, vous attend. Petit tour des pages en une minute.',
    features: [
      { icon: 'clipboard', text: 'Un plan, c’est votre budget du mois : revenu, dépenses prévues, épargne et impôts.' },
      { icon: 'receipt', text: 'Au quotidien, vous notez vos dépenses et l’app les compare au plan.' },
      { icon: 'layers', text: 'Personnalisez l’exemple à votre guise, ou créez autant de plans que vous voulez, seul ou à deux.' },
    ],
  },
  {
    to: '/',
    menu: { icon: 'dashboard', label: 'Vue d’ensemble' },
    title: 'Vue d’ensemble',
    intro: 'Où en est le mois par rapport au plan, en un coup d’œil.',
    features: [
      { icon: 'wallet', text: 'Dépensé, budget restant et jours restants avant la fin du mois.' },
      { icon: 'calendar', text: 'Le calendrier colore chaque jour selon votre budget quotidien ; touchez un jour pour voir ses dépenses.' },
      { visual: 'gauge', text: 'Une jauge par catégorie, sur le mois ou cumulée sur l’année, qui passe à l’orange à 80 % du budget et au rouge au-delà.' },
      { symbol: '↓', text: 'Tirez la page vers le bas pour l’actualiser, par exemple après une modification de l’autre personne du plan.' },
    ],
  },
  {
    to: '/depenses',
    menu: { icon: 'receipt', label: 'Dépenses' },
    title: 'Dépenses',
    intro: 'Notez une dépense en quelques secondes.',
    features: [
      { icon: 'check', text: 'Choisissez la catégorie, puis saisissez le montant en bas de l’écran et ajoutez la dépense.' },
      { icon: 'calendar', text: 'La date est celle du jour, modifiable à gauche du montant pour un oubli.' },
      { icon: 'user', text: 'Dans un plan à deux, le filtre du haut n’affiche que les catégories communes ou personnelles.' },
      { symbol: '+', text: 'Les raccourcis enregistrent une dépense fréquente, comme un billet de bus, en un geste.' },
      { icon: 'history', text: 'L’historique des dépenses, en haut, liste celles du mois pour les corriger ou les supprimer.' },
    ],
  },
  {
    to: '/plan',
    menu: { icon: 'wallet', label: 'Budget' },
    title: 'Budget',
    intro: 'Le plan lui-même : ce que vous prévoyez chaque mois.',
    features: [
      { visual: 'swatch', text: 'Les lignes sont rangées en sous-groupes colorés ; touchez un nom ou un montant pour le changer.' },
      { symbol: '↻', text: 'Auto marque un prélèvement automatique (loyer, abonnements) : compté dès le 1er du mois, sans saisie.' },
      { icon: 'clipboard', text: 'Épargne, impôts, graphiques et récapitulatif suivent, avec ce qu’il vous reste chaque mois.' },
    ],
  },
  {
    to: '/plans',
    menu: { icon: 'layers', label: 'Mes plans' },
    title: 'Mes plans',
    intro: 'Tous vos plans, dont celui qui est actif sur les autres pages.',
    features: [
      { icon: 'pencil', text: 'Éditer ouvre le budget du plan.' },
      { icon: 'copy', text: 'Le code de partage invite une deuxième personne dans un plan à deux.' },
      { icon: 'more', text: 'Les options publient le plan comme modèle, l’exportent ou le suppriment.' },
      { icon: 'plus', text: 'Nouveau plan : partez de zéro, d’un modèle ou d’un fichier.' },
    ],
  },
  {
    to: '/profil',
    menu: { icon: 'user', label: 'Profil' },
    title: 'Profil',
    intro: 'Vos informations, communes à tous vos plans.',
    features: [
      { icon: 'user', text: 'Nom affiché et revenu net mensuel : remplacez ceux de l’exemple par les vôtres.' },
      { visual: 'switch', text: 'Désactivez l’épargne ou les impôts s’ils ne vous servent pas : ils disparaissent du budget.' },
      { icon: 'history', text: 'Ce tutoriel se relance à tout moment depuis cette page.' },
    ],
  },
]

// Miniatures of the page controls that have no icon, drawn with their own classes
const VISUALS = {
  swatch: <span className="swatch swatch--3" />,
  gauge: (
    <span className="tour__gauges">
      <span className="tour__gauge" />
      <span className="tour__gauge tour__gauge--warning" />
      <span className="tour__gauge tour__gauge--over" />
    </span>
  ),
  switch: <span className="onoff__track" />,
}

// The last step closes the tour
function nextLabelOf(isLast) {
  if (isLast) {
    return 'Terminer'
  }

  return 'Suivant'
}

// The current step's dot stands out from the others
function dotClassOf(isCurrent) {
  if (isCurrent) {
    return 'tour__dot is-active'
  }

  return 'tour__dot'
}

/**
 * Mark in front of a feature, the same icon, symbol or control as on the page
 * @param {object} props
 * @param {{ icon?: string, symbol?: string, visual?: keyof VISUALS }} props.feature
 */
function FeatureMark({ feature }) {
  if (!!feature.icon) {
    return (
      <span className="tour__mark" aria-hidden="true">
        <Icon name={feature.icon} className="icon" />
      </span>
    )
  }

  if (!!feature.visual) {
    return (
      <span className="tour__mark" aria-hidden="true">
        {VISUALS[feature.visual]}
      </span>
    )
  }

  return (
    <span className="tour__mark" aria-hidden="true">
      {feature.symbol}
    </span>
  )
}

/**
 * Guided tour of the app, opening each page behind a sheet that explains it
 * @param {object} props
 * @param {() => void} props.onClose - finished or skipped
 */
export default function Tour({ onClose }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [index, setIndex] = useState(0)
  const step = STEPS[index]
  const isLast = index === STEPS.length - 1

  // The page explained is the one open behind the sheet; navigating only when it differs avoids a loop, navigate changing with the location
  useEffect(() => {
    if (pathname !== step.to) {
      navigate(step.to)
    }
  }, [navigate, pathname, step.to])

  function next() {
    if (isLast) {
      onClose()
      return
    }

    setIndex(index + 1)
  }

  return (
    <Sheet open title={step.title} description={step.intro} onClose={onClose}>
      <article className="tour">
        {!!step.menu && (
          <p className="tour__menu">
            <span>Dans le menu</span>
            <span className="tour__entry">
              <Icon name={step.menu.icon} className="icon" />
              {step.menu.label}
            </span>
          </p>
        )}

        <ul className="tour__features">
          {step.features.map((feature, featureIndex) => (
            <li key={`tour-feature-${index}-${featureIndex}`} className="tour__feature">
              <FeatureMark feature={feature} />
              <span>{feature.text}</span>
            </li>
          ))}
        </ul>

        <footer className="tour__footer">
          <ol className="tour__dots" aria-label={`Étape ${index + 1} sur ${STEPS.length}`}>
            {STEPS.map((candidate, stepIndex) => (
              <li key={`tour-dot-${candidate.to}-${stepIndex}`} className={dotClassOf(stepIndex === index)} />
            ))}
          </ol>

          {index > 0 && (
            <button type="button" className="actions__reset tour__back" onClick={() => setIndex(index - 1)}>
              Précédent
            </button>
          )}

          {index === 0 && (
            <button type="button" className="actions__reset tour__back" onClick={onClose}>
              Passer
            </button>
          )}

          <button type="button" className="form__submit" onClick={next}>
            {nextLabelOf(isLast)}
          </button>
        </footer>
      </article>
    </Sheet>
  )
}
