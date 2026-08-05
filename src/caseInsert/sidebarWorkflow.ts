import {
  getCaseInsertTemplatePaneConfig,
  type CaseInsertTemplatePaneId,
} from './templateSurfaces.ts'

export type CaseInsertSidebarPanelId =
  | 'projectFile'
  | 'exportOptions'
  | 'game'
  | 'template'
  | 'layoutPresets'

export type CaseInsertSidebarPanel = {
  id: CaseInsertSidebarPanelId
  label: string
  openByDefault?: boolean
}

const CASE_INSERT_SETUP_PANEL_IDS = [
  'projectFile',
  'exportOptions',
  'template',
  'layoutPresets',
  'game',
] as const

const CASE_INSERT_SETUP_PANEL_ID_SET: ReadonlySet<CaseInsertSidebarPanelId> =
  new Set(CASE_INSERT_SETUP_PANEL_IDS)

export function getCaseInsertSidebarStatusLabel(
  paneId: CaseInsertTemplatePaneId,
) {
  const paneConfig = getCaseInsertTemplatePaneConfig(paneId)

  return `Alpha jewel case editor - ${paneConfig.label}`
}

export function getCaseInsertSidebarWorkflow(
  paneId: CaseInsertTemplatePaneId,
): CaseInsertSidebarPanel[] {
  void paneId

  const setupPanels: CaseInsertSidebarPanel[] = [
    { id: 'projectFile', label: 'Project File' },
    { id: 'exportOptions', label: 'Export Options' },
    { id: 'template', label: 'Template' },
    { id: 'layoutPresets', label: 'Case Layout Presets' },
    { id: 'game', label: 'Game' },
  ]

  return setupPanels
}

export function getCaseInsertSidebarSetupPanels(
  paneId: CaseInsertTemplatePaneId,
): CaseInsertSidebarPanel[] {
  return getCaseInsertSidebarWorkflow(paneId).filter((panel) =>
    CASE_INSERT_SETUP_PANEL_ID_SET.has(panel.id))
}

export function getCaseInsertSidebarLegacyPanels(
  paneId: CaseInsertTemplatePaneId,
): CaseInsertSidebarPanel[] {
  void paneId

  return []
}
