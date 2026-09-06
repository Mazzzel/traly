import { useEffect, useState } from 'react'
import { fetchAccounts, fetchTrades, type Account, type Trade } from './api'
import { NewAccountForm } from './NewAccountForm'
import { NewTradeForm } from './NewTradeForm'
import './App.css'

function App() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchAccounts(), fetchTrades()])
      .then(([accounts, trades]) => {
        setAccounts(accounts)
        setTrades(trades)
      })
      .catch((err) => setError(err.message))
  }, [])

  return (
    <main>
      <h1>Journal de trading</h1>
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
