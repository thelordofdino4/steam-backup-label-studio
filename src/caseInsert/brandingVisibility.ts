import {
  getCaseInsertMarkLayerKind,
  type CaseInsertBrandingSourceCatalog,
  type CaseInsertMarkLayerKind,
} from './brandingSlotSources.ts'
import {
  getEnabledPlatformMarkValues,
} from '../project/projectPlatformMarks.ts'
import {
  getEnabledTechnicalMarkValues,
} from '../project/projectTechnicalMarks.ts'
import type {
  PlatformMarkValue,
  ProjectCaseInsertImageSlot,
  TechnicalMarkValue,
} from '../project/projectTypes.ts'

function getSourceIdPart(
  sourceId: string | null | undefined,
  prefix: string,
) {
  if (!sourceId?.startsWith(prefix)) {
    return null
  }

  return sourceId.slice(prefix.length).split(':')[0] ?? null
}

function isRatingSourceCurrent(
  sourceId: string | null | undefined,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  if (!sourceId?.startsWith('case-rating:')) {
    return true
  }

  if (sourceId.startsWith('case-rating:manual:')) {
    return true
  }

  const ratingValue = brandingSources.projectMetadata.ratingValue.trim() ||
    'default'

  return sourceId === `case-rating:${
    brandingSources.projectMetadata.ratingSystem
  }:${ratingValue}`
}

function isMediaSourceCurrent(
  sourceId: string | null | undefined,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  const value = getSourceIdPart(sourceId, 'case-media:')

  if (!value || value === 'manual') {
    return true
  }

  return value === brandingSources.projectMediaMark.value
}

function isPlatformSourceCurrent(
  sourceId: string | null | undefined,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  const value = getSourceIdPart(sourceId, 'case-platform:')

  if (!value || value === 'manual') {
    return true
  }

  return getEnabledPlatformMarkValues(
    brandingSources.projectPlatformMarks,
  ).includes(value as PlatformMarkValue)
}

function isTechnicalSourceCurrent(
  sourceId: string | null | undefined,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  const value = getSourceIdPart(sourceId, 'case-technical:')

  if (!value || value === 'manual') {
    return true
  }

  return getEnabledTechnicalMarkValues(
    brandingSources.projectTechnicalMarks,
  ).includes(value as TechnicalMarkValue)
}

export function isCaseInsertMarkKindEnabled(
  kind: CaseInsertMarkLayerKind,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  switch (kind) {
    case 'rating':
      return brandingSources.projectRatingBadge.layout.enabled &&
        brandingSources.projectMetadata.ratingSystem !== 'none'
    case 'media':
      return brandingSources.projectMediaMark.layout.enabled
    case 'platform':
      return getEnabledPlatformMarkValues(
        brandingSources.projectPlatformMarks,
      ).length > 0
    case 'technical':
      return getEnabledTechnicalMarkValues(
        brandingSources.projectTechnicalMarks,
      ).length > 0
  }
}

export function isCaseInsertMarkSlotVisible(
  slot: ProjectCaseInsertImageSlot,
  kind: CaseInsertMarkLayerKind,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  const sourceId = slot.imageSource?.sourceId

  if (getCaseInsertMarkLayerKind(sourceId) !== kind) {
    return false
  }

  if (!isCaseInsertMarkKindEnabled(kind, brandingSources)) {
    return false
  }

  switch (kind) {
    case 'rating':
      return isRatingSourceCurrent(sourceId, brandingSources)
    case 'media':
      return isMediaSourceCurrent(sourceId, brandingSources)
    case 'platform':
      return isPlatformSourceCurrent(sourceId, brandingSources)
    case 'technical':
      return isTechnicalSourceCurrent(sourceId, brandingSources)
  }
}
