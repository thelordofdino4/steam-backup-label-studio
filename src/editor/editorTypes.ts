export type EditorProjectType = 'disc' | 'caseInsert'

export type EditorWorkspace = 'home' | EditorProjectType

export type DiscTemplateType = 'discLabel'

// #127: Jewel case is a case insert template, not a disc editor template.
export type SupportedCaseInsertTemplateType = 'jewelCase'

export type UnavailableCaseInsertTemplateType = 'dvdAmaray' | 'bluRay'

export type CaseInsertTemplateType =
  | SupportedCaseInsertTemplateType
  | UnavailableCaseInsertTemplateType

export const DEFAULT_CASE_INSERT_TEMPLATE_TYPE: SupportedCaseInsertTemplateType =
  'jewelCase'

export const UNAVAILABLE_CASE_INSERT_TEMPLATE_TYPES: readonly UnavailableCaseInsertTemplateType[] = [
  'dvdAmaray',
  'bluRay',
]
