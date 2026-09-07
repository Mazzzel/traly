const API_URL = import.meta.env.VITE_API_URL

export type TradeDirection = 'buy' | 'sell'

export interface Account {
  id: number
  name: string
  broker: string
  initial_balance: number
}

export interface TradeExit {
  id: number
  sequence: number
  percent_of_remaining: number
  size_closed: number
  exit_price: number
  pnl: number
  closed_at: string
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
  is_breakeven: boolean
  notes: string | null
  exits: TradeExit[]
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
  winning_trades: number
  losing_trades: number
  win_rate: number | null
  profit_factor: number | null
  total_gain: number | null
  total_loss: number | null
  expectancy: number | null
  max_drawdown: number | null
  avg_win: number | null
  avg_loss: number | null
  best_trade: number | null
  worst_trade: number | null
  max_win_streak: number
  max_loss_streak: number
  avg_trade_duration_seconds: number | null
  equity_curve: EquityPoint[]
  period_start_balance: number
  period_start_at: string | null
}

export interface Withdrawal {
  id: number
  account_id: number
  amount: number
  balance_after: number
  withdrawn_at: string
}

export interface ArchivePeriod {
  withdrawal: Withdrawal
  period_start_at: string | null
  trades: Trade[]
  trade_count: number
  pnl: number
}

export interface SymbolSpec {
  id: number
  symbol: string
  contract_size: number
}

export type NewAccount = Omit<Account, 'id'>
export type NewTrade = Omit<Trade, 'id' | 'exits'>

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
export const addTradeExit = (
  tradeId: number,
  percentOfRemaining: number,
  exitPrice: number,
  pnl: number,
  isBreakeven = false,
  closedAt?: string,
) =>
  request<Trade>(`/trades/${tradeId}/exits`, {
    method: 'POST',
    body: JSON.stringify({
      percent_of_remaining: percentOfRemaining,
      exit_price: exitPrice,
      pnl,
      closed_at: closedAt ?? null,
      is_breakeven: isBreakeven,
    }),
  })

export const deleteTrade = (tradeId: number) =>
  request<void>(`/trades/${tradeId}`, { method: 'DELETE' })

export const fetchAccountStats = (accountId: number) =>
  request<AccountStats>(`/accounts/${accountId}/stats`)
export const fetchOverallStats = () => request<AccountStats>('/accounts/stats')

export const fetchWithdrawals = (accountId: number) =>
  request<Withdrawal[]>(`/accounts/${accountId}/withdrawals`)
export const createWithdrawal = (accountId: number, amount: number) =>
  request<Withdrawal>(`/accounts/${accountId}/withdrawals`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  })
export const fetchArchives = (accountId: number) =>
  request<ArchivePeriod[]>(`/accounts/${accountId}/archives`)

export const fetchSymbolSpecs = () => request<SymbolSpec[]>('/symbol-specs/')
export const upsertSymbolSpec = (symbol: string, contractSize: number) =>
  request<SymbolSpec>('/symbol-specs/', {
    method: 'PUT',
    body: JSON.stringify({ symbol, contract_size: contractSize }),
  })
