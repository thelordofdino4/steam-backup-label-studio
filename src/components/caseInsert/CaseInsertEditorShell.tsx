import type { ReactNode } from 'react'
import {
  CASE_INSERT_TEMPLATE_PANES,
  caseInsertTemplatePaneHasSpine,
  getCaseInsertTemplatePaneConfig,
  type CaseInsertTemplatePaneId,
} from '../../caseInsert/templateSurfaces'
import {
  getCaseInsertTemplate,
} from '../../templates/caseInsertTemplates'
import { getTemplateSurfaceExportPixelSize } from '../../templates/templateModel'
import type { PreviewToast } from '../preview/PreviewToastStack'
import type { ProjectJewelCaseState } from '../../project/projectTypes'
import type { CaseInsertTemplateEditorActions } from '../../hooks/useCaseInsertTemplateEditor'
import type { JewelCaseSpineEditorActions } from '../../hooks/useJewelCaseSpineEditor'
import {
  CaseInsertTemplateArtworkControls,
  CaseInsertTemplateBrandingControls,
  CaseInsertTemplateTextControls,
} from './CaseInsertTemplateControls'
import {
  CaseInsertSpineArtworkControls,
  CaseInsertSpineBrandingControls,
  CaseInsertSpineTextControls,
} from './CaseInsertSpineControls'
import type { CaseInsertImageSourceCatalog } from './CaseInsertImageSourceControls'
import { CaseInsertPreview } from '../preview/CaseInsertPreview'
import { GamePanel, type GamePanelProps } from '../sidebar/GamePanel'

export type CaseInsertEditorShellProps = {
  caseInsert: ProjectJewelCaseState
  activeTemplatePane: CaseInsertTemplatePaneId
  editor: CaseInsertTemplateEditorActions
  spineEditor: JewelCaseSpineEditorActions
  imageSources: CaseInsertImageSourceCatalog
  gamePanelProps: GamePanelProps
  projectStatus: string
  statusToasts: PreviewToast[]
  onMainMenu: () => void
  onNewCaseInsert: () => void
  onNewDisc: () => void
  onSaveProject: () => void
  onLoadProject: () => void
  onExportPng: () => void
  onActiveTemplatePaneChange: (paneId: CaseInsertTemplatePaneId) => void
}

