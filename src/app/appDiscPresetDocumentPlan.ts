import type { DiscTemplate } from '../types/template'
import {
  clampMediaMarkLayoutToSafeZone,
  clampProjectLogoAssetsToSafeZone,
  clampProjectPlatformMarksToSafeZone,
  clampProjectRatingBadgeToSafeZone,
  clampProjectTechnicalMarksToSafeZone,
  clampProjectTitleArtworkToSafeZone,
} from '../layout/discElementSafeZone.ts'
import {
  applyDiscRolePresetToOwners,
  type DiscRolePresetBackgroundRestoreState,
  type DiscRolePresetOwnerApplicationResult,
  type DiscRolePresetCurrentState,
} from './appDiscRolePresetApplication.ts'

export type DiscPresetDocumentPlanInput = Readonly<{
  presetId: string
  currentState: DiscRolePresetCurrentState
  selectedDiscTemplate: DiscTemplate
  clampDiscTextLayout(
    layout: DiscRolePresetCurrentState['discTextLayout'],
    template: DiscTemplate,
  ): DiscRolePresetCurrentState['discTextLayout']
}>

export type DiscPresetDocumentPlan = Readonly<{
  result: DiscRolePresetOwnerApplicationResult
  owners: DiscRolePresetCurrentState
  background: DiscRolePresetBackgroundRestoreState | null
}>

/** Collect exactly what the existing owner adapter would write, without touching
 * React or the document. Publish the resulting footprint only after acceptance. */
export function planDiscPresetDocument({
  presetId,
  currentState,
  selectedDiscTemplate,
  clampDiscTextLayout,
}: DiscPresetDocumentPlanInput): DiscPresetDocumentPlan {
  const owners = { ...currentState }
  let background: DiscRolePresetBackgroundRestoreState | null = null
  const result = applyDiscRolePresetToOwners({
    presetId,
    currentState,
    selectedDiscTemplate,
    actions: {
      restoreBackgroundImageState(next) {
        background = next
        owners.background = {
          enabled: next.isBackgroundArtworkEnabled,
          scale: next.backgroundScale,
          offset: next.backgroundOffset,
          imageDataUrl: next.backgroundImageUrl,
          imageSource: next.backgroundImageSource,
          imageSize: next.backgroundImageSize,
        }
      },
      setProjectTitleArtwork(value) { owners.titleArtwork = value },
      clampProjectTitleArtworkToTemplate(template) {
        owners.titleArtwork = clampProjectTitleArtworkToSafeZone(owners.titleArtwork, template)
      },
      restoreDiscTextState(value) { Object.assign(owners, value) },
      setDiscTextLayout(value) { owners.discTextLayout = value },
      clampDiscTextLayoutToTemplate(template) {
        owners.discTextLayout = clampDiscTextLayout(owners.discTextLayout, template)
      },
      setProjectLogoAssets(value) { owners.logoAssets = value },
      clampProjectLogoAssetsToTemplate(template) {
        owners.logoAssets = clampProjectLogoAssetsToSafeZone(owners.logoAssets, template)
      },
      setProjectRatingBadge(value) { owners.ratingBadge = value },
      clampProjectRatingBadgeToTemplate(template) {
        owners.ratingBadge = clampProjectRatingBadgeToSafeZone(owners.ratingBadge, template, currentState.metadata)
      },
      setProjectMediaMark(value) { owners.mediaMark = value },
      clampProjectMediaMarkToTemplate(template) {
        const mark = owners.mediaMark
        const layout = clampMediaMarkLayoutToSafeZone(mark, template)
        if (layout.x !== mark.layout.x || layout.y !== mark.layout.y) owners.mediaMark = { ...mark, layout }
      },
      setProjectPlatformMarks(value) { owners.platformMarks = value },
      clampProjectPlatformMarksToTemplate(template) {
        owners.platformMarks = clampProjectPlatformMarksToSafeZone(owners.platformMarks, template)
      },
      setProjectTechnicalMarks(value) { owners.technicalMarks = value },
      clampProjectTechnicalMarksToTemplate(template) {
        owners.technicalMarks = clampProjectTechnicalMarksToSafeZone(owners.technicalMarks, template)
      },
    },
  })

  return { result, owners, background }
}
