import type { CaseInsertMarkLayerKind } from './brandingSlotSources.ts'

export type CaseInsertMarkBrandingSection = {
  title: string
  emptyHint: string
  addLabel: string
  markKind: CaseInsertMarkLayerKind
  sourceSectionIds: readonly string[]
}

export const CASE_INSERT_MARK_BRANDING_SECTIONS:
CaseInsertMarkBrandingSection[] = [
  {
    title: 'Rating badge',
    emptyHint: 'No rating badges.',
    addLabel: 'Add rating badge',
    markKind: 'rating',
    sourceSectionIds: ['rating'],
  },
  {
    title: 'Media format mark',
    emptyHint: 'No media format marks.',
    addLabel: 'Add media format mark',
    markKind: 'media',
    sourceSectionIds: ['media'],
  },
  {
    title: 'Operating system marks',
    emptyHint: 'No operating system marks.',
    addLabel: 'Add operating system mark',
    markKind: 'platform',
    sourceSectionIds: ['platform'],
  },
  {
    title: 'Technical marks',
    emptyHint: 'No technical marks.',
    addLabel: 'Add technical mark',
    markKind: 'technical',
    sourceSectionIds: ['technical'],
  },
]
