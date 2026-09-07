import { useState } from 'react'
import { closeTrade, type Trade } from './api'

export function CloseTradeForm({
  trade,
  onClosed,
}: {
  trade: Trade
  onClosed: (trade: Trade) => void
}) {
  const [exitPrice, setExitPrice] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const updated = await closeTrade(trade.id, Number(exitPrice))
      onClosed(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
      {error && <span role="alert">{error}</span>}
      <input
        type="number"
        step="0.00001"
        placeholder="Prix de sortie"
        value={exitPrice}
        onChange={(e) => setExitPrice(e.target.value)}
        required
        style={{ width: '8rem' }}
      />
      <button type="submit">Clôturer</button>
    </form>
  )
}
