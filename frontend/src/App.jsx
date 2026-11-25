import './App.css'

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="Léviōsa home">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span>Léviōsa</span>
        </a>
      </header>

      <section className="welcome" aria-labelledby="welcome-title">
        <div className="welcome-content">
          <p className="eyebrow">Museum companion</p>
          <h1 id="welcome-title">Explore with your own pace</h1>
          <p className="welcome-copy">
            A guided museum experience shaped by your interests and available time.
          </p>

          <div className="welcome-actions">
            <button className="button button-primary" type="button">
              Begin as visitor
            </button>
            <button className="button button-secondary" type="button">
              Curator sign in
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
