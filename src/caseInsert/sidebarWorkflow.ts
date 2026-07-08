import {
  getCaseInsertTemplatePaneConfig,
  type CaseInsertTemplatePaneId,
} from './templateSurfaces.ts'

export type CaseInsertSidebarPanelId =
  | 'projectFile'
  | 'exportOptions'
  | 'game'
  | 'template'
  | 'spine'

export type CaseInsertSidebarPanel = {
  id: CaseInsertSidebarPanelId
  label: string
  openByDefault?: boolean
}

const CASE_INSERT_SETUP_PANEL_IDS = [
  'projectFile',
  'exportOptions',
  'template',
  'game',
] as const

const CASE_INSERT_LEGACY_PANEL_IDS = [
  'spine',
] as const

const CASE_INSERT_SETUP_PANEL_ID_SET: ReadonlySet<CaseInsertSidebarPanelId> =
  new Set(CASE_INSERT_SETUP_PANEL_IDS)

const CASE_INSERT_LEGACY_PANEL_ID_SET: ReadonlySet<CaseInsertSidebarPanelId> =
  new Set(CASE_INSERT_LEGACY_PANEL_IDS)

function createMigrationLabel(label: string) {
  return `${label} — Migrating Soon`
}

export function getCaseInsertSidebarStatusLabel(
  paneId: CaseInsertTemplatePaneId,
) {
  const paneConfig = getCaseInsertTemplatePaneConfig(paneId)

  return `Alpha jewel case editor - ${paneConfig.label}`
}

export function getCaseInsertSidebarWorkflow(
  paneId: CaseInsertTemplatePaneId,
): CaseInsertSidebarPanel[] {
  const paneConfig = getCaseInsertTemplatePaneConfig(paneId)
  const setupPanels: CaseInsertSidebarPanel[] = [
    { id: 'projectFile', label: 'Project File' },
    { id: 'exportOptions', label: 'Export Options' },
    { id: 'template', label: 'Template' },
    { id: 'game', label: 'Game' },
  ]
  const legacyPanels: CaseInsertSidebarPanel[] = []

  if (paneConfig.hasSpine) {
    legacyPanels.push({ id: 'spine', label: createMigrationLabel('Spine') })
  }

  return [...setupPanels, ...legacyPanels]
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
  return getCaseInsertSidebarWorkflow(paneId).filter((panel) =>
    CASE_INSERT_LEGACY_PANEL_ID_SET.has(panel.id))
}
