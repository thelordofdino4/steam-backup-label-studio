import { getDiscTextContent, isCurvedCopyrightDiscTextLayout, updateDiscTextMode,
  type DiscTextKey, type DiscTextHtmlSources, type DiscTextLayoutSettings, type DiscTextSettings,
  type SteamLogoPlacement } from '../discText/index.ts'
import { planSteamImportedDiscTextValues, resolveDiscTextMetadataState,
  type DiscTextMetadataState } from '../discText/metadataStateTransitions.ts'
import { areDiscTextRenderableContentsMeasurementEquivalent, getDiscTextRenderableContent } from '../discText/renderableContent.ts'
import type { DiscTextStyleSettings } from '../discText/styles.ts'
import { DISC_GUIDED_COMPLETION_SLOT_IDS as slots, isDiscGuidedPlatformMarksOwnerSatisfied,
  isDiscGuidedRatingBadgeOwnerSatisfied, isDiscGuidedTextOwnerSatisfied,
  isDiscGuidedTitleArtworkOwnerSatisfied } from '../guidedPresets/discGuidedCompletion.ts'
import { clampProjectRatingBadgeToSafeZone, clampStraightDiscTextLayoutToSafeZone } from '../layout/discElementSafeZone.ts'
import type { DiscSteamImportAfterState } from '../lifecycle/discSteamOperation.ts'
import { preserveDiscPlatformMarkPlacements, preserveDiscPointOwnerPlacement } from '../presets/discPresetOwnerPlacement.ts'
import type { ActiveDiscPresetState } from '../presets/discPresetTargetedApplication.ts'
import type { ProjectMetadata, ProjectPlatformMarks, ProjectRatingBadge, ProjectTitleArtwork } from '../project/projectTypes.ts'
import type { DiscTemplate } from '../types/template.ts'
import type { SteamImportMetadataPlan } from './appSteamImportPlan.ts'
import { shouldApplySteamPlatformMarksEligibilityChange, type PreparedSteamDiscVisualImport } from './appSteamDiscVisualImport.ts'
import { applyActiveDiscPresetToTitleArtworkState, applyActiveDiscPresetToRatingBadgeState,
  isActiveDiscPresetPointFitImpossible } from './appActiveDiscPresetPointOwners.ts'
import { applyActiveDiscPresetToPlatformMarkState, isActiveDiscPresetPlatformFitImpossible } from './appActiveDiscPresetPlatformMarks.ts'
import { applyActiveDiscPresetToLegalTextState, isActiveDiscPresetLegalFitImpossible } from './appActiveDiscPresetLegalText.ts'
import { applyActiveDiscPresetToTitleTextState, isActiveDiscPresetTitleFitImpossible } from './appActiveDiscPresetTitleText.ts'
import { getNextActiveDiscPresetStateForTargetedApplication } from '../hooks/useActiveDiscPreset.ts'

type RenderedOwners = DiscTextMetadataState & Readonly<{
  metadata: ProjectMetadata
  titleArtwork: ProjectTitleArtwork
  ratingBadge: ProjectRatingBadge
  platformMarks: ProjectPlatformMarks
  discTextLayout: DiscTextLayoutSettings
  discTextSettings: DiscTextSettings
  discTextHtmlSources: DiscTextHtmlSources
  discTextStyles: DiscTextStyleSettings
}>

const placementKeys = ['title', 'appId', 'developer', 'publisher', 'copyright'] as const
type ResolvedPresetUpdate = Parameters<typeof getNextActiveDiscPresetStateForTargetedApplication>[0]['application']

/** Project the existing import policies without touching editor refs. The
 * result is a closed operation input, not a second editable project. */
