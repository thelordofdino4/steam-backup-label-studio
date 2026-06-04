import type { SavedProject } from './projectTypes'

export const CURRENT_PROJECT_SCHEMA_VERSION = '0.1.0' as const

export type CurrentProjectSchemaVersion = typeof CURRENT_PROJECT_SCHEMA_VERSION

export function parseSavedProjectContents(contents: string): SavedProject {
  return JSON.parse(contents) as SavedProject
}
