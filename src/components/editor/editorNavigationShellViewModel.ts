import {
  CASE_INSERT_NAVIGATION_SURFACES,
  getEditorNavigationShellRoleSections,
  type CaseInsertNavigationSurfaceId,
  type EditorNavigationShellRoleSectionId,
  type EditorNavigationRoleSurfaceId,
} from '../../editor/editorNavigationShell.ts'

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
): readonly CaseInsertNavigationSurfaceTabItem[] {
  return CASE_INSERT_NAVIGATION_SURFACES.map((surface) => ({
    id: surface.id,
    label: surface.label,
    active: surface.id === activeSurfaceId,
    smokeId: getCaseInsertNavigationSurfaceTabSmokeId(surface.id),
  }))
}

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
