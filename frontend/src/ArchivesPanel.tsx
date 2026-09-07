import { useEffect, useState } from 'react'
import { fetchArchives, type Account, type ArchivePeriod, type Trade } from './api'
import { TradeExitsTable } from './TradeExitsTable'
import { ALL_ACCOUNTS } from './StatsPanel'

function formatMoney(value: number): string {
  const sign = value > 0 ? '+' : ''
  return sign + value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $'
}

function formatMoneyPlain(value: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function ArchivedTradeRow({ trade }: { trade: Trade }) {
  return (
    <details className="trade-row">
      <summary>
        <span className="chevron">▶</span>
        <span className="symbol">{trade.symbol}</span>
        <span className={`direction ${trade.is_breakeven ? 'be' : trade.direction}`}>
          {trade.is_breakeven ? 'BE' : trade.direction === 'buy' ? 'Achat' : 'Vente'}
        </span>
        <span className="col-entryexit mono">
          {trade.entry_price}
          <span className="arrow">→</span>
          {trade.exit_price ?? '—'}
        </span>
        <span
          className={`col-pnl mono tabular ${
            trade.pnl === null ? 'open' : trade.is_breakeven ? 'be' : trade.pnl >= 0 ? 'gain' : 'loss'
          }`}
        >
          {trade.pnl === null ? 'ouvert' : formatMoney(trade.pnl)}
        </span>
      </summary>
      <dl className="trade-detail">
        <div>
          <dt>Entrée</dt>
          <dd className="mono tabular">{trade.entry_price}</dd>
        </div>
        <div>
          <dt>Taille</dt>
          <dd className="mono tabular">{trade.size}</dd>
        </div>
        <div>
          <dt>Ouvert le</dt>
          <dd className="mono tabular">{new Date(trade.opened_at).toLocaleString('fr-FR')}</dd>
        </div>
        {trade.closed_at !== null && (
          <div>
            <dt>Clôturé le</dt>
            <dd className="mono tabular">{new Date(trade.closed_at).toLocaleString('fr-FR')}</dd>
          </div>
        )}
        {trade.notes && (
          <div className="notes">
            <dt>Notes</dt>
            <dd>{trade.notes}</dd>
          </div>
        )}
        <TradeExitsTable exits={trade.exits} />
      </dl>
    </details>
  )
}

export function ArchivesPanel({
  accounts,
  scope,
  withdrawalsVersion,
}: {
  accounts: Account[]
  scope: string
  withdrawalsVersion: number
}) {
  const [periods, setPeriods] = useState<(ArchivePeriod & { accountName: string })[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const targets = scope === ALL_ACCOUNTS ? accounts : accounts.filter((a) => String(a.id) === scope)
    Promise.all(
      targets.map((account) =>
        fetchArchives(account.id).then((periods) => periods.map((p) => ({ ...p, accountName: account.name }))),
      ),
    )
      .then((results) => {
        const merged = results
          .flat()
          .sort((a, b) => new Date(b.withdrawal.withdrawn_at).getTime() - new Date(a.withdrawal.withdrawn_at).getTime())
        setPeriods(merged)
      })
      .catch((err) => setError(err.message))
  }, [accounts, scope, withdrawalsVersion])

  if (error) return <p role="alert">Erreur: {error}</p>

  if (periods.length === 0) {
    return (
      <p style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>
        Aucune période archivée pour le moment — une période est créée à chaque retrait de fonds.
      </p>
    )
  }

  return (
    <div>
      <p style={{ fontSize: '12.5px', color: 'var(--ink-muted)', margin: '0 0 16px' }}>
        Les trades ci-dessous appartiennent à des périodes clôturées par un retrait — ils ne comptent plus dans les
        statistiques actuelles.
      </p>

      {periods.map((period) => (
        <details className="archive-period" key={period.withdrawal.id}>
          <summary>
            <div>
              <div className="title">
                {scope === ALL_ACCOUNTS ? `${period.accountName} — ` : ''}
                Période clôturée le {formatDate(period.withdrawal.withdrawn_at)}
              </div>
              <div className="range">Retrait de {formatMoneyPlain(period.withdrawal.amount)}</div>
            </div>
            <div className="figures">
              <div className="item">
                <div className="label">Trades</div>
                <div className="value tabular">{period.trade_count}</div>
              </div>
              <div className="item">
                <div className="label">PnL période</div>
                <div className={`value tabular ${period.pnl >= 0 ? 'gain' : 'loss'}`}>{formatMoney(period.pnl)}</div>
              </div>
              <div className="item">
                <div className="label">Solde après retrait</div>
                <div className="value tabular">{formatMoneyPlain(period.withdrawal.balance_after)}</div>
              </div>
            </div>
          </summary>
          {period.trades.length === 0 ? (
            <p className="empty">Aucun trade clôturé sur cette période.</p>
          ) : (
            <div className="trade-log">
              {period.trades.map((trade) => (
                <ArchivedTradeRow trade={trade} key={trade.id} />
              ))}
            </div>
          )}
        </details>
      ))}
    </div>
  )
}
