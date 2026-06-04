import { parseSavedProjectContents } from './projectSchema.ts'
import type { SavedProject } from './projectTypes'

export function normalizeParsedProject(parsedProject: string): SavedProject {
  return parseSavedProjectContents(parsedProject)
}
