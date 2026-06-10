import type { MouseEvent, ReactNode, RefObject } from 'react'
import {
  CASE_INSERT_TEMPLATE_PANES,
  getCaseInsertTemplatePaneConfig,
  type CaseInsertTemplatePaneId,
} from '../../caseInsert/templateSurfaces'
import {
  getCaseInsertSidebarStatusLabel,
  getCaseInsertSidebarWorkflow,
  type CaseInsertSidebarPanel,
} from '../../caseInsert/sidebarWorkflow'
import {
  countSelectedCaseInsertExportGuideOptions,
  getCaseInsertExportGuideOptions,
  isCaseInsertExportGuideOptionSelected,
} from '../../caseInsert/exportGuideOptions'
import {
  getCaseInsertTemplate,
  type JewelCaseGuideId,
} from '../../templates/caseInsertTemplates'
import { getTemplateSurfaceExportPixelSize } from '../../templates/templateModel'
import type { PreviewToast } from '../preview/PreviewToastStack'
import type { ProjectJewelCaseState } from '../../project/projectTypes'
import type { CaseInsertTemplateEditorActions } from '../../hooks/useCaseInsertTemplateEditor'
import type { JewelCaseSpineEditorActions } from '../../hooks/useJewelCaseSpineEditor'
import type { LogoCandidateDiscoveryState } from '../../hooks/useLogoAssetDiscovery'
import type { LogoAssetKey } from '../../project/projectLogoAssets'
import type { CaseInsertBrandingSourceCatalog } from '../../caseInsert/brandingSlotSources'
import type {
  CaseInsertBrandingMarkTarget,
  CaseInsertBrandingMarkTargetState,
} from '../../caseInsert/brandingMarkSlots'
import type {
  CaseInsertBrandingSetupControlsProps,
} from './CaseInsertBrandingSetupControls'
import {
  CaseInsertTemplateWorkflowControls,
} from './CaseInsertTemplateControls'
import {
  CaseInsertSpineWorkflowControls,
} from './CaseInsertSpineControls'
import type { CaseInsertImageSourceCatalog } from './CaseInsertImageSourceControls'
import { CaseInsertPreview } from '../preview/CaseInsertPreview'
import { GamePanel, type GamePanelProps } from '../sidebar/GamePanel'
import { EditorPanel } from '../editor/EditorPanel'
import { MirrorIcon } from '../sidebar/PanelIcons'
import type {
  CaseInsertPreviewPointerHandlers,
} from '../../interaction/useCaseInsertPreviewPointerDrag'

export type CaseInsertEditorShellProps = {
  caseInsert: ProjectJewelCaseState
  activeTemplatePane: CaseInsertTemplatePaneId
  caseInsertPreviewRef: RefObject<HTMLDivElement | null>
  pointerHandlers: CaseInsertPreviewPointerHandlers
  editor: CaseInsertTemplateEditorActions
  spineEditor: JewelCaseSpineEditorActions
  imageSources: CaseInsertImageSourceCatalog
  brandingSources: CaseInsertBrandingSourceCatalog
  getBrandingControls: (
    target: CaseInsertBrandingMarkTarget,
    targetState: CaseInsertBrandingMarkTargetState,
  ) => CaseInsertBrandingSetupControlsProps
  logoCandidateDiscovery: LogoCandidateDiscoveryState
  handleFindLogoCandidates: (logoKey: LogoAssetKey) => void | Promise<void>
  gamePanelProps: GamePanelProps
  projectStatus: string
  statusToasts: PreviewToast[]
  onMainMenu: () => void
  onNewCaseInsert: () => void
  onNewDisc: () => void
  onSaveProject: () => void
  onLoadProject: () => void
  onExportPng: () => void
  onExportGuideToggle: (
    guideIds: readonly JewelCaseGuideId[],
    checked: boolean,
  ) => void
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
  | 'caseInsertPreviewRef'
  | 'pointerHandlers'
  | 'editor'
  | 'spineEditor'
  | 'imageSources'
  | 'brandingSources'
  | 'getBrandingControls'
  | 'logoCandidateDiscovery'
  | 'handleFindLogoCandidates'
  | 'gamePanelProps'
  | 'statusToasts'
  | 'onActiveTemplatePaneChange'
  | 'onExportGuideToggle'
>) {
  return (
    <EditorPanel title="Project File">
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
    </EditorPanel>
  )
}

