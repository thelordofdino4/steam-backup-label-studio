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
  createDefaultCaseInsertImageSlot,
  createDefaultJewelCaseSpineArtworkSlot,
  createDefaultJewelCaseSpineMarkSlot,
} from '../caseInsert/defaults'
import {
  CASE_INSERT_DEFAULT_IMPORTED_SPINE_TITLE_ARTWORK_LAYOUT,
} from '../caseInsert/defaultImportLayouts'
import {
  addCaseInsertAdditionalLogoSlot,
  clearCaseInsertAdditionalLogoSlotImage,
  clearCaseInsertPrimaryLogoSlotImage,
  getCaseInsertPrimaryLogoLabel,
  resetCaseInsertPrimaryLogoSlotLayout,
  setCaseInsertPrimaryLogoSlotEnabled,
  setCaseInsertPrimaryLogoSlotImage,
  updateCaseInsertPrimaryLogoSlotLayoutField,
  withCaseInsertAdditionalLogoImageSource,
} from '../caseInsert/brandingLogoSlots'
import {
  fitCaseInsertImageSlotToRegionHeight,
  resetCaseInsertImageSlotFrame,
  setCaseInsertImageSlotEnabled,
  setCaseInsertImageSlotImage,
  updateCaseInsertImageSlotFit,
  updateCaseInsertImageSlotFrameField,
  updateCaseInsertImageSlotLayoutField,
} from '../caseInsert/imageSlotTransitions'
import {
  restoreCaseInsertTitleArtworkDefaultSteamLogo,
  setCustomCaseInsertTitleArtworkImage,
} from '../caseInsert/titleArtwork'
import {
  getNextRepeatedArtworkSlotNumber,
} from '../editor/repeatedArtwork'
import {
  resetCaseInsertSteamBannerColors,
  resetCaseInsertSteamBannerLockupImage,
  resetCaseInsertSteamBannerLockupLayout,
  setCaseInsertSteamBannerEnabled,
  setCaseInsertSteamBannerUseTextFallback,
  setCustomCaseInsertSteamBannerLockupImage,
  updateCaseInsertSteamBannerColor,
  updateCaseInsertSteamBannerFallbackText,
  updateCaseInsertSteamBannerLockupLayoutField,
  type CaseInsertSteamBannerColorField,
  type CaseInsertSteamBannerLayoutField,
} from '../caseInsert/steamBanner'
import { createCaseInsertPngExportLayout } from '../caseInsert/exportLayout'
import {
  getJewelCaseSteamBannerOpenArtworkRegion,
} from '../layout/jewelCaseSteamBannerLayout'
import {
  createLogoCandidateCaseInsertImageSlotImage,
  createLocalSteamScreenshotCaseInsertImageSlotImage,
  createSteamArtworkCaseInsertImageSlotImage,
  createUploadedCaseInsertImageSlotImage,
  createWebArtworkCaseInsertImageSlotImage,
} from '../caseInsert/imageSlotSourceImport'
import type {
  CaseInsertImageSlotImageInput,
} from '../caseInsert/types'
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
import type { JewelCaseSpineSide } from '../caseInsert/types'
import type { LocalSteamScreenshotAsset } from '../local/localArtwork'
import type {
  AdditionalArtworkFrameField,
} from '../project/additionalArtworkFrame.ts'
import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertSteamBanner,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextSource,
  ProjectJewelCaseState,
} from '../project/projectTypes'
import type { LogoAssetKey } from '../project/projectLogoAssets'
import type { SteamArtworkAsset } from '../steam/steamApi'
import type { RemoteLogoCandidate } from '../steam/steamLogoCandidates'
import { isImageFile } from '../utils/importedImageAsset'

type UseJewelCaseSpineEditorOptions = {
  setProjectJewelCase: Dispatch<SetStateAction<ProjectJewelCaseState>>
  announceStatus: (message: string) => void
}

const defaultSpineTitleLayouts: Record<JewelCaseSpineSide, ProjectCaseInsertLayout> = {
  left: { scale: 1, width: 90, x: 50, y: 50, rotation: -90 },
  right: { scale: 1, width: 90, x: 50, y: 50, rotation: 90 },
}

const defaultSpineTextBlockLayouts: Record<
  JewelCaseSpineSide,
  Record<string, ProjectCaseInsertLayout>
