import {
  CASE_INSERT_NAVIGATION_SURFACES,
  getEditorNavigationShellRoleSections,
  type CaseInsertNavigationSurfaceId,
  type EditorNavigationShellRoleSectionId,
  type EditorNavigationRoleSurfaceId,
} from '../../editor/editorNavigationShell.ts'
import type { DiscRolePresetRole } from '../../layout/discRolePresets.ts'

export const EDITOR_NAVIGATION_SHELL_SMOKE_IDS = {
  caseInsertSurfaceTabs: 'case-insert-surface-tabs',
} as const

export type CaseInsertNavigationSurfaceTabItem = {
  id: CaseInsertNavigationSurfaceId
  label: string
  active: boolean
  smokeId: string
}

export type EditorNavigationShellRoleSectionItem = {
  id: EditorNavigationShellRoleSectionId
  label: string
  smokeId: string
}

export type DiscEditorNavigationRoleSectionItem = Omit<
  EditorNavigationShellRoleSectionItem,
  'id'
> & {
  id: DiscRolePresetRole
}

const DEFAULT_CASE_INSERT_NAVIGATION_SURFACE_IDS: readonly CaseInsertNavigationSurfaceId[] =
  CASE_INSERT_NAVIGATION_SURFACES.map(({ id }) => id)

export function getCaseInsertNavigationSurfaceTabSmokeId(
  surfaceId: CaseInsertNavigationSurfaceId,
) {
  return `case-insert-surface-tab-${surfaceId}`
}

export function getEditorNavigationShellRoleSectionSmokeId(
  surfaceId: EditorNavigationRoleSurfaceId,
  sectionId: EditorNavigationShellRoleSectionId,
) {
  return `editor-role-section-${surfaceId}-${sectionId}`
}

export function getCaseInsertNavigationSurfaceTabItems(
  activeSurfaceId: CaseInsertNavigationSurfaceId,
  supportedSurfaceIds: readonly CaseInsertNavigationSurfaceId[] =
    DEFAULT_CASE_INSERT_NAVIGATION_SURFACE_IDS,
): readonly CaseInsertNavigationSurfaceTabItem[] {
  const supportedSurfaceIdSet = new Set(supportedSurfaceIds)

  return CASE_INSERT_NAVIGATION_SURFACES.filter((surface) =>
    supportedSurfaceIdSet.has(surface.id),
  ).map((surface) => ({
    id: surface.id,
    label: surface.label,
    active: surface.id === activeSurfaceId,
    smokeId: getCaseInsertNavigationSurfaceTabSmokeId(surface.id),
  }))
}

export function getEditorNavigationShellRoleSectionItems(
  activeSurfaceId: 'disc-label',
): readonly DiscEditorNavigationRoleSectionItem[]
export function getEditorNavigationShellRoleSectionItems(
  activeSurfaceId: EditorNavigationRoleSurfaceId,
): readonly EditorNavigationShellRoleSectionItem[]
export function getEditorNavigationShellRoleSectionItems(
  activeSurfaceId: EditorNavigationRoleSurfaceId,
): readonly EditorNavigationShellRoleSectionItem[] {
  return getEditorNavigationShellRoleSections(activeSurfaceId).map(
    (section) => ({
      id: section.id,
      label: section.label,
      smokeId: getEditorNavigationShellRoleSectionSmokeId(
        activeSurfaceId,
        section.id,
      ),
    }),
  )
}
