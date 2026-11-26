import { Link } from 'react-router-dom'
import './App.css'
import BrandHeader from './components/layout/BrandHeader.jsx'

function WelcomePage() {
  return (
    <main className="app-shell">
      <BrandHeader />

      <section className="welcome" aria-labelledby="welcome-title">
        <div className="welcome-content">
          <p className="eyebrow">Museum companion</p>
          <h1 id="welcome-title">Explore with your own pace</h1>
          <p className="welcome-copy">
            A guided museum experience shaped by your interests and available time.
          </p>

          <div className="welcome-actions">
            <Link className="button button-primary" to="/visitor/tour?scan=1">
              Begin as visitor
            </Link>
            <Link
              className="button button-secondary"
              to="/curator/login"
            >
              Curator sign in
            </Link>
          </div>
          <Link className="staff-login-link" to="/worker/login">
            Worker sign in
          </Link>
        </div>
      </section>
    </main>
  )
}

export default WelcomePage