> = {
  left: {
    'subtitle-text': { scale: 0.78, width: 74, x: 50, y: 42, rotation: -90 },
    'disc-number': { scale: 0.7, width: 46, x: 50, y: 60, rotation: -90 },
    'backup-date': { scale: 0.68, width: 48, x: 50, y: 68, rotation: -90 },
    'steam-app-id': { scale: 0.66, width: 48, x: 50, y: 76, rotation: -90 },
    'developer-text': { scale: 0.68, width: 48, x: 50, y: 84, rotation: -90 },
    'publisher-text': { scale: 0.68, width: 48, x: 50, y: 88, rotation: -90 },
    'install-notes': { scale: 0.66, width: 58, x: 50, y: 72, rotation: -90 },
    'custom-note': { scale: 0.72, width: 58, x: 50, y: 78, rotation: -90 },
    'copyright-text': { scale: 0.62, width: 68, x: 50, y: 92, rotation: -90 },
  },
  right: {
    'subtitle-text': { scale: 0.78, width: 74, x: 50, y: 42, rotation: 90 },
    'disc-number': { scale: 0.7, width: 46, x: 50, y: 60, rotation: 90 },
    'backup-date': { scale: 0.68, width: 48, x: 50, y: 68, rotation: 90 },
    'steam-app-id': { scale: 0.66, width: 48, x: 50, y: 76, rotation: 90 },
    'developer-text': { scale: 0.68, width: 48, x: 50, y: 84, rotation: 90 },
    'publisher-text': { scale: 0.68, width: 48, x: 50, y: 88, rotation: 90 },
    'install-notes': { scale: 0.66, width: 58, x: 50, y: 72, rotation: 90 },
    'custom-note': { scale: 0.72, width: 58, x: 50, y: 78, rotation: 90 },
    'copyright-text': { scale: 0.62, width: 68, x: 50, y: 92, rotation: 90 },
  },
}

const defaultSpineImageSlotLayouts: Record<
  JewelCaseSpineSide,
  Record<JewelCaseSpineImageSlotKey, ProjectCaseInsertLayout>
> = {
  left: {
    background: { scale: 1, x: 0, y: 0, rotation: 0 },
    titleArtwork: CASE_INSERT_DEFAULT_IMPORTED_SPINE_TITLE_ARTWORK_LAYOUT,
  },
  right: {
    background: { scale: 1, x: 0, y: 0, rotation: 0 },
    titleArtwork: CASE_INSERT_DEFAULT_IMPORTED_SPINE_TITLE_ARTWORK_LAYOUT,
  },
}

const defaultSpineGroupedImageSlotLayouts: Record<
  JewelCaseSpineSide,
  Record<JewelCaseSpineImageSlotGroupKey, ProjectCaseInsertLayout>
> = {
  left: {
    artworkSlots: { scale: 1, x: 50, y: 72, rotation: 0 },
    logoSlots: { scale: 1, x: 50, y: 84, rotation: 0 },
    markSlots: { scale: 1, x: 50, y: 82, rotation: 0 },
  },
  right: {
    artworkSlots: { scale: 1, x: 50, y: 72, rotation: 0 },
    logoSlots: { scale: 1, x: 50, y: 84, rotation: 0 },
    markSlots: { scale: 1, x: 50, y: 82, rotation: 0 },
  },
}

function normalizeLabel(label: string) {
  return label.trim().toLocaleLowerCase()
}

function getSpineLogoSlotIdPrefix(side: JewelCaseSpineSide) {
  return `${side}-spine-logo`
}

function getSpineBackgroundFitRegion(
  caseInsert: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
) {
  const layout = createCaseInsertPngExportLayout(caseInsert, 'tray')

  return getJewelCaseSteamBannerOpenArtworkRegion(
    caseInsert.spine[side].steamBanner,
    { kind: 'spine', side },
    layout,
  )
}

function getDefaultSpineTextBlockLayout(
  side: JewelCaseSpineSide,
  textBlockId: string,
) {
  const prefix = `${side}-spine-`
  const suffix = textBlockId.startsWith(prefix)
    ? textBlockId.slice(prefix.length)
    : textBlockId

  return defaultSpineTextBlockLayouts[side][suffix]
}

function getNextSpineArtworkSlotIndex(
  side: JewelCaseSpineSide,
  slots: ProjectCaseInsertImageSlot[],
) {
  return getNextRepeatedArtworkSlotNumber(
    slots,
    `${side}-spine-artwork`,
  )
}

