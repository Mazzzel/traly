import { useState } from 'react'
import { createTrade, type Account, type Trade, type TradeDirection } from './api'

export function NewTradeForm({
  accounts,
  onCreated,
}: {
  accounts: Account[]
  onCreated: (trade: Trade) => void
}) {
  const [accountId, setAccountId] = useState<string>(String(accounts[0]?.id ?? ''))
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
    <form onSubmit={handleSubmit}>
      <h2>Nouveau trade</h2>
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
        <input value={symbol} onChange={(e) => setSymbol(e.target.value)} required />
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
      <button type="submit">Enregistrer le trade</button>
    </form>
  )
}
