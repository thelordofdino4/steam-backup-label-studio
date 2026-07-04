import {
  useCallback,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  addCaseInsertTemplateImageSlot,
  getCaseInsertImageSlotGroupConfig,
  removeCaseInsertTemplateImageSlot,
  renameCaseInsertTemplateImageSlot,
  setCaseInsertTemplateAdditionalArtworkEnabled,
  updateCaseInsertTemplateImageSlot,
  updateCaseInsertTemplateImageSlotInGroup,
  updateCaseInsertTemplateTextBlock,
  updateProjectCaseInsertTemplate,
  type CaseInsertPrimaryImageSlotKey,
} from '../caseInsert/templateSurfaceTransitions'
import {
  clearCaseInsertAdditionalLogoSlotImage,
} from '../caseInsert/brandingLogoSlots'
import {
  resetCaseInsertImageSlotFrame,
  setCaseInsertImageSlotEnabled,
  setCaseInsertImageSlotImage,
  updateCaseInsertImageSlotFit,
  updateCaseInsertImageSlotFrameField,
  updateCaseInsertImageSlotLayoutField,
} from '../caseInsert/imageSlotTransitions'
import {
  setCustomCaseInsertTitleArtworkImage,
} from '../caseInsert/titleArtwork'
import {
  getCaseInsertImageSlotUploadFile,
  loadLocalSteamScreenshotCaseInsertImageSlotImage,
  loadSteamArtworkCaseInsertImageSlotImage,
  loadUploadedCaseInsertImageSlotImage,
  loadWebArtworkCaseInsertImageSlotImage,
} from '../caseInsert/imageSlotSourceImport'
import {
  applyLoadedCaseInsertImageSlotSource,
  type LoadedCaseInsertImageSlotSource,
} from '../caseInsert/imageSlotSourceApply'
import {
  applyCaseInsertTextBlockPresetLayout,
  applyCaseInsertTextBlockStylePreset,
  resetCaseInsertTextBlockStyle,
  setCaseInsertTextBlockAvoidVisualElements,
  setCaseInsertTextBlockEnabled,
  updateCaseInsertTextBlockStyleField,
  updateCaseInsertTextBlockLayoutField,
  updateCaseInsertTextBlockValue,
} from '../caseInsert/textTransitions'
import type {
  CaseInsertTextStyleField,
  CaseInsertTextStyleValue,
} from '../caseInsert/textStyles'
import type {
  CaseInsertImageSlotGroupKey,
  CaseInsertTemplatePaneId,
} from '../caseInsert/templateSurfaces'
import type { LocalSteamScreenshotAsset } from '../local/localArtwork'
import type {
  AdditionalArtworkFrameField,
} from '../project/additionalArtworkFrame.ts'
import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextSource,
  ProjectJewelCaseState,
} from '../project/projectTypes'
import type { SteamArtworkAsset } from '../steam/steamApi'
import type { RemoteLogoCandidate } from '../steam/steamLogoCandidates'
import {
  clearCaseInsertTemplatePrimaryImageSlot,
  fitCaseInsertTemplatePrimaryImageSlotToRegionHeight,
  getCaseInsertTemplateGroupedImageSlotResetLayout,
  preserveCaseInsertTemplateGroupedSlotSource,
  resetCaseInsertTemplatePrimaryImageSlotDefaultLayout,
  restoreCaseInsertTemplateTitleArtworkDefault,
  setCaseInsertTemplatePrimaryImageSlotEnabled,
  updateCaseInsertTemplatePrimaryImageSlotFit,
  updateCaseInsertTemplatePrimaryImageSlotLayoutValue,
} from '../caseInsert/templateSurfaceImageSlotActions'
import {
  addCaseInsertTemplateTextListItem,
  applyCaseInsertTemplateTextListLayoutPreset,
  applyCaseInsertTemplateTextListStylePreset,
  getDefaultCaseInsertTemplateTextBlockLayout,
  resetCaseInsertTemplateTextBlockLayout,
  removeCaseInsertTemplateTextListItem,
  resetCaseInsertTemplateTextListDefaultLayout,
  resetCaseInsertTemplateTextListDefaultStyle,
  setCaseInsertTemplateTextBlockAlign,
  setCaseInsertTemplateTextListAvoidVisualElements,
  setCaseInsertTemplateTextListEnabled,
  updateCaseInsertTemplateTextListItemValue,
  updateCaseInsertTemplateTextListLayoutValue,
  updateCaseInsertTemplateTextListStyleValue,
} from '../caseInsert/templateSurfaceTextActions'
import {
  useCaseInsertTemplateSteamBannerEditor,
} from './useCaseInsertTemplateSteamBannerEditor'
import {
  useCaseInsertTemplateLogoEditor,
} from './useCaseInsertTemplateLogoEditor'
import {
  normalizeCaseInsertLabel,
} from '../caseInsert/labelText'

