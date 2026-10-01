import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import ConfirmSheet from '../components/ConfirmSheet.jsx'
import Icon from '../components/Icon.jsx'
import PullIndicator from '../components/PullIndicator.jsx'
import SettlementTable from '../components/SettlementTable.jsx'
import usePullToRefresh from '../hooks/usePullToRefresh.js'
import { formatAmount, formatShortDay } from '../utils/format.js'
import { membersOf, nameOf, settlementPhaseOf } from '../utils/settlement.js'
import { indexLines, toDateValue } from '../utils/tracking.js'

/**
 * Day of an ISO timestamp, in the viewer's time zone
 * @param {string} timestamp
 */
function dayOf(timestamp) {
  return formatShortDay(toDateValue(new Date(timestamp)))
}

/**
 * How many expenses a sequence counts
 * @param {number} count
 */
function expenseCountOf(count) {
  if (count === 1) {
    return '1 dépense'
  }

  return `${count} dépenses`
}

/**
 * Who repays whom
 * @param {object} props
 * @param {string} props.debtorId
 * @param {string} props.creditorId
 * @param {Record<string, { name: string }>} props.members
 */
function MemberPair({ debtorId, creditorId, members }) {
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
function SettlementSummary({ data, members, slotId, busy, onDeclare, onValidate, onCancel }) {
  const phase = settlementPhaseOf(data)
  const { pending, open } = data
  // A declared repayment comes first: it is the one waiting for an answer
  let current = { debtorId: open.debtorId, creditorId: open.creditorId, amount: open.amount }

  if (!!pending) {
    current = { debtorId: pending.debtor_id, creditorId: pending.creditor_id, amount: pending.amount }
  }

  const isDebtor = current.debtorId === slotId

  return (
    <section className="card settlement-summary" aria-label="Remboursement" data-tour="settlement-summary">
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

/**
 * What deleting an expense removes, named so the right row is confirmed
 * @param {{ line_id?: string, amount: number, spent_on: string } | undefined} expense
 * @param {Record<string, { label: string }>} lines
 */
function removalMessageOf(expense, lines) {
  if (!expense) {
    return ''
  }

  const label = lines[expense.line_id]?.label ?? 'Ligne supprimée'

  return `La dépense « ${label} » de ${formatAmount(expense.amount)} du ${formatShortDay(expense.spent_on)} sera supprimée définitivement.`
}

// Oldest first, as in the history
function byDate(left, right) {
  if (left.spent_on !== right.spent_on) {
    return left.spent_on.localeCompare(right.spent_on)
  }

  return left.created_at.localeCompare(right.created_at)
}

/**
 * Common expenses not settled yet: those of a repayment waiting for validation stay here, beside the newer ones
 * @param {object} props
 * @param {object[]} props.expenses
 * @param {Record<string, { name: string }>} props.members
 * @param {Record<string, object>} props.lines - from indexLines
 * @param {string} props.slotId
 * @param {(expense: object) => void} props.onRemove - asks before deleting one of the viewer's expenses
 */
function OpenSequence({ expenses, members, lines, slotId, onRemove }) {
  return (
    <section className="card settlement" data-tour="settlement-open">
      <header className="settlement__head">
        <h2 className="settlement__title">Dépenses communes en cours</h2>
        <span className="settlement__count">{expenseCountOf(expenses.length)}</span>
      </header>

      {!expenses.length && <p className="section__hint">Aucune dépense commune depuis le dernier remboursement.</p>}

      {!!expenses.length && (
        <SettlementTable expenses={expenses} lines={lines} members={members} slotId={slotId} onRemove={onRemove} />
      )}
    </section>
  )
}

/**
 * Validated repayments, newest first, each row unfolding the expenses it covered
 * @param {object} props
 * @param {{ id: string, debtor_id: string, creditor_id: string, amount: number, declared_at: string, validated_at: string, expenses: object[] }[]} props.settlements
 * @param {Record<string, { name: string }>} props.members
 * @param {Record<string, object>} props.lines - from indexLines
 */
function SettlementHistory({ settlements, members, lines }) {
  return (
    <section className="card settlement">
      <header className="settlement__head">
        <h2 className="settlement__title">Historique</h2>
      </header>

      <ul className="settlement-history">
        {settlements.map((settlement, index) => (
          <li key={`settlement-${settlement.id}-${index}`}>
            <details className="settlement-history__item">
              <summary className="settlement-history__summary">
                <span className="settlement-history__date">{dayOf(settlement.validated_at)}</span>
                <MemberPair debtorId={settlement.debtor_id} creditorId={settlement.creditor_id} members={members} />
                <span className="settlement-history__amount">{formatAmount(settlement.amount)}</span>
                <span className="chevron settlement-history__chevron" aria-hidden="true" />
              </summary>

              {/* Inset panel, so the detail reads as part of its row rather than as the next rows of the history */}
              <div className="settlement-history__body">
                <SettlementTable expenses={settlement.expenses} lines={lines} members={members} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  )
}

// Who repays whom at the top, the common expenses in progress below, then every past repayment
export default function SettlementsPage() {
  const { plan, slotId, settlements, reload: reloadPlan } = useOutletContext()
  // The action waiting for a confirmation: 'declare' or 'validate'
  const [confirming, setConfirming] = useState(undefined)
  // The expense waiting for its deletion to be confirmed
  const [removing, setRemoving] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const { data, error } = settlements

  const members = useMemo(() => membersOf(plan), [plan])
  const lines = useMemo(() => indexLines(plan), [plan])
  // Pulling the page down fetches what the other member may have done
  const { indicatorRef, refreshing } = usePullToRefresh(() => Promise.all([reloadPlan(), settlements.reload()]))

  // The layout loaded them earlier, the other member may have acted since
  useEffect(() => {
    settlements.reload()
  }, [])

  /**
   * Runs one change at a time, so a double tap never sends it twice
   * @param {() => Promise<void>} change
   */
  async function run(change) {
    setConfirming(undefined)
    setBusy(true)
    await change()
    setBusy(false)
  }

  function confirmRemoval() {
    const { id } = removing

    setRemoving(undefined)
    run(() => settlements.removeExpense(id))
  }

  function confirm() {
    if (confirming === 'validate') {
      run(() => settlements.validate(data.pending.id))
      return
    }

    run(settlements.declare)
  }

  if (!data) {
    return <p className="section__hint">Chargement des remboursements…</p>
  }

  if (!data.available) {
    return (
      <section className="card empty">
        <h1 className="empty__title">Remboursements</h1>
        <p className="section__hint">Les remboursements ne sont utiles que pour les plans à deux.</p>
      </section>
    )
  }

  // Until it is validated, a declared repayment keeps its expenses in progress rather than in the history
  const inProgress = [...(data.pending?.expenses ?? []), ...data.open.expenses].sort(byDate)
  let confirmTitle = 'Remboursement effectué'
  let confirmMessage = `Vous confirmez avoir versé ${formatAmount(data.open.amount)} à ${nameOf(members, data.open.creditorId)}.`

  if (confirming === 'validate') {
    confirmTitle = 'Remboursement reçu'
    confirmMessage = `Vous confirmez avoir reçu ${formatAmount(data.pending?.amount)} de ${nameOf(members, data.pending?.debtor_id)}.`
  }

  return (
    <>
      <PullIndicator indicatorRef={indicatorRef} refreshing={refreshing} />

      <h1 className="settlements__heading">Remboursements</h1>

      {!!error && <p className="actions__error">{error}</p>}

      {/* Nothing owed, nothing to show: the expenses in progress come first */}
      {settlementPhaseOf(data) !== 'even' && (
        <SettlementSummary
          data={data}
          members={members}
          slotId={slotId}
          busy={busy}
          onDeclare={() => setConfirming('declare')}
          onValidate={() => setConfirming('validate')}
          onCancel={() => run(() => settlements.cancel(data.pending.id))}
        />
      )}

      <OpenSequence expenses={inProgress} members={members} lines={lines} slotId={slotId} onRemove={setRemoving} />

      {!!data.history.length && <SettlementHistory settlements={data.history} members={members} lines={lines} />}

      <ConfirmSheet
        open={!!confirming}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel="Confirmer"
        onConfirm={confirm}
        onClose={() => setConfirming(undefined)}
      />

      <ConfirmSheet
        open={!!removing}
        title="Supprimer la dépense"
        message={removalMessageOf(removing, lines)}
        confirmLabel="Supprimer"
        onConfirm={confirmRemoval}
        onClose={() => setRemoving(undefined)}
      />
    </>
  )
}
