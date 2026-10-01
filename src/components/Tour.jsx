import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useTourTarget from '../hooks/useTourTarget.js'

// Room around the element lit, between it and the bubble, and along the screen edges
const SPOTLIGHT_PADDING = 6
const BUBBLE_GAP = 12
const GUTTER = 16
// The arrow never leaves the rounded corners of the bubble
const ARROW_INSET = 20

// One element per step, on the page it lives on; a step without target, or whose element is missing, is explained
// in the middle of the screen. `only` keeps a step to a plan for two ('duo') or with a free place ('invite'),
// a text worded for each kind of plan carries both versions
const STEPS = [
  {
    chapter: 'Bienvenue',
    to: '/',
    title: 'Un petit tour pour commencer',
    text: {
      solo: 'Votre budget est prêt ! Faisons un petit tour de l’app pour le prendre en main.',
      duo: 'Votre budget à deux est prêt ! Faisons un petit tour de l’app pour le prendre en main ensemble.',
    },
  },
  {
    chapter: 'Vue d’ensemble',
    to: '/',
    target: '.sidebar a[href="/"]',
    title: 'Le mois en un coup d’œil',
    text: 'Votre page d’accueil : où en est le mois par rapport au budget prévu.',
  },
  {
    chapter: 'Vue d’ensemble',
    to: '/',
    target: '[data-tour="month-budget"]',
    title: 'Le reste à dépenser',
    text: 'Ce qu’il vous reste à dépenser ce mois, et combien par jour jusqu’à la fin.',
  },
  {
    chapter: 'Vue d’ensemble',
    to: '/',
    target: '[data-tour="gauges"]',
    title: 'Les jauges',
    text: 'Une jauge par catégorie pour savoir où vous en êtes dans chaque dépense !',
  },
  {
    chapter: 'Budget',
    to: '/plan',
    target: '.sidebar a[href="/plan"]',
    title: 'Ce que vous prévoyez',
    text: {
      solo: 'Le plan lui-même : ce que vous prévoyez de dépenser et d’épargner chaque mois. Les montants proposés sont un point de départ.',
      duo: 'Le plan lui-même : ce que vous prévoyez de dépenser et d’épargner chaque mois, ensemble et chacun de votre côté.',
    },
  },
  {
    chapter: 'Budget',
    to: '/plan',
    target: '#plan-expenses',
    title: 'Les lignes de dépense',
    text: {
      solo: 'Rangées en groupes colorés. Touchez un nom ou un montant pour l’ajuster à votre réalité.',
      duo: 'Rangées en groupes colorés, communes ou personnelles. Touchez un nom ou un montant pour le modifier.',
    },
  },
  {
    chapter: 'Budget',
    to: '/plan',
    target: '#plan-expenses .line__auto',
    title: 'Saisie automatique',
    text: 'Permet de comptabiliser automatiquement la dépense sans la saisir, dès le 1er du mois.',
  },
  {
    chapter: 'Budget',
    to: '/plan',
    target: '#plan-summary',
    title: 'Le récapitulatif',
    text: 'Ici, la synthèse de votre budget avec ce qu’il vous reste à la fin du mois et de l’année.',
  },
  {
    chapter: 'Dépenses',
    to: '/depenses',
    target: '.sidebar a[href="/depenses"]',
    title: 'Noter une dépense',
    text: 'Au quotidien, c’est ici que vous notez vos dépenses, en quelques secondes.',
  },
  {
    chapter: 'Dépenses',
    to: '/depenses',
    target: '[data-tour="expense-category"]',
    title: 'D’abord, la catégorie',
    text: 'Choisissez où ranger la dépense. Les plus utilisées remontent en haut.',
  },
  {
    chapter: 'Dépenses',
    to: '/depenses',
    target: '[data-tour="expense-amount"]',
    title: 'Puis le montant',
    text: 'Saisissez le montant, dans une autre devise si besoin, il sera converti. Ajouter l’enregistre.',
  },
  {
    chapter: 'Dépenses',
    to: '/depenses',
    target: '[data-tour="expense-shortcuts"]',
    title: 'Les raccourcis',
    text: 'Une dépense fréquente, comme un billet de bus, s’enregistre ici en un geste. « + Ajouter » en crée un.',
  },
  {
    chapter: 'Dépenses',
    to: '/depenses',
    target: '[data-tour="expense-date"]',
    title: 'La date et l’historique',
    text: 'La date est celle du jour, modifiable pour un oubli. L’historique liste les dépenses du mois pour les corriger ou les supprimer.',
  },
  {
    chapter: 'Remboursements',
    only: 'duo',
    to: '/remboursements',
    target: '.sidebar a[href="/remboursements"]',
    title: 'Les comptes à deux',
    text: 'Les dépenses communes sont partagées à parts égales : cette page fait les comptes entre vous deux.',
  },
  {
    chapter: 'Remboursements',
    only: 'duo',
    to: '/remboursements',
    target: '[data-tour="settlement-summary"]',
    title: 'Qui rembourse qui',
    text: 'Le montant à rembourser et dans quel sens. Une fois le virement fait, l’autre personne valide.',
  },
  {
    chapter: 'Remboursements',
    only: 'duo',
    to: '/remboursements',
    target: '[data-tour="settlement-open"]',
    title: 'Les dépenses en cours',
    text: 'Les dépenses communes depuis le dernier remboursement. Une fois remboursées, elles passent dans l’historique.',
  },
  {
    chapter: 'À deux',
    only: 'invite',
    to: '/plans',
    target: '.plan-card__share',
    title: 'Invitez votre partenaire',
    text: 'Envoyez-lui ce code : en créant son compte, il ou elle rejoint le plan et prend sa place, avec son propre revenu.',
  },
  {
    chapter: 'Profil',
    to: '/profil',
    target: '.sidebar a[href="/profil"]',
    title: 'Votre compte',
    text: 'Vos informations, communes à tous vos plans.',
  },
  {
    chapter: 'Profil',
    to: '/profil',
    target: '[data-tour="profile-info"]',
    title: 'Prénom et revenu',
    text: 'Repris de vos réponses : remplacez l’estimation par votre revenu exact, il vaut pour tous vos plans.',
  },
  {
    chapter: 'Profil',
    to: '/profil',
    target: '[data-tour="profile-currency"]',
    title: 'La devise principale',
    text: 'Tous les montants sont tenus dans cette devise. Une dépense saisie dans une autre devise y est convertie au taux du jour.',
  },
  {
    chapter: 'Profil',
    to: '/profil',
    target: '[data-tour="tour-replay"]',
    title: 'À vous de jouer',
    text: 'Le tour est terminé ! Vous pouvez le relancer à tout moment depuis ici.',
  },
]

