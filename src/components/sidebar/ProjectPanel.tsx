export type ProjectPanelProps = {
  projectStatus: string
  handleNewProject: () => void
  handleSaveProject: () => void
  handleLoadProject: () => void
  handleExportPng: () => void
}

export function ProjectPanel({
  projectStatus,
  handleNewProject,
  handleSaveProject,
  handleLoadProject,
  handleExportPng,
}: ProjectPanelProps) {
  return (
    <details className="panel collapsible-panel">
      <summary className="panel-summary">Project File</summary>
      <div className="panel-content">
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={handleNewProject}>
            New Project
          </button>
          <button className="secondary-button" type="button" onClick={handleSaveProject}>
            Save Project
          </button>
          <button className="secondary-button" type="button" onClick={handleLoadProject}>
            Load Project
          </button>
          <button className="secondary-button" type="button" onClick={handleExportPng}>
            Export PNG
          </button>
        </div>
        <p className="hint">{projectStatus}</p>
      </div>
    </details>
  )
}
