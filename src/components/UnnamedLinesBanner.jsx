import { hasName } from '../utils/plan.js'

/**
 * Warns about the budget lines left without a name, which the expense form cannot offer
 * @param {object} props
 * @param {{ label?: string }[]} props.lines
 */
export default function UnnamedLinesBanner({ lines }) {
  const count = lines.filter((line) => !hasName(line)).length

  if (!count) {
    return undefined
  }

  let title = `${count} lignes sans nom`

  if (count === 1) {
    title = '1 ligne sans nom'
  }

  return (
    <aside className="banner banner--warning" role="status">
      <p className="banner__title">{title}</p>
      <p className="banner__text">Donnez-leur un nom : sans nom, une ligne n&rsquo;apparaît pas dans la saisie des dépenses.</p>
    </aside>
  )
}
