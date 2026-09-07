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

export interface User {
  id: number
  email: string
  must_change_password: boolean
  is_admin: boolean
}

export interface EquityPoint {
  closed_at: string
  cumulative_pnl: number
}

export interface AccountStats {
  total_trades: number
  closed_trades: number
  win_rate: number | null
  profit_factor: number | null
  avg_win: number | null
  avg_loss: number | null
  best_trade: number | null
  worst_trade: number | null
  equity_curve: EquityPoint[]
}

export type NewAccount = Omit<Account, 'id'>
export type NewTrade = Omit<Trade, 'id'>

const TOKEN_KEY = 'traly_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  if (!res.ok) {
    if (res.status === 401) clearToken()
    throw new ApiError(`${options?.method ?? 'GET'} ${path} failed: ${res.status}`, res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const login = (email: string, password: string) =>
  request<{ token: string; must_change_password: boolean }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const changePassword = (current_password: string, new_password: string) =>
  request<{ token: string; must_change_password: boolean }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  })

export const fetchMe = () => request<User>('/auth/me')

export const fetchAccounts = () => request<Account[]>('/accounts/')
export const createAccount = (account: NewAccount) =>
  request<Account>('/accounts/', { method: 'POST', body: JSON.stringify(account) })

export const fetchTrades = () => request<Trade[]>('/trades/')
export const createTrade = (trade: NewTrade) =>
  request<Trade>('/trades/', { method: 'POST', body: JSON.stringify(trade) })
export const closeTrade = (tradeId: number, exitPrice: number, pnl: number, closedAt?: string) =>
  request<Trade>(`/trades/${tradeId}/close`, {
    method: 'POST',
    body: JSON.stringify({ exit_price: exitPrice, pnl, closed_at: closedAt ?? null }),
  })

export const deleteTrade = (tradeId: number) =>
  request<void>(`/trades/${tradeId}`, { method: 'DELETE' })

export const fetchAccountStats = (accountId: number) =>
  request<AccountStats>(`/accounts/${accountId}/stats`)
export const fetchOverallStats = () => request<AccountStats>('/accounts/stats')
