import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../../context/useAuth.js'
import { getAnalytics } from '../../services/workspaceService.js'

function CuratorAnalytics() {
  const { accessToken } = useAuth()
  const [filters, setFilters] = useState({ from: '', to: '' })
  const [analytics, setAnalytics] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load(nextFilters = filters) {
    setBusy(true)
    setError('')
    try {
      const result = await getAnalytics(accessToken, nextFilters)
      setAnalytics(result.analytics)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    load({ from: '', to: '' })
  }, [accessToken])

  return (
    <>
      <h1>Visitor analytics</h1>
      <p className="page-intro">
        Metrics below come from recorded tours and exhibit interactions. QR scans are not presented as verified physical movement.
      </p>
      <form
        className="workspace-panel workspace-form"
        onSubmit={(event) => {
          event.preventDefault()
          load()
        }}
      >
        <div className="form-row">
          <label>From<input onChange={(event) => setFilters({ ...filters, from: event.target.value })} type="date" value={filters.from} /></label>
          <label>To<input onChange={(event) => setFilters({ ...filters, to: event.target.value })} type="date" value={filters.to} /></label>
        </div>
        <button className="workspace-button" disabled={busy} type="submit">{busy ? 'Loading…' : 'Apply dates'}</button>
      </form>
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      {analytics ? (
        <>
          <div className="metric-grid" style={{ marginTop: 18 }}>
            <Metric label="Tours started" value={analytics.totalTours} />
            <Metric label="Tours completed" value={analytics.completedTours} />
            <Metric label="Completion rate" value={analytics.completionRate === null ? 'No data' : `${analytics.completionRate}%`} />
            <Metric label="Exhibit scans" value={analytics.exhibitScans} />
            <Metric label="Skipped stops" value={analytics.skippedExhibits} />
            <Metric label="Route changes" value={analytics.routeChanges} />
            <Metric label="Audio completion" value={analytics.audioCompletionRate === null ? 'No data' : `${analytics.audioCompletionRate}%`} />
            <Metric label="Feedback entries" value={analytics.feedback.count} />
          </div>
          {analytics.totalTours === 0 ? (
            <p className="notice notice-warning">No recorded visitor activity exists for this period.</p>
          ) : (
            <>
              <section className="workspace-panel" style={{ marginTop: 18 }}>
                <h2>Exhibit engagement</h2>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.exhibits} margin={{ top: 8, right: 12, bottom: 42, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D8C5A5" />
                      <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={58} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="scanCount" name="Exhibit QR scans" fill="#722F37" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className="workspace-panel" style={{ marginTop: 18 }}>
                <h2>Language preferences recorded</h2>
                {analytics.languages.length === 0 ? <p className="muted-copy">No language selection events recorded.</p> : (
                  <ul className="workspace-list">
                    {analytics.languages.map((item) => <li className="workspace-list-item" key={item.language}><h3>{item.language === 'en' ? 'English' : 'Kannada'}</h3><p>{item.count} selections</p></li>)}
                  </ul>
                )}
              </section>
            </>
          )}
        </>
      ) : null}
    </>
  )
}

function Metric({ label, value }) {
  return <div className="metric-card"><span>{label}</span><strong>{value ?? 0}</strong></div>
}

export default CuratorAnalytics
