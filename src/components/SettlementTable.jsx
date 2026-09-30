import { formatAmount, formatShortDay } from '../utils/format.js'
import { nameOf } from '../utils/settlement.js'

/**
 * Whether the viewer may delete an expense: their own, not yet covered by a repayment, as the server requires
 * @param {{ slot_id: string, settlement_id?: string }} expense
 * @param {string} [slotId]
 */
function isRemovable(expense, slotId) {
  return expense.slot_id === slotId && !expense.settlement_id
}

/**
 * Common expenses of one repayment sequence, oldest first: when, what, who paid and how much
 * @param {object} props
 * @param {{ id: string, slot_id: string, line_id?: string, amount: number, spent_on: string, note: string, settlement_id?: string }[]} props.expenses
 * @param {Record<string, { label: string }>} props.lines - from indexLines
 * @param {Record<string, { name: string }>} props.members - from membersOf
 * @param {string} [props.slotId] - the viewer's place, whose open expenses can be deleted
 * @param {(expense: object) => void} [props.onRemove] - none on a settled sequence, which is read only
 */
export default function SettlementTable({ expenses, lines, members, slotId, onRemove }) {
  return (
    <table className="ledger">
      <thead>
        <tr>
          <th scope="col" className="ledger__date">Date</th>
          <th scope="col">Dépense</th>
          <th scope="col">Payé par</th>
          <th scope="col" className="ledger__amount">Montant</th>
          {!!onRemove && (
            <th scope="col" className="ledger__action">
              <span className="visually-hidden">Actions</span>
            </th>
          )}
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
            {!!onRemove && (
              <td className="ledger__action">
                {isRemovable(expense, slotId) && (
                  <button
                    type="button"
                    className="recent__action recent__action--delete"
                    onClick={() => onRemove(expense)}
                    aria-label={`Supprimer ${lines[expense.line_id]?.label ?? ''} ${formatAmount(expense.amount)}`}
                  >
                    ×
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
