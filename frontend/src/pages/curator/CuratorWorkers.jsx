import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/useAuth.js'
import { createWorker, listWorkers } from '../../services/workspaceService.js'

function CuratorWorkers() {
  const { accessToken } = useAuth()
  const [workers, setWorkers] = useState([])
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const result = await listWorkers(accessToken)
    setWorkers(result.workers)
  }, [accessToken])

  useEffect(() => {
    refresh().catch((requestError) => setError(requestError.message))
  }, [refresh])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      await createWorker(accessToken, form)
      setForm({ fullName: '', email: '', password: '' })
      setNotice('Worker account created.')
      await refresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h1>Worker accounts</h1>
      <p className="page-intro">
        Create museum-scoped staff accounts. Share each worker’s credentials securely.
      </p>
      <div className="workspace-grid workspace-grid-two">
        <section className="workspace-panel">
          <h2>Add a worker</h2>
          <form className="workspace-form" onSubmit={submit}>
            <label>
              Full name
              <input
                autoComplete="name"
                maxLength={120}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                required
                value={form.fullName}
              />
            </label>
            <label>
              Email
              <input
                autoComplete="email"
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
                type="email"
                value={form.email}
              />
            </label>
            <label>
              Initial password
              <input
                autoComplete="new-password"
                minLength={12}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
                type="password"
                value={form.password}
              />
            </label>
            <button className="workspace-button" disabled={busy} type="submit">
              {busy ? 'Creating…' : 'Create worker'}
            </button>
          </form>
        </section>
        <section className="workspace-panel">
          <h2>Staff at this museum</h2>
          {workers.length === 0 ? (
            <p className="muted-copy">No worker accounts have been created.</p>
          ) : (
            <ul className="workspace-list">
              {workers.map((worker) => (
                <li className="workspace-list-item" key={worker.id}>
                  <div>
                    <h3>{worker.fullName}</h3>
                    <p>{worker.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {notice ? <p className="notice notice-success" role="status">{notice}</p> : null}
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
    </>
  )
}

export default CuratorWorkers
