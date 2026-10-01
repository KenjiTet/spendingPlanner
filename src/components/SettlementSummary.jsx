import Icon from './Icon.jsx'
import { formatAmount } from '../utils/format.js'
import { nameOf, settlementPhaseOf } from '../utils/settlement.js'

/**
 * Who repays whom
 * @param {object} props
 * @param {string} props.debtorId
 * @param {string} props.creditorId
 * @param {Record<string, { name: string }>} props.members
 */
export function MemberPair({ debtorId, creditorId, members }) {
  return (
    <span className="member-pair">
      <span>{nameOf(members, debtorId)}</span>
      <Icon name="arrow-right" className="member-pair__arrow" />
      <span>{nameOf(members, creditorId)}</span>
    </span>
  )
}

/**
 * The repayment at stake, readable at a glance: who repays whom, how much, and the action expected from the viewer
 * @param {object} props
 * @param {{ waiting: boolean, open: { debtorId: string, creditorId: string, amount: number }, pending?: object, action?: string }} props.data
 * @param {Record<string, { name: string }>} props.members
 * @param {string} props.slotId
 * @param {boolean} props.busy
 * @param {() => void} props.onDeclare
 * @param {() => void} props.onValidate
 * @param {() => void} props.onCancel - refused by the creditor ("Pas reçu")
 */
export default function SettlementSummary({ data, members, slotId, busy, onDeclare, onValidate, onCancel }) {
  const phase = settlementPhaseOf(data)
  const { pending, open } = data
  // A declared repayment comes first: it is the one waiting for an answer
  let current = { debtorId: open.debtorId, creditorId: open.creditorId, amount: open.amount }

  if (!!pending) {
    current = { debtorId: pending.debtor_id, creditorId: pending.creditor_id, amount: pending.amount }
  }

  const isDebtor = current.debtorId === slotId

  return (
    <section className="card settlement-summary" aria-label="Remboursement">
      <div className="settlement-summary__figures">
        {!!current.amount && <MemberPair debtorId={current.debtorId} creditorId={current.creditorId} members={members} />}

        {!!current.amount && <p className="settlement-summary__amount">{formatAmount(current.amount)}</p>}
      </div>

      <div className="settlement-summary__actions">
        {phase === 'waiting' && <span className="settlement-summary__status">En attente du second membre</span>}

        {phase === 'due' && isDebtor && (
          <button type="button" className="form__submit" disabled={busy} onClick={onDeclare}>
            Remboursement effectué
          </button>
        )}

        {phase === 'due' && !isDebtor && <span className="settlement-summary__status">En attente de remboursement</span>}

        {phase === 'pending' && isDebtor && <span className="settlement-summary__status">En attente de confirmation</span>}

        {phase === 'pending' && !isDebtor && (
          <>
            <button type="button" className="confirm__button" disabled={busy} onClick={onCancel}>
              Pas reçu
            </button>
            <button type="button" className="form__submit" disabled={busy} onClick={onValidate}>
              Reçu
            </button>
          </>
        )}
      </div>
    </section>
  )
}
