export type HomeScreenProps = {
  onLoadProject: () => void
  onNewDisc: () => void
  onNewCaseInsert: () => void
  onResumeProject: () => void
  resumeProject: Readonly<{
    title: string
    description: string
    status: string
  }> | null
  statusMessage?: string | null
}

type HomeMenuItemProps = {
  icon: string
  title: string
  description: string
  status: string
  onClick: () => void
  elementId?: string
  smokeId?: string
}

function HomeMenuItem({
  icon,
  title,
  description,
  status,
  onClick,
  elementId,
  smokeId,
}: HomeMenuItemProps) {
  return (
    <button
      className="home-menu-card"
      id={elementId}
      type="button"
      data-smoke-id={smokeId}
      onClick={onClick}
    >
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
  onResumeProject,
  resumeProject,
  statusMessage,
}: HomeScreenProps) {
  return (
    <main className="home-shell">
      <section className="home-panel" aria-labelledby="home-title">
        <div className="home-heading">
          <p className="home-kicker">Steam Backup Label Studio</p>
          <h1 id="home-title" tabIndex={-1}>
            Start a project
          </h1>
        </div>

        <div className="home-menu-grid">
          {resumeProject ? (
            <HomeMenuItem
              icon="RS"
              title={resumeProject.title}
              description={resumeProject.description}
              status={resumeProject.status}
              elementId="home-resume-project"
              smokeId="home-resume-project"
              onClick={onResumeProject}
            />
          ) : null}
          <HomeMenuItem
            icon="LD"
            title="Load Project"
            description="Open an existing Steam Backup Label Studio project."
            status="Disc projects supported"
            smokeId="home-load-project"
            onClick={onLoadProject}
          />
          <HomeMenuItem
            icon="CD"
            title="New Disc"
            description="Create a circular Steam backup disc label."
            status="Alpha"
            smokeId="home-new-disc"
            onClick={onNewDisc}
          />
          <HomeMenuItem
            icon="CI"
            title="New Case Insert"
            description="Start the separate case insert editor flow."
            status="Jewel case foundation next"
            smokeId="home-new-case-insert"
            onClick={onNewCaseInsert}
          />
        </div>

        {statusMessage ? (
          <p
            className="home-status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {statusMessage}
          </p>
        ) : null}
      </section>
    </main>
  )
}
