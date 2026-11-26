import {
  clampMediaMarkLayoutToSafeZone, clampProjectAdditionalArtworkToSafeZone,
  clampProjectLogoAssetsToSafeZone, clampProjectPlatformMarksToSafeZone,
  clampProjectRatingBadgeToSafeZone, clampProjectTechnicalMarksToSafeZone,
  clampProjectTitleArtworkToSafeZone,
} from '../layout/discElementSafeZone.ts'
import type { DiscTextLayoutSettings } from '../discText/types.ts'
import type {
  ProjectAdditionalArtwork, ProjectLogoAssets, ProjectMediaMark, ProjectMetadata, ProjectPlatformMarks,
  ProjectRatingBadge, ProjectTechnicalMarks, ProjectTitleArtwork,
} from '../project/projectTypes.ts'
import { getSelectedDiscTemplate, type DiscTemplateState } from '../templates/discTemplateStateModel.ts'
import type { DiscTemplate } from '../types/template.ts'

type Foreground = Readonly<{
  titleArtwork: ProjectTitleArtwork
  additionalArtwork: ProjectAdditionalArtwork
  logoAssets: ProjectLogoAssets
  ratingBadge: ProjectRatingBadge
  mediaMark: ProjectMediaMark
  platformMarks: ProjectPlatformMarks
  technicalMarks: ProjectTechnicalMarks
  discTextLayout: DiscTextLayoutSettings
}>

/** Apply exactly the existing owner placement policies against one template and
 * one rendered source. No setter runs during preparation. */
export function planDiscTemplateDocumentEdit(
  next: DiscTemplateState,
  state: Foreground & Readonly<{ metadata: ProjectMetadata }>,
  clampText: (layout: DiscTextLayoutSettings, template: DiscTemplate) => DiscTextLayoutSettings,
) {
  const template = getSelectedDiscTemplate(next)
  const layout = clampMediaMarkLayoutToSafeZone(state.mediaMark, template)
  return {
    template,
    fields: {
      template: { type: 'disc' as const, variant: next.selectedDiscTemplateId,
        customDimensions: next.selectedDiscTemplateId === 'custom' ? next.customDiscTemplate : null },
      titleArtwork: clampProjectTitleArtworkToSafeZone(state.titleArtwork, template),
      additionalArtwork: clampProjectAdditionalArtworkToSafeZone(state.additionalArtwork, template),
      logoAssets: clampProjectLogoAssetsToSafeZone(state.logoAssets, template),
      ratingBadge: clampProjectRatingBadgeToSafeZone(state.ratingBadge, template, state.metadata),
      mediaMark: { ...state.mediaMark, layout },
      platformMarks: clampProjectPlatformMarksToSafeZone(state.platformMarks, template),
      technicalMarks: clampProjectTechnicalMarksToSafeZone(state.technicalMarks, template),
      discTextLayout: clampText(state.discTextLayout, template),
    },
  }
}
