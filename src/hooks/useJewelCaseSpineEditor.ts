import {
  useCallback,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  getJewelCaseSpineSideScopedId,
  setJewelCaseSpineMirrored,
  updateProjectJewelCaseSpineSides,
  type JewelCaseSpineImageSlotGroupKey,
  type JewelCaseSpineImageSlotKey,
} from '../caseInsert/jewelCaseTransitions'
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
import type {
  CaseInsertTextStyleField,
  CaseInsertTextStyleValue,
} from '../caseInsert/textStyles'
import type { JewelCaseSpineSide } from '../caseInsert/types'
import type { LocalSteamScreenshotAsset } from '../local/localArtwork'
import type {
  AdditionalArtworkFrameField,
} from '../project/additionalArtworkFrame.ts'
import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextSource,
  ProjectJewelCaseState,
} from '../project/projectTypes'
import type { SteamArtworkAsset } from '../steam/steamApi'
import type { RemoteLogoCandidate } from '../steam/steamLogoCandidates'
import {
  applyJewelCaseSpineTextBlockLayoutPreset,
  applyJewelCaseSpineTextBlockStylePreset,
  applyJewelCaseSpineTitleLayoutPreset,
  applyJewelCaseSpineTitleStylePreset,
  resetJewelCaseSpineTextBlockDefaultLayout,
  resetJewelCaseSpineTextBlockDefaultStyle,
  resetJewelCaseSpineTitleDefaultLayout,
  resetJewelCaseSpineTitleDefaultStyle,
  setJewelCaseSpineTextBlockAlignValue,
  setJewelCaseSpineTextBlockAvoidVisualElements,
  setJewelCaseSpineTextBlockEnabled,
  setJewelCaseSpineTitleAlign,
  setJewelCaseSpineTitleAvoidVisualElements,
  setJewelCaseSpineTitleEnabled,
  updateJewelCaseSpineTextBlockLayoutValue,
  updateJewelCaseSpineTextBlockStyleValue,
  updateJewelCaseSpineTextBlockValue,
  updateJewelCaseSpineTitleLayoutValue,
  updateJewelCaseSpineTitleStyleValue,
  updateJewelCaseSpineTitleValue,
} from '../caseInsert/jewelCaseSpineTextActions'
import {
  clearJewelCaseSpineImageSlotImage,
  createDefaultJewelCaseSpineGroupedImageSlot,
  fitJewelCaseSpineImageSlotToRegionHeight,
  getSpineGroupedImageSlotResetLayout,
  preserveSpineGroupedSlotSource,
  resetJewelCaseSpineImageSlotDefaultLayout,
  restoreJewelCaseSpineTitleArtworkDefault,
  setJewelCaseSpineImageSlotEnabled,
  updateJewelCaseSpineImageSlotFit,
  updateJewelCaseSpineImageSlotLayoutValue,
} from '../caseInsert/jewelCaseSpineImageSlotActions'
import {
  useJewelCaseSpineSteamBannerEditor,
} from './useJewelCaseSpineSteamBannerEditor'
import {
  useJewelCaseSpineLogoEditor,
} from './useJewelCaseSpineLogoEditor'
import {
  normalizeCaseInsertLabel,
} from '../caseInsert/labelText'

type UseJewelCaseSpineEditorOptions = {
  setProjectJewelCase: Dispatch<SetStateAction<ProjectJewelCaseState>>
  announceStatus: (message: string) => void
}

