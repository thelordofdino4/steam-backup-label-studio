import type { SavedProject } from './projectTypes'

export function normalizeParsedProject(parsedProject: string): SavedProject {
  return JSON.parse(parsedProject) as SavedProject
}
