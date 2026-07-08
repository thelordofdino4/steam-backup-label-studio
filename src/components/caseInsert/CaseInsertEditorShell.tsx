import type { MouseEvent, ReactNode, RefObject } from 'react'
import {
  CASE_INSERT_TEMPLATE_PANES,
  getCaseInsertTemplatePaneConfig,
  getCaseInsertSupportedNavigationSurfacesForPane,
  type CaseInsertTemplatePaneId,
} from '../../caseInsert/templateSurfaces'
import {
  getCaseInsertSidebarLegacyPanels,
  getCaseInsertSidebarSetupPanels,
  getCaseInsertSidebarStatusLabel,
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
  CaseInsertSpineWorkflowControls,
} from './CaseInsertSpineControls'
import {
  CaseInsertTemplateCompanyLogoControls,
} from './CaseInsertTemplateCompanyLogoControls'
import {
  CaseInsertTemplateBackgroundArtworkControls,
} from './CaseInsertTemplateBackgroundArtworkControls'
import {
  CaseInsertTemplateGameTitleControls,
} from './CaseInsertTemplateGameTitleControls'
import {
  CaseInsertSpineBackgroundArtworkControls,
} from './CaseInsertSpineBackgroundArtworkControls'
import {
  CaseInsertSpineGameTitleControls,
} from './CaseInsertSpineGameTitleControls'
import {
  CaseInsertTemplateAdditionalArtworkControls,
} from './CaseInsertTemplateAdditionalArtworkControls'
import {
  CaseInsertTemplateAdditionalTextControls,
} from './CaseInsertTemplateAdditionalTextControls'
import {
  CaseInsertSpineAdditionalArtworkControls,
} from './CaseInsertSpineAdditionalArtworkControls'
import {
  CaseInsertSpineAdditionalTextControls,
} from './CaseInsertSpineAdditionalTextControls'
import {
  CaseInsertSpineCompanyLogoControls,
} from './CaseInsertSpineCompanyLogoControls'
import {
  CaseInsertSpineOptionalMediaFormatTypeControls,
} from './CaseInsertSpineOptionalMediaFormatTypeControls'
import {
  CaseInsertSpineLegalInfoControls,
} from './CaseInsertSpineLegalInfoControls'
import {
  CaseInsertSpineSteamBrandingControls,
} from './CaseInsertSpineSteamBrandingControls'
import {
  CaseInsertTemplateGameInfoLogoControls,
} from './CaseInsertTemplateGameInfoLogoControls'
import {
  CaseInsertTemplateLegalInfoControls,
} from './CaseInsertTemplateLegalInfoControls'
import {
  CaseInsertTemplateGameDescriptionTextControls,
} from './CaseInsertTemplateGameDescriptionTextControls'
import {
  CaseInsertTemplateFeatureBulletsControls,
} from './CaseInsertTemplateFeatureBulletsControls'
import {
  CaseInsertTemplateSystemRequirementsControls,
} from './CaseInsertTemplateSystemRequirementsControls'
import {
  CaseInsertTemplateScreenshotsControls,
} from './CaseInsertTemplateScreenshotsControls'
import {
  CaseInsertTemplateSteamBrandingControls,
} from './CaseInsertTemplateSteamBrandingControls'
import type { CaseInsertImageSourceCatalog } from './CaseInsertImageSourceControls'
import { CaseInsertPreview } from '../preview/CaseInsertPreview'
import {
  EditorNavigationRolePanel,
  CaseInsertSurfaceTabs,
} from '../editor/EditorNavigationShell'
import {
  getEditorNavigationShellRoleSectionItems,
} from '../editor/editorNavigationShellViewModel'
import { GamePanel, type GamePanelProps } from '../sidebar/GamePanel'
import { EditorPanel } from '../editor/EditorPanel'
import { MirrorIcon } from '../sidebar/PanelIcons'
import type {
  CaseInsertPreviewPointerHandlers,
} from '../../interaction/useCaseInsertPreviewPointerDrag'
import type {
  CaseInsertPreviewTextTarget,
} from '../../caseInsert/previewTextSelection'
import type {
  CaseInsertPreviewTextControlHandlers,
} from '../preview/caseInsertInlineTextEditorControls'
import type {
  CaseInsertNavigationSurfaceId,
} from '../../editor/editorNavigationShell'