export function useJewelCaseSpineEditor({
  setProjectJewelCase,
  announceStatus,
}: UseJewelCaseSpineEditorOptions) {
  const updateSpineSides = useCallback((
    side: JewelCaseSpineSide,
    updater: (
      spineSide: ProjectJewelCaseState['spine'][JewelCaseSpineSide],
      side: JewelCaseSpineSide,
    ) => ProjectJewelCaseState['spine'][JewelCaseSpineSide],
  ) => {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseSpineSides(currentCaseInsert, side, updater),
    )
  }, [setProjectJewelCase])

  const updateSpineImageSlot = useCallback((
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    updater: (slot: ProjectCaseInsertImageSlot) => ProjectCaseInsertImageSlot,
  ) => {
    updateSpineSides(side, (spineSide) => ({
      ...spineSide,
      [slotKey]: updater(spineSide[slotKey]),
    }))
  }, [updateSpineSides])

  const updateSpineGroupedImageSlot = useCallback((
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
    updater: (slot: ProjectCaseInsertImageSlot) => ProjectCaseInsertImageSlot,
    options: {
      enableAdditionalArtwork?: boolean
    } = {},
  ) => {
    updateSpineSides(side, (spineSide, targetSide) => {
      const targetSlotId = getJewelCaseSpineSideScopedId(targetSide, slotId)

      return {
        ...spineSide,
        additionalArtworkEnabled: slotKey === 'artworkSlots' &&
          options.enableAdditionalArtwork
          ? true
          : spineSide.additionalArtworkEnabled,
        [slotKey]: spineSide[slotKey].map((slot) =>
          slot.id === targetSlotId ? updater(slot) : slot),
      }
    })
  }, [updateSpineSides])

  const applySpineTextAction = useCallback(<TArgs extends unknown[]>(
    action: (
      state: ProjectJewelCaseState,
      ...args: TArgs
    ) => ProjectJewelCaseState,
    ...args: TArgs
  ) => {
    setProjectJewelCase((state) => action(state, ...args))
  }, [setProjectJewelCase])

  const applySpineImageSlotAction = useCallback(<TArgs extends unknown[]>(
    action: (
      state: ProjectJewelCaseState,
      ...args: TArgs
    ) => ProjectJewelCaseState,
    ...args: TArgs
  ) => {
    setProjectJewelCase((state) => action(state, ...args))
  }, [setProjectJewelCase])

  const {
    handleSpineSteamBannerEnabledChange,
    handleSpineSteamBannerLockupUpload,
    handleClearSpineSteamBannerLockup,
    handleSpineSteamBannerLockupLayoutChange,
    handleResetSpineSteamBannerLockupLayout,
    handleSpineSteamBannerUseTextFallbackChange,
    handleSpineSteamBannerFallbackTextChange,
    handleSpineSteamBannerColorChange,
    handleResetSpineSteamBannerColors,
  } = useJewelCaseSpineSteamBannerEditor({
    setProjectJewelCase,
    announceStatus,
  })

  const {
    handleAddSpineAdditionalLogoSlot,
    handleSpinePrimaryLogoSlotEnabledChange,
    handleSpinePrimaryLogoSlotUpload,
    handleSpinePrimaryLogoSlotLayoutChange,
    handleResetSpinePrimaryLogoSlotLayout,
    handleClearSpinePrimaryLogoSlot,
    handleUseSpineLogoCandidate,
  } = useJewelCaseSpineLogoEditor({
    setProjectJewelCase,
    announceStatus,
  })

  async function applySpineImageSlotSource(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    importedImagePromise: Promise<LoadedCaseInsertImageSlotSource | null>,
  ) {
    await applyLoadedCaseInsertImageSlotSource({
      announceStatus,
      importedImagePromise,
      applyImage: (image) =>
        updateSpineImageSlot(side, slotKey, (slot) =>
          setCaseInsertImageSlotImage(slot, image),
        ),
    })
  }

  async function applySpineGroupedImageSlotSource(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
    importedImagePromise: Promise<LoadedCaseInsertImageSlotSource | null>,
  ) {
    await applyLoadedCaseInsertImageSlotSource({
      announceStatus,
      importedImagePromise,
      applyImage: (image) =>
        updateSpineGroupedImageSlot(
          side,
          slotKey,
          slotId,
          (slot) => setCaseInsertImageSlotImage(slot, image),
          {
            enableAdditionalArtwork: slotKey === 'artworkSlots',
          },
        ),
    })
  }

  function handleSpineMirroredChange(mirrored: boolean) {
    setProjectJewelCase((currentCaseInsert) =>
      setJewelCaseSpineMirrored(currentCaseInsert, mirrored),
    )
    announceStatus(
      mirrored
        ? 'Mirrored spine editing enabled.'
        : 'Mirrored spine editing disabled.',
    )
  }

  function handleSpineTitleEnabledChange(
    side: JewelCaseSpineSide,
    enabled: boolean,
  ) {
    applySpineTextAction(setJewelCaseSpineTitleEnabled, side, enabled)
  }

  function handleSpineTitleValueChange(
    side: JewelCaseSpineSide,
    value: string,
    source?: ProjectCaseInsertTextSource,
  ) {
    applySpineTextAction(updateJewelCaseSpineTitleValue, side, value, source)
  }

  function handleSpineTitleAlignChange(
    side: JewelCaseSpineSide,
    align: ProjectCaseInsertTextAlign,
  ) {
    applySpineTextAction(setJewelCaseSpineTitleAlign, side, align)
  }

  function handleSpineTitleAvoidVisualElementsChange(
    side: JewelCaseSpineSide,
    avoidVisualElements: boolean,
  ) {
    applySpineTextAction(setJewelCaseSpineTitleAvoidVisualElements, side, avoidVisualElements)
  }

  function handleSpineTitleLayoutChange(
    side: JewelCaseSpineSide,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    applySpineTextAction(updateJewelCaseSpineTitleLayoutValue, side, field, value)
  }

  function handleApplySpineTitleLayoutPreset(
    side: JewelCaseSpineSide,
    presetId: string,
  ) {
    applySpineTextAction(applyJewelCaseSpineTitleLayoutPreset, side, presetId)
  }

  function handleSpineTitleOrientationChange(
    side: JewelCaseSpineSide,
    rotation: number,
  ) {
    handleSpineTitleLayoutChange(side, 'rotation', rotation)
  }

  function handleResetSpineTitleLayout(side: JewelCaseSpineSide) {
    applySpineTextAction(resetJewelCaseSpineTitleDefaultLayout, side)
  }

  function handleSpineTextBlockEnabledChange(
    side: JewelCaseSpineSide,
    textBlockId: string,
    enabled: boolean,
  ) {
    applySpineTextAction(setJewelCaseSpineTextBlockEnabled, side, textBlockId, enabled)
  }

  function handleSpineTextBlockValueChange(
    side: JewelCaseSpineSide,
    textBlockId: string,
    value: string,
    source?: ProjectCaseInsertTextSource,
  ) {
    applySpineTextAction(updateJewelCaseSpineTextBlockValue, side, textBlockId, value, source)
  }

  function handleSpineTextBlockAlignChange(
    side: JewelCaseSpineSide,
    textBlockId: string,
    align: ProjectCaseInsertTextAlign,
  ) {
    applySpineTextAction(setJewelCaseSpineTextBlockAlignValue, side, textBlockId, align)
  }

  function handleSpineTextBlockAvoidVisualElementsChange(
    side: JewelCaseSpineSide,
    textBlockId: string,
    avoidVisualElements: boolean,
  ) {
    applySpineTextAction(setJewelCaseSpineTextBlockAvoidVisualElements, side, textBlockId, avoidVisualElements)
  }

  function handleSpineTextBlockLayoutChange(
    side: JewelCaseSpineSide,
    textBlockId: string,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    applySpineTextAction(updateJewelCaseSpineTextBlockLayoutValue, side, textBlockId, field, value)
  }

  function handleApplySpineTextBlockLayoutPreset(
    side: JewelCaseSpineSide,
    textBlockId: string,
    presetId: string,
  ) {
    applySpineTextAction(applyJewelCaseSpineTextBlockLayoutPreset, side, textBlockId, presetId)
  }

  function handleSpineTextBlockOrientationChange(
    side: JewelCaseSpineSide,
    textBlockId: string,
    rotation: number,
  ) {
    handleSpineTextBlockLayoutChange(side, textBlockId, 'rotation', rotation)
  }

  function handleResetSpineTextBlockLayout(
    side: JewelCaseSpineSide,
    textBlockId: string,
  ) {
    applySpineTextAction(resetJewelCaseSpineTextBlockDefaultLayout, side, textBlockId)
  }

  function handleSpineTitleStyleChange(
    side: JewelCaseSpineSide,
    field: CaseInsertTextStyleField,
    value: CaseInsertTextStyleValue,
  ) {
    applySpineTextAction(updateJewelCaseSpineTitleStyleValue, side, field, value)
  }

  function handleApplySpineTitleStylePreset(
    side: JewelCaseSpineSide,
    presetId: string,
  ) {
    applySpineTextAction(applyJewelCaseSpineTitleStylePreset, side, presetId)
  }

  function handleResetSpineTitleStyle(side: JewelCaseSpineSide) {
    applySpineTextAction(resetJewelCaseSpineTitleDefaultStyle, side)
  }

  function handleSpineTextBlockStyleChange(
    side: JewelCaseSpineSide,
    textBlockId: string,
    field: CaseInsertTextStyleField,
    value: CaseInsertTextStyleValue,
  ) {
    applySpineTextAction(updateJewelCaseSpineTextBlockStyleValue, side, textBlockId, field, value)
  }

  function handleApplySpineTextBlockStylePreset(
    side: JewelCaseSpineSide,
    textBlockId: string,
    presetId: string,
  ) {
    applySpineTextAction(applyJewelCaseSpineTextBlockStylePreset, side, textBlockId, presetId)
  }

  function handleResetSpineTextBlockStyle(
    side: JewelCaseSpineSide,
    textBlockId: string,
  ) {
    applySpineTextAction(resetJewelCaseSpineTextBlockDefaultStyle, side, textBlockId)
  }

  async function handleSpineImageSlotUpload(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
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

    updateSpineImageSlot(side, slotKey, (slot) =>
      slotKey === 'titleArtwork'
        ? setCustomCaseInsertTitleArtworkImage(slot, image)
        : setCaseInsertImageSlotImage(slot, image),
    )
    announceStatus(`Selected ${uploadFile.statusLabel} image.`)
  }

  async function handleUseSpineImageSlotSteamArtwork(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    label: string,
    asset: SteamArtworkAsset,
  ) {
    await applySpineImageSlotSource(
      side,
      slotKey,
      loadSteamArtworkCaseInsertImageSlotImage({ announceStatus, asset, label }),
    )
  }

  async function handleUseSpineImageSlotLocalSteamScreenshot(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    label: string,
    asset: LocalSteamScreenshotAsset,
  ) {
    await applySpineImageSlotSource(
      side,
      slotKey,
      loadLocalSteamScreenshotCaseInsertImageSlotImage({ announceStatus, asset, label }),
    )
  }

  async function handleUseSpineImageSlotWebArtwork(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    label: string,
    candidate: RemoteLogoCandidate,
  ) {
    await applySpineImageSlotSource(
      side,
      slotKey,
      loadWebArtworkCaseInsertImageSlotImage({ announceStatus, candidate, label }),
    )
  }

  function handleSpineImageSlotEnabledChange(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    enabled: boolean,
  ) {
    applySpineImageSlotAction(
      setJewelCaseSpineImageSlotEnabled,
      side,
      slotKey,
      enabled,
    )
  }

  function handleSpineImageSlotFitChange(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    fit: ProjectCaseInsertImageFit,
  ) {
    applySpineImageSlotAction(
      updateJewelCaseSpineImageSlotFit,
      side,
      slotKey,
      fit,
    )
  }

  function handleSpineImageSlotLayoutChange(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    applySpineImageSlotAction(
      updateJewelCaseSpineImageSlotLayoutValue,
      side,
      slotKey,
      field,
      value,
    )
  }

  function handleResetSpineImageSlotLayout(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
  ) {
    applySpineImageSlotAction(
      resetJewelCaseSpineImageSlotDefaultLayout,
      side,
      slotKey,
    )
  }

  function handleRestoreSpineTitleArtworkDefault(side: JewelCaseSpineSide) {
    applySpineImageSlotAction(
      restoreJewelCaseSpineTitleArtworkDefault,
      side,
    )
    announceStatus('Restored game logo to the Steam default logo.')
  }

  function handleFitSpineImageSlotToRegion(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    label: string,
  ) {
    if (slotKey !== 'background') {
      return
    }

    applySpineImageSlotAction(
      fitJewelCaseSpineImageSlotToRegionHeight,
      side,
      slotKey,
    )
    announceStatus(`Fit ${normalizeCaseInsertLabel(label)} top to bottom.`)
  }

  function handleClearSpineImageSlot(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    label: string,
  ) {
    applySpineImageSlotAction(
      clearJewelCaseSpineImageSlotImage,
      side,
      slotKey,
    )
    announceStatus(`Cleared ${normalizeCaseInsertLabel(label)} image.`)
  }

  function handleAddSpineGroupedImageSlot(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseSpineSides(
        currentCaseInsert,
        side,
        (spineSide, targetSide) => {
          const slot = createDefaultJewelCaseSpineGroupedImageSlot(
            targetSide,
            slotKey,
            spineSide[slotKey],
          )

          return {
            ...spineSide,
            additionalArtworkEnabled: slotKey === 'artworkSlots'
              ? true
              : spineSide.additionalArtworkEnabled,
            [slotKey]: [...spineSide[slotKey], slot],
          }
        },
      ),
    )
    announceStatus(
      slotKey === 'artworkSlots'
        ? `Added ${side} spine artwork slot.`
        : slotKey === 'logoSlots'
          ? `Added ${side} spine logo slot.`
          : `Added ${side} spine mark slot.`,
    )
  }

  function handleSpineAdditionalArtworkEnabledChange(
    side: JewelCaseSpineSide,
    enabled: boolean,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseSpineSides(
        currentCaseInsert,
        side,
        (spineSide) => ({
          ...spineSide,
          additionalArtworkEnabled: enabled,
        }),
      ),
    )
  }

  function handleRemoveSpineGroupedImageSlot(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseSpineSides(
        currentCaseInsert,
        side,
        (spineSide, targetSide) => {
          const targetSlotId = getJewelCaseSpineSideScopedId(
            targetSide,
            slotId,
          )

          return {
            ...spineSide,
            [slotKey]: spineSide[slotKey].filter(
              (slot) => slot.id !== targetSlotId,
            ),
          }
        },
      ),
    )
    announceStatus(
      slotKey === 'artworkSlots'
        ? `Removed ${side} spine artwork slot.`
        : slotKey === 'logoSlots'
          ? `Removed ${side} spine logo slot.`
          : `Removed ${side} spine mark slot.`,
    )
  }

  function handleSpineGroupedImageSlotEnabledChange(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
    enabled: boolean,
  ) {
    updateSpineGroupedImageSlot(
      side,
      slotKey,
      slotId,
      (slot) => setCaseInsertImageSlotEnabled(slot, enabled),
      {
        enableAdditionalArtwork: enabled,
      },
    )
  }

  function handleSpineGroupedImageSlotLabelChange(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
    label: string,
  ) {
    const trimmedLabel = label.trim()

    updateSpineGroupedImageSlot(
      side,
      slotKey,
      slotId,
      (slot) => ({
        ...slot,
        label: trimmedLabel || slot.label,
      }),
    )
  }

  async function handleSpineGroupedImageSlotUpload(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
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

    updateSpineGroupedImageSlot(
      side,
      slotKey,
      slotId,
      (slot) => setCaseInsertImageSlotImage(
        slot,
        preserveSpineGroupedSlotSource(slotKey, slot, image),
      ),
      {
        enableAdditionalArtwork: slotKey === 'artworkSlots',
      },
    )
    announceStatus(`Selected ${uploadFile.statusLabel} image.`)
  }

  async function handleUseSpineGroupedImageSlotSteamArtwork(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
    label: string,
    asset: SteamArtworkAsset,
  ) {
    await applySpineGroupedImageSlotSource(
      side,
      slotKey,
      slotId,
      loadSteamArtworkCaseInsertImageSlotImage({ announceStatus, asset, label }),
    )
  }

  async function handleUseSpineGroupedImageSlotLocalSteamScreenshot(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
    label: string,
    asset: LocalSteamScreenshotAsset,
  ) {
    await applySpineGroupedImageSlotSource(
      side,
      slotKey,
      slotId,
      loadLocalSteamScreenshotCaseInsertImageSlotImage({ announceStatus, asset, label }),
    )
  }

  async function handleUseSpineGroupedImageSlotWebArtwork(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
    label: string,
    candidate: RemoteLogoCandidate,
  ) {
    await applySpineGroupedImageSlotSource(
      side,
      slotKey,
      slotId,
      loadWebArtworkCaseInsertImageSlotImage({ announceStatus, candidate, label }),
    )
  }

  function handleSpineGroupedImageSlotFitChange(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
    fit: ProjectCaseInsertImageFit,
  ) {
    updateSpineGroupedImageSlot(side, slotKey, slotId, (slot) =>
      updateCaseInsertImageSlotFit(slot, fit),
    )
  }

  function handleSpineGroupedImageSlotLayoutChange(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    updateSpineGroupedImageSlot(side, slotKey, slotId, (slot) =>
      updateCaseInsertImageSlotLayoutField(slot, field, value),
    )
  }

  function handleSpineGroupedImageSlotFrameChange(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
    field: AdditionalArtworkFrameField,
    value: boolean | number | string,
  ) {
    updateSpineGroupedImageSlot(side, slotKey, slotId, (slot) =>
      updateCaseInsertImageSlotFrameField(slot, field, value),
    )
  }

  function handleResetSpineGroupedImageSlotLayout(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
  ) {
    updateSpineSides(side, (spineSide, targetSide) => {
      const targetSlotId = getJewelCaseSpineSideScopedId(targetSide, slotId)

      return {
        ...spineSide,
        [slotKey]: spineSide[slotKey].map((slot) =>
          slot.id === targetSlotId
            ? {
                ...slot,
                layout: getSpineGroupedImageSlotResetLayout(
                  targetSide,
                  slotKey,
                  slot,
                ),
              }
            : slot),
      }
    })
  }

  function handleResetSpineGroupedImageSlotFrame(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
  ) {
    updateSpineGroupedImageSlot(
      side,
      slotKey,
      slotId,
      resetCaseInsertImageSlotFrame,
    )
  }

  function handleClearSpineGroupedImageSlot(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
    label: string,
  ) {
    updateSpineGroupedImageSlot(
      side,
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

  return {
    handleSpineMirroredChange,
    handleSpineTitleEnabledChange,
    handleSpineTitleValueChange,
    handleSpineTitleAlignChange,
    handleSpineTitleAvoidVisualElementsChange,
    handleSpineTitleLayoutChange,
    handleApplySpineTitleLayoutPreset,
    handleSpineTitleOrientationChange,
    handleResetSpineTitleLayout,
    handleSpineTitleStyleChange,
    handleApplySpineTitleStylePreset,
    handleResetSpineTitleStyle,
    handleSpineTextBlockEnabledChange,
    handleSpineTextBlockValueChange,
    handleSpineTextBlockAlignChange,
    handleSpineTextBlockAvoidVisualElementsChange,
    handleSpineTextBlockLayoutChange,
    handleApplySpineTextBlockLayoutPreset,
    handleSpineTextBlockOrientationChange,
    handleResetSpineTextBlockLayout,
    handleSpineTextBlockStyleChange,
    handleApplySpineTextBlockStylePreset,
    handleResetSpineTextBlockStyle,
    handleSpineImageSlotUpload,
    handleUseSpineImageSlotSteamArtwork,
    handleUseSpineImageSlotLocalSteamScreenshot,
    handleUseSpineImageSlotWebArtwork,
    handleSpineImageSlotEnabledChange,
    handleSpineImageSlotFitChange,
    handleSpineImageSlotLayoutChange,
    handleResetSpineImageSlotLayout,
    handleRestoreSpineTitleArtworkDefault,
    handleFitSpineImageSlotToRegion,
    handleClearSpineImageSlot,
    handleSpineSteamBannerEnabledChange,
    handleSpineSteamBannerLockupUpload,
    handleClearSpineSteamBannerLockup,
    handleSpineSteamBannerLockupLayoutChange,
    handleResetSpineSteamBannerLockupLayout,
    handleSpineSteamBannerUseTextFallbackChange,
    handleSpineSteamBannerFallbackTextChange,
    handleSpineSteamBannerColorChange,
    handleResetSpineSteamBannerColors,
    handleSpineAdditionalArtworkEnabledChange,
    handleAddSpineGroupedImageSlot,
    handleAddSpineAdditionalLogoSlot,
    handleRemoveSpineGroupedImageSlot,
    handleSpineGroupedImageSlotEnabledChange,
    handleSpineGroupedImageSlotLabelChange,
    handleSpineGroupedImageSlotUpload,
    handleUseSpineGroupedImageSlotSteamArtwork,
    handleUseSpineGroupedImageSlotLocalSteamScreenshot,
    handleUseSpineGroupedImageSlotWebArtwork,
    handleSpineGroupedImageSlotFitChange,
    handleSpineGroupedImageSlotLayoutChange,
    handleSpineGroupedImageSlotFrameChange,
    handleResetSpineGroupedImageSlotLayout,
    handleResetSpineGroupedImageSlotFrame,
    handleClearSpineGroupedImageSlot,
    handleSpinePrimaryLogoSlotEnabledChange,
    handleSpinePrimaryLogoSlotUpload,
    handleSpinePrimaryLogoSlotLayoutChange,
    handleResetSpinePrimaryLogoSlotLayout,
    handleClearSpinePrimaryLogoSlot,
    handleUseSpineLogoCandidate,
  }
}

export type JewelCaseSpineEditorActions = ReturnType<
  typeof useJewelCaseSpineEditor
>
