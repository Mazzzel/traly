import { useState } from 'react'
import { login, setToken } from './api'

export function LoginPage({ onLoggedIn }: { onLoggedIn: (mustChangePassword: boolean) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const { token, must_change_password } = await login(email, password)
      setToken(token)
      onLoggedIn(must_change_password)
    } catch {
      setError('Email ou mot de passe incorrect.')
    }
  }

  return (
    <div className="auth-shell">
      <h1>Traly</h1>
      <p>Connecte-toi pour accéder à ton journal de trading.</p>
      <form onSubmit={handleSubmit}>
        {error && <p role="alert">{error}</p>}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button className="btn-accent" type="submit">Se connecter</button>
      </form>
    </div>
  )
}
