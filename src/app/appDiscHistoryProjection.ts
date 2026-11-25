import { readDiscBackgroundAsset } from '../image/discBackgroundAsset.ts'
import type { DiscTemplate } from '../types/template.ts'
import type { DiscLegacyProjectProjection } from '../project/createProjectSnapshot.ts'
import {
  reconstructActiveDiscPresetState, type RegisteredDiscPresetApplicationState,
} from './appRegisteredDiscPresetApplication.ts'
import type { ActiveDiscPresetState } from '../presets/discPresetTargetedApplication.ts'
import type { ApplicationLifecycleCompositionRoot } from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import { isCommittedDiscProject, normalizedProjectValueMatches, type DeepReadonly } from '../lifecycle/canonicalProject.ts'
import type { DiscProjectSession } from '../lifecycle/projectSession.ts'
import { DISC_TEXT_KEYS } from '../discText/constants.ts'
import type { DiscTextLayout, DiscTextLayoutSettings, DiscTextSettings } from '../discText/types.ts'
import { createSavedDiscGuidedLayout, restoreSavedDiscGuidedWorkflow } from '../project/projectGuidedWorkflow.ts'
import type { DiscGuidedWorkflowState } from '../guidedPresets/discGuidedWorkflow.ts'
import type {
  BackgroundImageSize, ProjectAdditionalLogoAsset, ProjectLogoAssets, ProjectLogoAssetsInput,
  ProjectMediaMark, ProjectPlatformMarks, ProjectRatingBadge, ProjectTechnicalMarkAsset,
  ProjectTechnicalMarks, ProjectTechnicalMarksInput, ProjectTitleArtwork,
} from '../project/projectTypes.ts'

type DiscHistoryProjection = Readonly<{
  /** Background already renders directly from the accepted lifecycle snapshot. */
  ratingBadge?: ProjectRatingBadge
  mediaMark?: ProjectMediaMark
  platformMarks?: ProjectPlatformMarks
  titleArtwork?: ProjectTitleArtwork
  logoAssets?: ProjectLogoAssets
  technicalMarks?: ProjectTechnicalMarks
  guidedWorkflow?: DiscGuidedWorkflowState
  discTextSettings?: DiscTextSettings
  discTextLayout?: DiscTextLayoutSettings
}>

/**
 * Bridge only the Disc edits whose editor projection is known to be lossless.
 * This is deliberately not file restoration: it has no layout normalization,
 * defaults, workspace changes, or selection clearing. Run before committing a
 * history step so an unsupported delta cannot strand the editor mid-restore.
 */
