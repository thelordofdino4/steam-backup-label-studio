export type CaseInsertPlaceholderProps = {
  onMainMenu: () => void
  onNewDisc: () => void
}

export function CaseInsertPlaceholder({
  onMainMenu,
  onNewDisc,
}: CaseInsertPlaceholderProps) {
  return (
    <main className="case-insert-placeholder-shell">
      <section className="case-insert-placeholder-panel" aria-labelledby="case-insert-title">
        <div className="home-menu-card-icon" aria-hidden="true">
          CI
        </div>
        <div className="case-insert-placeholder-copy">
          <p className="home-kicker">Case Insert Editor</p>
          <h1 id="case-insert-title">Jewel case module foundation</h1>
          <p>
            This separate editor environment is reserved for jewel case inserts first,
            then future Amaray/DVD and Blu-ray inserts.
          </p>
        </div>
        <div className="case-insert-placeholder-actions">
          <button className="secondary-button" type="button" onClick={onMainMenu}>
            Main Menu
          </button>
          <button className="secondary-button" type="button" onClick={onNewDisc}>
            New Disc
          </button>
        </div>
      </section>
    </main>
  )
}
