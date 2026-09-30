import PieChart from './PieChart.jsx'
import Section from './Section.jsx'
import { SHARED, toScopeTree } from '../utils/plan.js'

// Headings splitting each legend, used only when the plan is shared
const LEGEND_GROUPS = [
  { id: 'common', label: 'Part commune' },
  { id: 'own', label: 'Personnel' },
]

// Largest share first inside a group
function byValue(first, second) {
  return second.value - first.value
}

// Sum of the loose lines of a scope, outside any sub-group
function looseTotalOf(scope) {
  return scope.items.reduce((sum, line) => sum + Number(line.amount), 0)
}

/**
 * Builds the slices making up one person's monthly spending, the common part first, then their own
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
    label: subgroup.label,
    value: subgroup.total / shareCount,
    tone: subgroup.color,
    group: 'common',
  }))

  const ownSlices = own.subgroups.map((subgroup) => ({
    id: `own-${subgroup.id}`,
    label: subgroup.label,
    value: subgroup.total,
    tone: subgroup.color,
    group: 'own',
  }))

  const commonPart = [
    ...commonSlices,
    { id: 'common-loose', label: 'Hors groupe', value: looseTotalOf(common) / shareCount, tone: 'neutral', group: 'common' },
  ]
  const ownPart = [
    ...ownSlices,
    { id: 'own-loose', label: 'Hors groupe', value: looseTotalOf(own), tone: 'neutral', group: 'own' },
    { id: 'tax', label: 'Impôts', value: tax, tone: 'tax', group: 'own' },
  ]

  // The donut follows its legend: one group after the other, the largest share first in each
  return [...commonPart.sort(byValue), ...ownPart.sort(byValue)]
}

// A solo plan has nothing to split, its legend stays a single list
function legendGroupsOf(shareCount) {
  if (shareCount < 2) {
    return undefined
  }

  return LEGEND_GROUPS
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
            title={`Budget de ${person.label}`}
            slices={slicesFor(person, tree, shareCount, taxByScope[person.id] ?? 0)}
            groups={legendGroupsOf(shareCount)}
          />
        ))}
      </div>
    </Section>
  )
}
