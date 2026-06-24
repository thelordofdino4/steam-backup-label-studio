import {
  DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
  UNAVAILABLE_CASE_INSERT_TEMPLATE_TYPES,
  type CaseInsertTemplateType,
  type EditorProjectType,
} from '../editor/editorTypes.ts'
import { parseSavedProjectContents } from './projectSchema.ts'

export type SavedProjectRoute = {
  projectType: EditorProjectType
  workspace: EditorProjectType
}

type JsonRecord = Record<string, unknown>

const CASE_INSERT_TEMPLATE_TYPES: readonly CaseInsertTemplateType[] = [
  DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
  ...UNAVAILABLE_CASE_INSERT_TEMPLATE_TYPES,
]

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null
}

function normalizeEditorProjectType(value: unknown): EditorProjectType | null {
  return value === 'disc' || value === 'caseInsert' ? value : null
}

function isCaseInsertTemplateType(value: unknown): value is CaseInsertTemplateType {
  return (
    typeof value === 'string' &&
    CASE_INSERT_TEMPLATE_TYPES.includes(value as CaseInsertTemplateType)
  )
}

function resolveTemplateProjectType(template: unknown): EditorProjectType | null {
  const templateRecord = asRecord(template)

  if (!templateRecord) {
    return null
  }

  const templateType = templateRecord.type

  if (templateType === 'disc') {
    return 'disc'
  }

  if (templateType === 'caseInsert' || isCaseInsertTemplateType(templateType)) {
    return 'caseInsert'
  }

  return null
}

export function resolveSavedProjectType(project: unknown): EditorProjectType {
  const projectRecord = asRecord(project)

  if (!projectRecord) {
    return 'disc'
  }

  const editorRecord = asRecord(projectRecord.editor)

  return (
    normalizeEditorProjectType(projectRecord.projectType) ??
    normalizeEditorProjectType(editorRecord?.projectType) ??
    normalizeEditorProjectType(editorRecord?.workspace) ??
    resolveTemplateProjectType(projectRecord.template) ??
    'disc'
  )
}

export function resolveSavedProjectRoute(project: unknown): SavedProjectRoute {
  const projectType = resolveSavedProjectType(project)

  return {
    projectType,
    workspace: projectType,
  }
}

export function resolveSavedProjectRouteFromContents(
  contents: string,
): SavedProjectRoute {
  return resolveSavedProjectRoute(parseSavedProjectContents(contents))
}