function getNextSpineMarkSlotIndex(
  side: JewelCaseSpineSide,
  slots: ProjectCaseInsertImageSlot[],
) {
  const idPrefix = `${side}-spine-mark`
  let index = slots.length + 1

  while (slots.some(({ id }) => id === `${idPrefix}-${index}`)) {
    index += 1
  }

  return index
}

function getNextSpineLogoSlotIndex(
  side: JewelCaseSpineSide,
  slots: ProjectCaseInsertImageSlot[],
) {
  const idPrefix = getSpineLogoSlotIdPrefix(side)
  let index = slots.length + 1

  while (slots.some(({ id }) => id === `${idPrefix}-${index}`)) {
    index += 1
  }

  return index
}

function createDefaultJewelCaseSpineLogoSlot(
  side: JewelCaseSpineSide,
  index: number,
) {
  return createDefaultCaseInsertImageSlot(
    `${getSpineLogoSlotIdPrefix(side)}-${index}`,
    `Logo ${index}`,
    {
      fit: 'contain',
      layout: defaultSpineGroupedImageSlotLayouts[side].logoSlots,
    },
  )
}

function createDefaultJewelCaseSpineGroupedImageSlot(
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotGroupKey,
  slots: ProjectCaseInsertImageSlot[],
) {
  if (slotKey === 'artworkSlots') {
    return createDefaultJewelCaseSpineArtworkSlot(
      side,
      getNextSpineArtworkSlotIndex(side, slots),
    )
  }

  if (slotKey === 'logoSlots') {
    return createDefaultJewelCaseSpineLogoSlot(
      side,
      getNextSpineLogoSlotIndex(side, slots),
    )
  }

  return createDefaultJewelCaseSpineMarkSlot(
    side,
    getNextSpineMarkSlotIndex(side, slots),
  )
}

function preserveSpineMarkSource(
  slotKey: JewelCaseSpineImageSlotGroupKey,
  slot: Pick<ProjectCaseInsertImageSlot, 'imageSource'>,
  image: CaseInsertImageSlotImageInput,
): CaseInsertImageSlotImageInput {
  if (slotKey !== 'markSlots' || !slot.imageSource?.sourceId?.startsWith('case-')) {
    return image
  }

  return {
    ...image,
    imageSource: {
      ...image.imageSource,
      sourceId: slot.imageSource.sourceId,
      sourceLabel: image.imageSource?.sourceLabel ?? slot.imageSource.sourceLabel,
    },
  }
}

