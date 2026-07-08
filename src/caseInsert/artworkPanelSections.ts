import type {
  CaseInsertTemplatePaneId,
} from './templateSurfaces.ts'

export type CaseInsertArtworkSurfaceId = CaseInsertTemplatePaneId | 'spine'

export const CASE_INSERT_ARTWORK_SECTION_LABELS = {
  background: 'Background',
  gameLogo: 'Game Logo',
  additionalArtwork: 'Additional Artwork',
} as const

export type CaseInsertArtworkSectionId =
  keyof typeof CASE_INSERT_ARTWORK_SECTION_LABELS

export const CASE_INSERT_ARTWORK_SECTION_IDS = [
  'background',
  'gameLogo',
  'additionalArtwork',
] as const satisfies CaseInsertArtworkSectionId[]

export const CASE_INSERT_ARTWORK_SOURCE_PANEL_LABELS = {
  steamArtwork: 'Imported Steam artwork',
  webArtwork: 'Web artwork',
  localSteamScreenshots: 'Local Steam screenshots',
  localFile: 'Local file',
} as const

export function getCaseInsertArtworkPanelSectionLabels(
  surfaceId: CaseInsertArtworkSurfaceId,
) {
  void surfaceId

  const sectionIds = CASE_INSERT_ARTWORK_SECTION_IDS.filter((sectionId) => {
    if (sectionId === 'background') {
      return false
    }

    if (sectionId === 'additionalArtwork') {
      return false
    }

    if (sectionId === 'gameLogo') {
      return false
    }

    return true
  })

  return sectionIds.map(
    (sectionId) => CASE_INSERT_ARTWORK_SECTION_LABELS[sectionId],
  )
}
