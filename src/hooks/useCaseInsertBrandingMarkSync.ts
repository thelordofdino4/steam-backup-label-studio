import { useEffect, useRef, type ChangeEvent, type Dispatch, type SetStateAction } from 'react'
import { clampProjectRatingBadgeToSafeZone } from '../layout/discElementSafeZone.ts'
import {
  clearRatingBadgeImage,
  updateRatingBadgeEnabledState,
  updateSupplementalUskRatingBadgeEnabledState,
  updateSupplementalUskRatingBadgeValue,
} from '../project/projectRatingBadge.ts'
import {
  clearMediaMarkImage,
  updateMediaMarkLayoutField,
  updateMediaMarkSource,
  updateMediaMarkTheme,
  updateMediaMarkValue,
} from '../project/projectMediaMark.ts'
import {
  clearPlatformMarkImage,
  getProjectPlatformMarkAsset,
  updatePlatformMarkLayoutField,
  updatePlatformMarkSource,
  updatePlatformMarkTheme,
  updatePlatformMarkToggle,
} from '../project/projectPlatformMarks.ts'
import {
  addTechnicalMarkAsset,
  getProjectTechnicalMarkAsset,
  removeTechnicalMarkAsset,
  updateTechnicalMarkLabel,
  updateTechnicalMarkLayoutField,
  updateTechnicalMarkSource,
  updateTechnicalMarkToggle,
} from '../project/projectTechnicalMarks.ts'
import type {
  MediaMarkSource,
  MediaMarkTheme,
  MediaMarkValue,
  PlatformMarkSource,
  PlatformMarkTheme,
  PlatformMarkValue,
  ProjectJewelCaseState,
  ProjectMediaMark,
  ProjectMetadata,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTechnicalMarks,
  RatingBadgeSource,
  TechnicalMarkSource,
  TechnicalMarkValue,
} from '../project/projectTypes.ts'
import type { MediaMarkLayoutField } from '../project/projectMediaMark.ts'
import type { PlatformMarkLayoutField } from '../project/projectPlatformMarks.ts'
import type { TechnicalMarkLayoutField } from '../project/projectTechnicalMarks.ts'
import type { DiscTemplate } from '../types/template.ts'
import {
  getCaseInsertBrandingMarkKindEnabledForTarget,
  setProjectJewelCaseBrandingMarkTargetKindEnabled,
  setProjectJewelCaseBrandingMarkTargetSourcePrefixEnabled,
  syncProjectJewelCaseBrandingMarkSlotsForTarget,
  syncProjectJewelCaseBrandingMarkSlots,
  type CaseInsertBrandingMarkTarget,
  type CaseInsertBrandingMarkTargetState,
} from '../caseInsert/brandingMarkSlots.ts'
import type {
  CaseInsertBrandingSourceCatalog,
} from '../caseInsert/brandingSlotSources.ts'

type UseCaseInsertBrandingMarkSyncOptions = {
  setProjectJewelCase: Dispatch<SetStateAction<ProjectJewelCaseState>>
  selectedDiscTemplate: DiscTemplate
  brandingSources: CaseInsertBrandingSourceCatalog
  handleProjectMetadataFieldsChange: (fields: Partial<ProjectMetadata>) => void
  handleRatingBadgeUpload: (
    event: ChangeEvent<HTMLInputElement>,
  ) => ProjectRatingBadge | null | void | Promise<ProjectRatingBadge | null | void>
  handleRatingBadgeSourceChange: (source: RatingBadgeSource) => void
  handleRatingBadgeEnabledChange: (enabled: boolean) => void
  handleSupplementalUskRatingBadgeEnabledChange: (enabled: boolean) => void
  handleSupplementalUskRatingBadgeValueChange: (ratingValue: string) => void
  handleClearRatingBadgeImage: () => void
  handleMediaMarkUpload: (
    event: ChangeEvent<HTMLInputElement>,
  ) => ProjectMediaMark | null | void | Promise<ProjectMediaMark | null | void>
  handleMediaMarkValueChange: (value: MediaMarkValue) => void
  handleMediaMarkSourceChange: (source: MediaMarkSource) => void
  handleMediaMarkThemeChange: (theme: MediaMarkTheme) => void
  handleMediaMarkLayoutChange: (field: MediaMarkLayoutField, value: boolean | number) => void
  handleClearMediaMarkImage: () => void
  handlePlatformMarkToggle: (value: PlatformMarkValue, enabled: boolean) => void
  handlePlatformMarkUpload: (
    value: PlatformMarkValue,
    event: ChangeEvent<HTMLInputElement>,
  ) => ProjectPlatformMarks | null | void | Promise<ProjectPlatformMarks | null | void>
  handlePlatformMarkSourceChange: (
    value: PlatformMarkValue,
    source: PlatformMarkSource,
  ) => void
  handlePlatformMarkThemeChange: (
    value: PlatformMarkValue,
    theme: PlatformMarkTheme,
  ) => void
  handlePlatformMarkLayoutChange: (
    value: PlatformMarkValue,
    field: PlatformMarkLayoutField,
    layoutValue: boolean | number,
  ) => void
  handleClearPlatformMarkImage: (value: PlatformMarkValue) => void
  handleTechnicalMarkToggle: (value: TechnicalMarkValue, enabled: boolean) => void
  handleTechnicalMarkUpload: (
    value: TechnicalMarkValue,
    event: ChangeEvent<HTMLInputElement>,
    assetId?: string | null,
  ) => ProjectTechnicalMarks | null | void | Promise<ProjectTechnicalMarks | null | void>
  handleTechnicalMarkSourceChange: (
    value: TechnicalMarkValue,
    source: TechnicalMarkSource,
    assetId?: string | null,
  ) => void
  handleTechnicalMarkLayoutChange: (
    value: TechnicalMarkValue,
    field: TechnicalMarkLayoutField,
    layoutValue: boolean | number,
    assetId?: string | null,
  ) => void
  handleTechnicalMarkLabelChange: (
    value: TechnicalMarkValue,
    label: string,
    assetId?: string | null,
  ) => void
  handleClearTechnicalMarkImage: (
    value: TechnicalMarkValue,
    assetId?: string | null,
  ) => void
  handleAddTechnicalMarkAsset: (
    value: TechnicalMarkValue,
  ) => ProjectTechnicalMarks | null | void
  handleRemoveTechnicalMarkAsset: (
    value: TechnicalMarkValue,
    assetId: string,
  ) => ProjectTechnicalMarks | null | void
}

