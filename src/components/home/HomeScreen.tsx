export type HomeScreenProps = {
  onLoadProject: () => void
  onNewDisc: () => void
  onNewCaseInsert: () => void
  statusMessage?: string | null
}

type HomeMenuItemProps = {
  icon: string
  title: string
  description: string
  status: string
  onClick: () => void
}

function HomeMenuItem({
  icon,
  title,
  description,
  status,
  onClick,
}: HomeMenuItemProps) {
  return (
    <button className="home-menu-card" type="button" onClick={onClick}>
      <span className="home-menu-card-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="home-menu-card-copy">
        <span className="home-menu-card-title">{title}</span>
        <span className="home-menu-card-description">{description}</span>
        <span className="home-menu-card-status">{status}</span>
      </span>
    </button>
  )
}

export function HomeScreen({
  onLoadProject,
  onNewDisc,
  onNewCaseInsert,
  statusMessage,
}: HomeScreenProps) {
  return (
    <main className="home-shell">
      <section className="home-panel" aria-labelledby="home-title">
        <div className="home-heading">
          <p className="home-kicker">Steam Backup Label Studio</p>
          <h1 id="home-title">Start a project</h1>
        </div>

        <div className="home-menu-grid">
          <HomeMenuItem
            icon="LD"
            title="Load Project"
            description="Open an existing Steam Backup Label Studio project."
            status="Disc projects supported"
            onClick={onLoadProject}
          />
          <HomeMenuItem
            icon="CD"
            title="New Disc"
            description="Create a circular Steam backup disc label."
            status="Alpha"
            onClick={onNewDisc}
          />
          <HomeMenuItem
            icon="CI"
            title="New Case Insert"
            description="Start the separate case insert editor flow."
            status="Jewel case foundation next"
            onClick={onNewCaseInsert}
          />
        </div>

        {statusMessage ? <p className="home-status">{statusMessage}</p> : null}
      </section>
    </main>
  )
}
