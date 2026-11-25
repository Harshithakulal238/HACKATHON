import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BrandHeader from '../../components/layout/BrandHeader.jsx'
import { useAuth } from '../../context/useAuth.js'
import './AuthPages.css'

function WorkerLogin() {
  const { loginWorker } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await loginWorker({ email, password })
      navigate('/worker/dashboard', { replace: true })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <BrandHeader />
      <div className="auth-content">
        <section className="auth-card" aria-labelledby="worker-login-title">
          <p className="auth-eyebrow">Museum staff</p>
          <h1 id="worker-login-title">Worker sign in</h1>
          <p className="auth-intro">
            Sign in to prepare an anonymous visitor tour and ticket.
          </p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="worker-email">Email</label>
              <input
                autoComplete="username"
                id="worker-email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
            <div className="form-field">
              <label htmlFor="worker-password">Password</label>
              <input
                autoComplete="current-password"
                id="worker-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            {error ? (
              <p className="form-message form-message-error" role="alert">
                {error}
              </p>
            ) : null}
            <button
              className="button button-primary auth-submit"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="auth-switch">
            Curator? <Link to="/curator/login">Sign in here</Link>
          </p>
        </section>
      </div>
    </main>
  )
}

export default WorkerLogin
