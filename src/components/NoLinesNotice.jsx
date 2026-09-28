import { Link } from 'react-router-dom'

// Shown instead of the tracking while the plan has no expense line to book on
export default function NoLinesNotice() {
  return (
    <section className="card empty">
      <h1 className="empty__title">Aucune catégorie de dépense</h1>
      <p className="section__hint">Ajoutez des lignes communes ou personnelles dans le plan pour commencer le suivi.</p>
      <Link to="/plan" className="form__submit">
        Ouvrir le plan
      </Link>
    </section>
  )
}
