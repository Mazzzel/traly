const API_URL = import.meta.env.VITE_API_URL

export type TradeDirection = 'buy' | 'sell'

export interface Account {
  id: number
  name: string
  broker: string
  initial_balance: number
}

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

export type NewAccount = Omit<Account, 'id'>
export type NewTrade = Omit<Trade, 'id'>

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`${options?.method ?? 'GET'} ${path} failed: ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

export const fetchAccounts = () => request<Account[]>('/accounts/')
export const createAccount = (account: NewAccount) =>
  request<Account>('/accounts/', { method: 'POST', body: JSON.stringify(account) })

export const fetchTrades = () => request<Trade[]>('/trades/')
export const createTrade = (trade: NewTrade) =>
  request<Trade>('/trades/', { method: 'POST', body: JSON.stringify(trade) })
