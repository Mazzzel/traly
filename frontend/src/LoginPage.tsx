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
    <main>
      <h1>Connexion</h1>
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
        <button type="submit">Se connecter</button>
      </form>
    </main>
  )
}
