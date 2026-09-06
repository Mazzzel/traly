import { useEffect, useState } from 'react'
import { clearToken, fetchAccounts, fetchMe, fetchTrades, getToken, type Account, type Trade } from './api'
import { LoginPage } from './LoginPage'
import { ChangePasswordPage } from './ChangePasswordPage'
import { NewAccountForm } from './NewAccountForm'
import { NewTradeForm } from './NewTradeForm'
import './App.css'

type AuthState = 'loading' | 'anonymous' | 'must-change-password' | 'authenticated'

function App() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
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
    Promise.all([fetchAccounts(), fetchTrades()])
      .then(([accounts, trades]) => {
        setAccounts(accounts)
        setTrades(trades)
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
          onCreated={(trade) => setTrades((prev) => [trade, ...prev])}
        />
      </section>

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
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id}>
                  <td>{trade.symbol}</td>
                  <td>{trade.direction}</td>
                  <td>{trade.entry_price}</td>
                  <td>{trade.exit_price ?? '—'}</td>
                  <td>{trade.pnl ?? '—'}</td>
                  <td>{new Date(trade.opened_at).toLocaleString()}</td>
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
