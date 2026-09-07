import { useEffect, useState } from 'react'
import {
  clearToken,
  deleteTrade,
  fetchAccounts,
  fetchMe,
  fetchSymbolSpecs,
  fetchTrades,
  getToken,
  type Account,
  type SymbolSpec,
  type Trade,
} from './api'
import { LoginPage } from './LoginPage'
import { ChangePasswordPage } from './ChangePasswordPage'
import { NewAccountForm } from './NewAccountForm'
import { NewTradeForm } from './NewTradeForm'
import { CloseTradeForm } from './CloseTradeForm'
import { StatsPanel } from './StatsPanel'
import './App.css'

type AuthState = 'loading' | 'anonymous' | 'must-change-password' | 'authenticated'

function App() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [symbolSpecs, setSymbolSpecs] = useState<SymbolSpec[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!getToken()) {
      setAuthState('anonymous')
      return
    }
    fetchMe()
      .then((me) => setAuthState(me.must_change_password ? 'must-change-password' : 'authenticated'))
      .catch(() => setAuthState('anonymous'))
  }, [])

  useEffect(() => {
    if (authState !== 'authenticated') return
    Promise.all([fetchAccounts(), fetchTrades(), fetchSymbolSpecs()])
      .then(([accounts, trades, specs]) => {
        setAccounts(accounts)
        setTrades(trades)
        setSymbolSpecs(specs)
      })
      .catch((err) => setError(err.message))
  }, [authState])

  if (authState === 'loading') return null

  if (authState === 'anonymous') {
    return (
      <LoginPage
        onLoggedIn={(mustChangePassword) =>
          setAuthState(mustChangePassword ? 'must-change-password' : 'authenticated')
        }
      />
    )
  }

  if (authState === 'must-change-password') {
    return <ChangePasswordPage onChanged={() => setAuthState('authenticated')} />
  }

  return (
    <main>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Journal de trading</h1>
        <button
          type="button"
          onClick={() => {
            clearToken()
            setAuthState('anonymous')
          }}
        >
          Se déconnecter
        </button>
      </header>
      {error && <p role="alert">Erreur: {error}</p>}

      <section>
        <NewAccountForm onCreated={(account) => setAccounts((prev) => [...prev, account])} />
      </section>

      <section>
        <NewTradeForm
          accounts={accounts}
          knownSymbols={[...new Set(trades.map((t) => t.symbol))].sort()}
          onCreated={(trade) => setTrades((prev) => [trade, ...prev])}
        />
      </section>

      <StatsPanel accounts={accounts} trades={trades} />

      <section>
        <h2>Trades</h2>
        {trades.length === 0 && <p>Aucun trade enregistré pour le moment.</p>}
        {trades.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Symbole</th>
                <th>Sens</th>
                <th>Entrée</th>
                <th>Sortie</th>
                <th>PnL</th>
                <th>Ouvert le</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id}>
                  <td>{trade.symbol}</td>
                  <td>{trade.direction}</td>
                  <td>{trade.entry_price}</td>
                  <td>{trade.exit_price ?? '—'}</td>
                  <td style={{ color: trade.pnl === null ? undefined : trade.pnl >= 0 ? 'var(--delta-good)' : 'var(--delta-bad)' }}>
                    {trade.pnl ?? '—'}
                  </td>
                  <td>{new Date(trade.opened_at).toLocaleString()}</td>
                  <td style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {trade.closed_at === null && (
                      <CloseTradeForm
                        trade={trade}
                        symbolSpecs={symbolSpecs}
                        onSpecSaved={(spec) =>
                          setSymbolSpecs((prev) => [
                            ...prev.filter((s) => s.symbol !== spec.symbol),
                            spec,
                          ])
                        }
                        onClosed={(updated) =>
                          setTrades((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
                        }
                      />
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`Supprimer le trade ${trade.symbol} ?`)) return
                        await deleteTrade(trade.id)
                        setTrades((prev) => prev.filter((t) => t.id !== trade.id))
                      }}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}

export default App
