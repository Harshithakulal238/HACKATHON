import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'
import { getAnalytics } from '../../services/workspaceService.js'

function CuratorOverview() {
  const { accessToken } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getAnalytics(accessToken)
      .then(({ analytics: result }) => {
        if (active) setAnalytics(result)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
    return () => {
      active = false
    }
  }, [accessToken])

  return (
    <>
      <h1>Curator home</h1>
      <p className="page-intro">
        Manage the museum collection and review engagement recorded by visitor sessions.
      </p>
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      {!analytics && !error ? <p role="status">Loading recorded activity…</p> : null}
      {analytics ? (
        <>
          <div className="metric-grid" aria-label="Recorded tour summary">
            <Metric label="Tours started" value={analytics.totalTours} />
            <Metric label="Tours completed" value={analytics.completedTours} />
            <Metric
              label="Completion rate"
              value={analytics.completionRate === null ? '—' : `${analytics.completionRate}%`}
            />
            <Metric label="Exhibit scans" value={analytics.exhibitScans} />
          </div>
          {analytics.totalTours === 0 ? (
            <p className="notice notice-warning">
              No visitor activity has been recorded yet. Start by adding real museum content and a floor map.
            </p>
          ) : null}
        </>
      ) : null}
      <div className="workspace-grid workspace-grid-two" style={{ marginTop: 20 }}>
        <section className="workspace-panel">
          <h2>Collection setup</h2>
          <p className="muted-copy">Create galleries, categories and bilingual exhibit stories.</p>
          <Link className="workspace-button workspace-button-link" to="/curator/collection">
            Manage collection
          </Link>
        </section>
        <section className="workspace-panel">
          <h2>Map setup</h2>
          <p className="muted-copy">Upload a real SVG floorplan and place nodes and walking paths.</p>
          <Link className="workspace-button workspace-button-link" to="/curator/map">
            Edit floor map
          </Link>
        </section>
      </div>
    </>
  )
}

function Metric({ label, value }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
    </div>
  )
}

export default CuratorOverview
