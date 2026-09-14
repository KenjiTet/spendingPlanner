import { useState } from 'react'

/**
 * Card whose body folds away when its header is clicked
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.tone - drives the accent colour of the card
 * @param {import('react').ReactNode} [props.actions] - shown on the right of the header
 * @param {import('react').ReactNode} props.children
 */
export default function Section({ title, tone, actions, children }) {
  const [open, setOpen] = useState(true)

  return (
    <section className={`card section section--${tone}`}>
      <header className="section__header">
        <button
          type="button"
          className="section__toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <span className="chevron" aria-hidden="true" />
          <h2 className="section__title">{title}</h2>
        </button>

        {actions}
      </header>

      {open && children}
    </section>
  )
}
