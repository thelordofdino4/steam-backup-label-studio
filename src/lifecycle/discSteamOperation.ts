import type { DiscTextLayout } from '../discText/types.ts'
import { DISC_GUIDED_COMPLETION_SLOT_IDS } from '../guidedPresets/discGuidedCompletion.ts'
import { completeDiscGuidedSlot } from '../guidedPresets/discGuidedWorkflow.ts'
import { createSavedDiscGuidedLayout, restoreSavedDiscGuidedWorkflow } from '../project/projectGuidedWorkflow.ts'
import type { DiscTextValueSources } from '../project/metadataDiscText.ts'
import type { ProjectMetadata, RatingBadgeLayout, SavedDiscProject } from '../project/projectTypes.ts'
import { normalizedProjectValueMatches } from './canonicalProject.ts'
import { readClosedDataFootprint } from './closedDocumentFootprint.ts'
import { replaceActiveDiscRemainder, type ApplicationLifecycleState } from './projectSession.ts'

const steamMetadataKeys = ['title', 'steamAppId', 'developer', 'publisher', 'releaseDate',
  'copyrightText', 'ratingSystem', 'ratingValue'] as const
const steamTextLayoutKeys = ['title', 'appId', 'developer', 'publisher', 'copyright'] as const
const steamGuidedSlots = [DISC_GUIDED_COMPLETION_SLOT_IDS.gameTitle,
  DISC_GUIDED_COMPLETION_SLOT_IDS.operatingSystemMarks, DISC_GUIDED_COMPLETION_SLOT_IDS.legalText,
  DISC_GUIDED_COMPLETION_SLOT_IDS.ratingBadge] as const

type MetadataKey = typeof steamMetadataKeys[number]
type TextLayoutKey = typeof steamTextLayoutKeys[number]
type SteamGuidedSlot = typeof steamGuidedSlots[number]

/** Existing settings/placement policies provide after-state, not arbitrary
 * document replacements. Background, unrelated text/metadata, rating source,
 * editor route, Case, and persisted schema are outside this boundary.
 */
export type DiscSteamImportAfterState = Readonly<{
  title: string
  game: Readonly<{ manualTitle: string; selectedSteamGame: NonNullable<SavedDiscProject['game']['selectedSteamGame']> }>
  metadata: Readonly<Partial<Pick<ProjectMetadata, MetadataKey>>>
  titleArtwork?: NonNullable<SavedDiscProject['titleArtwork']>
  ratingLayout?: Readonly<RatingBadgeLayout>
  uskRatingLayout?: Readonly<RatingBadgeLayout>
  platformMarks?: NonNullable<SavedDiscProject['platformMarks']>
  text?: Readonly<{
    appId?: string
    copyright?: string
    copyrightSource?: DiscTextValueSources['copyright']
    copyrightEnabled?: boolean
    layout?: Readonly<Partial<Record<TextLayoutKey, Readonly<DiscTextLayout>>>>
  }>
  completedGuidedSlots?: readonly SteamGuidedSlot[]
}>

const keys = (...fields: string[]) => new Set(fields)
const editKeys = keys('sessionId', 'expectedRevision', 'after')
const afterKeys = keys('title', 'game', 'metadata', 'titleArtwork', 'ratingLayout', 'uskRatingLayout',
  'platformMarks', 'text', 'completedGuidedSlots')
const metadataKeys = keys(...steamMetadataKeys)
const gameKeys = keys('manualTitle', 'selectedSteamGame')
const selectedGameKeys = keys('appId', 'title', 'developer', 'publisher', 'releaseDate', 'shortDescription',
  'detailedDescription', 'genres', 'categories', 'minimumRequirements', 'recommendedRequirements',
  'legalNotice', 'ratings', 'platforms', 'website', 'storeUrl', 'artwork')
const ratingSystems = keys('none', 'ESRB', 'PEGI', 'USK', 'custom')
const titleKeys = keys('source', 'steamArtworkAssetId', 'sourceLabel', 'imageDataUrl', 'imageSize',
  'defaultSteamLogo', 'layout')
const badgeLayoutKeys = keys('enabled', 'x', 'y', 'scale')
const titleDefaultKeys = keys('steamArtworkAssetId', 'sourceLabel', 'imageDataUrl', 'imageSize')
const platformInferenceKeys = keys('source', 'status', 'steamAppId', 'values', 'message')
const platformKeys = keys('values', 'assets', 'inference')
const platformAssetKeys = keys('pc', 'windows', 'linux', 'steamDeck', 'macos')
const platformAssetFields = keys('source', 'theme', 'customImageDataUrl', 'customImageSize', 'layout')
const discLayoutFields = keys('x', 'y', 'width', 'scale', 'fontSizePt', 'align', 'mode',
  'arcDegrees', 'arcSide', 'avoidVisualElements')
const textKeys = keys('appId', 'copyright', 'copyrightSource', 'copyrightEnabled', 'layout')
const textLayoutKeys = keys(...steamTextLayoutKeys)
const guidedSlotKeys = keys(...steamGuidedSlots)

