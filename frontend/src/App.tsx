import { useEffect, useState } from 'react'
import {
  clearToken,
  createWithdrawal,
  deleteTrade,
  fetchAccounts,
  fetchMe,
  fetchSymbolSpecs,
  fetchTrades,
  fetchWithdrawals,
  getToken,
  type Account,
  type SymbolSpec,
  type Trade,
  type Withdrawal,
} from './api'
import { LoginPage } from './LoginPage'
import { ChangePasswordPage } from './ChangePasswordPage'
import { NewAccountForm } from './NewAccountForm'
import { NewTradeForm } from './NewTradeForm'
import { CloseTradeForm } from './CloseTradeForm'
import { TradeExitsTable } from './TradeExitsTable'
import { ArchivesPanel } from './ArchivesPanel'
import { StatsPanel, ALL_ACCOUNTS } from './StatsPanel'
import './App.css'

type AuthState = 'loading' | 'anonymous' | 'must-change-password' | 'authenticated'
type Theme = '' | 'light' | 'dark'

function formatMoney(value: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $'
}

function accountBalance(account: Account, trades: Trade[], withdrawals: Withdrawal[]): number {
  const pnl = trades
    .filter((t) => t.account_id === account.id && t.closed_at !== null && t.pnl !== null)
    .reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const withdrawn = withdrawals
    .filter((w) => w.account_id === account.id)
    .reduce((sum, w) => sum + w.amount, 0)
  return account.initial_balance + pnl - withdrawn
}

function lastWithdrawalAt(accountId: number, withdrawals: Withdrawal[]): string | null {
  const relevant = withdrawals.filter((w) => w.account_id === accountId)
  if (relevant.length === 0) return null
  return relevant.reduce((latest, w) => (w.withdrawn_at > latest ? w.withdrawn_at : latest), relevant[0].withdrawn_at)
}

