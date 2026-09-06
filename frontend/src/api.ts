const API_URL = import.meta.env.VITE_API_URL

export type TradeDirection = 'buy' | 'sell'

export interface Trade {
  id: number
  account_id: number
  symbol: string
  direction: TradeDirection
  entry_price: number
  exit_price: number | null
  stop_loss: number | null
  take_profit: number | null
  size: number
  pnl: number | null
  opened_at: string
  closed_at: string | null
  notes: string | null
}

export async function fetchTrades(): Promise<Trade[]> {
  const res = await fetch(`${API_URL}/trades/`)
  if (!res.ok) throw new Error(`Failed to fetch trades: ${res.status}`)
  return res.json()
}
