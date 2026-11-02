import type { SavedProject } from '../project/projectTypes.ts'
import {
  locateProjectPackageCaptures,
  type ProjectPackageCapturePlanV1,
} from './projectPackageCapturePlan.ts'

/**
 * Operation-local transport projection, not a package or an editor model.
 * Only the existing closed registry may omit a leaf. The original snapshot and
 * every non-asset value remain unchanged; Rust still validates all assets.
 */
export function createProjectPackageWriteProjection(
  project: SavedProject,
  plan: ProjectPackageCapturePlanV1,
) {
  const located = locateProjectPackageCaptures(project)
  if (plan.version !== 1 || plan.captures.length !== located.length) {
    throw new Error('The capture plan does not match the project snapshot.')
  }
  const supplied = new Map(plan.captures.map((capture) => [capture.ownerId, capture]))
  if (supplied.size !== located.length) {
    throw new Error('The capture plan contains duplicate owners.')
  }
  const omitted = new Set<string>()
  const indices = new Map<string, number>()
  const dataUrls: string[] = []
  const captures = located.map(({ capture, container, key, path }) => {
    if (JSON.stringify(supplied.get(capture.ownerId)?.decision) !==
      JSON.stringify(capture.decision)) {
      throw new Error('The capture decision does not match the project snapshot.')
    }
    const decision = capture.decision
    if (container && (decision.kind === 'project-owned-data-url' ||
      decision.kind === 'qualified-built-in')) {
      omitted.add(path)
    }
    if (decision.kind !== 'project-owned-data-url') return capture
    const value = (container as Record<string, unknown>)[key] as string
    let dataUrlIndex = indices.get(value)
    if (dataUrlIndex === undefined) {
      dataUrlIndex = dataUrls.length
      indices.set(value, dataUrlIndex)
      dataUrls.push(value)
    }
    return {
      ownerId: capture.ownerId,
      decision: { kind: 'project-owned-data-url-part' as const, dataUrlIndex },
    }
  })
  const ancestors: Array<{ value: object; path: string }> = []
  let root = true
  const projectJson = JSON.stringify(project, function (this: object, key, value) {
    if (root) {
      root = false
      ancestors.push({ value, path: '' })
      return value
    }
    while (ancestors.length && ancestors[ancestors.length - 1].value !== this) {
      ancestors.pop()
    }
    const path = `${ancestors[ancestors.length - 1]?.path ?? ''}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`
    if (omitted.has(path)) return null
    if (value !== null && typeof value === 'object') ancestors.push({ value, path })
    return value
  })
  return { projectJson, plan: { version: 2, captures }, dataUrls }
}
