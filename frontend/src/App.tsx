import { useEffect, useState } from 'react'
import { fetchTrades, type Trade } from './api'
import './App.css'

function App() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTrades()
      .then(setTrades)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <main>
      <h1>Journal de trading</h1>
      {error && <p role="alert">Erreur: {error}</p>}
      {!error && trades.length === 0 && <p>Aucun trade enregistré pour le moment.</p>}
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
    </main>
  )
}

export default App
