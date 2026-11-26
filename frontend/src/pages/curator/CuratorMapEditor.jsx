import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/useAuth.js'
import {
  createFloorplan,
  createMapNode,
  createWalkingPath,
  deleteMapNode,
  deleteWalkingPath,
  getFloorplan,
  listExhibits,
  listFloorplans,
  replaceFloorplanSvg,
  uploadFloorplanSvg,
} from '../../services/workspaceService.js'

function CuratorMapEditor() {
  const { accessToken } = useAuth()
  const [floorplans, setFloorplans] = useState([])
  const [floorplan, setFloorplan] = useState(null)
  const [exhibits, setExhibits] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [mapName, setMapName] = useState('')
  const [floorLabel, setFloorLabel] = useState('')
  const [svgFile, setSvgFile] = useState(null)
  const [replacementSvgFile, setReplacementSvgFile] = useState(null)
  const [nodeType, setNodeType] = useState('waypoint')
  const [exhibitId, setExhibitId] = useState('')
  const [nodeLabel, setNodeLabel] = useState('')
  const [pathForm, setPathForm] = useState({
    fromNodeId: '',
    toNodeId: '',
    estimatedWalkingSeconds: 60,
    isBidirectional: true,
  })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const refreshFloorplans = useCallback(async () => {
    const [maps, exhibitResult] = await Promise.all([
      listFloorplans(accessToken),
      listExhibits(accessToken),
    ])
    setFloorplans(maps.floorplans)
    setExhibits(exhibitResult.exhibits)
    const id = selectedId || maps.floorplans[0]?.id
    if (id) {
      const current = await getFloorplan(accessToken, id)
      setFloorplan(current.floorplan)
      setSelectedId(id)
    } else {
      setFloorplan(null)
    }
  }, [accessToken, selectedId])

  useEffect(() => {
    refreshFloorplans().catch((requestError) => setError(requestError.message))
  }, [refreshFloorplans])

  async function createMap(event) {
    event.preventDefault()
    if (!svgFile) {
      setError('Choose an SVG floorplan to upload.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const uploaded = await uploadFloorplanSvg(accessToken, svgFile)
      const created = await createFloorplan(accessToken, {
        name: mapName,
        floorLabel: floorLabel || null,
        svgAssetPath: uploaded.svgAssetPath,
        viewBoxWidth: uploaded.viewBoxWidth,
        viewBoxHeight: uploaded.viewBoxHeight,
      })
      setMapName('')
      setFloorLabel('')
      setSvgFile(null)
      setSelectedId(created.floorplan.id)
      setNotice('Floorplan created. Click it to place map nodes.')
      await refreshFloorplans()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function selectFloorplan(id) {
    setSelectedId(id)
    setError('')
    try {
      const result = await getFloorplan(accessToken, id)
      setFloorplan(result.floorplan)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function replaceBackground(event) {
    event.preventDefault()
    if (!floorplan || !replacementSvgFile) {
      setError('Choose an SVG floorplan to upload.')
      return
    }
    const form = event.currentTarget
    setError('')
    setBusy(true)
    try {
      await replaceFloorplanSvg(accessToken, floorplan.id, replacementSvgFile)
      setReplacementSvgFile(null)
      form.reset()
      setNotice('Floorplan background replaced. Existing markers and paths were kept.')
      await refreshFloorplans()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function placeNode(event) {
    if (!floorplan) return
    if (nodeType === 'exhibit' && !exhibitId) {
      setError('Select an exhibit before placing its marker.')
      return
    }
    const bounds = event.currentTarget.getBoundingClientRect()
    const xCoordinate =
      Math.round(((event.clientX - bounds.left) / bounds.width) * Number(floorplan.viewBoxWidth) * 100) / 100
    const yCoordinate =
      Math.round(((event.clientY - bounds.top) / bounds.height) * Number(floorplan.viewBoxHeight) * 100) / 100
    setError('')
    setBusy(true)
    try {
      await createMapNode(accessToken, floorplan.id, {
        nodeType,
        exhibitId: nodeType === 'exhibit' ? exhibitId : undefined,
        label: nodeLabel || undefined,
        xCoordinate,
        yCoordinate,
      })
      setNotice(`${nodeType} marker placed.`)
      await refreshFloorplans()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function addPath(event) {
    event.preventDefault()
    if (!floorplan) return
    setError('')
    setBusy(true)
    try {
      await createWalkingPath(accessToken, floorplan.id, {
        ...pathForm,
        estimatedWalkingSeconds: Number(pathForm.estimatedWalkingSeconds),
      })
      setNotice('Walking path connected.')
      await refreshFloorplans()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function removeNode(node) {
    if (!window.confirm(`Remove map marker "${node.label || node.nodeType}"?`)) return
    setBusy(true)
    try {
      await deleteMapNode(accessToken, floorplan.id, node.id)
      await refreshFloorplans()
      setNotice('Map marker removed.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function removePath(path) {
    if (!window.confirm('Remove this walking connection?')) return
    setBusy(true)
    try {
      await deleteWalkingPath(accessToken, floorplan.id, path.id)
      await refreshFloorplans()
      setNotice('Walking connection removed.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h1>Floor map</h1>
      <p className="page-intro">
        Upload your real SVG floorplan. Select a marker type, then click the map to place entrances,
        exits, exhibits and waypoints. Connect adjacent nodes with walking times.
      </p>
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      {notice ? <p className="notice notice-success" role="status">{notice}</p> : null}

      <section className="workspace-panel">
        <h2>Add a floorplan</h2>
        <form className="workspace-form" onSubmit={createMap}>
          <div className="form-row">
            <label>Map name<input maxLength={120} onChange={(event) => setMapName(event.target.value)} required value={mapName} /></label>
            <label>Floor label (optional)<input maxLength={80} onChange={(event) => setFloorLabel(event.target.value)} value={floorLabel} /></label>
          </div>
          <label>
            SVG file (viewBox must be `0 0 width height`)
            <input accept=".svg,image/svg+xml" onChange={(event) => setSvgFile(event.target.files?.[0] ?? null)} required type="file" />
          </label>
          <button className="workspace-button" disabled={busy} type="submit">Upload floorplan</button>
        </form>
      </section>

      {floorplans.length > 0 ? (
        <>
          <label className="workspace-field-label" style={{ margin: '18px 0' }}>
            Active floorplan
            <select className="workspace-input" onChange={(event) => selectFloorplan(event.target.value)} value={selectedId}>
              {floorplans.map((item) => <option key={item.id} value={item.id}>{item.name}{item.floorLabel ? ` — ${item.floorLabel}` : ''}</option>)}
            </select>
          </label>
          {floorplan ? (
            <section className="workspace-panel">
              <h2>Replace floorplan background</h2>
              <p className="muted-copy">
                Use an SVG with viewBox 0 0 {floorplan.viewBoxWidth} {floorplan.viewBoxHeight} to keep existing markers and paths aligned.
              </p>
              <form className="workspace-form" onSubmit={replaceBackground}>
                <label>
                  Replacement SVG
                  <input
                    accept=".svg,image/svg+xml"
                    onChange={(event) => setReplacementSvgFile(event.target.files?.[0] ?? null)}
                    required
                    type="file"
                  />
                </label>
                <button className="workspace-button" disabled={busy} type="submit">
                  Replace background
                </button>
              </form>
            </section>
          ) : null}
          {floorplan ? (
            <div className="workspace-grid">
              <section className="workspace-panel">
                <h2>Place map markers</h2>
                <div className="form-row">
                  <label className="workspace-field-label">
                    Marker type
                    <select className="workspace-input" onChange={(event) => setNodeType(event.target.value)} value={nodeType}>
                      <option value="entrance">Entrance</option>
                      <option value="exit">Exit</option>
                      <option value="exhibit">Exhibit</option>
                      <option value="waypoint">Waypoint</option>
                    </select>
                  </label>
                  {nodeType === 'exhibit' ? (
                    <label className="workspace-field-label">
                      Exhibit
                      <select className="workspace-input" onChange={(event) => setExhibitId(event.target.value)} value={exhibitId}>
                        <option value="">Select an exhibit</option>
                        {exhibits.map((exhibit) => <option key={exhibit.id} value={exhibit.id}>{exhibit.name}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <label className="workspace-field-label">
                    Marker label (optional)
                    <input className="workspace-input" onChange={(event) => setNodeLabel(event.target.value)} value={nodeLabel} />
                  </label>
                </div>
                <p className="muted-copy">Click the floorplan below to place the selected marker.</p>
                <div className="map-canvas">
                  <svg
                    onClick={placeNode}
                    role="img"
                    aria-label="Floorplan. Click to place a map node."
                    viewBox={`0 0 ${floorplan.viewBoxWidth} ${floorplan.viewBoxHeight}`}
                  >
                    <image href={floorplan.svgAssetPath} height={floorplan.viewBoxHeight} width={floorplan.viewBoxWidth} />
                    {floorplan.paths.map((path) => {
                      const from = floorplan.nodes.find((node) => node.id === path.fromNodeId)
                      const to = floorplan.nodes.find((node) => node.id === path.toNodeId)
                      if (!from || !to) return null
                      return <line className="map-path" key={path.id} x1={from.xCoordinate} x2={to.xCoordinate} y1={from.yCoordinate} y2={to.yCoordinate} />
                    })}
                    {floorplan.nodes.map((node) => (
                      <g key={node.id} pointerEvents="none">
                        <circle className="map-marker" cx={node.xCoordinate} cy={node.yCoordinate} r={Math.max(3, Number(floorplan.viewBoxWidth) / 100)} />
                        <text fill="#29201D" fontSize={Math.max(4, Number(floorplan.viewBoxWidth) / 80)} x={Number(node.xCoordinate) + 4} y={Number(node.yCoordinate) - 4}>{node.label || node.nodeType}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              </section>

              <section className="workspace-panel">
                <h2>Walking connections</h2>
                <form className="workspace-form" onSubmit={addPath}>
                  <label>
                    From node
                    <select onChange={(event) => setPathForm({ ...pathForm, fromNodeId: event.target.value })} required value={pathForm.fromNodeId}>
                      <option value="">Select a node</option>
                      {floorplan.nodes.map((node) => <option key={node.id} value={node.id}>{node.label || node.nodeType}</option>)}
                    </select>
                  </label>
                  <label>
                    To node
                    <select onChange={(event) => setPathForm({ ...pathForm, toNodeId: event.target.value })} required value={pathForm.toNodeId}>
                      <option value="">Select a node</option>
                      {floorplan.nodes.map((node) => <option key={node.id} value={node.id}>{node.label || node.nodeType}</option>)}
                    </select>
                  </label>
                  <label>
                    Estimated walking seconds
                    <input min="1" onChange={(event) => setPathForm({ ...pathForm, estimatedWalkingSeconds: event.target.value })} required type="number" value={pathForm.estimatedWalkingSeconds} />
                  </label>
                  <label className="interest-option">
                    <input checked={pathForm.isBidirectional} onChange={(event) => setPathForm({ ...pathForm, isBidirectional: event.target.checked })} type="checkbox" />
                    Bidirectional connection
                  </label>
                  <button className="workspace-button" disabled={busy} type="submit">Connect nodes</button>
                </form>
              </section>

              <section className="workspace-panel">
                <h2>Placed markers</h2>
                {floorplan.nodes.length === 0 ? <p className="muted-copy">No markers placed yet.</p> : (
                  <ul className="workspace-list">
                    {floorplan.nodes.map((node) => (
                      <li className="workspace-list-item" key={node.id}>
                        <div><h3>{node.label || node.nodeType}</h3><p>{node.xCoordinate}, {node.yCoordinate}</p></div>
                        <button className="workspace-button-danger" disabled={busy} onClick={() => removeNode(node)} type="button">Remove</button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="workspace-panel">
                <h2>Walking paths</h2>
                {floorplan.paths.length === 0 ? <p className="muted-copy">No walking paths connected yet.</p> : (
                  <ul className="workspace-list">
                    {floorplan.paths.map((path) => (
                      <li className="workspace-list-item" key={path.id}>
                        <div><h3>{path.estimatedWalkingSeconds}s</h3><p>{path.isBidirectional ? 'Both directions' : 'One direction'}</p></div>
                        <button className="workspace-button-danger" disabled={busy} onClick={() => removePath(path)} type="button">Remove</button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : null}
        </>
      ) : (
        <p className="notice notice-warning" style={{ marginTop: 18 }}>No floorplan is configured yet.</p>
      )}
    </>
  )
}

export default CuratorMapEditor