function getSurfaceMetrics(
  paneId: CaseInsertTemplatePaneId,
  caseInsert: ProjectJewelCaseState,
) {
  const template = getCaseInsertTemplate(caseInsert.templateType)
  const pane = getCaseInsertTemplatePaneConfig(paneId)
  const surface = template.surfaces?.find(({ id }) => id === pane.surfaceId)
  const exportSize = getTemplateSurfaceExportPixelSize(
    template,
    pane.surfaceId,
  )

  return surface && exportSize
    ? {
        name: surface.name,
        label: pane.label,
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
  | 'caseInsert'
  | 'activeTemplatePane'
  | 'editor'
  | 'spineEditor'
  | 'imageSources'
  | 'gamePanelProps'
  | 'statusToasts'
  | 'onActiveTemplatePaneChange'
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
  children: ReactNode
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

function CaseInsertWorkflowPanel({
  title,
  open = false,
  children,
}: {
  title: string
  open?: boolean
  children: ReactNode
}) {
  return (
    <details className="panel collapsible-panel" open={open}>
      <summary className="panel-summary">{title}</summary>
      <div className="panel-content">{children}</div>
    </details>
  )
}

function CaseInsertTemplatePanel({
  caseInsert,
  activeTemplatePane,
  onActiveTemplatePaneChange,
}: {
  caseInsert: ProjectJewelCaseState
  activeTemplatePane: CaseInsertTemplatePaneId
  onActiveTemplatePaneChange: (paneId: CaseInsertTemplatePaneId) => void
}) {
  const activeTemplate = getSurfaceMetrics(activeTemplatePane, caseInsert)

  return (
    <details className="panel collapsible-panel" open>
      <summary className="panel-summary">Template</summary>
      <div className="panel-content">
        <label className="field-label" htmlFor="case-insert-active-template">
          Case insert template
        </label>
        <select
          id="case-insert-active-template"
          value={activeTemplatePane}
          onChange={(event) =>
            onActiveTemplatePaneChange(
              event.target.value as CaseInsertTemplatePaneId,
            )}
        >
          {CASE_INSERT_TEMPLATE_PANES.map((pane) => (
            <option key={pane.id} value={pane.id}>{pane.label}</option>
          ))}
        </select>
        {activeTemplate ? (
          <dl className="template-metrics">
            <div>
              <dt>{activeTemplate.label}</dt>
              <dd>
                {activeTemplate.widthMm.toFixed(1)} ×{' '}
                {activeTemplate.heightMm.toFixed(1)} mm
              </dd>
            </div>
            <div>
              <dt>Export size</dt>
              <dd>{activeTemplate.widthPx} × {activeTemplate.heightPx} px</dd>
            </div>
          </dl>
        ) : null}
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
              <p>Tray-card fold lines for the two spine strips.</p>
            </div>
          </div>
        </div>
      </div>
    </details>
  )
}

export function CaseInsertEditorShell({
  caseInsert,
  activeTemplatePane,
  editor,
  spineEditor,
  imageSources,
  gamePanelProps,
  projectStatus,
  statusToasts,
  onMainMenu,
  onNewCaseInsert,
  onNewDisc,
  onSaveProject,
  onLoadProject,
  onExportPng,
  onActiveTemplatePaneChange,
}: CaseInsertEditorShellProps) {
  const activeTemplateState = caseInsert.templates[activeTemplatePane]
  const activeTemplateLabel =
    getCaseInsertTemplatePaneConfig(activeTemplatePane).label
  const activeTemplateHasSpine =
    caseInsertTemplatePaneHasSpine(activeTemplatePane)
  const artworkPanelTitle = activeTemplateHasSpine
    ? `${activeTemplateLabel} Artwork`
    : 'Artwork'
  const brandingPanelTitle = activeTemplateHasSpine
    ? `${activeTemplateLabel} Branding`
    : 'Branding'
  const textPanelTitle = activeTemplateHasSpine
    ? `${activeTemplateLabel} Text`
    : 'Text'

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

        <GamePanel {...gamePanelProps} />

        <CaseInsertTemplatePanel
          caseInsert={caseInsert}
          activeTemplatePane={activeTemplatePane}
          onActiveTemplatePaneChange={onActiveTemplatePaneChange}
        />

        <CaseInsertWorkflowPanel title={artworkPanelTitle} open>
          <CaseInsertTemplateArtworkControls
            paneId={activeTemplatePane}
            templateState={activeTemplateState}
            actions={editor}
            imageSources={imageSources}
          />
        </CaseInsertWorkflowPanel>

        {activeTemplateHasSpine ? (
          <CaseInsertWorkflowPanel title="Spine Artwork">
            <CaseInsertSpineArtworkControls
              spine={caseInsert.spine}
              actions={spineEditor}
              imageSources={imageSources}
            />
          </CaseInsertWorkflowPanel>
        ) : null}

        <CaseInsertWorkflowPanel title={brandingPanelTitle}>
          <CaseInsertTemplateBrandingControls
            paneId={activeTemplatePane}
            templateState={activeTemplateState}
            actions={editor}
            imageSources={imageSources}
          />
        </CaseInsertWorkflowPanel>

        {activeTemplateHasSpine ? (
          <CaseInsertWorkflowPanel title="Spine Branding">
            <CaseInsertSpineBrandingControls
              spine={caseInsert.spine}
              actions={spineEditor}
              imageSources={imageSources}
            />
          </CaseInsertWorkflowPanel>
        ) : null}

        <CaseInsertWorkflowPanel title={textPanelTitle}>
          <CaseInsertTemplateTextControls
            paneId={activeTemplatePane}
            templateState={activeTemplateState}
            actions={editor}
            imageSources={imageSources}
          />
        </CaseInsertWorkflowPanel>

        {activeTemplateHasSpine ? (
          <CaseInsertWorkflowPanel title="Spine Text">
            <CaseInsertSpineTextControls
              spine={caseInsert.spine}
              actions={spineEditor}
              imageSources={imageSources}
            />
          </CaseInsertWorkflowPanel>
        ) : null}

        <CaseInsertGuideLegendPanel />
      </aside>

      <CaseInsertPreview
        caseInsert={caseInsert}
        activeTemplatePane={activeTemplatePane}
        statusToasts={statusToasts}
      />
    </main>
  )
}
