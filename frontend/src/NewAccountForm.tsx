import { useState } from 'react'
import { createAccount, type Account } from './api'

export function NewAccountForm({ onCreated }: { onCreated: (account: Account) => void }) {
  const [name, setName] = useState('')
  const [broker, setBroker] = useState('')
  const [initialBalance, setInitialBalance] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const account = await createAccount({
        name,
        broker,
        initial_balance: Number(initialBalance),
      })
      onCreated(account)
      setName('')
      setBroker('')
      setInitialBalance('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Nouveau compte</h2>
      {error && <p role="alert">Erreur: {error}</p>}
      <label>
        Nom
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Broker
        <input value={broker} onChange={(e) => setBroker(e.target.value)} required />
      </label>
      <label>
        Solde initial
        <input
          type="number"
          step="0.01"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          required
        />
      </label>
      <button type="submit">Créer le compte</button>
    </form>
  )
}
