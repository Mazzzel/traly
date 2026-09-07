import { useEffect, useState } from 'react'
import { fetchAccountStats, fetchOverallStats, type Account, type AccountStats, type Trade } from './api'
import { EquityChart } from './EquityChart'

export const ALL_ACCOUNTS = 'all'

function formatMoney(value: number | null): string {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return sign + value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $'
}

function formatMoneyPlain(value: number | null): string {
  if (value === null) return '—'
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $'
}

function formatPercent(value: number | null): string {
  if (value === null) return '—'
  return (value * 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %'
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return `${h} h ${String(m).padStart(2, '0')}`
}

function StatCell({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'good' | 'bad'
}) {
  return (
    <div className="stat-cell">
      <div className="label">{label}</div>
      <div className={`value tabular ${tone === 'good' ? 'gain' : tone === 'bad' ? 'loss' : ''}`}>{value}</div>
    </div>
  )
}

export function StatsPanel({
  accounts,
  trades,
  scope,
  withdrawalsVersion,
}: {
  accounts: Account[]
  trades: Trade[]
  scope: string
  withdrawalsVersion: number
}) {
  const [stats, setStats] = useState<AccountStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'essentiel' | 'detail'>('essentiel')

  useEffect(() => {
    const fetcher = scope === ALL_ACCOUNTS ? fetchOverallStats() : fetchAccountStats(Number(scope))
    fetcher.then(setStats).catch((err) => setError(err.message))
  }, [scope, trades, withdrawalsVersion])

  if (accounts.length === 0) {
    return null
  }

  const scopedAccount = scope === ALL_ACCOUNTS ? null : accounts.find((a) => String(a.id) === scope) ?? null
  const periodStartBalance = stats?.period_start_balance ?? 0

  const cumulativePnl = stats?.equity_curve.length ? stats.equity_curve[stats.equity_curve.length - 1].cumulative_pnl : 0
  const deltaPct = periodStartBalance > 0 ? (cumulativePnl / periodStartBalance) * 100 : null

  const scopeLabel = scope === ALL_ACCOUNTS ? 'Tous les comptes' : scopedAccount?.name ?? ''

  return (
    <section>
      <div className="section-head">
        <h2>Statistiques{scopeLabel ? ` — ${scopeLabel}` : ''}</h2>
        <span className="hint">{stats ? `${stats.closed_trades} trades clôturés` : ''}</span>
      </div>
      {error && <p role="alert">Erreur: {error}</p>}

      <div className="headline-figure">
        <span className={`value mono ${cumulativePnl >= 0 ? 'gain' : 'loss'}`}>{formatMoney(cumulativePnl)}</span>
        {deltaPct !== null && (
          <span className={`delta mono ${deltaPct >= 0 ? 'gain' : 'loss'}`}>
            {deltaPct >= 0 ? '+' : ''}
            {deltaPct.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}&nbsp;%
          </span>
        )}
        <span className="caption">équity cumulée</span>
      </div>

      <EquityChart points={stats?.equity_curve ?? []} initialBalance={periodStartBalance} />

      <div className="tabs-row" role="tablist" aria-label="Statistiques">
        <button className="tab-btn" role="tab" aria-selected={tab === 'essentiel'} onClick={() => setTab('essentiel')}>
          Essentiel
        </button>
        <button className="tab-btn" role="tab" aria-selected={tab === 'detail'} onClick={() => setTab('detail')}>
          Détails
        </button>
      </div>

      {stats && tab === 'essentiel' && (
        <div className="stat-grid">
          <StatCell label="Gain total" value={formatMoneyPlain(stats.total_gain)} tone="good" />
          <StatCell label="Perte totale" value={formatMoneyPlain(stats.total_loss)} tone="bad" />
          <StatCell label="Taux de réussite" value={formatPercent(stats.win_rate)} />
          <StatCell label="Profit factor" value={stats.profit_factor === null ? '—' : stats.profit_factor.toFixed(2)} tone={stats.profit_factor === null ? 'neutral' : stats.profit_factor >= 1 ? 'good' : 'bad'} />
          <StatCell label="Expectancy" value={stats.expectancy === null ? '—' : `${formatMoney(stats.expectancy)} / trade`} tone={stats.expectancy === null ? 'neutral' : stats.expectancy >= 0 ? 'good' : 'bad'} />
          <StatCell label="Max drawdown" value={stats.max_drawdown === null ? '—' : `−${formatMoneyPlain(stats.max_drawdown)}`} tone="bad" />
        </div>
      )}

      {stats && tab === 'detail' && (
        <div className="stat-grid">
          <StatCell label="Gain moyen" value={formatMoneyPlain(stats.avg_win)} tone="good" />
          <StatCell label="Perte moyenne" value={formatMoneyPlain(stats.avg_loss)} tone="bad" />
          <StatCell label="Meilleur trade" value={formatMoney(stats.best_trade)} tone="good" />
          <StatCell label="Pire trade" value={formatMoney(stats.worst_trade)} tone="bad" />
          <StatCell label="Série gagnante max" value={`${stats.max_win_streak} trades`} />
          <StatCell label="Série perdante max" value={`${stats.max_loss_streak} trades`} />
          <StatCell label="Durée moyenne" value={formatDuration(stats.avg_trade_duration_seconds)} />
          <StatCell label="Trades gagnants / perdants" value={`${stats.winning_trades} / ${stats.losing_trades}`} />
        </div>
      )}
    </section>
  )
}
