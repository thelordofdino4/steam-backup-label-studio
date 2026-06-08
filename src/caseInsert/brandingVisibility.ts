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
import {
  normalizeUskRatingValue,
} from '../project/projectMetadata.ts'
import type {
  ProjectCaseInsertImageSlot,
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

  if (sourceId.startsWith('case-rating:USK:') && sourceId.endsWith(':supplemental')) {
    const ratingValue = brandingSources.projectRatingBadge.uskBadge.ratingValue

    return brandingSources.projectMetadata.ratingSystem === 'PEGI' &&
      brandingSources.projectRatingBadge.uskBadge.layout.enabled &&
      Boolean(normalizeUskRatingValue(ratingValue)) &&
      sourceId === `case-rating:USK:${ratingValue}:supplemental`
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
) {
  const value = getSourceIdPart(sourceId, 'case-platform:')

  if (!value || value === 'manual') {
    return true
  }

  return true
}

function isTechnicalSourceCurrent(
  sourceId: string | null | undefined,
) {
  const value = getSourceIdPart(sourceId, 'case-technical:')

  if (!value || value === 'manual') {
    return true
  }

  return true
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

  if (!slot.enabled) {
    return false
  }

  if (getCaseInsertMarkLayerKind(sourceId) !== kind) {
    return false
  }

  switch (kind) {
    case 'rating':
      return isRatingSourceCurrent(sourceId, brandingSources)
    case 'media':
      return isMediaSourceCurrent(sourceId, brandingSources)
    case 'platform':
      return isPlatformSourceCurrent(sourceId)
    case 'technical':
      return isTechnicalSourceCurrent(sourceId)
  }
}