function App() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [symbolSpecs, setSymbolSpecs] = useState<SymbolSpec[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [withdrawalsVersion, setWithdrawalsVersion] = useState(0)
  const [statsScope, setStatsScope] = useState<string>(ALL_ACCOUNTS)
  const [tradesTab, setTradesTab] = useState<'trades' | 'archives'>('trades')
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>('')
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [showNewTrade, setShowNewTrade] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

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

  useEffect(() => {
    if (accounts.length === 0) return
    Promise.all(accounts.map((a) => fetchWithdrawals(a.id)))
      .then((lists) => setWithdrawals(lists.flat()))
      .catch((err) => setError(err.message))
  }, [accounts, withdrawalsVersion])

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

  const activeTrades = trades.filter((t) => {
    const since = lastWithdrawalAt(t.account_id, withdrawals)
    return since === null || t.closed_at === null || t.closed_at > since
  })
  const visibleTrades =
    statsScope === ALL_ACCOUNTS ? activeTrades : activeTrades.filter((t) => String(t.account_id) === statsScope)

  const totalBalance = accounts.reduce((sum, a) => sum + accountBalance(a, trades, withdrawals), 0)

  return (
    <div className="shell">
      <div className="topbar">
        <div className="wordmark">
          <span className="name">Traly</span>
          <span className="tag mono">journal de trading</span>
        </div>
        <div className="top-actions">
          <div className="theme-toggle" role="group" aria-label="Thème">
            <button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
              Clair
            </button>
            <button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
              Sombre
            </button>
            <button type="button" aria-pressed={theme === ''} onClick={() => setTheme('')}>
              Système
            </button>
          </div>
          <button
            className="btn-ghost"
            type="button"
            onClick={() => {
              clearToken()
              setAuthState('anonymous')
            }}
          >
            Se déconnecter
          </button>
        </div>
      </div>

      {error && <p role="alert">Erreur: {error}</p>}

      <div className="workspace">
        <div className="stats-col">
          <StatsPanel accounts={accounts} trades={trades} scope={statsScope} withdrawalsVersion={withdrawalsVersion} />
        </div>

        <div className="trades-col">
          <section>
            <div className="section-head">
              <div className="tabs-row no-top-margin" role="tablist" aria-label="Trades">
                <button className="tab-btn" role="tab" aria-selected={tradesTab === 'trades'} onClick={() => setTradesTab('trades')}>
                  Trades
                </button>
                <button className="tab-btn" role="tab" aria-selected={tradesTab === 'archives'} onClick={() => setTradesTab('archives')}>
                  Archives
                </button>
              </div>
              {tradesTab === 'trades' && (
                <button className="btn-accent" type="button" disabled={accounts.length === 0} onClick={() => setShowNewTrade((v) => !v)}>
                  {showNewTrade ? 'Annuler' : 'Nouveau trade'}
                </button>
              )}
            </div>

            {tradesTab === 'archives' && (
              <ArchivesPanel accounts={accounts} scope={statsScope} withdrawalsVersion={withdrawalsVersion} />
            )}

            {tradesTab === 'trades' && (
              <>
            {showNewTrade && (
              <NewTradeForm
                accounts={accounts}
                knownSymbols={[...new Set(trades.map((t) => t.symbol))].sort()}
                onCreated={(trade) => {
                  setTrades((prev) => [trade, ...prev])
                  setShowNewTrade(false)
                }}
              />
            )}

            {visibleTrades.length === 0 && <p>Aucun trade enregistré pour le moment.</p>}

            {visibleTrades.length > 0 && (
              <div className="trade-log">
                {visibleTrades.map((trade) => (
                  <details className="trade-row" key={trade.id}>
                    <summary>
                      <span className="chevron">▶</span>
                      <span className="symbol">{trade.symbol}</span>
                      <span className={`direction ${trade.is_breakeven ? 'be' : trade.direction}`}>
                        {trade.is_breakeven ? 'BE' : trade.direction === 'buy' ? 'Achat' : 'Vente'}
                      </span>
                      <span className="col-entryexit mono">
                        {trade.entry_price}
                        <span className="arrow">→</span>
                        {trade.exit_price ?? '—'}
                      </span>
                      <span
                        className={`col-pnl mono tabular ${
                          trade.pnl === null
                            ? 'open'
                            : trade.is_breakeven
                              ? 'be'
                              : trade.pnl >= 0
                                ? 'gain'
                                : 'loss'
                        }`}
                      >
                        {trade.pnl === null ? 'ouvert' : formatMoney(trade.pnl)}
                        {trade.closed_at === null && trade.pnl !== null ? ' · en cours' : ''}
                      </span>
                    </summary>
                    <dl className="trade-detail">
                      <div>
                        <dt>Entrée</dt>
                        <dd className="mono tabular">{trade.entry_price}</dd>
                      </div>
                      {trade.stop_loss !== null && (
                        <div>
                          <dt>Stop loss</dt>
                          <dd className="mono tabular">{trade.stop_loss}</dd>
                        </div>
                      )}
                      {trade.take_profit !== null && (
                        <div>
                          <dt>Take profit</dt>
                          <dd className="mono tabular">{trade.take_profit}</dd>
                        </div>
                      )}
                      <div>
                        <dt>Taille</dt>
                        <dd className="mono tabular">{trade.size}</dd>
                      </div>
                      <div>
                        <dt>Ouvert le</dt>
                        <dd className="mono tabular">{new Date(trade.opened_at).toLocaleString('fr-FR')}</dd>
                      </div>
                      {trade.closed_at !== null && (
                        <div>
                          <dt>Clôturé le</dt>
                          <dd className="mono tabular">{new Date(trade.closed_at).toLocaleString('fr-FR')}</dd>
                        </div>
                      )}
                      {trade.notes && (
                        <div className="notes">
                          <dt>Notes</dt>
                          <dd>{trade.notes}</dd>
                        </div>
                      )}
                      <TradeExitsTable exits={trade.exits} />
                      <div className="actions">
                        {trade.closed_at === null && (
                          <CloseTradeForm
                            trade={trade}
                            symbolSpecs={symbolSpecs}
                            onSpecSaved={(spec) =>
                              setSymbolSpecs((prev) => [...prev.filter((s) => s.symbol !== spec.symbol), spec])
                            }
                            onUpdated={(updated) =>
                              setTrades((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
                            }
                          />
                        )}
                        <button
                          className="btn-ghost-small"
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Supprimer le trade ${trade.symbol} ?`)) return
                            await deleteTrade(trade.id)
                            setTrades((prev) => prev.filter((t) => t.id !== trade.id))
                          }}
                        >
                          Supprimer
                        </button>
                      </div>
                    </dl>
                  </details>
                ))}
              </div>
            )}
              </>
            )}
          </section>
        </div>

        <div className="accounts-col">
          <section>
            <div className="section-head">
              <h2>Comptes</h2>
              <button
                className="btn-ghost-small"
                type="button"
                disabled={statsScope === ALL_ACCOUNTS}
                title={statsScope === ALL_ACCOUNTS ? 'Sélectionne un compte pour retirer des fonds' : undefined}
                onClick={() => setShowWithdraw((v) => !v)}
              >
                {showWithdraw ? 'Annuler' : '↓ Retirer des fonds'}
              </button>
            </div>

            {showWithdraw && statsScope !== ALL_ACCOUNTS && (
              <form
                className="form-card"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setWithdrawError(null)
                  try {
                    await createWithdrawal(Number(statsScope), Number(withdrawAmount))
                    setWithdrawAmount('')
                    setShowWithdraw(false)
                    setWithdrawalsVersion((v) => v + 1)
                  } catch (err) {
                    setWithdrawError(err instanceof Error ? err.message : String(err))
                  }
                }}
              >
                <h3>Retirer des fonds — {accounts.find((a) => String(a.id) === statsScope)?.name}</h3>
                {withdrawError && <p role="alert">Erreur: {withdrawError}</p>}
                <label>
                  Montant
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                  />
                </label>
                <button className="btn-accent" type="submit">
                  Confirmer le retrait
                </button>
              </form>
            )}

            <div className="account-switcher" role="group" aria-label="Compte">
              <button
                className={`account-pill${statsScope === ALL_ACCOUNTS ? ' active' : ''}`}
                type="button"
                onClick={() => setStatsScope(ALL_ACCOUNTS)}
              >
                <div>
                  <div className="name">Tous les comptes</div>
                  <div className="broker">{accounts.length} compte{accounts.length > 1 ? 's' : ''}</div>
                </div>
                <span className={`balance mono tabular ${totalBalance >= 0 ? 'gain' : 'loss'}`}>{formatMoney(totalBalance)}</span>
              </button>

              {accounts.map((account) => {
                const balance = accountBalance(account, trades, withdrawals)
                return (
                  <button
                    key={account.id}
                    className={`account-pill${statsScope === String(account.id) ? ' active' : ''}`}
                    type="button"
                    onClick={() => setStatsScope(String(account.id))}
                  >
                    <div>
                      <div className="name">{account.name}</div>
                      <div className="broker">{account.broker}</div>
                    </div>
                    <span className={`balance mono tabular ${balance >= account.initial_balance ? 'gain' : 'loss'}`}>
                      {formatMoney(balance)}
                    </span>
                  </button>
                )
              })}

              <button className="account-pill-new" type="button" onClick={() => setShowNewAccount((v) => !v)}>
                {showNewAccount ? 'Annuler' : '+ Nouveau compte'}
              </button>
            </div>

            {showNewAccount && (
              <NewAccountForm
                onCreated={(account) => {
                  setAccounts((prev) => [...prev, account])
                  setShowNewAccount(false)
                }}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default App
