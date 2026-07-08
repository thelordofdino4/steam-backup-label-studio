import type {
  JewelCaseRegionId,
  JewelCaseSurfaceId,
} from '../templates/caseInsertTemplates.ts'

export type CaseInsertTemplatePaneId = 'cover' | 'tray'

export type CaseInsertNavigationSurfaceId = JewelCaseSurfaceId | 'spine'

export type CaseInsertImageSlotGroupKey =
  | 'artworkSlots'
  | 'logoSlots'
  | 'markSlots'

export type CaseInsertImagePlacementRole =
  | 'titleArtwork'
  | 'calloutArtwork'
  | 'screenshot'
  | 'logo'
  | 'mark'

export type CaseInsertTextPlacementRole =
  | 'callout'
  | 'description'
  | 'minimumRequirements'
  | 'recommendedRequirements'
  | 'legalText'

export type CaseInsertTextListPlacementRole = 'featureBullets'

export type CaseInsertTemplatePaneConfig = {
  id: CaseInsertTemplatePaneId
  label: string
  surfaceId: JewelCaseSurfaceId
  printRegionId: JewelCaseRegionId
  safeRegionId: JewelCaseRegionId
  panelRegionId: JewelCaseRegionId
  hasSpine: boolean
}

export const CASE_INSERT_TEMPLATE_PANES: CaseInsertTemplatePaneConfig[] = [
  {
    id: 'cover',
    label: 'Cover Sheet',
    surfaceId: 'front',
    printRegionId: 'front',
    safeRegionId: 'frontSafe',
    panelRegionId: 'front',
    hasSpine: false,
  },
  {
    id: 'tray',
    label: 'Tray Card',
    surfaceId: 'back',
    printRegionId: 'back',
    safeRegionId: 'backSafe',
    panelRegionId: 'backPanelSafe',
    hasSpine: true,
  },
]

export const DEFAULT_CASE_INSERT_TEMPLATE_PANE_ID: CaseInsertTemplatePaneId =
  'cover'

export const CASE_INSERT_TEMPLATE_PANE_IDS = CASE_INSERT_TEMPLATE_PANES.map(
  ({ id }) => id,
)

export function isCaseInsertTemplatePaneId(
  value: unknown,
): value is CaseInsertTemplatePaneId {
  return value === 'cover' || value === 'tray'
}

export function normalizeCaseInsertTemplatePaneId(
  value: unknown,
  fallback: CaseInsertTemplatePaneId = DEFAULT_CASE_INSERT_TEMPLATE_PANE_ID,
): CaseInsertTemplatePaneId {
  return isCaseInsertTemplatePaneId(value) ? value : fallback
}

export function getCaseInsertTemplatePaneConfig(
  paneId: CaseInsertTemplatePaneId,
): CaseInsertTemplatePaneConfig {
  return CASE_INSERT_TEMPLATE_PANES.find(({ id }) => id === paneId) ??
    CASE_INSERT_TEMPLATE_PANES[0]
}

export function getCaseInsertTemplatePaneForSurface(
  surfaceId: JewelCaseSurfaceId,
) {
  return CASE_INSERT_TEMPLATE_PANES.find(
    (pane) => pane.surfaceId === surfaceId,
  ) ?? CASE_INSERT_TEMPLATE_PANES[0]
}

export function getCaseInsertTemplatePaneLabel(
  paneId: CaseInsertTemplatePaneId,
) {
  return getCaseInsertTemplatePaneConfig(paneId).label
}

export function caseInsertTemplatePaneHasSpine(
  paneId: CaseInsertTemplatePaneId,
) {
  return getCaseInsertTemplatePaneConfig(paneId).hasSpine
}

export function getCaseInsertSupportedNavigationSurfacesForPane(
  paneId: CaseInsertTemplatePaneId,
): readonly CaseInsertNavigationSurfaceId[] {
  const paneConfig = getCaseInsertTemplatePaneConfig(paneId)

  return paneConfig.hasSpine
    ? [paneConfig.surfaceId, 'spine']
    : [paneConfig.surfaceId]
}

export function isCaseInsertNavigationSurfaceSupportedForPane(
  paneId: CaseInsertTemplatePaneId,
  surfaceId: CaseInsertNavigationSurfaceId,
): boolean {
  return getCaseInsertSupportedNavigationSurfacesForPane(paneId).includes(
    surfaceId,
  )
}

export function normalizeCaseInsertNavigationSurfaceForPane(
  paneId: CaseInsertTemplatePaneId,
  surfaceId: CaseInsertNavigationSurfaceId,
): CaseInsertNavigationSurfaceId {
  return isCaseInsertNavigationSurfaceSupportedForPane(paneId, surfaceId)
    ? surfaceId
    : getCaseInsertSupportedNavigationSurfacesForPane(paneId)[0]
}
