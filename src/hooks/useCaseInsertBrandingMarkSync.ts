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
  updatePlatformMarkLayoutField,
  updatePlatformMarkSource,
  updatePlatformMarkTheme,
  updatePlatformMarkToggle,
} from '../project/projectPlatformMarks.ts'
import {
  addTechnicalMarkAsset,
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
import {
  getCaseInsertTargetBrandingSources,
  getCaseInsertTargetPlatformMarkSyncRequest,
  getCaseInsertTargetTechnicalMarkLayoutSyncRequest,
  getCaseInsertTargetTechnicalMarkToggleSyncRequest,
  getTechnicalMarksAfterCaseInsertTargetUpload,
} from '../caseInsert/brandingMarkTargetSources.ts'

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

  function syncAfter(
    update: () => void,
    overrides: Partial<CaseInsertBrandingSourceCatalog> = {},
  ) {
    update()
    scheduleCaseInsertBrandingMarkSlotSync(overrides)
  }

  function scheduleCaseInsertBrandingMarkSlotSyncFromResult<T>(
    nextState: T | null | void,
    getOverrides: (nextState: T) => Partial<CaseInsertBrandingSourceCatalog>,
  ) {
    scheduleCaseInsertBrandingMarkSlotSync(
      nextState ? getOverrides(nextState) : undefined,
    )
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

    scheduleCaseInsertBrandingMarkSlotSyncFromResult(
      nextProjectRatingBadge,
      (projectRatingBadge) => ({ projectRatingBadge }),
    )
  }

  function handleCaseInsertRatingBadgeSourceChange(source: RatingBadgeSource) {
    syncAfter(() => handleRatingBadgeSourceChange(source))
  }

  function handleCaseInsertRatingBadgeEnabledChange(enabled: boolean) {
    const nextState = updateRatingBadgeEnabledState(
      brandingSources.projectMetadata,
      brandingSources.projectRatingBadge,
      enabled,
    )

    syncAfter(() => handleRatingBadgeEnabledChange(enabled), {
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
    syncAfter(() => handleSupplementalUskRatingBadgeEnabledChange(enabled))
  }

  function handleCaseInsertSupplementalUskRatingBadgeValueChange(
    ratingValue: string,
  ) {
    syncAfter(() => handleSupplementalUskRatingBadgeValueChange(ratingValue))
  }

  function handleCaseInsertClearRatingBadgeImage() {
    syncAfter(handleClearRatingBadgeImage)
  }

  async function handleCaseInsertMediaMarkUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextProjectMediaMark = await handleMediaMarkUpload(event)

    scheduleCaseInsertBrandingMarkSlotSyncFromResult(
      nextProjectMediaMark,
      (projectMediaMark) => ({ projectMediaMark }),
    )
  }

  function handleCaseInsertMediaMarkValueChange(value: MediaMarkValue) {
    syncAfter(() => handleMediaMarkValueChange(value))
  }

  function handleCaseInsertMediaMarkSourceChange(source: MediaMarkSource) {
    syncAfter(() => handleMediaMarkSourceChange(source))
  }

  function handleCaseInsertMediaMarkThemeChange(theme: MediaMarkTheme) {
    syncAfter(() => handleMediaMarkThemeChange(theme))
  }

  function handleCaseInsertMediaMarkLayoutChange(
    field: MediaMarkLayoutField,
    value: boolean | number,
  ) {
    syncAfter(() => handleMediaMarkLayoutChange(field, value))
  }

  function handleCaseInsertClearMediaMarkImage() {
    syncAfter(handleClearMediaMarkImage)
  }

  async function handleCaseInsertPlatformMarkUpload(
    value: PlatformMarkValue,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextProjectPlatformMarks =
      await handlePlatformMarkUpload(value, event)

    scheduleCaseInsertBrandingMarkSlotSyncFromResult(
      nextProjectPlatformMarks,
      (projectPlatformMarks) => ({ projectPlatformMarks }),
    )
  }

  function handleCaseInsertPlatformMarkToggle(
    value: PlatformMarkValue,
    enabled: boolean,
  ) {
    syncAfter(() => handlePlatformMarkToggle(value, enabled))
  }

  function handleCaseInsertPlatformMarkSourceChange(
    value: PlatformMarkValue,
    source: PlatformMarkSource,
  ) {
    syncAfter(() => handlePlatformMarkSourceChange(value, source))
  }

  function handleCaseInsertPlatformMarkThemeChange(
    value: PlatformMarkValue,
    theme: PlatformMarkTheme,
  ) {
    syncAfter(() => handlePlatformMarkThemeChange(value, theme))
  }

  function handleCaseInsertPlatformMarkLayoutChange(
    value: PlatformMarkValue,
    field: PlatformMarkLayoutField,
    layoutValue: boolean | number,
  ) {
    syncAfter(() => handlePlatformMarkLayoutChange(value, field, layoutValue))
  }

  function handleCaseInsertClearPlatformMarkImage(value: PlatformMarkValue) {
    syncAfter(() => handleClearPlatformMarkImage(value))
  }

  async function handleCaseInsertTechnicalMarkUpload(
    value: TechnicalMarkValue,
    event: ChangeEvent<HTMLInputElement>,
    assetId?: string | null,
  ) {
    const nextProjectTechnicalMarks =
      await handleTechnicalMarkUpload(value, event, assetId)

    scheduleCaseInsertBrandingMarkSlotSyncFromResult(
      nextProjectTechnicalMarks,
      (projectTechnicalMarks) => ({ projectTechnicalMarks }),
    )
  }

  function handleCaseInsertTechnicalMarkToggle(
    value: TechnicalMarkValue,
    enabled: boolean,
  ) {
    syncAfter(() => handleTechnicalMarkToggle(value, enabled))
  }

  function handleCaseInsertTechnicalMarkSourceChange(
    value: TechnicalMarkValue,
    source: TechnicalMarkSource,
    assetId?: string | null,
  ) {
    syncAfter(() => handleTechnicalMarkSourceChange(value, source, assetId))
  }

  function handleCaseInsertTechnicalMarkLayoutChange(
    value: TechnicalMarkValue,
    field: TechnicalMarkLayoutField,
    layoutValue: boolean | number,
    assetId?: string | null,
  ) {
    syncAfter(() =>
      handleTechnicalMarkLayoutChange(value, field, layoutValue, assetId),
    )
  }

  function handleCaseInsertTechnicalMarkLabelChange(
    value: TechnicalMarkValue,
    label: string,
    assetId?: string | null,
  ) {
    syncAfter(() => handleTechnicalMarkLabelChange(value, label, assetId))
  }

  function handleCaseInsertClearTechnicalMarkImage(
    value: TechnicalMarkValue,
    assetId?: string | null,
  ) {
    syncAfter(() => handleClearTechnicalMarkImage(value, assetId))
  }

  function handleCaseInsertAddTechnicalMarkAsset(value: TechnicalMarkValue) {
    const nextProjectTechnicalMarks = handleAddTechnicalMarkAsset(value)

    scheduleCaseInsertBrandingMarkSlotSyncFromResult(
      nextProjectTechnicalMarks,
      (projectTechnicalMarks) => ({ projectTechnicalMarks }),
    )
  }

  function handleCaseInsertRemoveTechnicalMarkAsset(
    value: TechnicalMarkValue,
    assetId: string,
  ) {
    const nextProjectTechnicalMarks =
      handleRemoveTechnicalMarkAsset(value, assetId)

    scheduleCaseInsertBrandingMarkSlotSyncFromResult(
      nextProjectTechnicalMarks,
      (projectTechnicalMarks) => ({ projectTechnicalMarks }),
    )
  }

  function getCaseInsertBrandingControlsForTarget(
    target: CaseInsertBrandingMarkTarget,
    targetState: CaseInsertBrandingMarkTargetState,
  ) {
    const targetBrandingSources = getCaseInsertTargetBrandingSources(
      targetState,
      brandingSources,
      selectedDiscTemplate,
    )
    const {
      projectMediaMark: targetProjectMediaMark,
      projectPlatformMarks: targetProjectPlatformMarks,
      projectRatingBadge: targetProjectRatingBadge,
      projectTechnicalMarks: targetProjectTechnicalMarks,
    } = targetBrandingSources

    function syncTargetPlatform(
      request: ReturnType<typeof getCaseInsertTargetPlatformMarkSyncRequest>,
    ) {
      if (request.shouldEnableSharedValue) {
        handlePlatformMarkToggle(request.value, true)
      }

      setCaseInsertBrandingMarkTargetSourcePrefixEnabled(
        target,
        request.sourcePrefix,
        request.enabled,
        {
          ...targetBrandingSources,
          projectPlatformMarks: request.projectPlatformMarks,
        },
      )
    }

    function syncTargetTechnical(
      request:
        | ReturnType<typeof getCaseInsertTargetTechnicalMarkToggleSyncRequest>
        | ReturnType<typeof getCaseInsertTargetTechnicalMarkLayoutSyncRequest>,
    ) {
      if (request.shouldSyncSharedLayout) {
        handleTechnicalMarkLayoutChange(
          request.value,
          'enabled',
          request.enabled,
          request.assetId,
        )
      } else if (request.shouldEnableSharedValue) {
        handleTechnicalMarkToggle(request.value, true)
      }

      setCaseInsertBrandingMarkTargetSourcePrefixEnabled(
        target,
        request.sourcePrefix,
        request.enabled,
        {
          ...targetBrandingSources,
          projectTechnicalMarks: request.projectTechnicalMarks,
        },
      )
    }

    function scheduleTargetBrandingMarkSlotSync(
      overrides: Partial<CaseInsertBrandingSourceCatalog> = {},
    ) {
      scheduleCaseInsertBrandingMarkSlotSyncForTarget(target, {
        ...targetBrandingSources,
        ...overrides,
      })
    }

    function syncTargetAfter(
      update: () => void,
      overrides: Partial<CaseInsertBrandingSourceCatalog> = {},
    ) {
      update()
      scheduleTargetBrandingMarkSlotSync(overrides)
    }

    function syncTargetAfterSharedUpload<T>(
      upload: T | null | void | Promise<T | null | void>,
      getOverrides: (nextState: T) => Partial<CaseInsertBrandingSourceCatalog>,
    ) {
      return Promise.resolve(upload).then((nextState) =>
        scheduleTargetBrandingMarkSlotSync(
          nextState ? getOverrides(nextState) : {},
        ),
      )
    }

    function handleTargetProjectMetadataFieldsChange(
      fields: Partial<ProjectMetadata>,
    ) {
      const nextProjectMetadata = {
        ...brandingSources.projectMetadata,
        ...fields,
      }

      syncTargetAfter(() => handleProjectMetadataFieldsChange(fields), {
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
      return syncTargetAfterSharedUpload(
        handleRatingBadgeUpload(event),
        (projectRatingBadge) => ({ projectRatingBadge }),
      )
    }

    function handleTargetRatingBadgeSourceChange(source: RatingBadgeSource) {
      const nextProjectRatingBadge = {
        ...targetProjectRatingBadge,
        source,
      }

      syncTargetAfter(() => handleRatingBadgeSourceChange(source), {
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

      syncTargetAfter(
        () => handleSupplementalUskRatingBadgeEnabledChange(enabled),
        {
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

      syncTargetAfter(
        () => handleSupplementalUskRatingBadgeValueChange(ratingValue),
        {
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

      syncTargetAfter(handleClearRatingBadgeImage, {
        projectRatingBadge: nextProjectRatingBadge,
      })
    }

    function handleTargetMediaMarkUpload(event: ChangeEvent<HTMLInputElement>) {
      return syncTargetAfterSharedUpload(
        handleMediaMarkUpload(event),
        (projectMediaMark) => ({ projectMediaMark }),
      )
    }

    function handleTargetMediaMarkValueChange(value: MediaMarkValue) {
      const nextProjectMediaMark = updateMediaMarkValue(
        targetProjectMediaMark,
        value,
      )

      syncTargetAfter(() => handleMediaMarkValueChange(value), {
        projectMediaMark: nextProjectMediaMark,
      })
    }

    function handleTargetMediaMarkSourceChange(source: MediaMarkSource) {
      const nextProjectMediaMark = updateMediaMarkSource(
        targetProjectMediaMark,
        source,
      )

      syncTargetAfter(() => handleMediaMarkSourceChange(source), {
        projectMediaMark: nextProjectMediaMark,
      })
    }

    function handleTargetMediaMarkThemeChange(theme: MediaMarkTheme) {
      const nextProjectMediaMark = updateMediaMarkTheme(
        targetProjectMediaMark,
        theme,
      )

      syncTargetAfter(() => handleMediaMarkThemeChange(theme), {
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

      syncTargetAfter(() => handleMediaMarkLayoutChange(field, value), {
        projectMediaMark: nextProjectMediaMark,
      })
    }

    function handleTargetClearMediaMarkImage() {
      const nextProjectMediaMark = clearMediaMarkImage(targetProjectMediaMark)

      syncTargetAfter(handleClearMediaMarkImage, {
        projectMediaMark: nextProjectMediaMark,
      })
    }

    function handleTargetPlatformMarkUpload(
      value: PlatformMarkValue,
      event: ChangeEvent<HTMLInputElement>,
    ) {
      return syncTargetAfterSharedUpload(
        handlePlatformMarkUpload(value, event),
        (projectPlatformMarks) => ({ projectPlatformMarks }),
      )
    }

    function handleTargetPlatformMarkToggle(
      value: PlatformMarkValue,
      enabled: boolean,
    ) {
      const request = getCaseInsertTargetPlatformMarkSyncRequest(
        updatePlatformMarkToggle(
          targetProjectPlatformMarks,
          value,
          enabled,
          selectedDiscTemplate,
        ),
        brandingSources.projectPlatformMarks,
        value,
        enabled,
      )

      syncTargetPlatform(request)
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

      syncTargetAfter(() => handlePlatformMarkSourceChange(value, source), {
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

      syncTargetAfter(() => handlePlatformMarkThemeChange(value, theme), {
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
        const request = getCaseInsertTargetPlatformMarkSyncRequest(
          nextProjectPlatformMarks,
          brandingSources.projectPlatformMarks,
          value,
          Boolean(layoutValue),
        )

        syncTargetPlatform(request)
        return
      }

      syncTargetAfter(
        () => handlePlatformMarkLayoutChange(value, field, layoutValue),
        {
          projectPlatformMarks: nextProjectPlatformMarks,
        },
      )
    }

    function handleTargetClearPlatformMarkImage(value: PlatformMarkValue) {
      const nextProjectPlatformMarks = clearPlatformMarkImage(
        targetProjectPlatformMarks,
        value,
      )

      syncTargetAfter(() => handleClearPlatformMarkImage(value), {
        projectPlatformMarks: nextProjectPlatformMarks,
      })
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
          getTechnicalMarksAfterCaseInsertTargetUpload(
            targetProjectTechnicalMarks,
            nextProjectTechnicalMarks,
            selectedDiscTemplate,
            value,
            assetId,
          )

        scheduleTargetBrandingMarkSlotSync({
          projectTechnicalMarks: nextTargetProjectTechnicalMarks,
        })
      })
    }

    function handleTargetTechnicalMarkToggle(
      value: TechnicalMarkValue,
      enabled: boolean,
    ) {
      syncTargetTechnical(
        getCaseInsertTargetTechnicalMarkToggleSyncRequest(
          updateTechnicalMarkToggle(
            targetProjectTechnicalMarks,
            value,
            enabled,
            selectedDiscTemplate,
          ),
          brandingSources.projectTechnicalMarks,
          value,
          enabled,
        ),
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

      syncTargetAfter(
        () => handleTechnicalMarkSourceChange(value, source, assetId),
        {
          projectTechnicalMarks: nextProjectTechnicalMarks,
        },
      )
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

      if (field === 'enabled') {
        syncTargetTechnical(
          getCaseInsertTargetTechnicalMarkLayoutSyncRequest(
            nextProjectTechnicalMarks,
            brandingSources.projectTechnicalMarks,
            value,
            Boolean(layoutValue),
            assetId,
          ),
        )
        return
      }

      syncTargetAfter(
        () =>
          handleTechnicalMarkLayoutChange(value, field, layoutValue, assetId),
        {
          projectTechnicalMarks: nextProjectTechnicalMarks,
        },
      )
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

      syncTargetAfter(
        () => handleTechnicalMarkLabelChange(value, label, assetId),
        {
          projectTechnicalMarks: nextProjectTechnicalMarks,
        },
      )
    }

    function handleTargetClearTechnicalMarkImage(
      value: TechnicalMarkValue,
      assetId?: string | null,
    ) {
      syncTargetAfter(() => handleClearTechnicalMarkImage(value, assetId))
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

      scheduleTargetBrandingMarkSlotSync({
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

      scheduleTargetBrandingMarkSlotSync({
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
