import {
  useCallback,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  addJewelCaseSpineImageSlot,
  removeJewelCaseSpineImageSlot,
  renameJewelCaseSpineImageSlot,
  setJewelCaseSpineAdditionalArtworkEnabled,
  updateProjectJewelCaseSpineSide,
  updateJewelCaseSpineImageSlot,
  updateJewelCaseSpineImageSlotInGroup,
  updateJewelCaseSpineTextBlock,
  updateJewelCaseSpineTitle,
  type JewelCaseSpineImageSlotGroupKey,
  type JewelCaseSpineImageSlotKey,
} from '../caseInsert/jewelCaseTransitions'
import {
  createDefaultCaseInsertImageSlot,
  createDefaultJewelCaseSpineArtworkSlot,
  createDefaultJewelCaseSpineMarkSlot,
} from '../caseInsert/defaults'
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
  resetCaseInsertSteamBannerColors,
  resetCaseInsertSteamBannerLockupImage,
  resetCaseInsertSteamBannerLockupLayout,
  setCaseInsertSteamBannerEnabled,
  setCaseInsertSteamBannerUseTextFallback,
  setCustomCaseInsertSteamBannerLockupImage,
  updateCaseInsertSteamBannerColor,
  updateCaseInsertSteamBannerFallbackText,
  updateCaseInsertSteamBannerLockupLayoutField,
  updateJewelCaseSpineSteamBanner,
  type CaseInsertSteamBannerColorField,
  type CaseInsertSteamBannerLayoutField,
} from '../caseInsert/steamBanner'
import { getJewelCaseRegionExportBounds } from '../layout/jewelCaseLayout'
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
  ProjectCaseInsertTextAlign,
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
    titleArtwork: { scale: 1, x: 50, y: 28, rotation: -90 },
  },
  right: {
    background: { scale: 1, x: 0, y: 0, rotation: 0 },
    titleArtwork: { scale: 1, x: 50, y: 28, rotation: 90 },
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

function getSpineBackgroundFitRegion(side: JewelCaseSpineSide) {
  return getJewelCaseRegionExportBounds(
    side === 'left' ? 'leftSpine' : 'rightSpine',
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
  const idPrefix = `${side}-spine-artwork`
  let index = slots.length + 1

  while (slots.some(({ id }) => id === `${idPrefix}-${index}`)) {
    index += 1
  }

  return index
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
  const updateSpineTitle = useCallback((
    side: JewelCaseSpineSide,
    updater: Parameters<typeof updateJewelCaseSpineTitle>[2],
  ) => {
    setProjectJewelCase((currentCaseInsert) =>
      updateJewelCaseSpineTitle(currentCaseInsert, side, updater),
    )
  }, [setProjectJewelCase])

  const updateSpineTextBlock = useCallback((
    side: JewelCaseSpineSide,
    textBlockId: string,
    updater: Parameters<typeof updateJewelCaseSpineTextBlock>[3],
  ) => {
    setProjectJewelCase((currentCaseInsert) =>
      updateJewelCaseSpineTextBlock(
        currentCaseInsert,
        side,
        textBlockId,
        updater,
      ),
    )
  }, [setProjectJewelCase])

  const updateSpineImageSlot = useCallback((
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
    updater: Parameters<typeof updateJewelCaseSpineImageSlot>[3],
  ) => {
    setProjectJewelCase((currentCaseInsert) =>
      updateJewelCaseSpineImageSlot(
        currentCaseInsert,
        side,
        slotKey,
        updater,
      ),
    )
  }, [setProjectJewelCase])

  const updateSpineGroupedImageSlot = useCallback((
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
    updater: Parameters<typeof updateJewelCaseSpineImageSlotInGroup>[4],
    options: {
      enableAdditionalArtwork?: boolean
    } = {},
  ) => {
    setProjectJewelCase((currentCaseInsert) => {
      const nextCaseInsert = updateJewelCaseSpineImageSlotInGroup(
        currentCaseInsert,
        side,
        slotKey,
        slotId,
        updater,
      )

      return slotKey === 'artworkSlots' && options.enableAdditionalArtwork
        ? setJewelCaseSpineAdditionalArtworkEnabled(
            nextCaseInsert,
            side,
            true,
          )
        : nextCaseInsert
    })
  }, [setProjectJewelCase])

  const updateSpineSteamBanner = useCallback((
    side: JewelCaseSpineSide,
    updater: Parameters<typeof updateJewelCaseSpineSteamBanner>[2],
  ) => {
    setProjectJewelCase((currentCaseInsert) =>
      updateJewelCaseSpineSteamBanner(currentCaseInsert, side, updater),
    )
  }, [setProjectJewelCase])

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
    updateSpineTitle(side, (title) => ({
      ...title,
      layout: defaultSpineTitleLayouts[side],
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
    const layout = getDefaultSpineTextBlockLayout(side, textBlockId)

    if (!layout) {
      return
    }

    updateSpineTextBlock(side, textBlockId, (textBlock) => ({
      ...textBlock,
      layout,
    }))
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
    updateSpineImageSlot(side, slotKey, (slot) => ({
      ...slot,
      layout: defaultSpineImageSlotLayouts[side][slotKey],
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

    const region = getSpineBackgroundFitRegion(side)

    if (!region) {
      return
    }

    updateSpineImageSlot(side, slotKey, (slot) =>
      fitCaseInsertImageSlotToRegionHeight(slot, region),
    )
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
        setCustomCaseInsertSteamBannerLockupImage(banner, image),
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
    setProjectJewelCase((currentCaseInsert) => {
      const slots = currentCaseInsert.spine[side][slotKey]
      const slot = createDefaultJewelCaseSpineGroupedImageSlot(
        side,
        slotKey,
        slots,
      )

      return addJewelCaseSpineImageSlot(currentCaseInsert, side, slotKey, slot)
    })
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
      updateProjectJewelCaseSpineSide(
        currentCaseInsert,
        side,
        (spineSide) =>
          addCaseInsertAdditionalLogoSlot(
            spineSide,
            'spine',
            logoKey,
            getSpineLogoSlotIdPrefix(side),
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
      setJewelCaseSpineAdditionalArtworkEnabled(
        currentCaseInsert,
        side,
        enabled,
      ),
    )
  }

  function handleRemoveSpineGroupedImageSlot(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      removeJewelCaseSpineImageSlot(currentCaseInsert, side, slotKey, slotId),
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
    setProjectJewelCase((currentCaseInsert) =>
      renameJewelCaseSpineImageSlot(
        currentCaseInsert,
        side,
        slotKey,
        slotId,
        label,
      ),
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
    updateSpineGroupedImageSlot(side, slotKey, slotId, (slot) => ({
      ...slot,
      layout: defaultSpineGroupedImageSlotLayouts[side][slotKey],
    }))
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
      updateProjectJewelCaseSpineSide(
        currentCaseInsert,
        side,
        (spineSide) =>
          setCaseInsertPrimaryLogoSlotEnabled(
            spineSide,
            'spine',
            logoKey,
            enabled,
            getSpineLogoSlotIdPrefix(side),
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
        updateProjectJewelCaseSpineSide(
          currentCaseInsert,
          side,
          (spineSide) =>
            setCaseInsertPrimaryLogoSlotImage(
              spineSide,
              'spine',
              logoKey,
              image,
              getSpineLogoSlotIdPrefix(side),
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
      updateProjectJewelCaseSpineSide(
        currentCaseInsert,
        side,
        (spineSide) =>
          updateCaseInsertPrimaryLogoSlotLayoutField(
            spineSide,
            'spine',
            logoKey,
            field,
            value,
            getSpineLogoSlotIdPrefix(side),
          ),
      ),
    )
  }

  function handleResetSpinePrimaryLogoSlotLayout(
    side: JewelCaseSpineSide,
    logoKey: LogoAssetKey,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseSpineSide(
        currentCaseInsert,
        side,
        (spineSide) =>
          resetCaseInsertPrimaryLogoSlotLayout(
            spineSide,
            'spine',
            logoKey,
            getSpineLogoSlotIdPrefix(side),
          ),
      ),
    )
  }

  function handleClearSpinePrimaryLogoSlot(
    side: JewelCaseSpineSide,
    logoKey: LogoAssetKey,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseSpineSide(
        currentCaseInsert,
        side,
        (spineSide) =>
          clearCaseInsertPrimaryLogoSlotImage(
            spineSide,
            'spine',
            logoKey,
            getSpineLogoSlotIdPrefix(side),
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
        updateProjectJewelCaseSpineSide(
          currentCaseInsert,
          side,
          (spineSide) =>
            setCaseInsertPrimaryLogoSlotImage(
              spineSide,
              'spine',
              logoKey,
              image,
              getSpineLogoSlotIdPrefix(side),
            ),
        ),
      )
      announceStatus(`Added ${candidate.label} as the ${side} spine ${normalizeLabel(label)}.`)
    } catch (error) {
      announceStatus(`Logo candidate import failed for ${side} spine ${normalizeLabel(label)}: ${String(error)}`)
    }
  }

  return {
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