export function useCaseInsertBrandingMarkSync({
  setProjectJewelCase,
  selectedDiscTemplate,
  brandingSources,
  handleProjectMetadataFieldsChange,
  handleRatingBadgeUpload,
  handleRatingBadgeSourceChange,
  handleRatingBadgeEnabledChange,
  handleSupplementalUskRatingBadgeEnabledChange,
  handleSupplementalUskRatingBadgeValueChange,
  handleClearRatingBadgeImage,
  handleMediaMarkUpload,
  handleMediaMarkValueChange,
  handleMediaMarkSourceChange,
  handleMediaMarkThemeChange,
  handleMediaMarkLayoutChange,
  handleClearMediaMarkImage,
  handlePlatformMarkToggle,
  handlePlatformMarkUpload,
  handlePlatformMarkSourceChange,
  handlePlatformMarkThemeChange,
  handlePlatformMarkLayoutChange,
  handleClearPlatformMarkImage,
  handleTechnicalMarkToggle,
  handleTechnicalMarkUpload,
  handleTechnicalMarkSourceChange,
  handleTechnicalMarkLayoutChange,
  handleTechnicalMarkLabelChange,
  handleClearTechnicalMarkImage,
  handleAddTechnicalMarkAsset,
  handleRemoveTechnicalMarkAsset,
}: UseCaseInsertBrandingMarkSyncOptions) {
  const brandingSourcesRef =
    useRef<CaseInsertBrandingSourceCatalog>(brandingSources)

  useEffect(() => {
    brandingSourcesRef.current = brandingSources
  }, [brandingSources])

  function syncCaseInsertBrandingMarkSlots(
    overrides: Partial<CaseInsertBrandingSourceCatalog> = {},
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      syncProjectJewelCaseBrandingMarkSlots(currentCaseInsert, {
        ...brandingSourcesRef.current,
        ...overrides,
      }),
    )
  }

  function scheduleCaseInsertBrandingMarkSlotSync(
    overrides: Partial<CaseInsertBrandingSourceCatalog> = {},
  ) {
    globalThis.setTimeout(() => {
      syncCaseInsertBrandingMarkSlots(overrides)
    }, 0)
  }

  function syncCaseInsertBrandingMarkSlotsForTarget(
    target: CaseInsertBrandingMarkTarget,
    overrides: Partial<CaseInsertBrandingSourceCatalog> = {},
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      syncProjectJewelCaseBrandingMarkSlotsForTarget(currentCaseInsert, target, {
        ...brandingSourcesRef.current,
        ...overrides,
      }),
    )
  }

  function scheduleCaseInsertBrandingMarkSlotSyncForTarget(
    target: CaseInsertBrandingMarkTarget,
    overrides: Partial<CaseInsertBrandingSourceCatalog> = {},
  ) {
    globalThis.setTimeout(() => {
      syncCaseInsertBrandingMarkSlotsForTarget(target, overrides)
    }, 0)
  }

  function setCaseInsertBrandingMarkTargetKindEnabled(
    target: CaseInsertBrandingMarkTarget,
    kind: 'rating' | 'media' | 'platform' | 'technical',
    enabled: boolean,
    overrides: Partial<CaseInsertBrandingSourceCatalog> = {},
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      setProjectJewelCaseBrandingMarkTargetKindEnabled(
        currentCaseInsert,
        target,
        kind,
        enabled,
        {
          ...brandingSourcesRef.current,
          ...overrides,
        },
      ),
    )
  }

  function setCaseInsertBrandingMarkTargetSourcePrefixEnabled(
    target: CaseInsertBrandingMarkTarget,
    sourcePrefix: string,
    enabled: boolean,
    overrides: Partial<CaseInsertBrandingSourceCatalog> = {},
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      setProjectJewelCaseBrandingMarkTargetSourcePrefixEnabled(
        currentCaseInsert,
        target,
        sourcePrefix,
        enabled,
        {
          ...brandingSourcesRef.current,
          ...overrides,
        },
      ),
    )
  }

  function getTargetRatingBadge(
    targetState: CaseInsertBrandingMarkTargetState,
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

  function getTargetMediaMark(
    targetState: CaseInsertBrandingMarkTargetState,
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

  function getTargetPlatformMarks(
    targetState: CaseInsertBrandingMarkTargetState,
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

  function getTargetTechnicalMarks(
    targetState: CaseInsertBrandingMarkTargetState,
  ): ProjectTechnicalMarks {
    const getTechnicalSlotParts = (sourceId: string | null | undefined) => {
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

  function getTechnicalMarksAfterTargetUpload(
    targetProjectTechnicalMarks: ProjectTechnicalMarks,
    uploadedProjectTechnicalMarks: ProjectTechnicalMarks | null | void,
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

  function handleCaseInsertProjectMetadataFieldsChange(
    fields: Partial<ProjectMetadata>,
  ) {
    const nextProjectMetadata = {
      ...brandingSources.projectMetadata,
      ...fields,
    }

    handleProjectMetadataFieldsChange(fields)
    scheduleCaseInsertBrandingMarkSlotSync({
      projectMetadata: nextProjectMetadata,
    })
  }

  function handleCaseInsertProjectMetadataChange(
    field: keyof ProjectMetadata,
    value: string,
  ) {
    handleCaseInsertProjectMetadataFieldsChange({
      [field]: value,
    } as Partial<ProjectMetadata>)
  }

  async function handleCaseInsertRatingBadgeUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextProjectRatingBadge = await handleRatingBadgeUpload(event)

    scheduleCaseInsertBrandingMarkSlotSync(
      nextProjectRatingBadge
        ? { projectRatingBadge: nextProjectRatingBadge }
        : undefined,
    )
  }

  function handleCaseInsertRatingBadgeSourceChange(source: RatingBadgeSource) {
    handleRatingBadgeSourceChange(source)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleCaseInsertRatingBadgeEnabledChange(enabled: boolean) {
    const nextState = updateRatingBadgeEnabledState(
      brandingSources.projectMetadata,
      brandingSources.projectRatingBadge,
      enabled,
    )

    handleRatingBadgeEnabledChange(enabled)
    scheduleCaseInsertBrandingMarkSlotSync({
      projectMetadata: nextState.metadata,
      projectRatingBadge: clampProjectRatingBadgeToSafeZone(
        nextState.ratingBadge,
        selectedDiscTemplate,
        nextState.metadata,
      ),
    })
  }

  function handleCaseInsertSupplementalUskRatingBadgeEnabledChange(
    enabled: boolean,
  ) {
    handleSupplementalUskRatingBadgeEnabledChange(enabled)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleCaseInsertSupplementalUskRatingBadgeValueChange(
    ratingValue: string,
  ) {
    handleSupplementalUskRatingBadgeValueChange(ratingValue)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleCaseInsertClearRatingBadgeImage() {
    handleClearRatingBadgeImage()
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  async function handleCaseInsertMediaMarkUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextProjectMediaMark = await handleMediaMarkUpload(event)

    scheduleCaseInsertBrandingMarkSlotSync(
      nextProjectMediaMark
        ? { projectMediaMark: nextProjectMediaMark }
        : undefined,
    )
  }

  function handleCaseInsertMediaMarkValueChange(value: MediaMarkValue) {
    handleMediaMarkValueChange(value)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleCaseInsertMediaMarkSourceChange(source: MediaMarkSource) {
    handleMediaMarkSourceChange(source)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleCaseInsertMediaMarkThemeChange(theme: MediaMarkTheme) {
    handleMediaMarkThemeChange(theme)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleCaseInsertMediaMarkLayoutChange(
    field: MediaMarkLayoutField,
    value: boolean | number,
  ) {
    handleMediaMarkLayoutChange(field, value)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleCaseInsertClearMediaMarkImage() {
    handleClearMediaMarkImage()
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  async function handleCaseInsertPlatformMarkUpload(
    value: PlatformMarkValue,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextProjectPlatformMarks =
      await handlePlatformMarkUpload(value, event)

    scheduleCaseInsertBrandingMarkSlotSync(
      nextProjectPlatformMarks
        ? { projectPlatformMarks: nextProjectPlatformMarks }
        : undefined,
    )
  }

  function handleCaseInsertPlatformMarkToggle(
    value: PlatformMarkValue,
    enabled: boolean,
  ) {
    handlePlatformMarkToggle(value, enabled)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleCaseInsertPlatformMarkSourceChange(
    value: PlatformMarkValue,
    source: PlatformMarkSource,
  ) {
    handlePlatformMarkSourceChange(value, source)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleCaseInsertPlatformMarkThemeChange(
    value: PlatformMarkValue,
    theme: PlatformMarkTheme,
  ) {
    handlePlatformMarkThemeChange(value, theme)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleCaseInsertPlatformMarkLayoutChange(
    value: PlatformMarkValue,
    field: PlatformMarkLayoutField,
    layoutValue: boolean | number,
  ) {
    handlePlatformMarkLayoutChange(value, field, layoutValue)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleCaseInsertClearPlatformMarkImage(value: PlatformMarkValue) {
    handleClearPlatformMarkImage(value)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  async function handleCaseInsertTechnicalMarkUpload(
    value: TechnicalMarkValue,
    event: ChangeEvent<HTMLInputElement>,
    assetId?: string | null,
  ) {
    const nextProjectTechnicalMarks =
      await handleTechnicalMarkUpload(value, event, assetId)

    scheduleCaseInsertBrandingMarkSlotSync(
      nextProjectTechnicalMarks
        ? { projectTechnicalMarks: nextProjectTechnicalMarks }
        : undefined,
    )
  }

  function handleCaseInsertTechnicalMarkToggle(
    value: TechnicalMarkValue,
    enabled: boolean,
  ) {
    handleTechnicalMarkToggle(value, enabled)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleCaseInsertTechnicalMarkSourceChange(
    value: TechnicalMarkValue,
    source: TechnicalMarkSource,
    assetId?: string | null,
  ) {
    handleTechnicalMarkSourceChange(value, source, assetId)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleCaseInsertTechnicalMarkLayoutChange(
    value: TechnicalMarkValue,
    field: TechnicalMarkLayoutField,
    layoutValue: boolean | number,
    assetId?: string | null,
  ) {
    handleTechnicalMarkLayoutChange(value, field, layoutValue, assetId)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleCaseInsertTechnicalMarkLabelChange(
    value: TechnicalMarkValue,
    label: string,
    assetId?: string | null,
  ) {
    handleTechnicalMarkLabelChange(value, label, assetId)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleCaseInsertClearTechnicalMarkImage(
    value: TechnicalMarkValue,
    assetId?: string | null,
  ) {
    handleClearTechnicalMarkImage(value, assetId)
    scheduleCaseInsertBrandingMarkSlotSync()
  }

  function handleCaseInsertAddTechnicalMarkAsset(value: TechnicalMarkValue) {
    const nextProjectTechnicalMarks = handleAddTechnicalMarkAsset(value)

    scheduleCaseInsertBrandingMarkSlotSync(
      nextProjectTechnicalMarks
        ? { projectTechnicalMarks: nextProjectTechnicalMarks }
        : undefined,
    )
  }

  function handleCaseInsertRemoveTechnicalMarkAsset(
    value: TechnicalMarkValue,
    assetId: string,
  ) {
    const nextProjectTechnicalMarks =
      handleRemoveTechnicalMarkAsset(value, assetId)

    scheduleCaseInsertBrandingMarkSlotSync(
      nextProjectTechnicalMarks
        ? { projectTechnicalMarks: nextProjectTechnicalMarks }
        : undefined,
    )
  }

  function getCaseInsertBrandingControlsForTarget(
    target: CaseInsertBrandingMarkTarget,
    targetState: CaseInsertBrandingMarkTargetState,
  ) {
    const targetProjectRatingBadge = getTargetRatingBadge(targetState)
    const targetProjectMediaMark = getTargetMediaMark(targetState)
    const targetProjectPlatformMarks = getTargetPlatformMarks(targetState)
    const targetProjectTechnicalMarks = getTargetTechnicalMarks(targetState)
    const targetBrandingSources: CaseInsertBrandingSourceCatalog = {
      ...brandingSources,
      projectRatingBadge: targetProjectRatingBadge,
      projectMediaMark: targetProjectMediaMark,
      projectPlatformMarks: targetProjectPlatformMarks,
      projectTechnicalMarks: targetProjectTechnicalMarks,
    }

    function handleTargetProjectMetadataFieldsChange(
      fields: Partial<ProjectMetadata>,
    ) {
      const nextProjectMetadata = {
        ...brandingSources.projectMetadata,
        ...fields,
      }

      handleProjectMetadataFieldsChange(fields)
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(target, {
        ...targetBrandingSources,
        projectMetadata: nextProjectMetadata,
      })
    }

    function handleTargetProjectMetadataChange(
      field: keyof ProjectMetadata,
      value: string,
    ) {
      handleTargetProjectMetadataFieldsChange({
        [field]: value,
      } as Partial<ProjectMetadata>)
    }

    function handleTargetRatingBadgeUpload(
      event: ChangeEvent<HTMLInputElement>,
    ) {
      return Promise.resolve(handleRatingBadgeUpload(event)).then((nextProjectRatingBadge) => {
        scheduleCaseInsertBrandingMarkSlotSyncForTarget(
          target,
          {
            ...targetBrandingSources,
            ...(nextProjectRatingBadge
              ? { projectRatingBadge: nextProjectRatingBadge }
              : {}),
          },
        )
      })
    }

    function handleTargetRatingBadgeSourceChange(source: RatingBadgeSource) {
      const nextProjectRatingBadge = {
        ...targetProjectRatingBadge,
        source,
      }

      handleRatingBadgeSourceChange(source)
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(target, {
        ...targetBrandingSources,
        projectRatingBadge: nextProjectRatingBadge,
      })
    }

    function handleTargetRatingBadgeEnabledChange(enabled: boolean) {
      const nextState = updateRatingBadgeEnabledState(
        brandingSources.projectMetadata,
        targetProjectRatingBadge,
        enabled,
      )

      if (enabled) {
        handleProjectMetadataFieldsChange(nextState.metadata)
      }

      setCaseInsertBrandingMarkTargetKindEnabled(target, 'rating', enabled, {
        ...targetBrandingSources,
        projectMetadata: nextState.metadata,
        projectRatingBadge: clampProjectRatingBadgeToSafeZone(
          nextState.ratingBadge,
          selectedDiscTemplate,
          nextState.metadata,
        ),
      })
    }

    function handleTargetSupplementalUskRatingBadgeEnabledChange(
      enabled: boolean,
    ) {
      const nextProjectRatingBadge = clampProjectRatingBadgeToSafeZone(
        updateSupplementalUskRatingBadgeEnabledState(
          targetProjectRatingBadge,
          enabled,
        ),
        selectedDiscTemplate,
        targetBrandingSources.projectMetadata,
      )

      handleSupplementalUskRatingBadgeEnabledChange(enabled)
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(
        target,
        {
          ...targetBrandingSources,
          projectRatingBadge: nextProjectRatingBadge,
        },
      )
    }

    function handleTargetSupplementalUskRatingBadgeValueChange(
      ratingValue: string,
    ) {
      const nextProjectRatingBadge = updateSupplementalUskRatingBadgeValue(
        targetProjectRatingBadge,
        ratingValue,
      )

      handleSupplementalUskRatingBadgeValueChange(ratingValue)
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(
        target,
        {
          ...targetBrandingSources,
          projectRatingBadge: nextProjectRatingBadge,
        },
      )
    }

    function handleTargetClearRatingBadgeImage() {
      const nextProjectRatingBadge = clampProjectRatingBadgeToSafeZone(
        clearRatingBadgeImage(targetProjectRatingBadge),
        selectedDiscTemplate,
        targetBrandingSources.projectMetadata,
      )

      handleClearRatingBadgeImage()
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(
        target,
        {
          ...targetBrandingSources,
          projectRatingBadge: nextProjectRatingBadge,
        },
      )
    }

    function handleTargetMediaMarkUpload(event: ChangeEvent<HTMLInputElement>) {
      return Promise.resolve(handleMediaMarkUpload(event)).then((nextProjectMediaMark) => {
        scheduleCaseInsertBrandingMarkSlotSyncForTarget(
          target,
          {
            ...targetBrandingSources,
            ...(nextProjectMediaMark
              ? { projectMediaMark: nextProjectMediaMark }
              : {}),
          },
        )
      })
    }

    function handleTargetMediaMarkValueChange(value: MediaMarkValue) {
      const nextProjectMediaMark = updateMediaMarkValue(
        targetProjectMediaMark,
        value,
      )

      handleMediaMarkValueChange(value)
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(target, {
        ...targetBrandingSources,
        projectMediaMark: nextProjectMediaMark,
      })
    }

    function handleTargetMediaMarkSourceChange(source: MediaMarkSource) {
      const nextProjectMediaMark = updateMediaMarkSource(
        targetProjectMediaMark,
        source,
      )

      handleMediaMarkSourceChange(source)
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(target, {
        ...targetBrandingSources,
        projectMediaMark: nextProjectMediaMark,
      })
    }

    function handleTargetMediaMarkThemeChange(theme: MediaMarkTheme) {
      const nextProjectMediaMark = updateMediaMarkTheme(
        targetProjectMediaMark,
        theme,
      )

      handleMediaMarkThemeChange(theme)
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(target, {
        ...targetBrandingSources,
        projectMediaMark: nextProjectMediaMark,
      })
    }

    function handleTargetMediaMarkLayoutChange(
      field: MediaMarkLayoutField,
      value: boolean | number,
    ) {
      const nextProjectMediaMark = updateMediaMarkLayoutField(
        targetProjectMediaMark,
        field,
        value,
      )

      if (field === 'enabled') {
        setCaseInsertBrandingMarkTargetKindEnabled(
          target,
          'media',
          Boolean(value),
          {
            ...targetBrandingSources,
            projectMediaMark: nextProjectMediaMark,
          },
        )
        return
      }

      handleMediaMarkLayoutChange(field, value)
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(target, {
        ...targetBrandingSources,
        projectMediaMark: nextProjectMediaMark,
      })
    }

    function handleTargetClearMediaMarkImage() {
      const nextProjectMediaMark = clearMediaMarkImage(targetProjectMediaMark)

      handleClearMediaMarkImage()
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(
        target,
        {
          ...targetBrandingSources,
          projectMediaMark: nextProjectMediaMark,
        },
      )
    }

    function handleTargetPlatformMarkUpload(
      value: PlatformMarkValue,
      event: ChangeEvent<HTMLInputElement>,
    ) {
      return Promise.resolve(handlePlatformMarkUpload(value, event)).then((nextProjectPlatformMarks) => {
        scheduleCaseInsertBrandingMarkSlotSyncForTarget(
          target,
          {
            ...targetBrandingSources,
            ...(nextProjectPlatformMarks
              ? { projectPlatformMarks: nextProjectPlatformMarks }
              : {}),
          },
        )
      })
    }

    function handleTargetPlatformMarkToggle(
      value: PlatformMarkValue,
      enabled: boolean,
    ) {
      const nextProjectPlatformMarks = updatePlatformMarkToggle(
        targetProjectPlatformMarks,
        value,
        enabled,
        selectedDiscTemplate,
      )

      if (enabled && !brandingSources.projectPlatformMarks.values.includes(value)) {
        handlePlatformMarkToggle(value, true)
      }

      setCaseInsertBrandingMarkTargetSourcePrefixEnabled(
        target,
        `case-platform:${value}:`,
        enabled,
        {
          ...targetBrandingSources,
          projectPlatformMarks: nextProjectPlatformMarks,
        },
      )
    }

    function handleTargetPlatformMarkSourceChange(
      value: PlatformMarkValue,
      source: PlatformMarkSource,
    ) {
      const nextProjectPlatformMarks = updatePlatformMarkSource(
        targetProjectPlatformMarks,
        value,
        source,
      )

      handlePlatformMarkSourceChange(value, source)
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(target, {
        ...targetBrandingSources,
        projectPlatformMarks: nextProjectPlatformMarks,
      })
    }

    function handleTargetPlatformMarkThemeChange(
      value: PlatformMarkValue,
      theme: PlatformMarkTheme,
    ) {
      const nextProjectPlatformMarks = updatePlatformMarkTheme(
        targetProjectPlatformMarks,
        value,
        theme,
        selectedDiscTemplate,
      )

      handlePlatformMarkThemeChange(value, theme)
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(target, {
        ...targetBrandingSources,
        projectPlatformMarks: nextProjectPlatformMarks,
      })
    }

    function handleTargetPlatformMarkLayoutChange(
      value: PlatformMarkValue,
      field: PlatformMarkLayoutField,
      layoutValue: boolean | number,
    ) {
      const nextProjectPlatformMarks = updatePlatformMarkLayoutField(
        targetProjectPlatformMarks,
        value,
        field,
        layoutValue,
      )

      if (field === 'enabled') {
        if (
          Boolean(layoutValue) &&
          !brandingSources.projectPlatformMarks.values.includes(value)
        ) {
          handlePlatformMarkToggle(value, true)
        }

        setCaseInsertBrandingMarkTargetSourcePrefixEnabled(
          target,
          `case-platform:${value}:`,
          Boolean(layoutValue),
          {
            ...targetBrandingSources,
            projectPlatformMarks: nextProjectPlatformMarks,
          },
        )
        return
      }

      handlePlatformMarkLayoutChange(value, field, layoutValue)
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(target, {
        ...targetBrandingSources,
        projectPlatformMarks: nextProjectPlatformMarks,
      })
    }

    function handleTargetClearPlatformMarkImage(value: PlatformMarkValue) {
      const nextProjectPlatformMarks = clearPlatformMarkImage(
        targetProjectPlatformMarks,
        value,
      )

      handleClearPlatformMarkImage(value)
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(
        target,
        {
          ...targetBrandingSources,
          projectPlatformMarks: nextProjectPlatformMarks,
        },
      )
    }

    function handleTargetTechnicalMarkUpload(
      value: TechnicalMarkValue,
      event: ChangeEvent<HTMLInputElement>,
      assetId?: string | null,
    ) {
      return Promise.resolve(
        handleTechnicalMarkUpload(value, event, assetId),
      ).then((nextProjectTechnicalMarks) => {
        const nextTargetProjectTechnicalMarks =
          getTechnicalMarksAfterTargetUpload(
            targetProjectTechnicalMarks,
            nextProjectTechnicalMarks,
            value,
            assetId,
          )

        scheduleCaseInsertBrandingMarkSlotSyncForTarget(
          target,
          {
            ...targetBrandingSources,
            projectTechnicalMarks: nextTargetProjectTechnicalMarks,
          },
        )
      })
    }

    function handleTargetTechnicalMarkToggle(
      value: TechnicalMarkValue,
      enabled: boolean,
    ) {
      const nextProjectTechnicalMarks = updateTechnicalMarkToggle(
        targetProjectTechnicalMarks,
        value,
        enabled,
        selectedDiscTemplate,
      )

      if (enabled && !brandingSources.projectTechnicalMarks.values.includes(value)) {
        handleTechnicalMarkToggle(value, true)
      }

      setCaseInsertBrandingMarkTargetSourcePrefixEnabled(
        target,
        `case-technical:${value}`,
        enabled,
        {
          ...targetBrandingSources,
          projectTechnicalMarks: nextProjectTechnicalMarks,
        },
      )
    }

    function handleTargetTechnicalMarkSourceChange(
      value: TechnicalMarkValue,
      source: TechnicalMarkSource,
      assetId?: string | null,
    ) {
      const nextProjectTechnicalMarks = updateTechnicalMarkSource(
        targetProjectTechnicalMarks,
        value,
        source,
        assetId,
      )

      handleTechnicalMarkSourceChange(value, source, assetId)
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(target, {
        ...targetBrandingSources,
        projectTechnicalMarks: nextProjectTechnicalMarks,
      })
    }

    function handleTargetTechnicalMarkLayoutChange(
      value: TechnicalMarkValue,
      field: TechnicalMarkLayoutField,
      layoutValue: boolean | number,
      assetId?: string | null,
    ) {
      const nextProjectTechnicalMarks = updateTechnicalMarkLayoutField(
        targetProjectTechnicalMarks,
        value,
        field,
        layoutValue,
        assetId,
      )

      if (field === 'enabled' && assetId) {
        handleTechnicalMarkLayoutChange(value, field, layoutValue, assetId)
        setCaseInsertBrandingMarkTargetSourcePrefixEnabled(
          target,
          `case-technical:${value}:${assetId}`,
          Boolean(layoutValue),
          {
            ...targetBrandingSources,
            projectTechnicalMarks: nextProjectTechnicalMarks,
          },
        )
        return
      }

      if (field === 'enabled') {
        if (
          Boolean(layoutValue) &&
          !brandingSources.projectTechnicalMarks.values.includes(value)
        ) {
          handleTechnicalMarkToggle(value, true)
        }

        setCaseInsertBrandingMarkTargetSourcePrefixEnabled(
          target,
          `case-technical:${value}:primary`,
          Boolean(layoutValue),
          {
            ...targetBrandingSources,
            projectTechnicalMarks: nextProjectTechnicalMarks,
          },
        )
        return
      }

      handleTechnicalMarkLayoutChange(value, field, layoutValue, assetId)
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(target, {
        ...targetBrandingSources,
        projectTechnicalMarks: nextProjectTechnicalMarks,
      })
    }

    function handleTargetTechnicalMarkLabelChange(
      value: TechnicalMarkValue,
      label: string,
      assetId?: string | null,
    ) {
      const nextProjectTechnicalMarks = updateTechnicalMarkLabel(
        targetProjectTechnicalMarks,
        value,
        label,
        assetId,
      )

      handleTechnicalMarkLabelChange(value, label, assetId)
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(target, {
        ...targetBrandingSources,
        projectTechnicalMarks: nextProjectTechnicalMarks,
      })
    }

    function handleTargetClearTechnicalMarkImage(
      value: TechnicalMarkValue,
      assetId?: string | null,
    ) {
      handleClearTechnicalMarkImage(value, assetId)
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(
        target,
        targetBrandingSources,
      )
    }

    function handleTargetAddTechnicalMarkAsset(value: TechnicalMarkValue) {
      const nextProjectTechnicalMarks = handleAddTechnicalMarkAsset(value)
      const nextTargetProjectTechnicalMarks = nextProjectTechnicalMarks
        ? nextProjectTechnicalMarks
        : addTechnicalMarkAsset(
            targetProjectTechnicalMarks,
            value,
            selectedDiscTemplate,
          )

      scheduleCaseInsertBrandingMarkSlotSyncForTarget(target, {
        ...targetBrandingSources,
        projectTechnicalMarks: nextTargetProjectTechnicalMarks,
      })

      return nextTargetProjectTechnicalMarks
    }

    function handleTargetRemoveTechnicalMarkAsset(
      value: TechnicalMarkValue,
      assetId: string,
    ) {
      const nextProjectTechnicalMarks =
        handleRemoveTechnicalMarkAsset(value, assetId)
      const nextTargetProjectTechnicalMarks = nextProjectTechnicalMarks
        ? nextProjectTechnicalMarks
        : removeTechnicalMarkAsset(
            targetProjectTechnicalMarks,
            value,
            assetId,
          )

      scheduleCaseInsertBrandingMarkSlotSyncForTarget(target, {
        ...targetBrandingSources,
        projectTechnicalMarks: nextTargetProjectTechnicalMarks,
      })

      return nextTargetProjectTechnicalMarks
    }

    return {
      projectMetadata: brandingSources.projectMetadata,
      projectRatingBadge: targetProjectRatingBadge,
      projectMediaMark: targetProjectMediaMark,
      projectPlatformMarks: targetProjectPlatformMarks,
      projectTechnicalMarks: targetProjectTechnicalMarks,
      handleProjectMetadataChange: handleTargetProjectMetadataChange,
      handleProjectMetadataFieldsChange: handleTargetProjectMetadataFieldsChange,
      handleRatingBadgeUpload: handleTargetRatingBadgeUpload,
      handleRatingBadgeSourceChange: handleTargetRatingBadgeSourceChange,
      handleRatingBadgeEnabledChange: handleTargetRatingBadgeEnabledChange,
      handleSupplementalUskRatingBadgeEnabledChange:
        handleTargetSupplementalUskRatingBadgeEnabledChange,
      handleSupplementalUskRatingBadgeValueChange:
        handleTargetSupplementalUskRatingBadgeValueChange,
      handleClearRatingBadgeImage: handleTargetClearRatingBadgeImage,
      handleMediaMarkUpload: handleTargetMediaMarkUpload,
      handleMediaMarkValueChange: handleTargetMediaMarkValueChange,
      handleMediaMarkSourceChange: handleTargetMediaMarkSourceChange,
      handleMediaMarkThemeChange: handleTargetMediaMarkThemeChange,
      handleMediaMarkLayoutChange: handleTargetMediaMarkLayoutChange,
      handleClearMediaMarkImage: handleTargetClearMediaMarkImage,
      handlePlatformMarkUpload: handleTargetPlatformMarkUpload,
      handlePlatformMarkToggle: handleTargetPlatformMarkToggle,
      handlePlatformMarkSourceChange: handleTargetPlatformMarkSourceChange,
      handlePlatformMarkThemeChange: handleTargetPlatformMarkThemeChange,
      handlePlatformMarkLayoutChange: handleTargetPlatformMarkLayoutChange,
      handleClearPlatformMarkImage: handleTargetClearPlatformMarkImage,
      handleTechnicalMarkUpload: handleTargetTechnicalMarkUpload,
      handleTechnicalMarkToggle: handleTargetTechnicalMarkToggle,
      handleTechnicalMarkSourceChange: handleTargetTechnicalMarkSourceChange,
      handleTechnicalMarkLayoutChange: handleTargetTechnicalMarkLayoutChange,
      handleTechnicalMarkLabelChange: handleTargetTechnicalMarkLabelChange,
      handleClearTechnicalMarkImage: handleTargetClearTechnicalMarkImage,
      handleAddTechnicalMarkAsset: handleTargetAddTechnicalMarkAsset,
      handleRemoveTechnicalMarkAsset: handleTargetRemoveTechnicalMarkAsset,
    }
  }

  return {
    scheduleCaseInsertBrandingMarkSlotSync,
    getCaseInsertBrandingControlsForTarget,
    handleCaseInsertProjectMetadataChange,
    handleCaseInsertProjectMetadataFieldsChange,
    handleCaseInsertRatingBadgeUpload,
    handleCaseInsertRatingBadgeSourceChange,
    handleCaseInsertRatingBadgeEnabledChange,
    handleCaseInsertSupplementalUskRatingBadgeEnabledChange,
    handleCaseInsertSupplementalUskRatingBadgeValueChange,
    handleCaseInsertClearRatingBadgeImage,
    handleCaseInsertMediaMarkUpload,
    handleCaseInsertMediaMarkValueChange,
    handleCaseInsertMediaMarkSourceChange,
    handleCaseInsertMediaMarkThemeChange,
    handleCaseInsertMediaMarkLayoutChange,
    handleCaseInsertClearMediaMarkImage,
    handleCaseInsertPlatformMarkUpload,
    handleCaseInsertPlatformMarkToggle,
    handleCaseInsertPlatformMarkSourceChange,
    handleCaseInsertPlatformMarkThemeChange,
    handleCaseInsertPlatformMarkLayoutChange,
    handleCaseInsertClearPlatformMarkImage,
    handleCaseInsertTechnicalMarkUpload,
    handleCaseInsertTechnicalMarkToggle,
    handleCaseInsertTechnicalMarkSourceChange,
    handleCaseInsertTechnicalMarkLayoutChange,
    handleCaseInsertTechnicalMarkLabelChange,
    handleCaseInsertClearTechnicalMarkImage,
    handleCaseInsertAddTechnicalMarkAsset,
    handleCaseInsertRemoveTechnicalMarkAsset,
  }
}
