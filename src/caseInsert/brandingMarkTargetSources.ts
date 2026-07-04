import {
  updateMediaMarkLayoutField,
} from '../project/projectMediaMark.ts'
import {
  getProjectPlatformMarkAsset,
} from '../project/projectPlatformMarks.ts'
import {
  getProjectTechnicalMarkAsset,
} from '../project/projectTechnicalMarks.ts'
import type {
  PlatformMarkValue,
  ProjectPlatformMarks,
  ProjectTechnicalMarks,
  TechnicalMarkValue,
} from '../project/projectTypes.ts'
import type { DiscTemplate } from '../types/template.ts'
import {
  getCaseInsertBrandingMarkKindEnabledForTarget,
  type CaseInsertBrandingMarkTargetState,
} from './brandingMarkSlots.ts'
import type {
  CaseInsertBrandingSourceCatalog,
} from './brandingSlotSources.ts'

type TechnicalSlotParts = {
  value: TechnicalMarkValue
  assetId: string
}

// Matrix preserved from the sync hook:
// case-rating:* and case-media:* toggle their shared layouts per target.
// case-platform:<value>:* maps a target slot back to one enabled platform asset.
// case-technical:<value>[:assetId] maps primary/additional technical assets.
function getTechnicalSlotParts(
  sourceId: string | null | undefined,
): TechnicalSlotParts | null {
  if (!sourceId?.startsWith('case-technical:')) {
    return null
  }

  const [, value, assetId = 'primary'] = sourceId.split(':')

  return value
    ? {
        value: value as TechnicalMarkValue,
        assetId: assetId || 'primary',
      }
    : null
}

export function getCaseInsertTargetRatingBadge(
  targetState: CaseInsertBrandingMarkTargetState,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  const enabled = getCaseInsertBrandingMarkKindEnabledForTarget(
    targetState,
    'rating',
    brandingSources,
  )

  return {
    ...brandingSources.projectRatingBadge,
    layout: {
      ...brandingSources.projectRatingBadge.layout,
      enabled,
    },
  }
}

export function getCaseInsertTargetMediaMark(
  targetState: CaseInsertBrandingMarkTargetState,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  const enabled = getCaseInsertBrandingMarkKindEnabledForTarget(
    targetState,
    'media',
    brandingSources,
  )

  return updateMediaMarkLayoutField(
    brandingSources.projectMediaMark,
    'enabled',
    enabled,
  )
}

export function getCaseInsertTargetPlatformMarks(
  targetState: CaseInsertBrandingMarkTargetState,
  brandingSources: CaseInsertBrandingSourceCatalog,
  selectedDiscTemplate: DiscTemplate,
): ProjectPlatformMarks {
  const values = Array.from(new Set(
    targetState.markSlots.flatMap((slot) => {
      const sourceId = slot.imageSource?.sourceId

      if (!sourceId?.startsWith('case-platform:')) {
        return []
      }

      const value = sourceId.split(':')[1] as PlatformMarkValue | undefined
      return value ? [value] : []
    }),
  ))
  const assets = { ...brandingSources.projectPlatformMarks.assets }

  values.forEach((value) => {
    const asset = getProjectPlatformMarkAsset(
      brandingSources.projectPlatformMarks,
      value,
      selectedDiscTemplate,
    )
    const enabled = targetState.markSlots.some((slot) => (
      slot.enabled &&
      slot.imageSource?.sourceId?.startsWith(`case-platform:${value}:`)
    ))

    assets[value] = {
      ...asset,
      layout: {
        ...asset.layout,
        enabled,
      },
    }
  })

  return {
    ...brandingSources.projectPlatformMarks,
    values,
    assets,
  }
}

export function getCaseInsertTargetPlatformMarkSyncRequest(
  projectPlatformMarks: ProjectPlatformMarks,
  sharedProjectPlatformMarks: ProjectPlatformMarks,
  value: PlatformMarkValue,
  enabled: boolean,
) {
  return {
    projectPlatformMarks,
    value,
    sourcePrefix: `case-platform:${value}:`,
    enabled,
    shouldEnableSharedValue:
      enabled && !sharedProjectPlatformMarks.values.includes(value),
  }
}

export function getCaseInsertTargetTechnicalMarkToggleSyncRequest(
  projectTechnicalMarks: ProjectTechnicalMarks,
  sharedProjectTechnicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  enabled: boolean,
) {
  return {
    projectTechnicalMarks,
    value,
    sourcePrefix: `case-technical:${value}`,
    enabled,
    shouldEnableSharedValue:
      enabled && !sharedProjectTechnicalMarks.values.includes(value),
    shouldSyncSharedLayout: false,
    assetId: null,
  }
}

