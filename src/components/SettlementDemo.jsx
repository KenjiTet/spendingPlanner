import SettlementSummary from './SettlementSummary.jsx'
import SettlementTable from './SettlementTable.jsx'
import { toDateValue } from '../utils/tracking.js'

// A pair sharing three common expenses: the partner paid 120, the viewer 60, so the viewer owes 30
const MEMBERS = { me: { name: 'Vous' }, partner: { name: 'Partenaire' } }
const LINES = { groceries: { label: 'Courses' }, restaurant: { label: 'Restaurant' }, household: { label: 'Produits ménagers' } }
const AMOUNT_DUE = 30

/**
 * A day before today, as stored on an expense
 * @param {number} days
 */
function daysAgo(days) {
  const date = new Date()

  date.setDate(date.getDate() - days)

  return toDateValue(date)
}

function expensesOf() {
  return [
    { id: 'groceries', slot_id: 'partner', line_id: 'groceries', amount: 84, spent_on: daysAgo(6), note: '' },
    { id: 'restaurant', slot_id: 'me', line_id: 'restaurant', amount: 60, spent_on: daysAgo(3), note: '' },
    { id: 'household', slot_id: 'partner', line_id: 'household', amount: 36, spent_on: daysAgo(1), note: '' },
  ]
}

function noop() {}

/**
 * The repayment screens with made-up figures, for the guided tour: no repayment exists yet when it is played.
 * Rendered with the real components, inert: the amount owed, then the common expenses it comes from
 */
export default function SettlementDemo() {
  return (
    <figure className="tour__demo" inert>
      {/* The viewer owes the partner, and declares the transfer once made */}
      <SettlementSummary data={{ open: { debtorId: 'me', creditorId: 'partner', amount: AMOUNT_DUE } }} members={MEMBERS} slotId="me" busy={false} onDeclare={noop} onValidate={noop} onCancel={noop} />

      <section className="card settlement">
        <header className="settlement__head">
          <h3 className="settlement__title">Dépenses communes en cours</h3>
          <span className="settlement__count">3 dépenses</span>
        </header>

        <SettlementTable expenses={expensesOf()} lines={LINES} members={MEMBERS} />
      </section>
    </figure>
  )
}
