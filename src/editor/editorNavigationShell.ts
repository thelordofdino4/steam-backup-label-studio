import type {
  CaseInsertNavigationSurfaceId,
  CaseInsertTemplatePaneId,
} from '../caseInsert/templateSurfaces.ts'

export type {
  CaseInsertNavigationSurfaceId,
} from '../caseInsert/templateSurfaces.ts'

export type EditorNavigationWorkspaceId = 'disc-label' | 'case-insert'

export type EditorNavigationRoleSurfaceId =
  | 'disc-label'
  | CaseInsertNavigationSurfaceId

export type EditorNavigationShellRoleSectionId =
  | 'game-title'
  | 'background-artwork'
  | 'game-info-logos'
  | 'company-logos'
  | 'legal-info'
  | 'additional-artwork'
  | 'additional-text'
  | 'game-description-text'
  | 'feature-bullets-callouts'
  | 'screenshots'
  | 'system-requirements'
  | 'steam-backup-branding'
  | 'vertical-game-logo-title'
  | 'company-logo'
  | 'optional-media-format-type'
  | 'spine-background-artwork'

export type EditorNavigationShellRoleSection = {
  id: EditorNavigationShellRoleSectionId
  label: string
}

export type EditorNavigationWorkspace = {
  id: EditorNavigationWorkspaceId
  label: string
}

export type CaseInsertNavigationSurface = {
  id: CaseInsertNavigationSurfaceId
  label: string
  roleSurfaceId: EditorNavigationRoleSurfaceId
}

export type EditorNavigationRoleSurface = {
  id: EditorNavigationRoleSurfaceId
  label: string
  roleSections: readonly EditorNavigationShellRoleSection[]
}

export type CaseInsertNavigationRoute = {
  caseInsertPane: CaseInsertTemplatePaneId
  navigationSurfaceId: CaseInsertNavigationSurfaceId
  roleSurfaceId: EditorNavigationRoleSurfaceId
}

const DISC_ROLE_SECTIONS = [
  { id: 'background-artwork', label: 'Background Image' },
  { id: 'game-title', label: 'Game Title' },
  { id: 'game-info-logos', label: 'Game Info Logos' },
  { id: 'company-logos', label: 'Company Logos' },
  { id: 'legal-info', label: 'Legal Text' },
  { id: 'additional-artwork', label: 'Additional Artwork' },
  { id: 'additional-text', label: 'Additional Text' },
] as const satisfies readonly EditorNavigationShellRoleSection[]

const CASE_FRONT_ROLE_SECTIONS = [
  { id: 'background-artwork', label: 'Background Image' },
  { id: 'game-title', label: 'Game Title' },
  { id: 'game-info-logos', label: 'Game Info Logos' },
  { id: 'company-logos', label: 'Company Logos' },
  { id: 'legal-info', label: 'Legal Info' },
  { id: 'additional-artwork', label: 'Additional Artwork' },
  { id: 'additional-text', label: 'Additional Text' },
] as const satisfies readonly EditorNavigationShellRoleSection[]

const CASE_BACK_ROLE_SECTIONS = [
  { id: 'background-artwork', label: 'Background Image' },
  { id: 'game-title', label: 'Game Title' },
  { id: 'screenshots', label: 'Screenshots' },
  { id: 'game-info-logos', label: 'Game Info Logos' },
  { id: 'company-logos', label: 'Company Logos' },
  { id: 'game-description-text', label: 'Game Description Text' },
  { id: 'feature-bullets-callouts', label: 'Feature Bullets / Callouts' },
  { id: 'system-requirements', label: 'System Requirements' },
  { id: 'legal-info', label: 'Legal Info' },
  { id: 'additional-artwork', label: 'Additional Artwork' },
  { id: 'additional-text', label: 'Additional Text' },
] as const satisfies readonly EditorNavigationShellRoleSection[]

const SPINE_ROLE_SECTIONS = [
  {
    id: 'spine-background-artwork',
    label: 'Background Image',
  },
  {
    id: 'vertical-game-logo-title',
    label: 'Vertical Game Logo or Game Title',
  },
  {
    id: 'steam-backup-branding',
    label: 'Steam Logo / Steam Backup Branding',
  },
  { id: 'company-logo', label: 'Company Logo' },
  { id: 'optional-media-format-type', label: 'Optional Media Format Type' },
  { id: 'legal-info', label: 'Legal Info' },
  { id: 'additional-artwork', label: 'Additional Artwork' },
  { id: 'additional-text', label: 'Additional Text' },
] as const satisfies readonly EditorNavigationShellRoleSection[]

export const EDITOR_NAVIGATION_WORKSPACES = [
  {
    id: 'disc-label',
    label: 'Disc Label',
  },
  {
    id: 'case-insert',
    label: 'Case Insert',
  },
] as const satisfies readonly EditorNavigationWorkspace[]

export const CASE_INSERT_NAVIGATION_SURFACES = [
  {
    id: 'front',
    label: 'Front',
    roleSurfaceId: 'front',
  },
  {
    id: 'back',
    label: 'Back',
    roleSurfaceId: 'back',
  },
  {
    id: 'spine',
    label: 'Spine',
    roleSurfaceId: 'spine',
  },
] as const satisfies readonly CaseInsertNavigationSurface[]

export const EDITOR_NAVIGATION_ROLE_SURFACES = [
  {
    id: 'disc-label',
    label: 'Disc Label',
    roleSections: DISC_ROLE_SECTIONS,
  },
  {
    id: 'front',
    label: 'Front',
    roleSections: CASE_FRONT_ROLE_SECTIONS,
  },
  {
    id: 'back',
    label: 'Back',
    roleSections: CASE_BACK_ROLE_SECTIONS,
  },
  {
    id: 'spine',
    label: 'Spine',
    roleSections: SPINE_ROLE_SECTIONS,
  },
] as const satisfies readonly EditorNavigationRoleSurface[]

export function getEditorNavigationRoleSurface(
  surfaceId: EditorNavigationRoleSurfaceId,
): EditorNavigationRoleSurface {
  return EDITOR_NAVIGATION_ROLE_SURFACES.find(
    (surface) => surface.id === surfaceId,
  ) ?? EDITOR_NAVIGATION_ROLE_SURFACES[0]
}

export function getEditorNavigationShellRoleSections(
  surfaceId: EditorNavigationRoleSurfaceId,
): readonly EditorNavigationShellRoleSection[] {
  return getEditorNavigationRoleSurface(surfaceId).roleSections
}

export function getCaseInsertNavigationRoute(
  surfaceId: CaseInsertNavigationSurfaceId,
): CaseInsertNavigationRoute {
  switch (surfaceId) {
    case 'front':
      return {
        caseInsertPane: 'cover',
        navigationSurfaceId: surfaceId,
        roleSurfaceId: surfaceId,
      }
    case 'back':
      return {
        caseInsertPane: 'tray',
        navigationSurfaceId: surfaceId,
        roleSurfaceId: surfaceId,
      }
    case 'spine':
      return {
        caseInsertPane: 'tray',
        navigationSurfaceId: surfaceId,
        roleSurfaceId: surfaceId,
      }
  }
}

export function getCaseInsertNavigationSurfaceForPane(
  paneId: CaseInsertTemplatePaneId,
): CaseInsertNavigationSurfaceId {
  return paneId === 'cover' ? 'front' : 'back'
}
