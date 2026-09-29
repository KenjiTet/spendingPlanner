import { formatAmount, formatShortDay } from '../utils/format.js'
import { nameOf } from '../utils/settlement.js'

/**
 * Common expenses of one repayment sequence, oldest first: when, what, who paid and how much
 * @param {object} props
 * @param {{ id: string, slot_id: string, line_id?: string, amount: number, spent_on: string, note: string }[]} props.expenses
 * @param {Record<string, { label: string }>} props.lines - from indexLines
 * @param {Record<string, { name: string }>} props.members - from membersOf
 */
export default function SettlementTable({ expenses, lines, members }) {
  return (
    <table className="ledger">
      <thead>
        <tr>
          <th scope="col" className="ledger__date">Date</th>
          <th scope="col">Dépense</th>
          <th scope="col">Payé par</th>
          <th scope="col" className="ledger__amount">Montant</th>
        </tr>
      </thead>

      <tbody>
        {expenses.map((expense, index) => (
          <tr key={`ledger-${expense.id}-${index}`}>
            <td className="ledger__date">{formatShortDay(expense.spent_on)}</td>
            <td>
              <span className="ledger__label">{lines[expense.line_id]?.label ?? 'Ligne supprimée'}</span>
              {!!expense.note && <span className="ledger__note">{expense.note}</span>}
            </td>
            <td className="ledger__payer">{nameOf(members, expense.slot_id)}</td>
            <td className="ledger__amount">{formatAmount(expense.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
