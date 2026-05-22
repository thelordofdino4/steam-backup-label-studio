import './App.css'

function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <h1>Steam Backup Label Studio</h1>
        <p className="muted">Issue #2: Blank disc preview</p>

        <section className="panel">
          <h2>Template</h2>
          <p>Standard printable disc</p>
        </section>

        <section className="panel">
          <h2>Guides</h2>
          <ul>
            <li>Outer disc edge</li>
            <li>Center hole</li>
            <li>Safe zone</li>
          </ul>
        </section>
      </aside>

      <section className="preview-area">
        <div className="disc-preview" aria-label="Blank standard printable disc preview">
          <div className="safe-zone" />
          <div className="center-hole" />
        </div>
      </section>
    </main>
  )
}

export default App