import { useEffect, useState } from 'react'
import { createTrade, type Account, type Trade, type TradeDirection } from './api'

export function NewTradeForm({
  accounts,
  knownSymbols,
  onCreated,
}: {
  accounts: Account[]
  knownSymbols: string[]
  onCreated: (trade: Trade) => void
}) {
  const [accountId, setAccountId] = useState<string>('')

  useEffect(() => {
    if (accounts.length === 0) return
    if (!accounts.some((a) => String(a.id) === accountId)) {
      setAccountId(String(accounts[0].id))
    }
  }, [accounts, accountId])
  const [symbol, setSymbol] = useState('')
  const [direction, setDirection] = useState<TradeDirection>('buy')
  const [entryPrice, setEntryPrice] = useState('')
  const [size, setSize] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const trade = await createTrade({
        account_id: Number(accountId),
        symbol,
        direction,
        entry_price: Number(entryPrice),
        exit_price: null,
        stop_loss: null,
        take_profit: null,
        size: Number(size),
        pnl: null,
        opened_at: new Date().toISOString(),
        closed_at: null,
        is_breakeven: false,
        notes: null,
      })
      onCreated(trade)
      setSymbol('')
      setEntryPrice('')
      setSize('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  if (accounts.length === 0) {
    return <p>Crée d'abord un compte pour pouvoir enregistrer un trade.</p>
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h3>Nouveau trade</h3>
      {error && <p role="alert">Erreur: {error}</p>}
      <label>
        Compte
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Symbole
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          list="known-symbols"
          required
        />
        <datalist id="known-symbols">
          {knownSymbols.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <label>
        Sens
        <select value={direction} onChange={(e) => setDirection(e.target.value as TradeDirection)}>
          <option value="buy">Achat</option>
          <option value="sell">Vente</option>
        </select>
      </label>
      <label>
        Prix d'entrée
        <input
          type="number"
          step="0.00001"
          value={entryPrice}
          onChange={(e) => setEntryPrice(e.target.value)}
          required
        />
      </label>
      <label>
        Taille
        <input
          type="number"
          step="0.0001"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          required
        />
      </label>
      <button className="btn-accent" type="submit">Enregistrer le trade</button>
    </form>
  )
}
