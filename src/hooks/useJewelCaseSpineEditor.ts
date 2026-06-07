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
  updateJewelCaseSpineImageSlot,
  updateJewelCaseSpineImageSlotInGroup,
  updateJewelCaseSpineTitle,
  type JewelCaseSpineImageSlotGroupKey,
  type JewelCaseSpineImageSlotKey,
} from '../caseInsert/jewelCaseTransitions'
import {
  createDefaultJewelCaseSpineArtworkSlot,
} from '../caseInsert/defaults'
import type {
  CaseInsertBrandingSlotSourceItem,
} from '../caseInsert/brandingSlotSources'
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
import { getJewelCaseRegionExportBounds } from '../layout/jewelCaseLayout'
import {
  createLocalSteamScreenshotCaseInsertImageSlotImage,
  createSteamArtworkCaseInsertImageSlotImage,
  createUploadedCaseInsertImageSlotImage,
  createWebArtworkCaseInsertImageSlotImage,
} from '../caseInsert/imageSlotSourceImport'
import {
  setCaseInsertTextBlockEnabled,
  updateCaseInsertTextBlockLayoutField,
  updateCaseInsertTextBlockValue,
} from '../caseInsert/textTransitions'
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
  ProjectJewelCaseState,
} from '../project/projectTypes'
import type { SteamArtworkAsset } from '../steam/steamApi'
import type { RemoteLogoCandidate } from '../steam/steamLogoCandidates'
import { isImageFile } from '../utils/importedImageAsset'

type UseJewelCaseSpineEditorOptions = {
  setProjectJewelCase: Dispatch<SetStateAction<ProjectJewelCaseState>>
  announceStatus: (message: string) => void
}

const defaultSpineTitleLayouts: Record<JewelCaseSpineSide, ProjectCaseInsertLayout> = {
  left: { scale: 1, x: 50, y: 50, rotation: -90 },
  right: { scale: 1, x: 50, y: 50, rotation: 90 },
}

const defaultSpineImageSlotLayouts: Record<
  JewelCaseSpineSide,
  Record<JewelCaseSpineImageSlotKey, ProjectCaseInsertLayout>
> = {
  left: {
    background: { scale: 1, x: 0, y: 0, rotation: 0 },
    titleArtwork: { scale: 1, x: 50, y: 28, rotation: -90 },
    steamBackupBranding: { scale: 1, x: 50, y: 14, rotation: -90 },
    logo: { scale: 1, x: 50, y: 88, rotation: 0 },
  },
  right: {
    background: { scale: 1, x: 0, y: 0, rotation: 0 },
    titleArtwork: { scale: 1, x: 50, y: 28, rotation: 90 },
    steamBackupBranding: { scale: 1, x: 50, y: 14, rotation: 90 },
    logo: { scale: 1, x: 50, y: 88, rotation: 0 },
  },
}

const defaultSpineGroupedImageSlotLayouts: Record<
  JewelCaseSpineSide,
  Record<JewelCaseSpineImageSlotGroupKey, ProjectCaseInsertLayout>
> = {
  left: {
    artworkSlots: { scale: 1, x: 50, y: 72, rotation: 0 },
  },
  right: {
    artworkSlots: { scale: 1, x: 50, y: 72, rotation: 0 },
  },
}

function normalizeLabel(label: string) {
  return label.trim().toLocaleLowerCase()
}

function getSpineBackgroundFitRegion(side: JewelCaseSpineSide) {
  return getJewelCaseRegionExportBounds(
    side === 'left' ? 'leftSpine' : 'rightSpine',
  )
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

  function handleSpineTitleEnabledChange(
    side: JewelCaseSpineSide,
    enabled: boolean,
  ) {
    updateSpineTitle(side, (title) => setCaseInsertTextBlockEnabled(title, enabled))
  }

  function handleSpineTitleValueChange(
    side: JewelCaseSpineSide,
    value: string,
  ) {
    updateSpineTitle(side, (title) => updateCaseInsertTextBlockValue(title, value))
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

  function handleSpineTitleLayoutChange(
    side: JewelCaseSpineSide,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    updateSpineTitle(side, (title) =>
      updateCaseInsertTextBlockLayoutField(title, field, value),
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

  function handleAddSpineGroupedImageSlot(
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
  ) {
    setProjectJewelCase((currentCaseInsert) => {
      const slots = currentCaseInsert.spine[side][slotKey]
      const slot = createDefaultJewelCaseSpineArtworkSlot(
        side,
        getNextSpineArtworkSlotIndex(side, slots),
      )

      return addJewelCaseSpineImageSlot(currentCaseInsert, side, slotKey, slot)
    })
    announceStatus(`Added ${side} spine artwork slot.`)
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
    announceStatus(`Removed ${side} spine artwork slot.`)
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
        (slot) => setCaseInsertImageSlotImage(slot, image),
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
    updateSpineGroupedImageSlot(side, slotKey, slotId, (slot) => ({
      ...slot,
      imageDataUrl: null,
      imageSize: null,
      imageSource: null,
    }))
    announceStatus(`Cleared ${normalizeLabel(label)} image.`)
  }

  async function handleUseSpineBrandingSource(
    side: JewelCaseSpineSide,
    source: CaseInsertBrandingSlotSourceItem,
  ) {
    announceStatus(`Adding ${source.label} to the ${side} spine...`)

    try {
      const image = await source.resolveImage()

      updateSpineImageSlot(side, 'logo', (slot) =>
        setCaseInsertImageSlotImage(
          {
            ...slot,
            label: source.label,
            fit: 'contain',
          },
          image,
        ),
      )
      announceStatus(`Added ${source.label} to the ${side} spine.`)
    } catch (error) {
      announceStatus(`Spine branding source failed: ${String(error)}`)
    }
  }

  return {
    handleSpineTitleEnabledChange,
    handleSpineTitleValueChange,
    handleSpineTitleAlignChange,
    handleSpineTitleLayoutChange,
    handleSpineTitleOrientationChange,
    handleResetSpineTitleLayout,
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
    handleSpineAdditionalArtworkEnabledChange,
    handleAddSpineGroupedImageSlot,
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
    handleUseSpineBrandingSource,
  }
}

export type JewelCaseSpineEditorActions = ReturnType<
  typeof useJewelCaseSpineEditor
>
