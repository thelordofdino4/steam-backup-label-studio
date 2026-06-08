import type { CaseInsertMarkLayerKind } from './brandingSlotSources.ts'

export type CaseInsertMarkBrandingSection = {
  title: string
  markKind: CaseInsertMarkLayerKind
}

export const CASE_INSERT_MARK_BRANDING_SECTIONS:
CaseInsertMarkBrandingSection[] = [
  {
    title: 'Rating badge',
    markKind: 'rating',
  },
  {
    title: 'Media format mark',
    markKind: 'media',
  },
  {
    title: 'Operating system marks',
    markKind: 'platform',
  },
  {
    title: 'Technical marks',
    markKind: 'technical',
  },
]
