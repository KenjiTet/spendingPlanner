import PieChart from './PieChart.jsx'
import Section from './Section.jsx'
import { SHARED, toScopeTree } from '../utils/plan.js'

/**
 * Builds the slices making up one person's monthly spending
 * @param {{ id: string, label: string }} person
 * @param {object[]} tree - the expense scopes returned by toScopeTree
 * @param {number} shareCount - how many people split the common lines
 * @param {number} tax - the person's monthly tax
 */
function slicesFor(person, tree, shareCount, tax) {
  const common = tree.find((scope) => scope.id === SHARED)
  const own = tree.find((scope) => scope.id === person.id)

  const commonSlices = common.subgroups.map((subgroup) => ({
    id: `common-${subgroup.id}`,
    label: `${subgroup.label} (commun)`,
    value: subgroup.total / shareCount,
    tone: subgroup.color,
  }))

  const ownSlices = own.subgroups.map((subgroup) => ({
    id: `own-${subgroup.id}`,
    label: subgroup.label,
    value: subgroup.total,
    tone: subgroup.color,
  }))

  const loose =
    common.items.reduce((sum, line) => sum + Number(line.amount), 0) / shareCount +
    own.items.reduce((sum, line) => sum + Number(line.amount), 0)

  return [
    ...commonSlices,
    ...ownSlices,
    { id: 'loose', label: 'Hors sous-groupe', value: loose, tone: 'neutral' },
    { id: 'tax', label: 'Impôts', value: tax, tone: 'tax' },
  ]
}

/**
 * One expense breakdown per person
 * @param {object} props
 * @param {{ id: string, label: string }[]} props.people
 * @param {{ id: string, label: string }[]} props.scopes
 * @param {{ id: string, label: string, color: string, scope: string }[]} props.subgroups
 * @param {{ id: string, label: string, amount: number, parent: string }[]} props.categories
 * @param {Record<string, number>} props.taxByScope
 */
export default function ChartsSection({ people, scopes, subgroups, categories, taxByScope }) {
  const tree = toScopeTree(scopes, subgroups, categories)
  const shareCount = people.length || 1

  return (
    <Section title="Répartition du mois" tone="charts">
      <div className="charts">
        {people.map((person, index) => (
          <PieChart
            key={`chart-${person.id}-${index}`}
            title={`Dépenses de ${person.label}`}
            slices={slicesFor(person, tree, shareCount, taxByScope[person.id] ?? 0)}
          />
        ))}
      </div>
    </Section>
  )
}
