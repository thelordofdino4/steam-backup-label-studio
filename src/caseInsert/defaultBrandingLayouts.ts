import type { ProjectCaseInsertLayout } from '../project/projectTypes.ts'
import type { CaseInsertMarkLayerKind } from './brandingSlotSources.ts'
import type { CaseInsertTemplatePaneId } from './templateSurfaces.ts'

export const CASE_INSERT_COVER_RATING_MARK_LAYOUT = {
  scale: 1,
  x: 0,
  y: 100,
  rotation: 0,
} satisfies ProjectCaseInsertLayout

export const CASE_INSERT_COVER_DEVELOPER_LOGO_LAYOUT = {
  scale: 1,
  x: 50,
  y: 92,
  rotation: 0,
} satisfies ProjectCaseInsertLayout

export const CASE_INSERT_COVER_PUBLISHER_LOGO_LAYOUT = {
  scale: 1,
  x: 84,
  y: 92,
  rotation: 0,
} satisfies ProjectCaseInsertLayout

const CASE_INSERT_COVER_MARK_LAYOUTS = {
  rating: CASE_INSERT_COVER_RATING_MARK_LAYOUT,
  media: { scale: 0.78, x: 78, y: 92, rotation: 0 },
  platform: { scale: 0.72, x: 92, y: 92, rotation: 0 },
  technical: { scale: 0.72, x: 64, y: 92, rotation: 0 },
} satisfies Record<CaseInsertMarkLayerKind, ProjectCaseInsertLayout>

export const CASE_INSERT_TRAY_MARK_LAYOUTS = {
  rating: { scale: 0.66, x: 88, y: 86, rotation: 0 },
  media: { scale: 0.66, x: 70, y: 91, rotation: 0 },
  platform: { scale: 0.66, x: 52, y: 91, rotation: 0 },
  technical: { scale: 0.66, x: 34, y: 91, rotation: 0 },
} satisfies Record<CaseInsertMarkLayerKind, ProjectCaseInsertLayout>

export const CASE_INSERT_SPINE_MARK_LAYOUTS = {
  platform: { scale: 0.78, x: 50, y: 70, rotation: 0 },
  media: { scale: 0.78, x: 50, y: 78, rotation: 0 },
  technical: { scale: 0.78, x: 50, y: 86, rotation: 0 },
  rating: { scale: 0.78, x: 50, y: 94, rotation: 0 },
} satisfies Record<CaseInsertMarkLayerKind, ProjectCaseInsertLayout>

export function getCaseInsertTemplateMarkDefaultLayout(
  paneId: CaseInsertTemplatePaneId,
  kind: CaseInsertMarkLayerKind,
): ProjectCaseInsertLayout {
  return paneId === 'tray'
    ? CASE_INSERT_TRAY_MARK_LAYOUTS[kind]
    : CASE_INSERT_COVER_MARK_LAYOUTS[kind]
}

export function getJewelCaseSpineMarkDefaultLayout(
  kind: CaseInsertMarkLayerKind,
): ProjectCaseInsertLayout {
  return CASE_INSERT_SPINE_MARK_LAYOUTS[kind]
}
