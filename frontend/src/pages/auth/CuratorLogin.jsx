import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BrandHeader from '../../components/layout/BrandHeader.jsx'
import { useAuth } from '../../context/useAuth.js'
import './AuthPages.css'

function CuratorLogin() {
  const { login, restoreError } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login({ email, password })
      navigate('/curator/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <BrandHeader showHomeLink />
      <section className="auth-content" aria-labelledby="login-title">
        <div className="auth-card">
          <p className="auth-eyebrow">Curator workspace</p>
          <h1 id="login-title">Welcome back</h1>
          <p className="auth-intro">Sign in to manage your museum.</p>

          {restoreError && (
            <p className="form-message form-message-error" role="alert">
              {restoreError}
            </p>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="login-email">Email address</label>
              <input
                autoComplete="email"
                id="login-email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>

            <div className="form-field">
              <label htmlFor="login-password">Password</label>
              <div className="password-field">
                <input
                  autoComplete="current-password"
                  id="login-password"
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <p className="form-message form-message-error" role="alert">
                {error}
              </p>
            )}

            <button
              className="button button-primary auth-submit"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="auth-switch">
            New to Léviōsa? <Link to="/curator/register">Create an account</Link>
          </p>
        </div>
      </section>
    </main>
  )
}

export default CuratorLogin
