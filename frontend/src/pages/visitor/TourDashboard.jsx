import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import BrandHeader from '../../components/layout/BrandHeader.jsx'
import QrScanner from '../../components/qr/QrScanner.jsx'
import {
  completeExhibit,
  extendVisitorTour,
  finishVisitorTour,
  getVisitorMap,
  getVisitorTour,
  recordVisitorEvent,
  scanExhibit,
  startVisitorTour,
  submitExhibitFeedback,
} from '../../services/tourService.js'
import '../PrototypePages.css'

const visitorTokenKey = 'leviosa.visitorRouteToken'

function extractToken(value) {
  try {
    const url = new URL(value)
    return url.searchParams.get('token') ?? value
  } catch {
    return value.trim()
  }
}

function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return 'Not started'
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function TourDashboard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryToken = searchParams.get('token')
  const isFreshScan = searchParams.get('scan') === '1'
  const [routeToken, setRouteToken] = useState(
    () =>
      queryToken ||
      (!isFreshScan ? sessionStorage.getItem(visitorTokenKey) : '') ||
      '',
  )
  const [manualToken, setManualToken] = useState('')
  const [tour, setTour] = useState(null)
  const [map, setMap] = useState(null)
  const [story, setStory] = useState(null)
  const [feedbackTarget, setFeedbackTarget] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [language, setLanguage] = useState('en')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [syncedAt, setSyncedAt] = useState(Date.now())
  const [clock, setClock] = useState(Date.now())

  const refresh = useCallback(async () => {
    if (!routeToken) return
    const [tourResult, mapResult] = await Promise.all([
      getVisitorTour(routeToken),
      getVisitorMap(routeToken),
    ])
    setTour(tourResult)
    setMap(mapResult)
    setSyncedAt(Date.now())
  }, [routeToken])

  useEffect(() => {
    if (!routeToken) return undefined
    let active = true
    setIsLoading(true)
    setError('')
    sessionStorage.setItem(visitorTokenKey, routeToken)
    Promise.all([getVisitorTour(routeToken), getVisitorMap(routeToken)])
      .then(([tourResult, mapResult]) => {
        if (!active) return
        setTour(tourResult)
        setMap(mapResult)
        setSyncedAt(Date.now())
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message)
        if (requestError.status === 401) {
          sessionStorage.removeItem(visitorTokenKey)
          setTour(null)
          setMap(null)
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [routeToken])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const remainingSeconds = useMemo(() => {
    if (tour?.session.remainingSeconds === null || !tour?.session.startedAt) {
      return null
    }
    return Math.max(
      0,
      tour.session.remainingSeconds - Math.floor((clock - syncedAt) / 1000),
    )
  }, [clock, syncedAt, tour])

  const currentStop = tour?.route.stops.find(
    (stop) => stop.stopType === 'exhibit' && ['pending', 'arrived'].includes(stop.status),
  )

  useEffect(() => {
    if (queryToken) {
      navigate('/visitor/tour', { replace: true })
    }
  }, [navigate, queryToken])

  useEffect(() => {
    if (
      !routeToken ||
      tour?.session.status !== 'active' ||
      currentStop?.status !== 'arrived' ||
      !currentStop.shortCode ||
      story?.id === currentStop.exhibitId
    ) {
      return
    }
    let active = true
    scanExhibit(routeToken, currentStop.shortCode)
      .then(async ({ exhibit }) => {
        if (!active) return
        setStory(exhibit)
        await recordVisitorEvent(routeToken, {
          eventType: 'STORY_OPENED',
          exhibitId: exhibit.id,
          language,
        })
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
    return () => {
      active = false
    }
  }, [currentStop, language, routeToken, story?.id, tour?.session.status])

  async function beginTour(event) {
    event?.preventDefault()
    const token = extractToken(manualToken)
    if (!token) {
      setError('Enter or scan the route QR code first.')
      return
    }
    setRouteToken(token)
    sessionStorage.setItem(visitorTokenKey, token)
    navigate('/visitor/tour', { replace: true })
    setManualToken('')
    setError('')
    if (tour?.session.status === 'ready') {
      setIsStarting(true)
      try {
        const result = await startVisitorTour(token)
        setTour(result)
        setSyncedAt(Date.now())
        await refresh()
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setIsStarting(false)
      }
    } else {
      setIsLoading(true)
      try {
        const [tourResult, mapResult] = await Promise.all([
          getVisitorTour(token),
          getVisitorMap(token),
        ])
        setTour(tourResult)
        setMap(mapResult)
        setSyncedAt(Date.now())
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setIsLoading(false)
      }
    }
  }

  async function startReadyTour() {
    setIsStarting(true)
    setError('')
    try {
      const result = await startVisitorTour(routeToken)
      setTour(result)
      setSyncedAt(Date.now())
      await refresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsStarting(false)
    }
  }

  async function scanCode(value) {
    if (!routeToken) {
      setManualToken(extractToken(value))
      setScannerOpen(false)
      setNotice('Route QR received. Choose Start tour to begin.')
      return
    }
    if (tour?.session.status !== 'active') {
      setManualToken(extractToken(value))
      setScannerOpen(false)
      return
    }
    setError('')
    setScannerOpen(false)
    try {
      const { exhibit } = await scanExhibit(routeToken, value)
      setStory(exhibit)
      await recordVisitorEvent(routeToken, {
        eventType: 'STORY_OPENED',
        exhibitId: exhibit.id,
        language,
      })
      setNotice(`Exhibit scanned: ${exhibit.name}`)
      await refresh()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function completeCurrent(skipped) {
    if (!currentStop) return
    setError('')
    try {
      await completeExhibit(routeToken, currentStop.exhibitId, skipped)
      setFeedbackTarget(skipped ? null : { id: currentStop.exhibitId, name: currentStop.name })
      setStory(null)
      await refresh()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function sendFeedback(event) {
    event.preventDefault()
    if (!feedbackTarget) return
    setError('')
    try {
      await submitExhibitFeedback(routeToken, feedbackTarget.id, {
        rating: Number(rating),
        comment: comment || null,
      })
      setFeedbackTarget(null)
      setComment('')
      setNotice('Thank you. Your feedback was recorded.')
      await refresh()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function extend(minutes) {
    setError('')
    try {
      const result = await extendVisitorTour(routeToken, minutes)
      setTour((current) => ({
        ...current,
        session: { ...current.session, allocatedMinutes: result.allocatedMinutes },
        route: result.route,
      }))
      await refresh()
      setNotice(`Tour extended by ${minutes} minutes. The remaining route was updated.`)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function finishTour() {
    setError('')
    try {
      await finishVisitorTour(routeToken)
      await refresh()
      sessionStorage.removeItem(visitorTokenKey)
      setNotice('Tour completed. Thank you for visiting.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function changeLanguage(nextLanguage) {
    setLanguage(nextLanguage)
    if (tour?.session.status !== 'active') return
    try {
      await recordVisitorEvent(routeToken, {
        eventType: 'LANGUAGE_SELECTED',
        language: nextLanguage,
      })
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function recordAudioEvent(eventType) {
    if (!story) return
    try {
      await recordVisitorEvent(routeToken, {
        eventType,
        exhibitId: story.id,
        language,
      })
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <main className="visitor-page">
      <header className="workspace-header">
        <BrandHeader />
        <Link className="workspace-button-secondary" to="/">Exit to welcome</Link>
      </header>
      <section className="visitor-content">
        <p className="auth-eyebrow">Visitor tour</p>
        <h1>{tour?.session.status === 'completed' ? 'Tour complete' : 'Your museum journey'}</h1>
        <p className="page-intro">Scan your route ticket to retrieve the latest route from the museum.</p>
        {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
        {notice ? <p className="notice notice-success" role="status">{notice}</p> : null}
        {isLoading ? <p role="status">Loading your route…</p> : null}

        {!routeToken || !tour ? (
          <section className="workspace-panel">
            <h2>Scan route ticket</h2>
            <form className="workspace-form" onSubmit={beginTour}>
              <label>
                Route token or ticket QR value
                <input
                  autoComplete="off"
                  onChange={(event) => setManualToken(event.target.value)}
                  value={manualToken}
                />
              </label>
              <div className="visitor-actions">
                <button className="workspace-button" type="submit">Retrieve ticket</button>
                <button className="workspace-button-secondary" onClick={() => setScannerOpen((open) => !open)} type="button">
                  {scannerOpen ? 'Close camera' : 'Scan with camera'}
                </button>
              </div>
            </form>
            <QrScanner enabled={scannerOpen} onDecode={(value) => {
              const token = extractToken(value)
              setManualToken(token)
              setScannerOpen(false)
              setRouteToken(token)
              sessionStorage.setItem(visitorTokenKey, token)
              navigate('/visitor/tour', { replace: true })
              setNotice('Route QR received. Review your route and start the tour.')
            }} />
            <p className="muted-copy">Camera access is optional. You can enter the route ticket value manually.</p>
          </section>
        ) : null}

        {tour ? (
          <>
            <div className="visitor-toolbar">
              <span className="visitor-timer" aria-label="Time remaining">
                {formatTime(remainingSeconds)}
              </span>
              <span>{tour.session.allocatedMinutes} minutes allocated</span>
            </div>

            {tour.session.status === 'ready' ? (
              <section className="workspace-panel">
                <h2>Route ready</h2>
                <RouteList route={tour.route} />
                <button className="workspace-button" disabled={isStarting} onClick={startReadyTour} type="button">
                  {isStarting ? 'Starting…' : 'Start tour'}
                </button>
              </section>
            ) : null}

            {tour.session.status === 'active' ? (
              <>
                <section className="workspace-panel visitor-stop">
                  <h2>{currentStop ? (currentStop.status === 'arrived' ? 'You are at this exhibit' : 'Next recommended exhibit') : 'Route to the exit'}</h2>
                  {currentStop ? <h3>{currentStop.name}</h3> : <p className="muted-copy">No more recommended exhibits remain. Follow the route to the exit.</p>}
                  <div className="visitor-actions">
                    <button className="workspace-button-secondary" onClick={() => setScannerOpen((open) => !open)} type="button">
                      {scannerOpen ? 'Close camera' : 'Scan exhibit QR'}
                    </button>
                    <button className="workspace-button-secondary" onClick={() => extend(10)} type="button">Extend 10 min</button>
                    <button className="workspace-button-secondary" onClick={() => extend(20)} type="button">Extend 20 min</button>
                    <button className="workspace-button-danger" onClick={finishTour} type="button">Finish tour</button>
                  </div>
                  <form
                    className="workspace-form"
                    onSubmit={(event) => {
                      event.preventDefault()
                      scanCode(code)
                      setCode('')
                    }}
                    style={{ marginTop: 16 }}
                  >
                    <label>
                      Exhibit short code
                      <input autoComplete="off" onChange={(event) => setCode(event.target.value)} value={code} />
                    </label>
                    <button className="workspace-button" type="submit">Validate code</button>
                  </form>
                  <QrScanner enabled={scannerOpen} onDecode={scanCode} />
                  {remainingSeconds === 0 ? (
                    <p className="notice notice-warning">Your allocated time has ended. Extend your session or continue to the exit.</p>
                  ) : null}
                </section>

                {story ? (
                  <section className="workspace-panel visitor-stop">
                    <div className="visitor-toolbar">
                      <h2>{story.name}</h2>
                      <div className="visitor-actions" aria-label="Story language">
                        <button className="workspace-button-secondary" onClick={() => changeLanguage('en')} type="button">English</button>
                        <button className="workspace-button-secondary" onClick={() => changeLanguage('kn')} type="button">ಕನ್ನಡ</button>
                      </div>
                    </div>
                    {story.imageUrl ? <img className="story-image" src={story.imageUrl} alt={story.name} /> : null}
                    <p className="story-copy">
                      {language === 'en'
                        ? story.descriptionEn || 'The curator has not added an English story yet.'
                        : story.descriptionKn || 'The curator has not added a Kannada story yet.'}
                    </p>
                    {(language === 'en' ? story.audioEnUrl : story.audioKnUrl) ? (
                      <audio
                        className="story-audio"
                        controls
                        onEnded={() => recordAudioEvent('AUDIO_COMPLETED')}
                        onPlay={() => recordAudioEvent('AUDIO_STARTED')}
                        preload="none"
                        src={language === 'en' ? story.audioEnUrl : story.audioKnUrl}
                      />
                    ) : <p className="muted-copy">Audio narration is not available in this language.</p>}
                    <div className="visitor-actions">
                      <button className="workspace-button" onClick={() => completeCurrent(false)} type="button">Done — continue</button>
                      <button className="workspace-button-secondary" onClick={() => completeCurrent(true)} type="button">Skip exhibit</button>
                    </div>
                  </section>
                ) : null}

                {feedbackTarget ? (
                  <section className="workspace-panel visitor-stop">
                    <h2>How was “{feedbackTarget.name}”?</h2>
                    <form className="workspace-form" onSubmit={sendFeedback}>
                      <label>
                        Rating (1–5)
                        <select onChange={(event) => setRating(event.target.value)} value={rating}>
                          {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                      </label>
                      <label>
                        Optional comment
                        <textarea maxLength={1000} onChange={(event) => setComment(event.target.value)} value={comment} />
                      </label>
                      <button className="workspace-button" type="submit">Send feedback</button>
                    </form>
                  </section>
                ) : null}

                {map ? (
                  <section className="workspace-panel visitor-stop">
                    <h2>Museum map</h2>
                    <MuseumMap map={map} />
                    <RouteList route={tour.route} />
                  </section>
                ) : null}
              </>
            ) : null}

            {tour.session.status === 'completed' ? (
              <section className="workspace-panel">
                <h2>Thank you for visiting</h2>
                <p className="muted-copy">Your tour has ended. Recorded visitor feedback helps curators improve the experience.</p>
                <Link className="workspace-button workspace-button-link" to="/">Return to welcome</Link>
              </section>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  )
}

function RouteList({ route }) {
  return (
    <ol>
      {route.stops.map((stop, index) => (
        <li key={`${route.version}-${stop.nodeId}-${index}`}>
          {stop.stopType === 'exit' ? 'Exit' : stop.name}
          {stop.status === 'completed' ? ' — completed' : ''}
          {stop.status === 'skipped' ? ' — skipped' : ''}
          {stop.visitMinutes ? ` · ${stop.visitMinutes} min` : ''}
        </li>
      ))}
    </ol>
  )
}

function MuseumMap({ map }) {
  const nodesById = new Map(map.nodes.map((node) => [node.id, node]))
  const arrivedNodeIds = new Set(
    map.route.stops
      .filter((stop) => stop.status === 'arrived')
      .map((stop) => stop.nodeId),
  )
  const routeSegments = map.route.stops
    .map((stop) => (stop.pathNodeIds ?? []).map((id) => nodesById.get(id)))
    .filter(
      (segment) =>
        segment.length > 1 && segment.every((node) => node !== undefined),
    )

  return (
    <div className="map-canvas">
      <svg
        role="img"
        aria-label="Museum map showing the current recommended route"
        viewBox={`0 0 ${map.floorplan.viewBoxWidth} ${map.floorplan.viewBoxHeight}`}
      >
        <image href={map.floorplan.svgAssetPath} height={map.floorplan.viewBoxHeight} width={map.floorplan.viewBoxWidth} />
        {map.paths.filter((path) => !path.isArchived).map((path) => {
          const from = nodesById.get(path.fromNodeId)
          const to = nodesById.get(path.toNodeId)
          return from && to ? <line className="map-path" key={path.id} x1={from.xCoordinate} x2={to.xCoordinate} y1={from.yCoordinate} y2={to.yCoordinate} /> : null
        })}
        {routeSegments.map((segment, index) => (
          <polyline
            fill="none"
            key={`route-segment-${index}`}
            points={segment
              .map((node) => `${node.xCoordinate},${node.yCoordinate}`)
              .join(' ')}
            stroke="#722F37"
            strokeWidth={Math.max(1, Number(map.floorplan.viewBoxWidth) / 120)}
          />
        ))}
        {map.nodes
          .filter((node) => !node.isArchived || arrivedNodeIds.has(node.id))
          .map((node) => (
          <g key={node.id}>
            <circle className="map-marker" cx={node.xCoordinate} cy={node.yCoordinate} r={Math.max(3, Number(map.floorplan.viewBoxWidth) / 100)} />
            <text fill="#29201D" fontSize={Math.max(4, Number(map.floorplan.viewBoxWidth) / 80)} x={Number(node.xCoordinate) + 4} y={Number(node.yCoordinate) - 4}>{node.label || node.nodeType}</text>
          </g>
          ))}
      </svg>
    </div>
  )
}

export default TourDashboard