function CaseInsertExportOptionsPanel({
  caseInsert,
  activeTemplatePane,
  onExportGuideToggle,
}: {
  caseInsert: ProjectJewelCaseState
  activeTemplatePane: CaseInsertTemplatePaneId
  onExportGuideToggle: (
    guideIds: readonly JewelCaseGuideId[],
    checked: boolean,
  ) => void
}) {
  const selectedGuideIds = new Set(caseInsert.export.guideIds)
  const guideOptions = getCaseInsertExportGuideOptions(
    caseInsert.templateType,
    activeTemplatePane,
  )
  const enabledGuideCount = countSelectedCaseInsertExportGuideOptions(
    guideOptions,
    caseInsert.export.guideIds,
  )

  return (
    <EditorPanel title="Export Options">
        <p className="hint">
          {enabledGuideCount > 0
            ? `${enabledGuideCount} guide ${enabledGuideCount === 1 ? 'option is' : 'options are'} on.`
            : 'Export guides are off.'}
        </p>
        <div className="disc-mark-checkbox-list">
          {guideOptions.map((option) => (
            <label className="checkbox-row" key={option.id}>
              <input
                type="checkbox"
                checked={isCaseInsertExportGuideOptionSelected(
                  option,
                  selectedGuideIds,
                )}
                onChange={(event) =>
                  onExportGuideToggle(option.guideIds, event.target.checked)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
    </EditorPanel>
  )
}

function CaseInsertWorkflowPanel({
  title,
  open = false,
  headerActions,
  children,
}: {
  title: string
  open?: boolean
  headerActions?: ReactNode
  children: ReactNode
}) {
  return (
    <EditorPanel title={title} open={open} headerActions={headerActions}>
      {children}
    </EditorPanel>
  )
}

function CaseInsertSpineMirrorToggle({
  mirrored,
  onMirroredChange,
}: {
  mirrored: boolean
  onMirroredChange: (mirrored: boolean) => void
}) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    onMirroredChange(!mirrored)
  }

  return (
    <button
      className={`icon-button case-insert-spine-mirror-button${
        mirrored ? ' is-active' : ''
      }`}
      type="button"
      aria-label={mirrored
        ? 'Turn off mirrored spine editing'
        : 'Turn on mirrored spine editing'}
      aria-pressed={mirrored}
      title={mirrored
        ? 'Mirrored spine editing on'
        : 'Mirrored spine editing off'}
      onClick={handleClick}
    >
      <MirrorIcon />
    </button>
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
    <EditorPanel title="Template">
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
    </EditorPanel>
  )
}

function CaseInsertGuideLegendPanel() {
  return (
    <EditorPanel title="Guide Legend">
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
    </EditorPanel>
  )
}

export function CaseInsertEditorShell({
  caseInsert,
  activeTemplatePane,
  caseInsertPreviewRef,
  pointerHandlers,
  editor,
  spineEditor,
  imageSources,
  brandingSources,
  getBrandingControls,
  logoCandidateDiscovery,
  handleFindLogoCandidates,
  gamePanelProps,
  projectStatus,
  statusToasts,
  onMainMenu,
  onNewCaseInsert,
  onNewDisc,
  onSaveProject,
  onLoadProject,
  onExportPng,
  onExportGuideToggle,
  onActiveTemplatePaneChange,
}: CaseInsertEditorShellProps) {
  const activeTemplateState = caseInsert.templates[activeTemplatePane]
  const sidebarWorkflow = getCaseInsertSidebarWorkflow(activeTemplatePane)

  function renderCaseInsertSidebarPanel(panel: CaseInsertSidebarPanel) {
    switch (panel.id) {
      case 'projectFile':
        return (
          <CaseInsertProjectPanel
            key={panel.id}
            projectStatus={projectStatus}
            onMainMenu={onMainMenu}
            onNewCaseInsert={onNewCaseInsert}
            onNewDisc={onNewDisc}
            onSaveProject={onSaveProject}
            onLoadProject={onLoadProject}
            onExportPng={onExportPng}
          />
        )
      case 'exportOptions':
        return (
          <CaseInsertExportOptionsPanel
            key={panel.id}
            caseInsert={caseInsert}
            activeTemplatePane={activeTemplatePane}
            onExportGuideToggle={onExportGuideToggle}
          />
        )
      case 'game':
        return <GamePanel key={panel.id} {...gamePanelProps} />
      case 'template':
        return (
          <CaseInsertTemplatePanel
            key={panel.id}
            caseInsert={caseInsert}
            activeTemplatePane={activeTemplatePane}
            onActiveTemplatePaneChange={onActiveTemplatePaneChange}
          />
        )
      case 'surface':
        return (
          <CaseInsertWorkflowPanel
            key={panel.id}
            title={panel.label}
            open={panel.openByDefault}
          >
            <CaseInsertTemplateWorkflowControls
              paneId={activeTemplatePane}
              templateState={activeTemplateState}
              projectMetadata={brandingSources.projectMetadata}
              actions={editor}
              imageSources={imageSources}
              getBrandingControls={getBrandingControls}
              logoCandidateDiscovery={logoCandidateDiscovery}
              handleFindLogoCandidates={handleFindLogoCandidates}
            />
          </CaseInsertWorkflowPanel>
        )
      case 'spine':
        return (
          <CaseInsertWorkflowPanel
            key={panel.id}
            title={panel.label}
            open={panel.openByDefault}
            headerActions={(
              <CaseInsertSpineMirrorToggle
                mirrored={caseInsert.spine.mirrored}
                onMirroredChange={spineEditor.handleSpineMirroredChange}
              />
            )}
          >
            <CaseInsertSpineWorkflowControls
              spine={caseInsert.spine}
              projectMetadata={brandingSources.projectMetadata}
              actions={spineEditor}
              imageSources={imageSources}
              getBrandingControls={getBrandingControls}
              logoCandidateDiscovery={logoCandidateDiscovery}
              handleFindLogoCandidates={handleFindLogoCandidates}
            />
          </CaseInsertWorkflowPanel>
        )
      case 'guideLegend':
        return <CaseInsertGuideLegendPanel key={panel.id} />
      default:
        return null
    }
  }

  return (
    <main className="app-shell case-insert-app-shell">
      <aside className="sidebar case-insert-sidebar">
        <h1>Steam Backup Label Studio</h1>
        <p className="muted">{getCaseInsertSidebarStatusLabel(activeTemplatePane)}</p>

        {sidebarWorkflow.map(renderCaseInsertSidebarPanel)}
      </aside>

      <CaseInsertPreview
        caseInsert={caseInsert}
        activeTemplatePane={activeTemplatePane}
        brandingSources={brandingSources}
        caseInsertPreviewRef={caseInsertPreviewRef}
        pointerHandlers={pointerHandlers}
        statusToasts={statusToasts}
      />
    </main>
  )
}
