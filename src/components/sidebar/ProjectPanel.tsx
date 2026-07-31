import { EditorPanel } from '../editor/EditorPanel'

export type ProjectPanelProps = {
  projectStatus: string
  handleNewProject: () => void
  handleSaveProject: () => void
  handleLoadProject: () => void
  handleExportPng: () => void
  exportPngDisabled: boolean
  handleMainMenu: () => void
  handleNewCaseInsert: () => void
}

export function ProjectPanel({
  projectStatus,
  handleNewProject,
  handleSaveProject,
  handleLoadProject,
  handleExportPng,
  exportPngDisabled,
  handleMainMenu,
  handleNewCaseInsert,
}: ProjectPanelProps) {
  return (
    <EditorPanel title="Project File">
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={handleMainMenu}>
            Main Menu
          </button>
          <button className="secondary-button" type="button" onClick={handleNewProject}>
            New Disc
          </button>
          <button className="secondary-button" type="button" onClick={handleSaveProject}>
            Save Project
          </button>
          <button className="secondary-button" type="button" onClick={handleLoadProject}>
            Load Project
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={exportPngDisabled}
            onClick={handleExportPng}
          >
            Export PNG
          </button>
          <button className="secondary-button" type="button" onClick={handleNewCaseInsert}>
            New Case Insert
          </button>
        </div>
        <p className="hint">{projectStatus}</p>
    </EditorPanel>
  )
}
