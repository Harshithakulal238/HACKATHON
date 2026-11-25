import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BrandHeader from '../../components/layout/BrandHeader.jsx'
import { useAuth } from '../../context/useAuth.js'
import './AuthPages.css'

function CuratorRegister() {
  const { register, restoreError } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [museumName, setMuseumName] = useState('')
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
      await register({ fullName, museumName, email, password })
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
      <section className="auth-content" aria-labelledby="register-title">
        <div className="auth-card">
          <p className="auth-eyebrow">Curator workspace</p>
          <h1 id="register-title">Create your account</h1>
          <p className="auth-intro">
            Set up your curator access and museum workspace.
          </p>

          {restoreError && (
            <p className="form-message form-message-error" role="alert">
              {restoreError}
            </p>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="register-name">Your name</label>
              <input
                autoComplete="name"
                id="register-name"
                name="fullName"
                onChange={(event) => setFullName(event.target.value)}
                required
                type="text"
                value={fullName}
              />
            </div>

            <div className="form-field">
              <label htmlFor="register-museum">Museum name</label>
              <input
                autoComplete="organization"
                id="register-museum"
                name="museumName"
                onChange={(event) => setMuseumName(event.target.value)}
                required
                type="text"
                value={museumName}
              />
            </div>

            <div className="form-field">
              <label htmlFor="register-email">Email address</label>
              <input
                autoComplete="email"
                id="register-email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>

            <div className="form-field">
              <label htmlFor="register-password">Password</label>
              <div className="password-field">
                <input
                  autoComplete="new-password"
                  id="register-password"
                  maxLength={72}
                  minLength={12}
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
              <span className="field-hint">
                Use at least 12 characters.
              </span>
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
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            Already registered? <Link to="/curator/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  )
}

export default CuratorRegister
