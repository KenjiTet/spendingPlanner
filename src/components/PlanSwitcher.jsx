import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { initialOf } from '../utils/format.js'

// Highlights the active plan in the menu
function optionClassOf(isActive) {
  if (isActive) {
    return 'switcher__option is-active'
  }

  return 'switcher__option'
}

/**
 * Active plan picker of the sidebar, its menu opening to the right
 * @param {object} props
 * @param {{ id: string, name: string }[]} props.plans
 * @param {string} [props.currentPlanId]
 * @param {(id: string) => void} props.onSelect
 */
export default function PlanSwitcher({ plans, currentPlanId, onSelect }) {
  const [open, setOpen] = useState(false)
  const root = useRef(undefined)
  const current = plans.find((plan) => plan.id === currentPlanId)

  // An open menu closes on a click outside of it or on Escape
  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handlePointer(event) {
      if (!root.current.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleKey(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function choose(id) {
    onSelect(id)
    setOpen(false)
  }

  return (
    <div className="switcher" ref={root}>
      <button
        type="button"
        className="switcher__trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="switcher__badge" aria-hidden="true">
          {initialOf(current?.name)}
        </span>
        <span className="switcher__text">
          <span className="sidebar__eyebrow">Plan actif</span>
          <span className="switcher__name">{current?.name ?? 'Aucun plan'}</span>
        </span>
        <span className="switcher__arrow" aria-hidden="true" />
      </button>

      {open && (
        <section className="switcher__menu" aria-label="Changer de plan">
          <h2 className="switcher__heading">Vos plans</h2>

          {!plans.length && <p className="section__hint">Aucun plan pour le moment.</p>}

          {!!plans.length && (
            <ul className="switcher__list">
              {plans.map((plan, index) => (
                <li key={`switcher-${plan.id}-${index}`}>
                  <button
                    type="button"
                    className={optionClassOf(plan.id === currentPlanId)}
                    aria-current={plan.id === currentPlanId}
                    onClick={() => choose(plan.id)}
                  >
                    <span className="switcher__badge switcher__badge--small" aria-hidden="true">
                      {initialOf(plan.name)}
                    </span>
                    <span className="switcher__option-name">{plan.name}</span>
                    {plan.id === currentPlanId && (
                      <span className="switcher__check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link to="/profil" className="switcher__manage" onClick={() => setOpen(false)}>
            Gérer, créer ou rejoindre un plan
          </Link>
        </section>
      )}
    </div>
  )
}
