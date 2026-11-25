import { Link } from 'react-router-dom'

function BrandHeader({ showHomeLink = false }) {
  return (
    <header className="app-header">
      <Link className="brand" to="/" aria-label="Léviōsa home">
        <span className="brand-mark" aria-hidden="true">L</span>
        <span>Léviōsa</span>
      </Link>
      {showHomeLink && (
        <Link className="header-link" to="/">
          Back to home
        </Link>
      )}
    </header>
  )
}

export default BrandHeader
