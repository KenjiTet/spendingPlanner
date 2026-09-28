import { formatAmount } from '../utils/format.js'

// Red once the month costs more than the income
function balanceClassOf(available) {
  if (available < 0) {
    return 'card balance balance--over'
  }

  return 'card balance'
}

// Amount taken off the income, the minus sign kept out of a negative value
function debitOf(amount) {
  return `− ${formatAmount(amount)}`
}

/**
 * What is really left on the account this month: how it is reached from the income, then what it is made of,
 * the budget still to spend and the income no budget line uses
 * @param {object} props
 * @param {{ income: number, tax: number, savings: number, spent: number, remaining: number, unbudgeted: number, available: number }} props.balance
 */
export default function AccountBalance({ balance }) {
  return (
    <section className={balanceClassOf(balance.available)} aria-label="Disponible sur le compte">
      <header className="balance__head">
        <span className="kpi__label">Disponible sur le compte</span>
        <strong className="balance__value">{formatAmount(balance.available)}</strong>
      </header>

      <div className="balance__detail">
        <dl className="balance__rows">
          <div className="balance__row">
            <dt>Revenus nets</dt>
            <dd>{formatAmount(balance.income)}</dd>
          </div>
          <div className="balance__row">
            <dt>Impôts du mois</dt>
            <dd>{debitOf(balance.tax)}</dd>
          </div>
          <div className="balance__row">
            <dt>Épargne</dt>
            <dd>{debitOf(balance.savings)}</dd>
          </div>
          <div className="balance__row">
            <dt>Dépensé</dt>
            <dd>{debitOf(balance.spent)}</dd>
          </div>
        </dl>

        <dl className="balance__rows balance__rows--split" aria-label="Répartition du disponible">
          <div className="balance__row">
            <dt>Reste à dépenser</dt>
            <dd>{formatAmount(balance.remaining)}</dd>
          </div>
          <div className="balance__row">
            <dt>Hors budget</dt>
            <dd>{formatAmount(balance.unbudgeted)}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