function knownStringArray(value: unknown, allowed: ReadonlySet<string>): string[] | null {
  if (!Array.isArray(value)) return null
  const descriptors = Object.getOwnPropertyDescriptors<object>(value)
  const length = descriptors.length.value
  if (!Number.isSafeInteger(length) || length > allowed.size ||
      Reflect.ownKeys(descriptors).length !== length + 1) return null
  const result: string[] = []
  for (let i = 0; i < length; i++) {
    const item = descriptors[i]
    if (!item || !item.enumerable || !('value' in item) || typeof item.value !== 'string' ||
        !allowed.has(item.value) || result.includes(item.value)) return null
    result.push(item.value)
  }
  return result
}

function validLayout(record: Record<string, unknown>, kind: 'text' | 'badge'): boolean {
  return Object.entries(record).every(([key, value]) => {
    if (key === 'enabled' || key === 'avoidVisualElements') return typeof value === 'boolean'
    if (key === 'mode') return value === 'straight' || value === 'curved'
    if (key === 'align') return value === 'left' || value === 'center' || value === 'right'
    if (key === 'arcSide') return value === 'top' || value === 'bottom'
    return typeof value === 'number' && Number.isFinite(value) &&
      (kind === 'badge' ? key !== 'scale' || value > 0 :
        !['scale', 'width', 'fontSizePt'].includes(key) || value > 0)
  })
}

/** Prepare against the exact state read by the lifecycle CAS. No UI effects,
 * no hidden render mirror admission, and no write or cast of a saved schema.
 */
