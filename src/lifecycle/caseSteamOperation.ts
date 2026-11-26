import type { ProjectMetadata, SavedCaseInsertProject } from '../project/projectTypes.ts'
import { captureNormalizedProjectSnapshot, normalizedProjectValueMatches } from './canonicalProject.ts'
import { readClosedDataFootprint } from './closedDocumentFootprint.ts'
import { synchronizeActiveProjectContent, type ApplicationLifecycleState } from './projectSession.ts'

export type CaseSteamImport = Readonly<{
  sessionId: string
  expectedRevision: number
  proposed: SavedCaseInsertProject
}>

const editKeys = new Set(['sessionId', 'expectedRevision', 'proposed'])
const projectKeys = new Set(['schemaVersion', 'projectType', 'title', 'savedAt',
  'game', 'metadata', 'template', 'editor', 'caseInsert', 'caseInsertLayoutPreset'])
const caseKeys = new Set(['templateType', 'templates', 'spine', 'export'])
const gameKeys = new Set(['manualTitle', 'selectedSteamGame'])
const steamGameKeys = new Set(['appId', 'title', 'developer', 'publisher', 'releaseDate',
  'shortDescription', 'detailedDescription', 'genres', 'categories', 'minimumRequirements',
  'recommendedRequirements', 'legalNotice', 'ratings', 'platforms', 'website', 'storeUrl', 'artwork'])
const steamMetadata = new Set<keyof ProjectMetadata>(['title', 'steamAppId', 'developer',
  'publisher', 'releaseDate', 'copyrightText', 'ratingSystem', 'ratingValue'])

const surfaceChanges = new Set(['titleArtwork', 'markSlots'])
const trayChanges = new Set([...surfaceChanges, 'textBlocks', 'textLists'])
const spineChanges = new Set([...surfaceChanges, 'title'])
const enabledChange = new Set(['enabled'])
const templatePanes = new Set(['cover', 'tray'])
const spineSides = new Set(['mirrored', 'left', 'right'])
function preservesUnchangedOwners(candidate: unknown, original: object, changed: ReadonlySet<string>) {
  const before = Object.keys(original)
  const after = readClosedDataFootprint(candidate, new Set(before))
  return !!after && Object.keys(after).length === before.length &&
    before.every(key => changed.has(key) || normalizedProjectValueMatches(after[key], Reflect.get(original, key)))
}

/** Prepare one successor through the existing Case session boundary. The
 * proposal never supplies the authoritative preset attachment or route. */
export function prepareCaseSteamImport(
  state: ApplicationLifecycleState, input: unknown,
): Readonly<{ status: 'invalid' | 'stale' | 'unavailable' | 'no-op' }> |
   Readonly<{ status: 'prepared'; state: ApplicationLifecycleState }> {
  const session = state.activeSession
  if (session?.kind !== 'caseInsert' || state.visibleWorkspace !== 'caseInsert') return { status: 'unavailable' }
  try {
    const edit = readClosedDataFootprint(input, editKeys)
    if (!edit || typeof edit.sessionId !== 'string' || typeof edit.expectedRevision !== 'number' ||
        !Number.isSafeInteger(edit.expectedRevision)) return { status: 'invalid' }
    if (edit.sessionId !== session.id || edit.expectedRevision !== session.revision) return { status: 'stale' }
    const proposal = readClosedDataFootprint(edit.proposed, projectKeys)
    const caseInsert = readClosedDataFootprint(proposal?.caseInsert, caseKeys)
    const game = readClosedDataFootprint(proposal?.game, gameKeys)
    if (!proposal || proposal.projectType !== 'caseInsert' || typeof proposal.title !== 'string' ||
        proposal.schemaVersion !== session.project.schemaVersion || !game || game.manualTitle !== proposal.title ||
        !caseInsert || caseInsert.templateType !== session.project.caseInsert.templateType ||
        !normalizedProjectValueMatches(caseInsert.export, session.project.caseInsert.export) ||
        !normalizedProjectValueMatches(proposal.template, session.project.template)) return { status: 'invalid' }
    const previous = session.project.caseInsert
    const templates = readClosedDataFootprint(caseInsert.templates, templatePanes)
    const spine = readClosedDataFootprint(caseInsert.spine, spineSides)
    if (!templates || !spine || spine.mirrored !== previous.spine.mirrored ||
        !preservesUnchangedOwners(templates.cover, previous.templates.cover, surfaceChanges) ||
        !preservesUnchangedOwners(templates.tray, previous.templates.tray, trayChanges)) return { status: 'invalid' }
    for (const side of ['left', 'right'] as const) {
      const nextSide = spine[side]
      if (!preservesUnchangedOwners(nextSide, previous.spine[side], spineChanges) ||
          !preservesUnchangedOwners(Reflect.get(nextSide as object, 'title'), previous.spine[side].title, enabledChange))
        return { status: 'invalid' }
    }

    const selected = readClosedDataFootprint(game.selectedSteamGame, steamGameKeys, steamGameKeys)
    if (!selected || typeof selected.appId !== 'number' || !Number.isSafeInteger(selected.appId) ||
        selected.appId <= 0 || selected.title !== proposal.title)
      return { status: 'invalid' }

    const previousMetadata = session.project.metadata
    const allowedMetadata = new Set([...Object.keys(previousMetadata ?? {}), ...steamMetadata])
    const metadata = readClosedDataFootprint(proposal.metadata, allowedMetadata)
    if (!metadata || metadata.title !== proposal.title || metadata.steamAppId !== String(selected.appId) ||
        Object.values(metadata).some(value => typeof value !== 'string')) return { status: 'invalid' }
    // Existing values outside the Steam-owned metadata footprint (e.g.
    // authored edition) cannot be rewritten by this operation.
    const metadataKeys = new Set([...Object.keys(previousMetadata ?? {}), ...Object.keys(metadata)] as (keyof ProjectMetadata)[])
    for (const key of metadataKeys) {
      if (!steamMetadata.has(key) && !normalizedProjectValueMatches(previousMetadata?.[key], metadata[key]))
        return { status: 'invalid' }
    }
    const project = captureNormalizedProjectSnapshot({
      ...session.project, game: { ...game, selectedSteamGame: selected },
      title: proposal.title, metadata, caseInsert,
    } as SavedCaseInsertProject)
    const next = synchronizeActiveProjectContent(state, {
      sessionId: session.id, kind: 'caseInsert', project: project as SavedCaseInsertProject,
    })
    return next === state ? { status: 'no-op' } : { status: 'prepared', state: next }
  } catch {
    return { status: 'invalid' }
  }
}
