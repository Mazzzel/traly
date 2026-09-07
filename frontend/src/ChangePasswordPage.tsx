import { useState } from 'react'
import { changePassword, setToken } from './api'

export function ChangePasswordPage({ onChanged }: { onChanged: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const { token } = await changePassword(currentPassword, newPassword)
      setToken(token)
      onChanged()
    } catch {
      setError('Mot de passe actuel incorrect.')
    }
  }

  return (
    <div className="auth-shell">
      <h1>Nouveau mot de passe</h1>
      <p>Première connexion : choisis un nouveau mot de passe avant de continuer.</p>
      <form onSubmit={handleSubmit}>
        {error && <p role="alert">{error}</p>}
        <label>
          Mot de passe actuel
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label>
          Nouveau mot de passe
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <button className="btn-accent" type="submit">Valider</button>
      </form>
    </div>
  )
}