export type CaseInsertEditorShellProps = {
  caseInsert: ProjectJewelCaseState
  activeTemplatePane: CaseInsertTemplatePaneId
  activeNavigationSurface: CaseInsertNavigationSurfaceId
  selectedTextTarget: CaseInsertPreviewTextTarget | null
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
  onNavigationSurfaceChange: (
    surfaceId: CaseInsertNavigationSurfaceId,
  ) => void
  onActiveTemplatePaneChange: (paneId: CaseInsertTemplatePaneId) => void
  onSelectedTextTargetChange: (
    target: CaseInsertPreviewTextTarget | null,
  ) => void
  onTextTargetValueChange: (
    target: CaseInsertPreviewTextTarget,
    value: string,
    options?: { sourceMode?: boolean },
  ) => void
  onTextTargetEditComplete: (target: CaseInsertPreviewTextTarget) => void
  previewTextControlHandlers: CaseInsertPreviewTextControlHandlers
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
  | 'activeNavigationSurface'
  | 'selectedTextTarget'
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
  | 'onNavigationSurfaceChange'
  | 'onActiveTemplatePaneChange'
  | 'onSelectedTextTargetChange'
  | 'onTextTargetValueChange'
  | 'onTextTargetEditComplete'
  | 'previewTextControlHandlers'
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
      data-smoke-id="case-spine-mirror-toggle"
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
          data-smoke-id="case-template-pane-select"
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

export function CaseInsertEditorShell({
  caseInsert,
  activeTemplatePane,
  activeNavigationSurface,
  selectedTextTarget,
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
  onNavigationSurfaceChange,
  onActiveTemplatePaneChange,
  onSelectedTextTargetChange,
  onTextTargetValueChange,
  onTextTargetEditComplete,
  previewTextControlHandlers,
}: CaseInsertEditorShellProps) {
  const activeTemplateState = caseInsert.templates[activeTemplatePane]
  const setupSidebarPanels =
    getCaseInsertSidebarSetupPanels(activeTemplatePane)
  const legacySidebarPanels =
    getCaseInsertSidebarLegacyPanels(activeTemplatePane)
  const supportedNavigationSurfaces =
    getCaseInsertSupportedNavigationSurfacesForPane(activeTemplatePane)
  const roleSectionItems =
    getEditorNavigationShellRoleSectionItems(activeNavigationSurface)

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
              onSelectedTextTargetChange={onSelectedTextTargetChange}
            />
          </CaseInsertWorkflowPanel>
        )
      default:
        return null
    }
  }

  function renderCaseInsertSteamBrandingPanel() {
    if (activeNavigationSurface === 'front' && activeTemplatePane === 'cover') {
      return (
        <EditorPanel title="Steam Branding">
          <CaseInsertTemplateSteamBrandingControls
            paneId={activeTemplatePane}
            templateState={activeTemplateState}
            projectMetadata={brandingSources.projectMetadata}
            actions={editor}
            imageSources={imageSources}
            getBrandingControls={getBrandingControls}
            logoCandidateDiscovery={logoCandidateDiscovery}
            handleFindLogoCandidates={handleFindLogoCandidates}
            onSelectedTextTargetChange={onSelectedTextTargetChange}
          />
        </EditorPanel>
      )
    }

    if (activeNavigationSurface === 'spine') {
      return (
        <EditorPanel title="Steam Branding">
          <CaseInsertSpineSteamBrandingControls
            spine={caseInsert.spine}
            projectMetadata={brandingSources.projectMetadata}
            actions={spineEditor}
            imageSources={imageSources}
            getBrandingControls={getBrandingControls}
            logoCandidateDiscovery={logoCandidateDiscovery}
            handleFindLogoCandidates={handleFindLogoCandidates}
            onSelectedTextTargetChange={onSelectedTextTargetChange}
          />
        </EditorPanel>
      )
    }

    return null
  }

  return (
    <main
      className="app-shell case-insert-app-shell"
      data-smoke-id="case-insert-editor"
    >
      <aside
        className="sidebar case-insert-sidebar"
        data-smoke-id="case-insert-sidebar"
      >
        <h1>Steam Backup Label Studio</h1>
        <p className="muted">{getCaseInsertSidebarStatusLabel(activeTemplatePane)}</p>

        <CaseInsertSurfaceTabs
          activeSurfaceId={activeNavigationSurface}
          onSurfaceChange={onNavigationSurfaceChange}
          supportedSurfaceIds={supportedNavigationSurfaces}
        />

        {setupSidebarPanels.map(renderCaseInsertSidebarPanel)}

        {renderCaseInsertSteamBrandingPanel()}

        {roleSectionItems.map((section) => (
          <EditorNavigationRolePanel
            key={section.id}
            label={section.label}
            smokeId={section.smokeId}
          >
            {section.id === 'background-artwork' ? (
              <CaseInsertTemplateBackgroundArtworkControls
                paneId={activeTemplatePane}
                templateState={activeTemplateState}
                projectMetadata={brandingSources.projectMetadata}
                actions={editor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'game-title' ? (
              <CaseInsertTemplateGameTitleControls
                paneId={activeTemplatePane}
                templateState={activeTemplateState}
                projectMetadata={brandingSources.projectMetadata}
                actions={editor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'spine-background-artwork' ? (
              <CaseInsertSpineBackgroundArtworkControls
                spine={caseInsert.spine}
                projectMetadata={brandingSources.projectMetadata}
                actions={spineEditor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'vertical-game-logo-title' ? (
              <CaseInsertSpineGameTitleControls
                spine={caseInsert.spine}
                projectMetadata={brandingSources.projectMetadata}
                actions={spineEditor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'additional-artwork' &&
              activeNavigationSurface === 'front' ? (
              <CaseInsertTemplateAdditionalArtworkControls
                paneId={activeTemplatePane}
                templateState={activeTemplateState}
                projectMetadata={brandingSources.projectMetadata}
                actions={editor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'additional-artwork' &&
              activeNavigationSurface === 'spine' ? (
              <CaseInsertSpineAdditionalArtworkControls
                spine={caseInsert.spine}
                projectMetadata={brandingSources.projectMetadata}
                actions={spineEditor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'additional-text' &&
              activeNavigationSurface === 'spine' ? (
              <CaseInsertSpineAdditionalTextControls
                spine={caseInsert.spine}
                projectMetadata={brandingSources.projectMetadata}
                actions={spineEditor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'additional-text' ? (
              <CaseInsertTemplateAdditionalTextControls
                paneId={activeTemplatePane}
                templateState={activeTemplateState}
                projectMetadata={brandingSources.projectMetadata}
                actions={editor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'company-logos' ? (
              <CaseInsertTemplateCompanyLogoControls
                paneId={activeTemplatePane}
                templateState={activeTemplateState}
                projectMetadata={brandingSources.projectMetadata}
                actions={editor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'game-info-logos' ? (
              <CaseInsertTemplateGameInfoLogoControls
                paneId={activeTemplatePane}
                templateState={activeTemplateState}
                projectMetadata={brandingSources.projectMetadata}
                actions={editor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'screenshots' ? (
              <CaseInsertTemplateScreenshotsControls
                paneId={activeTemplatePane}
                templateState={activeTemplateState}
                projectMetadata={brandingSources.projectMetadata}
                actions={editor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'game-description-text' ? (
              <CaseInsertTemplateGameDescriptionTextControls
                paneId={activeTemplatePane}
                templateState={activeTemplateState}
                projectMetadata={brandingSources.projectMetadata}
                actions={editor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'feature-bullets-callouts' ? (
              <CaseInsertTemplateFeatureBulletsControls
                paneId={activeTemplatePane}
                templateState={activeTemplateState}
                projectMetadata={brandingSources.projectMetadata}
                actions={editor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'system-requirements' ? (
              <CaseInsertTemplateSystemRequirementsControls
                paneId={activeTemplatePane}
                templateState={activeTemplateState}
                projectMetadata={brandingSources.projectMetadata}
                actions={editor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'company-logo' ? (
              <CaseInsertSpineCompanyLogoControls
                spine={caseInsert.spine}
                projectMetadata={brandingSources.projectMetadata}
                actions={spineEditor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'optional-media-format-type' ? (
              <CaseInsertSpineOptionalMediaFormatTypeControls
                spine={caseInsert.spine}
                projectMetadata={brandingSources.projectMetadata}
                actions={spineEditor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'legal-info' &&
              activeNavigationSurface === 'spine' ? (
              <CaseInsertSpineLegalInfoControls
                spine={caseInsert.spine}
                projectMetadata={brandingSources.projectMetadata}
                actions={spineEditor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : section.id === 'legal-info' ? (
              <CaseInsertTemplateLegalInfoControls
                paneId={activeTemplatePane}
                templateState={activeTemplateState}
                projectMetadata={brandingSources.projectMetadata}
                actions={editor}
                imageSources={imageSources}
                getBrandingControls={getBrandingControls}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onSelectedTextTargetChange={onSelectedTextTargetChange}
              />
            ) : null}
          </EditorNavigationRolePanel>
        ))}

        {legacySidebarPanels.map(renderCaseInsertSidebarPanel)}
      </aside>

      <CaseInsertPreview
        caseInsert={caseInsert}
        activeTemplatePane={activeTemplatePane}
        brandingSources={brandingSources}
        selectedTextTarget={selectedTextTarget}
        caseInsertPreviewRef={caseInsertPreviewRef}
        pointerHandlers={pointerHandlers}
        statusToasts={statusToasts}
        onSelectedTextTargetChange={onSelectedTextTargetChange}
        onTextTargetValueChange={onTextTargetValueChange}
        onTextTargetEditComplete={onTextTargetEditComplete}
        previewTextControlHandlers={previewTextControlHandlers}
      />
    </main>
  )
}