export function getCaseInsertTargetTechnicalMarkLayoutSyncRequest(
  projectTechnicalMarks: ProjectTechnicalMarks,
  sharedProjectTechnicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  enabled: boolean,
  assetId?: string | null,
) {
  return {
    projectTechnicalMarks,
    value,
    sourcePrefix: assetId
      ? `case-technical:${value}:${assetId}`
      : `case-technical:${value}:primary`,
    enabled,
    shouldEnableSharedValue:
      !assetId && enabled && !sharedProjectTechnicalMarks.values.includes(value),
    shouldSyncSharedLayout: Boolean(assetId),
    assetId: assetId ?? null,
  }
}

export function getCaseInsertTargetTechnicalMarks(
  targetState: CaseInsertBrandingMarkTargetState,
  brandingSources: CaseInsertBrandingSourceCatalog,
  selectedDiscTemplate: DiscTemplate,
): ProjectTechnicalMarks {
  const values = Array.from(new Set(
    targetState.markSlots.flatMap((slot) => {
      const parts = getTechnicalSlotParts(slot.imageSource?.sourceId)

      return parts?.value ? [parts.value] : []
    }),
  ))
  const assets = { ...brandingSources.projectTechnicalMarks.assets }
  const additionalAssets = {
    ...brandingSources.projectTechnicalMarks.additionalAssets,
  }

  values.forEach((value) => {
    const asset = getProjectTechnicalMarkAsset(
      brandingSources.projectTechnicalMarks,
      value,
      selectedDiscTemplate,
    )
    const enabled = targetState.markSlots.some((slot) => (
      slot.enabled &&
      (
        slot.imageSource?.sourceId === `case-technical:${value}` ||
        slot.imageSource?.sourceId === `case-technical:${value}:primary`
      )
    ))
    const sharedAdditionalAssets =
      brandingSources.projectTechnicalMarks.additionalAssets?.[value] ?? []

    assets[value] = {
      ...asset,
      layout: {
        ...asset.layout,
        enabled,
      },
    }
    additionalAssets[value] = sharedAdditionalAssets.map((additionalAsset) => ({
      ...additionalAsset,
      layout: {
        ...additionalAsset.layout,
        enabled: targetState.markSlots.some((slot) => (
          slot.enabled &&
          slot.imageSource?.sourceId ===
            `case-technical:${value}:${additionalAsset.id ?? 'primary'}`
        )),
      },
    }))
  })

  return {
    ...brandingSources.projectTechnicalMarks,
    values,
    assets,
    additionalAssets,
  }
}

export function getCaseInsertTargetBrandingSources(
  targetState: CaseInsertBrandingMarkTargetState,
  brandingSources: CaseInsertBrandingSourceCatalog,
  selectedDiscTemplate: DiscTemplate,
): CaseInsertBrandingSourceCatalog {
  return {
    ...brandingSources,
    projectRatingBadge: getCaseInsertTargetRatingBadge(
      targetState,
      brandingSources,
    ),
    projectMediaMark: getCaseInsertTargetMediaMark(
      targetState,
      brandingSources,
    ),
    projectPlatformMarks: getCaseInsertTargetPlatformMarks(
      targetState,
      brandingSources,
      selectedDiscTemplate,
    ),
    projectTechnicalMarks: getCaseInsertTargetTechnicalMarks(
      targetState,
      brandingSources,
      selectedDiscTemplate,
    ),
  }
}

export function getTechnicalMarksAfterCaseInsertTargetUpload(
  targetProjectTechnicalMarks: ProjectTechnicalMarks,
  uploadedProjectTechnicalMarks: ProjectTechnicalMarks | null | void,
  selectedDiscTemplate: DiscTemplate,
  value: TechnicalMarkValue,
  assetId?: string | null,
): ProjectTechnicalMarks {
  if (!uploadedProjectTechnicalMarks) {
    return targetProjectTechnicalMarks
  }

  const uploadedAsset = getProjectTechnicalMarkAsset(
    uploadedProjectTechnicalMarks,
    value,
    selectedDiscTemplate,
    assetId,
  )

  if (assetId) {
    const additionalAssets =
      targetProjectTechnicalMarks.additionalAssets?.[value] ?? []
    const nextAdditionalAssets = additionalAssets.some((asset) =>
      asset.id === assetId)
      ? additionalAssets.map((asset) =>
          asset.id === assetId ? uploadedAsset : asset)
      : [...additionalAssets, uploadedAsset]

    return {
      ...targetProjectTechnicalMarks,
      values: Array.from(new Set([
        ...targetProjectTechnicalMarks.values,
        value,
      ])),
      additionalAssets: {
        ...targetProjectTechnicalMarks.additionalAssets,
        [value]: nextAdditionalAssets,
      },
    }
  }

  return {
    ...targetProjectTechnicalMarks,
    values: Array.from(new Set([
      ...targetProjectTechnicalMarks.values,
      value,
    ])),
    assets: {
      ...targetProjectTechnicalMarks.assets,
      [value]: uploadedAsset,
    },
  }
}
