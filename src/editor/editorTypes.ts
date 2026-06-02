export type EditorProjectType = 'disc' | 'caseInsert'

export type EditorWorkspace = 'home' | EditorProjectType

export type DiscTemplateType = 'discLabel'

// #127: Jewel case is a case insert template, not a disc editor template.
export type CaseInsertTemplateType = 'jewelCase'

export const DEFAULT_CASE_INSERT_TEMPLATE_TYPE: CaseInsertTemplateType =
  'jewelCase'