export function planDiscSteamDocumentImport(
  prepared: PreparedSteamDiscVisualImport,
  metadataPlan: SteamImportMetadataPlan,
  current: RenderedOwners,
  selectedDiscTemplate: DiscTemplate,
  steamLogoPlacement: SteamLogoPlacement,
  activePresetState: ActiveDiscPresetState | null,
) {
  const metadata = prepared.nextProjectMetadata
  let presetState = activePresetState
  const record = (application: ResolvedPresetUpdate) => {
    presetState = getNextActiveDiscPresetStateForTargetedApplication({ currentPresetState: presetState, application })
  }
  let titleArtwork = prepared.titleArtwork.titleArtwork
  if (prepared.titleArtwork.placementRefitRequired) {
    const fitted = applyActiveDiscPresetToTitleArtworkState({ presetState, selectedDiscTemplate, titleArtwork })
    record(fitted.application)
    titleArtwork = isActiveDiscPresetPointFitImpossible(fitted.application, 'game-title.artwork')
      ? { ...titleArtwork, layout: preserveDiscPointOwnerPlacement(titleArtwork.layout, current.titleArtwork.layout) }
      : fitted.titleArtwork
  }
  let platformMarks: ProjectPlatformMarks | undefined
  if (shouldApplySteamPlatformMarksEligibilityChange(prepared.platform.status)) {
    const fit = applyActiveDiscPresetToPlatformMarkState({
      presetState, selectedDiscTemplate, platformMarks: prepared.platform.platformMarks,
    })
    record(fit.application)
    platformMarks = isActiveDiscPresetPlatformFitImpossible(fit.application)
      ? preserveDiscPlatformMarkPlacements(prepared.platform.platformMarks, current.platformMarks, selectedDiscTemplate)
      : fit.platformMarks
  }

  const copyrightEnabled = metadataPlan.autoLegalCandidate ? true
    : metadataPlan.shouldResetGameScopedLegal ? false : current.discTextSettings.copyright
  const text = planSteamImportedDiscTextValues(prepared.importedGame.appId, metadata, current,
    prepared.useMetadataCopyright || !!metadataPlan.autoLegalCandidate)
  const previousText = resolveDiscTextMetadataState(current.metadata, current)
  const resolveContent = (resolution: typeof text, key: DiscTextKey) =>
    getDiscTextRenderableContent({ key, htmlSources: current.discTextHtmlSources,
      fallbackText: getDiscTextContent(key, resolution.metadataBoundDiscTextValues, resolution.resolvedDiscTextTitle) })
  const textPlacement = metadataPlan.autoLegalCandidate
    ? updateDiscTextMode(current.discTextLayout, 'copyright', 'curved', steamLogoPlacement, selectedDiscTemplate)
    : current.discTextLayout
  const layout: NonNullable<NonNullable<DiscSteamImportAfterState['text']>['layout']> = Object.fromEntries(
    placementKeys.flatMap(key => {
      if (text.discTextValueSources[key] === 'manual') return []
      const content = resolveContent(text, key)
      const original = textPlacement[key]
      const clamped = isCurvedCopyrightDiscTextLayout(key, original) ? original
        : clampStraightDiscTextLayoutToSafeZone(key, original, selectedDiscTemplate, content.plainText,
          undefined, current.discTextStyles)
      const changed = !areDiscTextRenderableContentsMeasurementEquivalent(resolveContent(previousText, key), content)
      const input = { content, layout: clamped, style: current.discTextStyles[key], template: selectedDiscTemplate }
      if (key === 'title' && changed) {
        const fit = applyActiveDiscPresetToTitleTextState({ presetState, selectedDiscTemplate,
          titleText: { ...input, key, enabled: current.discTextSettings.title } })
        record(fit.application)
        return [[key, isActiveDiscPresetTitleFitImpossible(fit.application) ? original : fit.titleText.layout]]
      }
      if (key === 'copyright' && (changed || !!metadataPlan.autoLegalCandidate || metadataPlan.shouldResetGameScopedLegal)) {
        const fit = applyActiveDiscPresetToLegalTextState({ presetState, selectedDiscTemplate,
          legalText: { ...input, key, enabled: copyrightEnabled } })
        record(fit.application)
        return [[key, isActiveDiscPresetLegalFitImpossible(fit.application) ? original : fit.legalText.layout]]
      }
      return [[key, clamped]]
    }),
  )
  let badge: ProjectRatingBadge | undefined
  if (metadataPlan.autoRatingCandidate || metadataPlan.shouldResetGameScopedRating) {
    const enabled = !!metadataPlan.autoRatingCandidate &&
      metadataPlan.autoRatingCandidate.applyKind !== 'none' && metadata.ratingSystem !== 'none'
    badge = clampProjectRatingBadgeToSafeZone({
      ...current.ratingBadge, layout: { ...current.ratingBadge.layout, enabled },
    }, selectedDiscTemplate, enabled ? metadata : current.metadata)
    if (enabled) {
      const fit = applyActiveDiscPresetToRatingBadgeState({ presetState, selectedDiscTemplate, ratingBadge: badge, metadata })
      record(fit.application)
      badge = isActiveDiscPresetPointFitImpossible(fit.application, 'rating.primary')
        ? { ...badge, layout: preserveDiscPointOwnerPlacement(badge.layout, current.ratingBadge.layout) }
        : fit.ratingBadge
    }
  }

  const guidedText = { metadata, discText: {
    settings: { ...current.discTextSettings, copyright: copyrightEnabled },
    values: text.discTextValues, valueSources: text.discTextValueSources,
    titleValue: current.discTextTitleValue, htmlSources: current.discTextHtmlSources,
  } }
  const completed: NonNullable<DiscSteamImportAfterState['completedGuidedSlots']>[number][] = []
  if (isDiscGuidedTitleArtworkOwnerSatisfied(titleArtwork) || isDiscGuidedTextOwnerSatisfied(guidedText, 'title')) completed.push(slots.gameTitle)
  if (platformMarks && isDiscGuidedPlatformMarksOwnerSatisfied(platformMarks)) completed.push(slots.operatingSystemMarks)
  if (metadataPlan.autoLegalCandidate && isDiscGuidedTextOwnerSatisfied(guidedText, 'copyright')) completed.push(slots.legalText)
  if (badge && isDiscGuidedRatingBadgeOwnerSatisfied(metadata, badge)) completed.push(slots.ratingBadge)
  const { title, steamAppId, developer, publisher, releaseDate, copyrightText, ratingSystem, ratingValue } = metadata
  const after: DiscSteamImportAfterState = {
    title: prepared.importedGame.title,
    game: { manualTitle: prepared.importedGame.title, selectedSteamGame: prepared.importedGame },
    metadata: { title, steamAppId, developer, publisher, releaseDate, copyrightText, ratingSystem, ratingValue },
    titleArtwork,
    ...(platformMarks && { platformMarks }),
    ...(badge && { ratingLayout: badge.layout, uskRatingLayout: badge.uskBadge.layout }),
    text: {
      ...(current.discTextValueSources.appId !== 'manual' && { appId: text.discTextValues.appId }),
      ...(prepared.useMetadataCopyright && { copyright: text.discTextValues.copyright }),
      ...(prepared.useMetadataCopyright || metadataPlan.autoLegalCandidate
        ? { copyrightSource: text.discTextValueSources.copyright } : {}),
      copyrightEnabled, layout,
    },
    completedGuidedSlots: completed,
  }
  return { after, presetState, titleArtwork, platformMarks, badge, text, layout, copyrightEnabled }
}