export function prepareDiscSteamImport(
  state: ApplicationLifecycleState,
  input: unknown,
): Readonly<{ status: 'invalid' | 'stale' | 'unavailable' }> |
   Readonly<{ status: 'prepared'; state: ApplicationLifecycleState }> {
  const session = state.activeSession
  if (session?.kind !== 'disc' || state.visibleWorkspace !== 'disc') return { status: 'unavailable' }
  const edit = readClosedDataFootprint(input, editKeys)
  if (!edit || typeof edit.sessionId !== 'string' || typeof edit.expectedRevision !== 'number' ||
      !Number.isSafeInteger(edit.expectedRevision)) return { status: 'invalid' }
  if (edit.sessionId !== session.id || edit.expectedRevision !== session.revision) return { status: 'stale' }
  const after = readClosedDataFootprint(edit.after, afterKeys)
  if (!after || typeof after.title !== 'string') return { status: 'invalid' }
  const game = readClosedDataFootprint(after.game, gameKeys)
  const metadata = readClosedDataFootprint(after.metadata, metadataKeys)
  if (!game || game.manualTitle !== after.title || !metadata ||
      !game.selectedSteamGame || typeof game.selectedSteamGame !== 'object') return { status: 'invalid' }
  const selected = readClosedDataFootprint(game.selectedSteamGame, selectedGameKeys, selectedGameKeys)
  if (!selected || selected.title !== after.title || typeof selected.appId !== 'number' ||
      !Number.isSafeInteger(selected.appId) || selected.appId < 1 ||
      (metadata.title !== undefined && metadata.title !== after.title) ||
      (metadata.steamAppId !== undefined && metadata.steamAppId !== String(selected.appId)) ||
      Object.entries(metadata).some(([key, value]) => typeof value !== 'string' ||
        (key === 'ratingSystem' && !ratingSystems.has(value)))) return { status: 'invalid' }
  game.selectedSteamGame = selected

  const remainder = Object.fromEntries(Object.entries(session.project).filter(([key]) => key !== 'background'))
  const updated: Record<string, unknown> = {
    ...remainder, title: after.title, game, metadata: { ...session.project.metadata, ...metadata },
  }
  if (after.titleArtwork !== undefined) {
    const value = readClosedDataFootprint(after.titleArtwork, titleKeys)
    if (!value || (value.source !== undefined && value.source !== 'steam' && value.source !== 'custom'))
      return { status: 'invalid' }
    if (value.layout !== undefined) {
      const layout = readClosedDataFootprint(value.layout, badgeLayoutKeys)
      if (!layout || !validLayout(layout, 'badge')) return { status: 'invalid' }
      value.layout = { ...session.project.titleArtwork?.layout, ...layout }
    }
    if (value.defaultSteamLogo !== undefined && value.defaultSteamLogo !== null) {
      const logo = readClosedDataFootprint(value.defaultSteamLogo, titleDefaultKeys)
      if (!logo) return { status: 'invalid' }
      value.defaultSteamLogo = logo
    }
    updated.titleArtwork = { ...session.project.titleArtwork, ...value }
  }
  if (after.platformMarks !== undefined) {
    const value = readClosedDataFootprint(after.platformMarks, platformKeys)
    if (!value) return { status: 'invalid' }
    if (value.values !== undefined) {
      const values = knownStringArray(value.values, platformAssetKeys)
      if (!values) return { status: 'invalid' }
      value.values = values
    }
    if (value.inference !== undefined) {
      const inference = readClosedDataFootprint(value.inference, platformInferenceKeys)
      const values = knownStringArray(inference?.values, platformAssetKeys)
      if (!inference || !values || typeof inference.message !== 'string') return { status: 'invalid' }
      value.inference = { ...inference, values }
    }
    if (value.assets !== undefined) {
      const assets = readClosedDataFootprint(value.assets, platformAssetKeys)
      if (!assets) return { status: 'invalid' }
      const previous = session.project.platformMarks?.assets
      const bounds: Record<string, unknown> = { ...previous }
      for (const [platform, candidate] of Object.entries(assets)) {
        const asset = readClosedDataFootprint(candidate, platformAssetFields)
        const layout = readClosedDataFootprint(asset?.layout, badgeLayoutKeys)
        if (!asset || !layout || !validLayout(layout, 'badge')) return { status: 'invalid' }
        const original = previous?.[platform as keyof NonNullable<typeof previous>]
        const content = Object.fromEntries(Object.entries(asset).filter(([key]) => key !== 'layout'))
        if (original) {
          const source = Object.fromEntries(Object.entries(original).filter(([key]) => key !== 'layout'))
          if (!normalizedProjectValueMatches(content, source)) return { status: 'invalid' }
          bounds[platform] = { ...original, layout: { ...original.layout, ...layout } }
        } else {
          if (content.source !== 'placeholder' || content.customImageDataUrl !== null ||
              content.customImageSize !== null) return { status: 'invalid' }
          bounds[platform] = { ...content, layout }
        }
      }
      value.assets = bounds
    }
    updated.platformMarks = { ...session.project.platformMarks, ...value }
  }
  if (after.ratingLayout !== undefined || after.uskRatingLayout !== undefined) {
    const rating = session.project.ratingBadge
    if (!rating) return { status: 'invalid' } // hydrated runtime owner required
    const primary = after.ratingLayout === undefined ? {} : readClosedDataFootprint(after.ratingLayout, badgeLayoutKeys)
    const usk = after.uskRatingLayout === undefined ? {} : readClosedDataFootprint(after.uskRatingLayout, badgeLayoutKeys)
    if (!primary || !usk || !validLayout(primary, 'badge') || !validLayout(usk, 'badge')) return { status: 'invalid' }
    updated.ratingBadge = {
      ...rating, layout: { ...rating.layout, ...primary },
      uskBadge: { ...rating.uskBadge, layout: { ...rating.uskBadge.layout, ...usk } },
    }
  }
  if (after.text !== undefined) {
    const value = readClosedDataFootprint(after.text, textKeys)
    if (!value) return { status: 'invalid' }
    const previous = session.project.discText
    const text = { ...previous,
      values: { ...previous?.values },
      valueSources: { ...previous?.valueSources },
      settings: { ...previous?.settings },
    }
    if (value.appId !== undefined) {
      if (value.appId !== String(selected.appId) || previous?.valueSources?.appId === 'manual')
        return { status: 'invalid' }
      text.values.appId = value.appId
    }
    if (typeof value.copyright === 'string') text.values.copyright = value.copyright
    else if (value.copyright !== undefined) return { status: 'invalid' }
    if (value.copyrightSource === 'metadata' || value.copyrightSource === 'manual') {
      text.valueSources.copyright = value.copyrightSource
    } else if (value.copyrightSource !== undefined) return { status: 'invalid' }
    if (typeof value.copyrightEnabled === 'boolean') text.settings.copyright = value.copyrightEnabled
    else if (value.copyrightEnabled !== undefined) return { status: 'invalid' }
    if (value.layout !== undefined) {
      const layout = readClosedDataFootprint(value.layout, textLayoutKeys)
      if (!layout) return { status: 'invalid' }
      const merged: Record<string, unknown> = { ...previous?.layout }
      for (const [key, candidate] of Object.entries(layout)) {
        const fields = readClosedDataFootprint(candidate, discLayoutFields)
        if (!fields || !validLayout(fields, 'text')) return { status: 'invalid' }
        merged[key] = { ...previous?.layout?.[key as TextLayoutKey], ...fields }
      }
      updated.discText = { ...text, layout: merged }
    } else updated.discText = text
  }
  if (after.completedGuidedSlots !== undefined) {
    const slots = knownStringArray(after.completedGuidedSlots, guidedSlotKeys)
    if (!slots) return { status: 'invalid' }
    const old = restoreSavedDiscGuidedWorkflow(session.project.editor)
    let workflow = old
    for (const slot of slots) workflow = completeDiscGuidedSlot(workflow, slot).state
    if (workflow !== old) updated.editor = {
      ...session.project.editor, guidedLayout: createSavedDiscGuidedLayout(workflow),
    }
  }
  return { status: 'prepared', state: replaceActiveDiscRemainder(state, session, updated) }
}
