import {
  getCaseInsertTemplate,
  type JewelCaseSurfaceId,
} from '../../templates/caseInsertTemplates'
import { getTemplateSurfaceExportPixelSize } from '../../templates/templateModel'
import type { PreviewToast } from '../preview/PreviewToastStack'
import type { ProjectJewelCaseState } from '../../project/projectTypes'
import { CaseInsertPreview } from '../preview/CaseInsertPreview'

export type CaseInsertEditorShellProps = {
  caseInsert: ProjectJewelCaseState
  projectStatus: string
  manualGameTitle: string
  statusToasts: PreviewToast[]
  onMainMenu: () => void
  onNewCaseInsert: () => void
  onNewDisc: () => void
  onSaveProject: () => void
  onLoadProject: () => void
  onExportPng: () => void
}

function getSurfaceMetrics(
  surfaceId: JewelCaseSurfaceId,
  caseInsert: ProjectJewelCaseState,
) {
  const template = getCaseInsertTemplate(caseInsert.templateType)
  const surface = template.surfaces?.find(({ id }) => id === surfaceId)
  const exportSize = getTemplateSurfaceExportPixelSize(
    template,
    surfaceId,
  )

  return surface && exportSize
    ? {
        name: surface.name,
        widthMm: surface.widthMm,
        heightMm: surface.heightMm,
        widthPx: exportSize.widthPx,
        heightPx: exportSize.heightPx,
      }
    : null
}

function CaseInsertProjectPanel({
  projectStatus,
  onMainMenu,
  onNewCaseInsert,
  onNewDisc,
  onSaveProject,
  onLoadProject,
  onExportPng,
}: Omit<
  CaseInsertEditorShellProps,
  'caseInsert' | 'manualGameTitle' | 'statusToasts'
>) {
  return (
    <details className="panel collapsible-panel">
      <summary className="panel-summary">Project File</summary>
      <div className="panel-content">
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={onMainMenu}>
            Main Menu
          </button>
          <button className="secondary-button" type="button" onClick={onNewCaseInsert}>
            New Case Insert
          </button>
          <button className="secondary-button" type="button" onClick={onNewDisc}>
            New Disc
          </button>
          <button className="secondary-button" type="button" onClick={onSaveProject}>
            Save Project
          </button>
          <button className="secondary-button" type="button" onClick={onLoadProject}>
            Load Project
          </button>
          <button className="secondary-button" type="button" onClick={onExportPng}>
            Export PNG
          </button>
        </div>
        <p className="hint">{projectStatus}</p>
      </div>
    </details>
  )
}

function CaseInsertSidebarNotePanel({
  title,
  children,
}: {
  title: string
  children: string
}) {
  return (
    <details className="panel collapsible-panel">
      <summary className="panel-summary">{title}</summary>
      <div className="panel-content">
        <p className="hint">{children}</p>
      </div>
    </details>
  )
}

function CaseInsertTemplatePanel({
  caseInsert,
}: {
  caseInsert: ProjectJewelCaseState
}) {
  const front = getSurfaceMetrics('front', caseInsert)
  const back = getSurfaceMetrics('back', caseInsert)

  return (
    <details className="panel collapsible-panel">
      <summary className="panel-summary">Template</summary>
      <div className="panel-content">
        <p className="hint">Jewel case insert set</p>
        <dl className="template-metrics">
          {[front, back].flatMap((surface) =>
            surface
              ? [
                  <div key={`${surface.name}-physical`}>
                    <dt>{surface.name}</dt>
                    <dd>{surface.widthMm.toFixed(1)} × {surface.heightMm.toFixed(1)} mm</dd>
                  </div>,
                  <div key={`${surface.name}-export`}>
                    <dt>Export size</dt>
                    <dd>{surface.widthPx} × {surface.heightPx} px</dd>
                  </div>,
                ]
              : [],
          )}
        </dl>
      </div>
    </details>
  )
}

function CaseInsertGuideLegendPanel() {
  return (
    <details className="panel collapsible-panel">
      <summary className="panel-summary">Guide Legend</summary>
      <div className="panel-content">
        <div className="guide-legend">
          <div className="guide-legend-item">
            <span className="guide-swatch case-guide-swatch-trim" aria-hidden="true" />
            <div>
              <strong>Trim</strong>
              <p>Final cut boundary.</p>
            </div>
          </div>
          <div className="guide-legend-item">
            <span className="guide-swatch case-guide-swatch-safe" aria-hidden="true" />
            <div>
              <strong>Safe Area</strong>
              <p>Keep important content inside this line.</p>
            </div>
          </div>
          <div className="guide-legend-item">
            <span className="guide-swatch case-guide-swatch-spine" aria-hidden="true" />
            <div>
              <strong>Spine Fold</strong>
              <p>Back-tray fold lines for the two spine strips.</p>
            </div>
          </div>
        </div>
      </div>
    </details>
  )
}

export function CaseInsertEditorShell({
  caseInsert,
  projectStatus,
  manualGameTitle,
  statusToasts,
  onMainMenu,
  onNewCaseInsert,
  onNewDisc,
  onSaveProject,
  onLoadProject,
  onExportPng,
}: CaseInsertEditorShellProps) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <h1>Steam Backup Label Studio</h1>
        <p className="muted">Alpha jewel case editor</p>

        <CaseInsertProjectPanel
          projectStatus={projectStatus}
          onMainMenu={onMainMenu}
          onNewCaseInsert={onNewCaseInsert}
          onNewDisc={onNewDisc}
          onSaveProject={onSaveProject}
          onLoadProject={onLoadProject}
          onExportPng={onExportPng}
        />

        <CaseInsertSidebarNotePanel title="Export Options">
          Case export options will use the jewel case guide model.
        </CaseInsertSidebarNotePanel>

        <CaseInsertSidebarNotePanel title="Game">
          {manualGameTitle}
        </CaseInsertSidebarNotePanel>

        <CaseInsertTemplatePanel caseInsert={caseInsert} />

        <CaseInsertSidebarNotePanel title="Artwork">
          Front, back, screenshot, and title artwork slots are next.
        </CaseInsertSidebarNotePanel>

        <CaseInsertSidebarNotePanel title="Branding">
          Case logos, marks, ratings, and spine branding are next.
        </CaseInsertSidebarNotePanel>

        <CaseInsertSidebarNotePanel title="Text">
          Front, back, legal, requirements, and spine text controls are next.
        </CaseInsertSidebarNotePanel>

        <CaseInsertGuideLegendPanel />
      </aside>

      <CaseInsertPreview
        caseInsert={caseInsert}
        statusToasts={statusToasts}
      />
    </main>
  )
}
