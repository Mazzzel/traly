import { useState } from 'react'
import { closeTrade, type Trade } from './api'

function suggestedPnl(trade: Trade, exitPrice: number): number {
  const diff = trade.direction === 'buy' ? exitPrice - trade.entry_price : trade.entry_price - exitPrice
  return Math.round(diff * trade.size * 100) / 100
}

export function CloseTradeForm({
  trade,
  onClosed,
}: {
  trade: Trade
  onClosed: (trade: Trade) => void
}) {
  const [exitPrice, setExitPrice] = useState('')
  const [pnl, setPnl] = useState('')
  const [pnlTouched, setPnlTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleExitPriceChange(value: string) {
    setExitPrice(value)
    if (!pnlTouched && value !== '') {
      setPnl(String(suggestedPnl(trade, Number(value))))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const updated = await closeTrade(trade.id, Number(exitPrice), Number(pnl))
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
        onChange={(e) => handleExitPriceChange(e.target.value)}
        required
        style={{ width: '8rem' }}
      />
      <input
        type="number"
        step="0.01"
        title="PnL réel (issu de ton broker) — une suggestion est calculée automatiquement, corrige-la si besoin"
        placeholder="PnL réel"
        value={pnl}
        onChange={(e) => {
          setPnl(e.target.value)
          setPnlTouched(true)
        }}
        required
        style={{ width: '7rem' }}
      />
      <button type="submit">Clôturer</button>
    </form>
  )
}