// The last step closes the tour
function nextLabelOf(isLast) {
  if (isLast) {
    return 'Terminer'
  }

  return 'Suivant'
}

// The bubble stays hidden while the element is looked for, then sits beside it or, without one, in the middle
function rootClassOf(status) {
  if (status === 'searching') {
    return 'tour is-searching'
  }

  if (status === 'none') {
    return 'tour is-centered'
  }

  return 'tour'
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * The steps that apply to the plan, each with the text worded for it
 * @param {{ duo: boolean, invite: boolean }} context
 */
function stepsOf(context) {
  return STEPS.filter((step) => !step.only || context[step.only]).map((step) => {
    if (typeof step.text === 'string') {
      return step
    }

    if (context.duo) {
      return { ...step, text: step.text.duo }
    }

    return { ...step, text: step.text.solo }
  })
}

// The element's box grown by the spotlight padding
function paddedBoxOf(rect) {
  if (!rect) {
    return undefined
  }

  return {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  }
}

/**
 * Where the bubble goes: under the element, above it, then beside it, and over its bottom when nothing else fits
 * @param {{ top: number, left: number, width: number, height: number }} [box] - undefined to centre the bubble
 * @param {{ width: number, height: number }} size - of the bubble
 * @returns {{ placement: 'below' | 'above' | 'right' | 'left' | 'over' | 'center', top: number, left: number, arrow: number }}
 */
function bubblePositionOf(box, size) {
  const viewportWidth = document.documentElement.clientWidth
  const viewportHeight = window.innerHeight

  if (!box) {
    return { placement: 'center', top: (viewportHeight - size.height) / 2, left: (viewportWidth - size.width) / 2, arrow: 0 }
  }

  const centreX = box.left + box.width / 2
  const left = clamp(centreX - size.width / 2, GUTTER, viewportWidth - size.width - GUTTER)
  const arrow = clamp(centreX - left, ARROW_INSET, size.width - ARROW_INSET)
  const bottom = box.top + box.height

  if (bottom + BUBBLE_GAP + size.height <= viewportHeight - GUTTER) {
    return { placement: 'below', top: bottom + BUBBLE_GAP, left, arrow }
  }

  if (box.top - BUBBLE_GAP - size.height >= GUTTER) {
    return { placement: 'above', top: box.top - BUBBLE_GAP - size.height, left, arrow }
  }

  // Beside the element, the arrow then pointing sideways at its visible middle
  const visibleCentreY = (Math.max(box.top, 0) + Math.min(bottom, viewportHeight)) / 2
  const sideTop = clamp(visibleCentreY - size.height / 2, GUTTER, viewportHeight - size.height - GUTTER)
  const sideArrow = clamp(visibleCentreY - sideTop, ARROW_INSET, size.height - ARROW_INSET)
  const right = box.left + box.width

  if (right + BUBBLE_GAP + size.width <= viewportWidth - GUTTER) {
    return { placement: 'right', top: sideTop, left: right + BUBBLE_GAP, arrow: sideArrow }
  }

  if (box.left - BUBBLE_GAP - size.width >= GUTTER) {
    return { placement: 'left', top: sideTop, left: box.left - BUBBLE_GAP - size.width, arrow: sideArrow }
  }

  return { placement: 'over', top: viewportHeight - size.height - GUTTER, left, arrow }
}

// Positions are handed to the stylesheet as custom properties, the only styles written from script
function setProperties(element, properties) {
  Object.entries(properties).forEach(([name, value]) => element.style.setProperty(name, value))
}

// Lights the element's box; a zero box in the middle of the screen dims it all
function placeSpotlight(element, box) {
  if (!box) {
    setProperties(element, { '--spot-top': '50%', '--spot-left': '50%', '--spot-width': '0px', '--spot-height': '0px' })
    return
  }

  setProperties(element, {
    '--spot-top': `${box.top}px`,
    '--spot-left': `${box.left}px`,
    '--spot-width': `${box.width}px`,
    '--spot-height': `${box.height}px`,
  })
}

// Measures the bubble, then moves it beside the element, its arrow facing it
function placeBubble(element, box) {
  const position = bubblePositionOf(box, { width: element.offsetWidth, height: element.offsetHeight })

  element.dataset.placement = position.placement
  setProperties(element, {
    '--bubble-top': `${position.top}px`,
    '--bubble-left': `${position.left}px`,
    '--bubble-arrow': `${position.arrow}px`,
  })
}

/**
 * Guided tour of the app: each step opens its page, dims it around one element and explains it in a bubble beside it.
 * The steps follow the active plan: alone, or for two with the repayments, and the invitation while a place is free
 * @param {object} props
 * @param {boolean} props.isDuo - the active plan has two places
 * @param {boolean} props.canInvite - one of them is still free
 * @param {() => void} props.onClose - finished or skipped
 */
export default function Tour({ isDuo, canInvite, onClose }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [index, setIndex] = useState(0)
  // Fixed for the whole tour, so a plan changing behind it never shifts the steps under the viewer
  const [steps] = useState(() => stepsOf({ duo: isDuo, invite: canInvite }))
  const spotlightRef = useRef(undefined)
  const bubbleRef = useRef(undefined)
  const nextRef = useRef(undefined)
  const titleId = useId()
  const step = steps[index]
  const isLast = index === steps.length - 1
  const target = useTourTarget(step.target, pathname === step.to)
  const shown = target.status !== 'searching'

  // The page explained is the one open behind; navigating only when it differs avoids a loop, navigate changing with the location
  useEffect(() => {
    if (pathname !== step.to) {
      navigate(step.to)
    }
  }, [navigate, pathname, step.to])

  // Every render may follow a move of the element, so both layers are placed again before the paint
  useLayoutEffect(() => {
    if (!shown) {
      return
    }

    const box = paddedBoxOf(target.rect)

    placeSpotlight(spotlightRef.current, box)
    placeBubble(bubbleRef.current, box)
  })

  // The keyboard lands on the main button of each bubble, without scrolling the page to it
  useEffect(() => {
    if (shown) {
      nextRef.current.focus({ preventScroll: true })
    }
  }, [index, shown])

  function next() {
    if (isLast) {
      onClose()
      return
    }

    setIndex(index + 1)
  }

  function previous() {
    if (index > 0) {
      setIndex(index - 1)
    }
  }

  // Arrows walk through the steps, Escape leaves the tour
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') {
        onClose()
      }

      if (event.key === 'ArrowRight') {
        next()
      }

      if (event.key === 'ArrowLeft') {
        previous()
      }
    }

    document.addEventListener('keydown', handleKey)

    return () => document.removeEventListener('keydown', handleKey)
  })

  return (
    <div className={rootClassOf(target.status)}>
      <div ref={spotlightRef} className="tour__spotlight" aria-hidden="true" />

      <section ref={bubbleRef} className="tour__bubble" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="tour__header">
          <span className="tour__chapter">{step.chapter}</span>
          <span className="tour__count">
            {index + 1} / {steps.length}
          </span>
        </header>

        <h2 id={titleId} className="tour__title">
          {step.title}
        </h2>
        <p className="tour__text">{step.text}</p>

        <footer className="tour__footer">
          {!isLast && (
            <button type="button" className="actions__reset tour__skip" onClick={onClose}>
              Ignorer
            </button>
          )}

          {index > 0 && (
            <button type="button" className="actions__reset tour__back" onClick={previous}>
              Précédent
            </button>
          )}

          <button ref={nextRef} type="button" className="form__submit" onClick={next}>
            {nextLabelOf(isLast)}
          </button>
        </footer>
      </section>
    </div>
  )
}