type UseCaseInsertTemplateEditorOptions = {
  setProjectJewelCase: Dispatch<SetStateAction<ProjectJewelCaseState>>
  announceStatus: (message: string) => void
}

export function useCaseInsertTemplateEditor({
  setProjectJewelCase,
  announceStatus,
}: UseCaseInsertTemplateEditorOptions) {
  const updatePrimaryImageSlot = useCallback((
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    updater: Parameters<typeof updateCaseInsertTemplateImageSlot>[3],
  ) => {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateImageSlot(
        currentCaseInsert,
        paneId,
        slotKey,
        updater,
      ),
    )
  }, [setProjectJewelCase])

  const updateGroupedImageSlot = useCallback((
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    updater: Parameters<typeof updateCaseInsertTemplateImageSlotInGroup>[4],
    options: {
      enableAdditionalArtwork?: boolean
    } = {},
  ) => {
    setProjectJewelCase((currentCaseInsert) => {
      const nextCaseInsert = updateCaseInsertTemplateImageSlotInGroup(
        currentCaseInsert,
        paneId,
        slotKey,
        slotId,
        updater,
      )

      return slotKey === 'artworkSlots' && options.enableAdditionalArtwork
        ? setCaseInsertTemplateAdditionalArtworkEnabled(
            nextCaseInsert,
            paneId,
            true,
          )
        : nextCaseInsert
    })
  }, [setProjectJewelCase])

  const updateTextBlock = useCallback((
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
    updater: Parameters<typeof updateCaseInsertTemplateTextBlock>[3],
  ) => {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateTextBlock(
        currentCaseInsert,
        paneId,
        textBlockId,
        updater,
      ),
    )
  }, [setProjectJewelCase])

  const applyTemplateTextListAction = useCallback(<TArgs extends unknown[]>(
    action: (
      state: ProjectJewelCaseState,
      ...args: TArgs
    ) => ProjectJewelCaseState,
    ...args: TArgs
  ) => {
    setProjectJewelCase((state) => action(state, ...args))
  }, [setProjectJewelCase])

  const applyPrimaryImageSlotAction = useCallback(<TArgs extends unknown[]>(
    action: (
      state: ProjectJewelCaseState,
      ...args: TArgs
    ) => ProjectJewelCaseState,
    ...args: TArgs
  ) => {
    setProjectJewelCase((state) => action(state, ...args))
  }, [setProjectJewelCase])

  const {
    handleSteamBannerEnabledChange,
    handleSteamBannerLockupUpload,
    handleClearSteamBannerLockup,
    handleSteamBannerLockupLayoutChange,
    handleResetSteamBannerLockupLayout,
    handleSteamBannerUseTextFallbackChange,
    handleSteamBannerFallbackTextChange,
    handleSteamBannerColorChange,
    handleResetSteamBannerColors,
  } = useCaseInsertTemplateSteamBannerEditor({
    setProjectJewelCase,
    announceStatus,
  })
  const {
    handlePrimaryLogoSlotEnabledChange,
    handlePrimaryLogoSlotUpload,
    handlePrimaryLogoSlotLayoutChange,
    handleResetPrimaryLogoSlotLayout,
    handleClearPrimaryLogoSlot,
    handleAddAdditionalLogoSlot,
    handleUseLogoCandidate,
  } = useCaseInsertTemplateLogoEditor({
    setProjectJewelCase,
    announceStatus,
  })

  async function applyPrimaryImageSlotSource(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    importedImagePromise: Promise<LoadedCaseInsertImageSlotSource | null>,
  ) {
    await applyLoadedCaseInsertImageSlotSource({
      announceStatus,
      importedImagePromise,
      applyImage: (image) =>
        updatePrimaryImageSlot(paneId, slotKey, (slot) =>
          setCaseInsertImageSlotImage(slot, image),
        ),
    })
  }

  async function applyGroupedImageSlotSource(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    importedImagePromise: Promise<LoadedCaseInsertImageSlotSource | null>,
  ) {
    await applyLoadedCaseInsertImageSlotSource({
      announceStatus,
      importedImagePromise,
      applyImage: (image) =>
        updateGroupedImageSlot(
          paneId,
          slotKey,
          slotId,
          (slot) => setCaseInsertImageSlotImage(slot, image),
          {
            enableAdditionalArtwork: slotKey === 'artworkSlots',
          },
        ),
    })
  }

  async function handleImageSlotUpload(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    label: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const uploadFile = getCaseInsertImageSlotUploadFile({
      announceStatus,
      event,
      label,
    })

    if (!uploadFile) {
      return
    }

    const image = await loadUploadedCaseInsertImageSlotImage({
      announceStatus,
      uploadFile,
    })

    if (!image) {
      return
    }

    updatePrimaryImageSlot(paneId, slotKey, (slot) =>
      slotKey === 'titleArtwork'
        ? setCustomCaseInsertTitleArtworkImage(slot, image)
        : setCaseInsertImageSlotImage(slot, image),
    )
    announceStatus(`Selected ${uploadFile.statusLabel} image.`)
  }

  async function handleUseImageSlotSteamArtwork(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    label: string,
    asset: SteamArtworkAsset,
  ) {
    await applyPrimaryImageSlotSource(
      paneId,
      slotKey,
      loadSteamArtworkCaseInsertImageSlotImage({ announceStatus, asset, label }),
    )
  }

  async function handleUseImageSlotLocalSteamScreenshot(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    label: string,
    asset: LocalSteamScreenshotAsset,
  ) {
    await applyPrimaryImageSlotSource(
      paneId,
      slotKey,
      loadLocalSteamScreenshotCaseInsertImageSlotImage({ announceStatus, asset, label }),
    )
  }

  async function handleUseImageSlotWebArtwork(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    label: string,
    candidate: RemoteLogoCandidate,
  ) {
    await applyPrimaryImageSlotSource(
      paneId,
      slotKey,
      loadWebArtworkCaseInsertImageSlotImage({ announceStatus, candidate, label }),
    )
  }

  function handleImageSlotEnabledChange(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    enabled: boolean,
  ) {
    applyPrimaryImageSlotAction(
      setCaseInsertTemplatePrimaryImageSlotEnabled,
      paneId,
      slotKey,
      enabled,
    )
  }

  function handleImageSlotFitChange(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    fit: ProjectCaseInsertImageFit,
  ) {
    applyPrimaryImageSlotAction(
      updateCaseInsertTemplatePrimaryImageSlotFit,
      paneId,
      slotKey,
      fit,
    )
  }

  function handleImageSlotLayoutChange(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    applyPrimaryImageSlotAction(
      updateCaseInsertTemplatePrimaryImageSlotLayoutValue,
      paneId,
      slotKey,
      field,
      value,
    )
  }

  function handleResetImageSlotLayout(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
  ) {
    applyPrimaryImageSlotAction(
      resetCaseInsertTemplatePrimaryImageSlotDefaultLayout,
      paneId,
      slotKey,
    )
  }

  function handleRestoreTitleArtworkDefault(paneId: CaseInsertTemplatePaneId) {
    applyPrimaryImageSlotAction(
      restoreCaseInsertTemplateTitleArtworkDefault,
      paneId,
    )
    announceStatus('Restored game logo to the Steam default logo.')
  }

  function handleFitImageSlotToRegion(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    label: string,
  ) {
    if (slotKey !== 'background') {
      return
    }

    applyPrimaryImageSlotAction(
      fitCaseInsertTemplatePrimaryImageSlotToRegionHeight,
      paneId,
      slotKey,
    )
    announceStatus(`Fit ${normalizeCaseInsertLabel(label)} top to bottom.`)
  }

  function handleClearImageSlot(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
    label: string,
  ) {
    applyPrimaryImageSlotAction(
      clearCaseInsertTemplatePrimaryImageSlot,
      paneId,
      slotKey,
    )
    announceStatus(`Cleared ${normalizeCaseInsertLabel(label)} image.`)
  }

  function handleAddGroupedImageSlot(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
  ) {
    const label = normalizeCaseInsertLabel(
      getCaseInsertImageSlotGroupConfig(paneId, slotKey).labelPrefix,
    )

    setProjectJewelCase((currentCaseInsert) =>
      addCaseInsertTemplateImageSlot(currentCaseInsert, paneId, slotKey),
    )
    announceStatus(`Added ${label} slot.`)
  }

  function handleAdditionalArtworkEnabledChange(
    paneId: CaseInsertTemplatePaneId,
    enabled: boolean,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      setCaseInsertTemplateAdditionalArtworkEnabled(
        currentCaseInsert,
        paneId,
        enabled,
      ),
    )
  }

  function handleRemoveGroupedImageSlot(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
  ) {
    const label = normalizeCaseInsertLabel(
      getCaseInsertImageSlotGroupConfig(paneId, slotKey).labelPrefix,
    )

    setProjectJewelCase((currentCaseInsert) =>
      removeCaseInsertTemplateImageSlot(
        currentCaseInsert,
        paneId,
        slotKey,
        slotId,
      ),
    )
    announceStatus(`Removed ${label} slot.`)
  }

  function handleGroupedImageSlotEnabledChange(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    enabled: boolean,
  ) {
    updateGroupedImageSlot(
      paneId,
      slotKey,
      slotId,
      (slot) => setCaseInsertImageSlotEnabled(slot, enabled),
      {
        enableAdditionalArtwork: enabled,
      },
    )
  }

  function handleGroupedImageSlotLabelChange(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    label: string,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectCaseInsertTemplate(currentCaseInsert, paneId, (templateState) =>
        renameCaseInsertTemplateImageSlot(templateState, slotKey, slotId, label),
      ),
    )
  }

  async function handleGroupedImageSlotUpload(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    label: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const uploadFile = getCaseInsertImageSlotUploadFile({
      announceStatus,
      event,
      label,
    })

    if (!uploadFile) {
      return
    }

    const image = await loadUploadedCaseInsertImageSlotImage({
      announceStatus,
      uploadFile,
    })

    if (!image) {
      return
    }

    updateGroupedImageSlot(
      paneId,
      slotKey,
      slotId,
      (slot) => setCaseInsertImageSlotImage(
        slot,
        preserveCaseInsertTemplateGroupedSlotSource(slotKey, slot, image),
      ),
      {
        enableAdditionalArtwork: slotKey === 'artworkSlots',
      },
    )
    announceStatus(`Selected ${uploadFile.statusLabel} image.`)
  }

  async function handleUseGroupedImageSlotSteamArtwork(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    label: string,
    asset: SteamArtworkAsset,
  ) {
    await applyGroupedImageSlotSource(
      paneId,
      slotKey,
      slotId,
      loadSteamArtworkCaseInsertImageSlotImage({ announceStatus, asset, label }),
    )
  }

  async function handleUseGroupedImageSlotLocalSteamScreenshot(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    label: string,
    asset: LocalSteamScreenshotAsset,
  ) {
    await applyGroupedImageSlotSource(
      paneId,
      slotKey,
      slotId,
      loadLocalSteamScreenshotCaseInsertImageSlotImage({ announceStatus, asset, label }),
    )
  }

  async function handleUseGroupedImageSlotWebArtwork(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    label: string,
    candidate: RemoteLogoCandidate,
  ) {
    await applyGroupedImageSlotSource(
      paneId,
      slotKey,
      slotId,
      loadWebArtworkCaseInsertImageSlotImage({ announceStatus, candidate, label }),
    )
  }

  function handleGroupedImageSlotFitChange(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    fit: ProjectCaseInsertImageFit,
  ) {
    updateGroupedImageSlot(paneId, slotKey, slotId, (slot) =>
      updateCaseInsertImageSlotFit(slot, fit),
    )
  }

  function handleGroupedImageSlotLayoutChange(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    updateGroupedImageSlot(paneId, slotKey, slotId, (slot) =>
      updateCaseInsertImageSlotLayoutField(slot, field, value),
    )
  }

  function handleGroupedImageSlotFrameChange(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    field: AdditionalArtworkFrameField,
    value: boolean | number | string,
  ) {
    updateGroupedImageSlot(paneId, slotKey, slotId, (slot) =>
      updateCaseInsertImageSlotFrameField(slot, field, value),
    )
  }

  function handleResetGroupedImageSlotLayout(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
  ) {
    updateGroupedImageSlot(paneId, slotKey, slotId, (slot) => ({
      ...slot,
      layout: getCaseInsertTemplateGroupedImageSlotResetLayout(
        paneId,
        slotKey,
        slot,
      ),
    }))
  }

  function handleResetGroupedImageSlotFrame(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
  ) {
    updateGroupedImageSlot(paneId, slotKey, slotId, resetCaseInsertImageSlotFrame)
  }

  function handleClearGroupedImageSlot(
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
    label: string,
  ) {
    updateGroupedImageSlot(
      paneId,
      slotKey,
      slotId,
      (slot) => slotKey === 'logoSlots'
        ? clearCaseInsertAdditionalLogoSlotImage(slot)
        : {
            ...slot,
            imageDataUrl: null,
            imageSize: null,
            imageSource: null,
          },
    )
    announceStatus(`Cleared ${normalizeCaseInsertLabel(label)} image.`)
  }

  function handleTextBlockEnabledChange(
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
    enabled: boolean,
  ) {
    updateTextBlock(
      paneId,
      textBlockId,
      (textBlock) => setCaseInsertTextBlockEnabled(textBlock, enabled),
    )
  }

  function handleTextBlockValueChange(
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
    value: string,
    source?: ProjectCaseInsertTextSource,
  ) {
    updateTextBlock(
      paneId,
      textBlockId,
      (textBlock) => updateCaseInsertTextBlockValue(
        textBlock,
        value,
        source,
      ),
    )
  }

  function handleTextBlockAlignChange(
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
    align: ProjectCaseInsertTextAlign,
  ) {
    updateTextBlock(
      paneId,
      textBlockId,
      (textBlock) => setCaseInsertTemplateTextBlockAlign(textBlock, align),
    )
  }

  function handleTextBlockAvoidVisualElementsChange(
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
    avoidVisualElements: boolean,
  ) {
    updateTextBlock(
      paneId,
      textBlockId,
      (textBlock) => setCaseInsertTextBlockAvoidVisualElements(
        textBlock,
        avoidVisualElements,
      ),
    )
  }

  function handleTextBlockLayoutChange(
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    updateTextBlock(
      paneId,
      textBlockId,
      (textBlock) =>
        updateCaseInsertTextBlockLayoutField(textBlock, field, value),
    )
  }

  function handleApplyTextBlockLayoutPreset(
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
    presetId: string,
  ) {
    updateTextBlock(
      paneId,
      textBlockId,
      (textBlock) =>
        applyCaseInsertTextBlockPresetLayout(paneId, textBlock, presetId),
    )
  }

  function handleResetTextBlockLayout(
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
  ) {
    const layout = getDefaultCaseInsertTemplateTextBlockLayout(textBlockId)

    if (!layout) {
      return
    }

    updateTextBlock(
      paneId,
      textBlockId,
      (textBlock) => resetCaseInsertTemplateTextBlockLayout(textBlock, layout),
    )
  }

  function handleTextBlockStyleChange(
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
    field: CaseInsertTextStyleField,
    value: CaseInsertTextStyleValue,
  ) {
    updateTextBlock(
      paneId,
      textBlockId,
      (textBlock) =>
        updateCaseInsertTextBlockStyleField(textBlock, field, value),
    )
  }

  function handleApplyTextBlockStylePreset(
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
    presetId: string,
  ) {
    updateTextBlock(
      paneId,
      textBlockId,
      (textBlock) => applyCaseInsertTextBlockStylePreset(textBlock, presetId),
    )
  }

  function handleResetTextBlockStyle(
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
  ) {
    updateTextBlock(paneId, textBlockId, resetCaseInsertTextBlockStyle)
  }

  function handleTextListEnabledChange(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
    enabled: boolean,
  ) {
    applyTemplateTextListAction(
      setCaseInsertTemplateTextListEnabled,
      paneId,
      textListId,
      enabled,
    )
  }

  function handleAddTextListItem(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
  ) {
    applyTemplateTextListAction(
      addCaseInsertTemplateTextListItem,
      paneId,
      textListId,
    )
  }

  function handleTextListItemValueChange(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
    index: number,
    value: string,
  ) {
    applyTemplateTextListAction(
      updateCaseInsertTemplateTextListItemValue,
      paneId,
      textListId,
      index,
      value,
    )
  }

  function handleTextListAvoidVisualElementsChange(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
    avoidVisualElements: boolean,
  ) {
    applyTemplateTextListAction(
      setCaseInsertTemplateTextListAvoidVisualElements,
      paneId,
      textListId,
      avoidVisualElements,
    )
  }

  function handleRemoveTextListItem(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
    index: number,
  ) {
    applyTemplateTextListAction(
      removeCaseInsertTemplateTextListItem,
      paneId,
      textListId,
      index,
    )
  }

  function handleTextListLayoutChange(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    applyTemplateTextListAction(
      updateCaseInsertTemplateTextListLayoutValue,
      paneId,
      textListId,
      field,
      value,
    )
  }

  function handleApplyTextListLayoutPreset(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
    presetId: string,
  ) {
    applyTemplateTextListAction(
      applyCaseInsertTemplateTextListLayoutPreset,
      paneId,
      textListId,
      presetId,
    )
  }

  function handleResetTextListLayout(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
  ) {
    applyTemplateTextListAction(
      resetCaseInsertTemplateTextListDefaultLayout,
      paneId,
      textListId,
    )
  }

  function handleTextListStyleChange(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
    field: CaseInsertTextStyleField,
    value: CaseInsertTextStyleValue,
  ) {
    applyTemplateTextListAction(
      updateCaseInsertTemplateTextListStyleValue,
      paneId,
      textListId,
      field,
      value,
    )
  }

  function handleApplyTextListStylePreset(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
    presetId: string,
  ) {
    applyTemplateTextListAction(
      applyCaseInsertTemplateTextListStylePreset,
      paneId,
      textListId,
      presetId,
    )
  }

  function handleResetTextListStyle(
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
  ) {
    applyTemplateTextListAction(
      resetCaseInsertTemplateTextListDefaultStyle,
      paneId,
      textListId,
    )
  }

  return {
    handleImageSlotUpload,
    handleUseImageSlotSteamArtwork,
    handleUseImageSlotLocalSteamScreenshot,
    handleUseImageSlotWebArtwork,
    handleImageSlotEnabledChange,
    handleImageSlotFitChange,
    handleImageSlotLayoutChange,
    handleResetImageSlotLayout,
    handleRestoreTitleArtworkDefault,
    handleFitImageSlotToRegion,
    handleClearImageSlot,
    handleSteamBannerEnabledChange,
    handleSteamBannerLockupUpload,
    handleClearSteamBannerLockup,
    handleSteamBannerLockupLayoutChange,
    handleResetSteamBannerLockupLayout,
    handleSteamBannerUseTextFallbackChange,
    handleSteamBannerFallbackTextChange,
    handleSteamBannerColorChange,
    handleResetSteamBannerColors,
    handlePrimaryLogoSlotEnabledChange,
    handlePrimaryLogoSlotUpload,
    handlePrimaryLogoSlotLayoutChange,
    handleResetPrimaryLogoSlotLayout,
    handleClearPrimaryLogoSlot,
    handleAdditionalArtworkEnabledChange,
    handleAddGroupedImageSlot,
    handleAddAdditionalLogoSlot,
    handleRemoveGroupedImageSlot,
    handleGroupedImageSlotEnabledChange,
    handleGroupedImageSlotLabelChange,
    handleGroupedImageSlotUpload,
    handleUseGroupedImageSlotSteamArtwork,
    handleUseGroupedImageSlotLocalSteamScreenshot,
    handleUseGroupedImageSlotWebArtwork,
    handleGroupedImageSlotFitChange,
    handleGroupedImageSlotLayoutChange,
    handleGroupedImageSlotFrameChange,
    handleResetGroupedImageSlotLayout,
    handleResetGroupedImageSlotFrame,
    handleClearGroupedImageSlot,
    handleUseLogoCandidate,
    handleTextBlockEnabledChange,
    handleTextBlockValueChange,
    handleTextBlockAlignChange,
    handleTextBlockAvoidVisualElementsChange,
    handleTextBlockLayoutChange,
    handleApplyTextBlockLayoutPreset,
    handleResetTextBlockLayout,
    handleTextBlockStyleChange,
    handleApplyTextBlockStylePreset,
    handleResetTextBlockStyle,
    handleTextListEnabledChange,
    handleAddTextListItem,
    handleTextListItemValueChange,
    handleTextListAvoidVisualElementsChange,
    handleRemoveTextListItem,
    handleTextListLayoutChange,
    handleApplyTextListLayoutPreset,
    handleResetTextListLayout,
    handleTextListStyleChange,
    handleApplyTextListStylePreset,
    handleResetTextListStyle,
  }
}

export type CaseInsertTemplateEditorActions = ReturnType<
  typeof useCaseInsertTemplateEditor
>
