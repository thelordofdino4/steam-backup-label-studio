import {
  getCaseInsertTemplatePaneConfig,
  type CaseInsertTemplatePaneId,
} from './templateSurfaces.ts'

export type CaseInsertSidebarPanelId =
  | 'projectFile'
  | 'exportOptions'
  | 'game'
  | 'template'
  | 'surface'
  | 'spine'
  | 'guideLegend'

export type CaseInsertSidebarPanel = {
  id: CaseInsertSidebarPanelId
  label: string
  openByDefault?: boolean
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
  const panels: CaseInsertSidebarPanel[] = [
    { id: 'projectFile', label: 'Project File' },
    { id: 'exportOptions', label: 'Export Options' },
    { id: 'game', label: 'Game' },
    { id: 'template', label: 'Template' },
    { id: 'surface', label: paneConfig.label },
  ]

  if (paneConfig.hasSpine) {
    panels.push({ id: 'spine', label: 'Spine' })
  }

  panels.push({ id: 'guideLegend', label: 'Guide Legend' })

  return panels
}
