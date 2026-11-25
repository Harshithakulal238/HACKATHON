import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import BrandHeader from '../../components/layout/BrandHeader.jsx'
import { useAuth } from '../../context/useAuth.js'
import '../auth/AuthPages.css'
import '../PrototypePages.css'

const navigation = [
  { to: '/curator/dashboard', label: 'Overview', end: true },
  { to: '/curator/collection', label: 'Collection' },
  { to: '/curator/map', label: 'Floor map' },
  { to: '/curator/workers', label: 'Workers' },
  { to: '/curator/analytics', label: 'Analytics' },
]

function CuratorDashboard({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [isNavigationOpen, setIsNavigationOpen] = useState(false)

  function handleSignOut() {
    signOut()
    navigate('/curator/login', { replace: true })
  }

  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <BrandHeader />
        <div className="workspace-account">
          <span>{user.fullName}</span>
          <button
            className="workspace-button-secondary"
            onClick={handleSignOut}
            type="button"
          >
            Sign out
          </button>
        </div>
      </header>
      <button
        aria-controls="curator-navigation"
        aria-expanded={isNavigationOpen}
        className="workspace-button-secondary workspace-nav-toggle"
        onClick={() => setIsNavigationOpen((isOpen) => !isOpen)}
        type="button"
      >
        Menu
      </button>
      <nav
        aria-label="Curator navigation"
        className={`workspace-nav${isNavigationOpen ? ' is-open' : ''}`}
        id="curator-navigation"
      >
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setIsNavigationOpen(false)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <section className="workspace-content">{children}</section>
    </main>
  )
}

export default CuratorDashboard