function preserveSpineGroupedSlotSource(
  slotKey: JewelCaseSpineImageSlotGroupKey,
  slot: ProjectCaseInsertImageSlot,
  image: CaseInsertImageSlotImageInput,
): CaseInsertImageSlotImageInput {
  if (slotKey === 'logoSlots') {
    return withCaseInsertAdditionalLogoImageSource(slot, image)
  }

  return preserveSpineMarkSource(slotKey, slot, image)
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

  const updateSpineTitle = useCallback((
    side: JewelCaseSpineSide,
    updater: (
      title: ProjectCaseInsertTextBlock,
      side: JewelCaseSpineSide,
    ) => ProjectCaseInsertTextBlock,
  ) => {
    updateSpineSides(side, (spineSide, targetSide) => ({
      ...spineSide,
      title: updater(spineSide.title, targetSide),
    }))
  }, [updateSpineSides])

  const updateSpineTextBlock = useCallback((
    side: JewelCaseSpineSide,
    textBlockId: string,
    updater: (
      textBlock: ProjectCaseInsertTextBlock,
    ) => ProjectCaseInsertTextBlock,
  ) => {
    updateSpineSides(side, (spineSide, targetSide) => {
      const targetTextBlockId = getJewelCaseSpineSideScopedId(
        targetSide,
        textBlockId,
      )

      return {
        ...spineSide,
        textBlocks: spineSide.textBlocks.map((textBlock) =>
          textBlock.id === targetTextBlockId
            ? updater(textBlock)
            : textBlock),
      }
    })
  }, [updateSpineSides])

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

  const updateSpineSteamBanner = useCallback((
    side: JewelCaseSpineSide,
    updater: (
      banner: ProjectCaseInsertSteamBanner,
    ) => ProjectCaseInsertSteamBanner,
  ) => {
    updateSpineSides(side, (spineSide) => ({
      ...spineSide,
      steamBanner: updater(spineSide.steamBanner),
    }))
  }, [updateSpineSides])

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
    updateSpineTitle(side, (title) => setCaseInsertTextBlockEnabled(title, enabled))
  }

  function handleSpineTitleValueChange(
    side: JewelCaseSpineSide,
    value: string,
    source?: ProjectCaseInsertTextSource,
  ) {
    updateSpineTitle(side, (title) =>
      updateCaseInsertTextBlockValue(title, value, source))
  }

  function handleSpineTitleAlignChange(
    side: JewelCaseSpineSide,
    align: ProjectCaseInsertTextAlign,
  ) {
    updateSpineTitle(side, (title) => ({
      ...title,
      align,
    }))
  }

  function handleSpineTitleAvoidVisualElementsChange(
    side: JewelCaseSpineSide,
    avoidVisualElements: boolean,
  ) {
    updateSpineTitle(side, (title) =>
      setCaseInsertTextBlockAvoidVisualElements(
        title,
        avoidVisualElements,
      ))
  }

  function handleSpineTitleLayoutChange(
    side: JewelCaseSpineSide,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    updateSpineTitle(side, (title) =>
      updateCaseInsertTextBlockLayoutField(title, field, value),
    )
  }

  function handleApplySpineTitleLayoutPreset(
    side: JewelCaseSpineSide,
    presetId: string,
  ) {
    updateSpineTitle(side, (title) =>
      applyCaseInsertTextBlockPresetLayout('spine', title, presetId),
    )
  }

  function handleSpineTitleOrientationChange(
    side: JewelCaseSpineSide,
    rotation: number,
  ) {
    handleSpineTitleLayoutChange(side, 'rotation', rotation)
  }

  function handleResetSpineTitleLayout(side: JewelCaseSpineSide) {
    updateSpineTitle(side, (title, targetSide) => ({
      ...title,
      layout: defaultSpineTitleLayouts[targetSide],
    }))
  }

  function handleSpineTextBlockEnabledChange(
    side: JewelCaseSpineSide,
    textBlockId: string,
    enabled: boolean,
  ) {
    updateSpineTextBlock(
      side,
      textBlockId,
      (textBlock) => setCaseInsertTextBlockEnabled(textBlock, enabled),
    )
  }

  function handleSpineTextBlockValueChange(
    side: JewelCaseSpineSide,
    textBlockId: string,
    value: string,
    source?: ProjectCaseInsertTextSource,
  ) {
    updateSpineTextBlock(side, textBlockId, (textBlock) =>
      updateCaseInsertTextBlockValue(textBlock, value, source))
  }

  function handleSpineTextBlockAlignChange(
    side: JewelCaseSpineSide,
    textBlockId: string,
    align: ProjectCaseInsertTextAlign,
  ) {
    updateSpineTextBlock(side, textBlockId, (textBlock) => ({
      ...textBlock,
      align,
    }))
  }

  function handleSpineTextBlockAvoidVisualElementsChange(
    side: JewelCaseSpineSide,
    textBlockId: string,
    avoidVisualElements: boolean,
  ) {
    updateSpineTextBlock(side, textBlockId, (textBlock) =>
      setCaseInsertTextBlockAvoidVisualElements(
        textBlock,
        avoidVisualElements,
      ))
  }

  function handleSpineTextBlockLayoutChange(
    side: JewelCaseSpineSide,
    textBlockId: string,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    updateSpineTextBlock(side, textBlockId, (textBlock) =>
      updateCaseInsertTextBlockLayoutField(textBlock, field, value))
  }

  function handleApplySpineTextBlockLayoutPreset(
    side: JewelCaseSpineSide,
    textBlockId: string,
    presetId: string,
  ) {
    updateSpineTextBlock(side, textBlockId, (textBlock) =>
      applyCaseInsertTextBlockPresetLayout('spine', textBlock, presetId))
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
    updateSpineSides(side, (spineSide, targetSide) => {
      const targetTextBlockId = getJewelCaseSpineSideScopedId(
        targetSide,
        textBlockId,
      )
      const layout = getDefaultSpineTextBlockLayout(
        targetSide,
        targetTextBlockId,
      )

      if (!layout) {
        return spineSide
      }

      return {
        ...spineSide,
        textBlocks: spineSide.textBlocks.map((textBlock) =>
          textBlock.id === targetTextBlockId
            ? { ...textBlock, layout }
            : textBlock),
      }
    })
  }

  function handleSpineTitleStyleChange(
    side: JewelCaseSpineSide,
    field: CaseInsertTextStyleField,
    value: CaseInsertTextStyleValue,
  ) {
    updateSpineTitle(side, (title) =>
      updateCaseInsertTextBlockStyleField(title, field, value),
    )
  }

  function handleApplySpineTitleStylePreset(
    side: JewelCaseSpineSide,
    presetId: string,
  ) {
    updateSpineTitle(side, (title) =>
      applyCaseInsertTextBlockStylePreset(title, presetId),
    )
  }

  function handleResetSpineTitleStyle(side: JewelCaseSpineSide) {
    updateSpineTitle(side, resetCaseInsertTextBlockStyle)
  }

  function handleSpineTextBlockStyleChange(
    side: JewelCaseSpineSide,
    textBlockId: string,
    field: CaseInsertTextStyleField,
    value: CaseInsertTextStyleValue,
  ) {
    updateSpineTextBlock(side, textBlockId, (textBlock) =>
      updateCaseInsertTextBlockStyleField(textBlock, field, value))
  }

  function handleApplySpineTextBlockStylePreset(
    side: JewelCaseSpineSide,
    textBlockId: string,
    presetId: string,
  ) {
    updateSpineTextBlock(side, textBlockId, (textBlock) =>
      applyCaseInsertTextBlockStylePreset(textBlock, presetId))
  }

  function handleResetSpineTextBlockStyle(
    side: JewelCaseSpineSide,
    textBlockId: string,
  ) {
    updateSpineTextBlock(side, textBlockId, resetCaseInsertTextBlockStyle)
  }

  async function handleSpineImageSlotUpload(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    label: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const statusLabel = normalizeLabel(label)

    if (!isImageFile(file)) {
      announceStatus(`Choose an image file for the ${statusLabel}.`)
      return
    }

    try {
      const image = await createUploadedCaseInsertImageSlotImage(
        file,
        statusLabel,
      )

      updateSpineImageSlot(side, slotKey, (slot) =>
        slotKey === 'titleArtwork'
          ? setCustomCaseInsertTitleArtworkImage(slot, image)
          : setCaseInsertImageSlotImage(slot, image),
      )
      announceStatus(`Selected ${statusLabel} image.`)
    } catch {
      announceStatus(`The ${statusLabel} image could not be read.`)
    }
  }

  async function handleUseSpineImageSlotSteamArtwork(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    label: string,
    asset: SteamArtworkAsset,
  ) {
    const statusLabel = normalizeLabel(label)
    announceStatus(`Downloading ${asset.label} for ${statusLabel}...`)

    try {
      const image = await createSteamArtworkCaseInsertImageSlotImage(asset)

      updateSpineImageSlot(side, slotKey, (slot) =>
        setCaseInsertImageSlotImage(slot, image),
      )
      announceStatus(`Using ${asset.label} as the ${statusLabel}.`)
    } catch (error) {
      announceStatus(`Steam artwork import failed for ${statusLabel}: ${String(error)}`)
    }
  }

  async function handleUseSpineImageSlotLocalSteamScreenshot(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    label: string,
    asset: LocalSteamScreenshotAsset,
  ) {
    const statusLabel = normalizeLabel(label)
    announceStatus(`Loading ${asset.label} for ${statusLabel}...`)

    try {
      const image = await createLocalSteamScreenshotCaseInsertImageSlotImage(asset)

      updateSpineImageSlot(side, slotKey, (slot) =>
        setCaseInsertImageSlotImage(slot, image),
      )
      announceStatus(`Using ${asset.label} as the ${statusLabel}.`)
    } catch (error) {
      announceStatus(`Local screenshot import failed for ${statusLabel}: ${String(error)}`)
    }
  }

  async function handleUseSpineImageSlotWebArtwork(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    label: string,
    candidate: RemoteLogoCandidate,
  ) {
    const statusLabel = normalizeLabel(label)
    announceStatus(`Downloading ${candidate.label} for ${statusLabel}...`)

    try {
      const image = await createWebArtworkCaseInsertImageSlotImage(candidate)

      updateSpineImageSlot(side, slotKey, (slot) =>
        setCaseInsertImageSlotImage(slot, image),
      )
      announceStatus(`Using ${candidate.label} as the ${statusLabel}.`)
    } catch (error) {
      announceStatus(`Web artwork import failed for ${statusLabel}: ${String(error)}`)
    }
  }

  function handleSpineImageSlotEnabledChange(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    enabled: boolean,
  ) {
    updateSpineImageSlot(side, slotKey, (slot) =>
      setCaseInsertImageSlotEnabled(slot, enabled),
    )
  }

  function handleSpineImageSlotFitChange(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    fit: ProjectCaseInsertImageFit,
  ) {
    updateSpineImageSlot(side, slotKey, (slot) =>
      updateCaseInsertImageSlotFit(slot, fit),
    )
  }

  function handleSpineImageSlotLayoutChange(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    updateSpineImageSlot(side, slotKey, (slot) =>
      updateCaseInsertImageSlotLayoutField(slot, field, value),
    )
  }

  function handleResetSpineImageSlotLayout(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
  ) {
    updateSpineSides(side, (spineSide, targetSide) => ({
      ...spineSide,
      [slotKey]: {
        ...spineSide[slotKey],
        layout: defaultSpineImageSlotLayouts[targetSide][slotKey],
      },
    }))
  }

  function handleRestoreSpineTitleArtworkDefault(side: JewelCaseSpineSide) {
    updateSpineImageSlot(side, 'titleArtwork', (slot) =>
      restoreCaseInsertTitleArtworkDefaultSteamLogo(slot),
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

    setProjectJewelCase((currentCaseInsert) => {
      return updateProjectJewelCaseSpineSides(
        currentCaseInsert,
        side,
        (spineSide, targetSide) => {
          const region = getSpineBackgroundFitRegion(
            currentCaseInsert,
            targetSide,
          )

          return region
            ? {
                ...spineSide,
                [slotKey]: fitCaseInsertImageSlotToRegionHeight(
                  spineSide[slotKey],
                  region,
                ),
              }
            : spineSide
        },
      )
    })
    announceStatus(`Fit ${normalizeLabel(label)} top to bottom.`)
  }

  function handleClearSpineImageSlot(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    label: string,
  ) {
    updateSpineImageSlot(side, slotKey, (slot) => ({
      ...slot,
      imageDataUrl: null,
      imageSize: null,
      imageSource: null,
    }))
    announceStatus(`Cleared ${normalizeLabel(label)} image.`)
  }

  function handleSpineSteamBannerEnabledChange(
    side: JewelCaseSpineSide,
    enabled: boolean,
  ) {
    updateSpineSteamBanner(side, (banner) =>
      setCaseInsertSteamBannerEnabled(banner, enabled),
    )
  }

  async function handleSpineSteamBannerLockupUpload(
    side: JewelCaseSpineSide,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isImageFile(file)) {
      announceStatus('Choose an image file for the Steam spine banner icon.')
      return
    }

    try {
      const image = await createUploadedCaseInsertImageSlotImage(
        file,
        'Steam spine banner icon',
      )

      updateSpineSteamBanner(side, (banner) =>
        setCustomCaseInsertSteamBannerLockupImage(banner, image, 'spine'),
      )
      announceStatus(`Using ${file.name} as the ${side} spine Steam banner icon.`)
    } catch {
      announceStatus('The Steam spine banner icon could not be read.')
    }
  }

  function handleClearSpineSteamBannerLockup(side: JewelCaseSpineSide) {
    updateSpineSteamBanner(side, (banner) =>
      resetCaseInsertSteamBannerLockupImage(banner, 'spine'),
    )
    announceStatus(`Reset ${side} spine Steam banner icon to the default asset.`)
  }

  function handleSpineSteamBannerLockupLayoutChange(
    side: JewelCaseSpineSide,
    field: CaseInsertSteamBannerLayoutField,
    value: number,
  ) {
    updateSpineSteamBanner(side, (banner) =>
      updateCaseInsertSteamBannerLockupLayoutField(banner, field, value),
    )
  }

  function handleResetSpineSteamBannerLockupLayout(side: JewelCaseSpineSide) {
    updateSpineSteamBanner(side, (banner) =>
      resetCaseInsertSteamBannerLockupLayout(banner, 'spine'),
    )
    announceStatus(`Reset ${side} spine Steam banner icon layout.`)
  }

  function handleSpineSteamBannerUseTextFallbackChange(
    side: JewelCaseSpineSide,
    useTextFallback: boolean,
  ) {
    updateSpineSteamBanner(side, (banner) =>
      setCaseInsertSteamBannerUseTextFallback(banner, useTextFallback),
    )
    announceStatus(
      useTextFallback
        ? `Using saved text for the ${side} spine Steam banner.`
        : `Using the ${side} spine Steam banner icon.`,
    )
  }

  function handleSpineSteamBannerFallbackTextChange(
    side: JewelCaseSpineSide,
    fallbackText: string,
  ) {
    updateSpineSteamBanner(side, (banner) =>
      updateCaseInsertSteamBannerFallbackText(banner, fallbackText),
    )
  }

  function handleSpineSteamBannerColorChange(
    side: JewelCaseSpineSide,
    field: CaseInsertSteamBannerColorField,
    value: string,
  ) {
    updateSpineSteamBanner(side, (banner) =>
      updateCaseInsertSteamBannerColor(banner, field, value),
    )
  }

  function handleResetSpineSteamBannerColors(side: JewelCaseSpineSide) {
    updateSpineSteamBanner(side, resetCaseInsertSteamBannerColors)
    announceStatus(`Reset ${side} spine Steam banner colors.`)
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

  function handleAddSpineAdditionalLogoSlot(
    side: JewelCaseSpineSide,
    logoKey: LogoAssetKey,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseSpineSides(
        currentCaseInsert,
        side,
        (spineSide, targetSide) =>
          addCaseInsertAdditionalLogoSlot(
            spineSide,
            'spine',
            logoKey,
            getSpineLogoSlotIdPrefix(targetSide),
          ),
      ),
    )
    announceStatus(`Added ${side} spine additional ${logoKey} logo.`)
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
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const statusLabel = normalizeLabel(label)

    if (!isImageFile(file)) {
      announceStatus(`Choose an image file for the ${statusLabel}.`)
      return
    }

    try {
      const image = await createUploadedCaseInsertImageSlotImage(
        file,
        statusLabel,
      )

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
      announceStatus(`Selected ${statusLabel} image.`)
    } catch {
      announceStatus(`The ${statusLabel} image could not be read.`)
    }
  }

  async function handleUseSpineGroupedImageSlotSteamArtwork(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
    label: string,
    asset: SteamArtworkAsset,
  ) {
    const statusLabel = normalizeLabel(label)
    announceStatus(`Downloading ${asset.label} for ${statusLabel}...`)

    try {
      const image = await createSteamArtworkCaseInsertImageSlotImage(asset)

      updateSpineGroupedImageSlot(
        side,
        slotKey,
        slotId,
        (slot) => setCaseInsertImageSlotImage(slot, image),
        {
          enableAdditionalArtwork: slotKey === 'artworkSlots',
        },
      )
      announceStatus(`Using ${asset.label} as the ${statusLabel}.`)
    } catch (error) {
      announceStatus(`Steam artwork import failed for ${statusLabel}: ${String(error)}`)
    }
  }

  async function handleUseSpineGroupedImageSlotLocalSteamScreenshot(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
    label: string,
    asset: LocalSteamScreenshotAsset,
  ) {
    const statusLabel = normalizeLabel(label)
    announceStatus(`Loading ${asset.label} for ${statusLabel}...`)

    try {
      const image = await createLocalSteamScreenshotCaseInsertImageSlotImage(asset)

      updateSpineGroupedImageSlot(
        side,
        slotKey,
        slotId,
        (slot) => setCaseInsertImageSlotImage(slot, image),
        {
          enableAdditionalArtwork: slotKey === 'artworkSlots',
        },
      )
      announceStatus(`Using ${asset.label} as the ${statusLabel}.`)
    } catch (error) {
      announceStatus(`Local screenshot import failed for ${statusLabel}: ${String(error)}`)
    }
  }

  async function handleUseSpineGroupedImageSlotWebArtwork(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
    label: string,
    candidate: RemoteLogoCandidate,
  ) {
    const statusLabel = normalizeLabel(label)
    announceStatus(`Downloading ${candidate.label} for ${statusLabel}...`)

    try {
      const image = await createWebArtworkCaseInsertImageSlotImage(candidate)

      updateSpineGroupedImageSlot(
        side,
        slotKey,
        slotId,
        (slot) => setCaseInsertImageSlotImage(slot, image),
        {
          enableAdditionalArtwork: slotKey === 'artworkSlots',
        },
      )
      announceStatus(`Using ${candidate.label} as the ${statusLabel}.`)
    } catch (error) {
      announceStatus(`Web artwork import failed for ${statusLabel}: ${String(error)}`)
    }
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
                layout: defaultSpineGroupedImageSlotLayouts[targetSide][slotKey],
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
    announceStatus(`Cleared ${normalizeLabel(label)} image.`)
  }

  function handleSpinePrimaryLogoSlotEnabledChange(
    side: JewelCaseSpineSide,
    logoKey: LogoAssetKey,
    enabled: boolean,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseSpineSides(
        currentCaseInsert,
        side,
        (spineSide, targetSide) =>
          setCaseInsertPrimaryLogoSlotEnabled(
            spineSide,
            'spine',
            logoKey,
            enabled,
            getSpineLogoSlotIdPrefix(targetSide),
          ),
      ),
    )
  }

  async function handleSpinePrimaryLogoSlotUpload(
    side: JewelCaseSpineSide,
    logoKey: LogoAssetKey,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const label = getCaseInsertPrimaryLogoLabel(logoKey)
    const statusLabel = normalizeLabel(label)

    if (!isImageFile(file)) {
      announceStatus(`Choose an image file for the ${statusLabel}.`)
      return
    }

    try {
      const image = await createUploadedCaseInsertImageSlotImage(
        file,
        statusLabel,
      )

      setProjectJewelCase((currentCaseInsert) =>
        updateProjectJewelCaseSpineSides(
          currentCaseInsert,
          side,
          (spineSide, targetSide) =>
            setCaseInsertPrimaryLogoSlotImage(
              spineSide,
              'spine',
              logoKey,
              image,
              getSpineLogoSlotIdPrefix(targetSide),
            ),
        ),
      )
      announceStatus(`Selected ${side} spine ${statusLabel} image.`)
    } catch {
      announceStatus(`The ${statusLabel} image could not be read.`)
    }
  }

  function handleSpinePrimaryLogoSlotLayoutChange(
    side: JewelCaseSpineSide,
    logoKey: LogoAssetKey,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseSpineSides(
        currentCaseInsert,
        side,
        (spineSide, targetSide) =>
          updateCaseInsertPrimaryLogoSlotLayoutField(
            spineSide,
            'spine',
            logoKey,
            field,
            value,
            getSpineLogoSlotIdPrefix(targetSide),
          ),
      ),
    )
  }

  function handleResetSpinePrimaryLogoSlotLayout(
    side: JewelCaseSpineSide,
    logoKey: LogoAssetKey,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseSpineSides(
        currentCaseInsert,
        side,
        (spineSide, targetSide) =>
          resetCaseInsertPrimaryLogoSlotLayout(
            spineSide,
            'spine',
            logoKey,
            getSpineLogoSlotIdPrefix(targetSide),
          ),
      ),
    )
  }

  function handleClearSpinePrimaryLogoSlot(
    side: JewelCaseSpineSide,
    logoKey: LogoAssetKey,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseSpineSides(
        currentCaseInsert,
        side,
        (spineSide, targetSide) =>
          clearCaseInsertPrimaryLogoSlotImage(
            spineSide,
            'spine',
            logoKey,
            getSpineLogoSlotIdPrefix(targetSide),
          ),
      ),
    )
    announceStatus(
      `Cleared ${side} spine ${normalizeLabel(getCaseInsertPrimaryLogoLabel(logoKey))} image.`,
    )
  }

  async function handleUseSpineLogoCandidate(
    side: JewelCaseSpineSide,
    logoKey: LogoAssetKey,
    candidate: RemoteLogoCandidate,
  ) {
    const label = getCaseInsertPrimaryLogoLabel(logoKey)
    announceStatus(`Adding ${candidate.label} to the ${side} spine...`)

    try {
      const image = await createLogoCandidateCaseInsertImageSlotImage(candidate)

      setProjectJewelCase((currentCaseInsert) =>
        updateProjectJewelCaseSpineSides(
          currentCaseInsert,
          side,
          (spineSide, targetSide) =>
            setCaseInsertPrimaryLogoSlotImage(
              spineSide,
              'spine',
              logoKey,
              image,
              getSpineLogoSlotIdPrefix(targetSide),
            ),
        ),
      )
      announceStatus(`Added ${candidate.label} as the ${side} spine ${normalizeLabel(label)}.`)
    } catch (error) {
      announceStatus(`Logo candidate import failed for ${side} spine ${normalizeLabel(label)}: ${String(error)}`)
    }
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