export function prepareDiscHistoryProjection(
  current: DiscProjectSession,
  target: DiscProjectSession['project'],
): DiscHistoryProjection | null {
  const keys = new Set([...Object.keys(current.project), ...Object.keys(target)])
  const plan: { -readonly [Key in keyof DiscHistoryProjection]: DiscHistoryProjection[Key] } = {}
  for (const key of keys) {
    // The committed background is consumed directly, including its owned asset.
    if (key === 'background') continue
    const before = Reflect.get(current.project, key)
    const after = Reflect.get(target, key)
    if (before === after || normalizedProjectValueMatches(before, after)) continue
    switch (key) {
      case 'ratingBadge': {
        const badge = target.ratingBadge
        if (!badge?.layout || !badge.uskBadge?.layout) return null
        plan.ratingBadge = {
          ...badge,
          layout: { ...badge.layout },
          uskBadge: { ...badge.uskBadge, layout: { ...badge.uskBadge.layout } },
          customImageSize: cloneImageSize(badge.customImageSize),
        }
        break
      }
      case 'mediaMark': {
        const mark = target.mediaMark
        if (!mark?.layout) return null
        plan.mediaMark = {
          ...mark, layout: { ...mark.layout }, customImageSize: cloneImageSize(mark.customImageSize),
        }
        break
      }
      case 'platformMarks': {
        const marks = target.platformMarks
        if (!marks || !Array.isArray(marks.values) || !marks.assets ||
            (marks.inference && !Array.isArray(marks.inference.values))) return null
        const entries = Object.entries(marks.assets)
        if (entries.some(([, mark]) => !mark?.layout)) return null
        const assets = Object.fromEntries(entries.map(([id, mark]) =>
          [id, {
            ...mark,
            layout: { ...mark.layout },
            customImageSize: cloneImageSize(mark.customImageSize),
          }]))
        const { inference, ...rest } = marks
        plan.platformMarks = {
          ...rest,
          values: [...marks.values],
          assets,
          ...(inference && { inference: { ...inference, values: [...inference.values] } }),
        }
        break
      }
      case 'titleArtwork': {
        const art = target.titleArtwork
        if (!isCompleteTitleArtwork(art)) return null
        // The remembered Steam logo is persisted independently of active custom artwork.
        plan.titleArtwork = {
          ...art,
          layout: { ...art.layout },
          imageSize: cloneImageSize(art.imageSize),
          defaultSteamLogo: art.defaultSteamLogo && {
            ...art.defaultSteamLogo,
            imageSize: cloneImageSize(art.defaultSteamLogo.imageSize),
          },
        }
        break
      }
      case 'logoAssets': {
        // Clone only the affected aggregate, never the document or its background.
        const assets = target.logoAssets
        if (!isCompleteLogoAssets(assets)) return null
        plan.logoAssets = structuredClone(assets)
        break
      }
      case 'technicalMarks': {
        const marks = target.technicalMarks
        if (!isCompleteTechnicalMarks(marks)) return null
        plan.technicalMarks = structuredClone(marks)
        break
      }
      case 'editor': {
        // An exact round trip is required; file migration may silently normalize
        // invalid identities/slot lists, which is not what Undo means.
        const workflow = restoreSavedDiscGuidedWorkflow(target.editor)
        const saved = createSavedDiscGuidedLayout(workflow)
        if (!normalizedProjectValueMatches(target.editor, saved ? { guidedLayout: saved } : undefined)) return null
        plan.guidedWorkflow = workflow
        break
      }
      case 'discText': {
        const previous = current.project.discText
        const next = target.discText
        if (!previous || !next) return null
        const { layout: previousLayout, settings: previousSettings, ...previousText } = previous
        const { layout, settings, ...nextText } = next
        // Presets may write layout/settings, not the text, styles, or sources.
        if (!normalizedProjectValueMatches(previousText, nextText)) return null
        if (!normalizedProjectValueMatches(previousLayout, layout)) {
          if (!layout) return null
          const nextLayout = { ...layout }
          for (const key of DISC_TEXT_KEYS) {
            const item = layout[key]
            if (!isCompleteTextLayout(item)) return null
            nextLayout[key] = { ...item }
          }
          plan.discTextLayout = nextLayout as DiscTextLayoutSettings
        }
        if (!normalizedProjectValueMatches(previousSettings, settings)) {
          if (!settings) return null
          const nextSettings = { ...settings }
          for (const key of DISC_TEXT_KEYS) {
            const item = settings[key]
            if (typeof item !== 'boolean') return null
            nextSettings[key] = item
          }
          plan.discTextSettings = nextSettings as DiscTextSettings
        }
        break
      }
      default:
        return null
    }
  }
  return Object.freeze(plan)
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isImageSize(value: unknown): value is BackgroundImageSize | null {
  return value === null || (typeof value === 'object' &&
    Number.isFinite(Reflect.get(value, 'width')) && Number.isFinite(Reflect.get(value, 'height')))
}

function isPositioned(layout: { x: number; y: number; scale: number; enabled: boolean } | undefined) {
  return !!layout && typeof layout.enabled === 'boolean' &&
    [layout.x, layout.y, layout.scale].every(Number.isFinite)
}

function isCompleteAdditionalLogo(asset: Partial<ProjectAdditionalLogoAsset> | undefined): asset is ProjectAdditionalLogoAsset {
  return !!asset && typeof asset.id === 'string' && typeof asset.label === 'string' &&
    isNullableString(asset.imageDataUrl) && isImageSize(asset.imageSize) && isPositioned(asset.layout)
}

function isCompleteLogoAssets(assets: DeepReadonly<ProjectLogoAssetsInput> | undefined): assets is ProjectLogoAssets {
  return !!assets &&
    isNullableString(assets.developerLogoDataUrl) && isNullableString(assets.publisherLogoDataUrl) &&
    assets.developerLogoSource !== undefined && assets.publisherLogoSource !== undefined &&
    isImageSize(assets.developerLogoSize) && isImageSize(assets.publisherLogoSize) &&
    isPositioned(assets.developerLogoLayout) && isPositioned(assets.publisherLogoLayout) &&
    Array.isArray(assets.additionalDeveloperLogos) && assets.additionalDeveloperLogos.every(isCompleteAdditionalLogo) &&
    Array.isArray(assets.additionalPublisherLogos) && assets.additionalPublisherLogos.every(isCompleteAdditionalLogo)
}

function isCompleteTechnicalAsset(asset: Partial<ProjectTechnicalMarkAsset> | undefined): asset is ProjectTechnicalMarkAsset {
  return !!asset && typeof asset.label === 'string' && (asset.source === 'custom' || asset.source === 'placeholder') &&
    isNullableString(asset.customImageDataUrl) && isImageSize(asset.customImageSize) && isPositioned(asset.layout)
}

function isCompleteTechnicalMarks(marks: DeepReadonly<ProjectTechnicalMarksInput> | undefined): marks is ProjectTechnicalMarks {
  return !!marks && Array.isArray(marks.values) && !!marks.assets &&
    Object.values(marks.assets).every(isCompleteTechnicalAsset) &&
    (marks.additionalAssets === undefined || (!!marks.additionalAssets &&
      Object.values(marks.additionalAssets).every(entries => Array.isArray(entries) && entries.every(isCompleteTechnicalAsset))))
}

function isCompleteTitleArtwork(art: DiscProjectSession['project']['titleArtwork']): art is ProjectTitleArtwork {
  return !!art?.layout && (art.source === 'steam' || art.source === 'custom') &&
    typeof art.sourceLabel === 'string' &&
    (typeof art.steamArtworkAssetId === 'string' || art.steamArtworkAssetId === null) &&
    (typeof art.imageDataUrl === 'string' || art.imageDataUrl === null) &&
    (typeof art.imageSize === 'object') &&
    (art.defaultSteamLogo === null || !!art.defaultSteamLogo?.imageSize)
}

function isCompleteTextLayout(layout: Partial<DiscTextLayout> | undefined): layout is DiscTextLayout {
  return !!layout && [layout.x, layout.y, layout.width, layout.scale, layout.fontSizePt, layout.arcDegrees]
    .every(Number.isFinite) &&
    (layout.align === 'left' || layout.align === 'center' || layout.align === 'right') &&
    (layout.mode === 'straight' || layout.mode === 'curved') &&
    (layout.arcSide === 'top' || layout.arcSide === 'bottom') &&
    typeof layout.avoidVisualElements === 'boolean'
}

function cloneImageSize(size: BackgroundImageSize): BackgroundImageSize
function cloneImageSize(size: BackgroundImageSize | null): BackgroundImageSize | null
function cloneImageSize(size: BackgroundImageSize | null): BackgroundImageSize | null {
  return size && {
    ...size,
    ...(size.contentBounds && { contentBounds: { ...size.contentBounds } }),
    ...(size.contentShape && { contentShape: { ...size.contentShape } }),
  }
}

/** Rebuild the fitted Guided attachment from accepted owner values, not Open.
 * Unchanged needed owners may come from the mounted editor only if its captured
 * projection still matches the source revision. A blank destination clears the
 * attachment; missing exact registry resolution rejects the step in preflight. */
export function prepareDiscHistoryGuidedAttachment({
  workflow, current, target, plan, renderProjection, rendered, template,
}: Readonly<{
  workflow: DiscGuidedWorkflowState
  current: DiscProjectSession['project']
  target: DiscProjectSession['project']
  plan: DiscHistoryProjection
  renderProjection: DiscLegacyProjectProjection
  rendered: Omit<RegisteredDiscPresetApplicationState, 'background'>
  template: DiscTemplate
}>): Readonly<{ workflow: DiscGuidedWorkflowState; attachment: ActiveDiscPresetState | null }> | null {
  if (!workflow.activeLayout) return Object.freeze({ workflow, attachment: null })
  const verifiedRenderKeys = [
    'template', 'titleArtwork', 'discText', 'logoAssets', 'ratingBadge', 'mediaMark', 'platformMarks', 'metadata',
  ] as const
  if (!verifiedRenderKeys.every(key => normalizedProjectValueMatches(renderProjection[key], current[key]))) return null
  const attachment = reconstructActiveDiscPresetState({
    workflow, selectedDiscTemplate: template,
    currentState: {
      ...rendered,
      titleArtwork: plan.titleArtwork ?? rendered.titleArtwork,
      ratingBadge: plan.ratingBadge ?? rendered.ratingBadge,
      mediaMark: plan.mediaMark ?? rendered.mediaMark,
      platformMarks: plan.platformMarks ?? rendered.platformMarks,
      logoAssets: plan.logoAssets ?? rendered.logoAssets,
      discTextSettings: plan.discTextSettings ?? rendered.discTextSettings,
      discTextLayout: plan.discTextLayout ?? rendered.discTextLayout,
      background: {
        enabled: target.background.enabled ?? true,
        imageDataUrl: readDiscBackgroundAsset(target.background.asset),
        imageSource: target.background.imageSource ?? null,
        imageSize: target.background.imageSize ?? null,
        scale: target.background.scale,
        offset: target.background.offset,
      },
    },
  })
  return attachment ? Object.freeze({ workflow, attachment }) : null
}

/** Stages a lossless mirror before the exact-generation transition, then writes
 * it only if a synchronous lifecycle subscriber has not replaced the session.
 * A later committed editor render still has to acknowledge the pending fence. */
export function stepProjectedDiscHistory(
  root: ApplicationLifecycleCompositionRoot,
  direction: 'undo' | 'redo',
  editor: Readonly<{
    batch(apply: () => void): void
    setRatingBadge(value: ProjectRatingBadge): void
    setMediaMark(value: ProjectMediaMark): void
    setPlatformMarks(value: ProjectPlatformMarks): void
    setTitleArtwork(value: ProjectTitleArtwork): void
    setLogoAssets(value: ProjectLogoAssets): void
    setTechnicalMarks(value: ProjectTechnicalMarks): void
    /** Prepare both persisted slots and their runtime attachment from target. */
    prepareGuidedAttachment?(
      workflow: DiscGuidedWorkflowState, target: DiscProjectSession['project'],
      plan: DiscHistoryProjection, current: DiscProjectSession['project'],
    ): (() => void) | null
    setDiscTextSettings(value: DiscTextSettings): void
    setDiscTextLayout(value: DiscTextLayoutSettings): void
  }>,
): ReturnType<ApplicationLifecycleCompositionRoot['stepDiscDocumentHistory']> {
  const basis = root.getStateSnapshot()
  const current = basis.state.activeSession
  const history = basis.discHistory
  if (current?.kind !== 'disc' || !history || !root.canCommitDiscBackground()) return 'unavailable'
  const target = direction === 'undo' ? history.past.at(-1) : history.future[0]
  if (!target) return 'no-op'
  if (history.sessionId !== current.id || history.current !== current.project ||
      !isCommittedDiscProject(target)) return 'stale'
  const plan = prepareDiscHistoryProjection(current, target)
  if (!plan) return 'unavailable'
  const applyGuided = plan.guidedWorkflow ? editor.prepareGuidedAttachment?.(plan.guidedWorkflow, target, plan, current.project) : undefined
  if (plan.guidedWorkflow && !applyGuided) return 'unavailable'
  let result: ReturnType<ApplicationLifecycleCompositionRoot['stepDiscDocumentHistory']> | undefined
  editor.batch(() => {
    result = root.stepDiscDocumentHistory({ sessionId: current.id, expectedGeneration: basis.generation, direction })
    if (result !== 'committed') return
    const accepted = root.getStateSnapshot()
    const session = accepted.state.activeSession
    if (session?.kind !== 'disc' || session.id !== current.id ||
        session.revision !== current.revision + 1 || session.project !== target ||
        !accepted.discHistoryProjectionPending) return
    if (plan.ratingBadge) editor.setRatingBadge(plan.ratingBadge)
    if (plan.mediaMark) editor.setMediaMark(plan.mediaMark)
    if (plan.platformMarks) editor.setPlatformMarks(plan.platformMarks)
    if (plan.titleArtwork) editor.setTitleArtwork(plan.titleArtwork)
    if (plan.logoAssets) editor.setLogoAssets(plan.logoAssets)
    if (plan.technicalMarks) editor.setTechnicalMarks(plan.technicalMarks)
    if (plan.discTextSettings) editor.setDiscTextSettings(plan.discTextSettings)
    if (plan.discTextLayout) editor.setDiscTextLayout(plan.discTextLayout)
    applyGuided?.()
  })
  if (!result) throw new Error('The history editor batch must run synchronously.')
  return result
}
