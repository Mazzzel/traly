import { useEffect, useState } from 'react'
import { fetchAccountStats, fetchOverallStats, type Account, type AccountStats, type Trade } from './api'
import { EquityChart } from './EquityChart'

export const ALL_ACCOUNTS = 'all'

function formatMoney(value: number | null): string {
  if (value === null) return '—'
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' $'
}

function formatPercent(value: number | null): string {
  if (value === null) return '—'
  return (value * 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' %'
}

function StatTile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'good' | 'bad'
}) {
  const color =
    tone === 'good' ? 'var(--delta-good)' : tone === 'bad' ? 'var(--delta-bad)' : 'var(--text-primary)'
  return (
    <div className="stat-tile">
      <div className="stat-tile-label">{label}</div>
      <div className="stat-tile-value" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

export function StatsPanel({
  accounts,
  trades,
  scope,
  onScopeChange,
}: {
  accounts: Account[]
  trades: Trade[]
  scope: string
  onScopeChange: (scope: string) => void
}) {
  const [stats, setStats] = useState<AccountStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetcher = scope === ALL_ACCOUNTS ? fetchOverallStats() : fetchAccountStats(Number(scope))
    fetcher.then(setStats).catch((err) => setError(err.message))
    // `trades` en dépendance : refetch dès qu'un trade est créé/clôturé ailleurs sur la page.
  }, [scope, trades])

  if (accounts.length === 0) {
    return null
  }

  return (
    <section className="viz-root">
      <h2>Statistiques</h2>
      {error && <p role="alert">Erreur: {error}</p>}
      <label>
        Compte
        <select value={scope} onChange={(e) => onScopeChange(e.target.value)}>
          <option value={ALL_ACCOUNTS}>Tous les comptes</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>

      {stats && (
        <>
          <div className="stat-tiles">
            <StatTile label="Trades clôturés" value={`${stats.closed_trades} / ${stats.total_trades}`} />
            <StatTile label="Taux de réussite" value={formatPercent(stats.win_rate)} />
            <StatTile
              label="Profit factor"
              value={stats.profit_factor === null ? '—' : stats.profit_factor.toFixed(2)}
              tone={stats.profit_factor === null ? 'neutral' : stats.profit_factor >= 1 ? 'good' : 'bad'}
            />
            <StatTile label="Gain moyen" value={formatMoney(stats.avg_win)} tone="good" />
            <StatTile label="Perte moyenne" value={formatMoney(stats.avg_loss)} tone="bad" />
            <StatTile label="Meilleur trade" value={formatMoney(stats.best_trade)} tone="good" />
            <StatTile label="Pire trade" value={formatMoney(stats.worst_trade)} tone="bad" />
          </div>

          <h3>Courbe d'équity</h3>
          <EquityChart points={stats.equity_curve} />
        </>
      )}
    </section>
  )
}
