import {
  useCallback,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  updateJewelCaseSpineImageSlot,
  updateJewelCaseSpineTitle,
  type JewelCaseSpineImageSlotKey,
} from '../caseInsert/jewelCaseTransitions'
import {
  setCaseInsertImageSlotEnabled,
  setCaseInsertImageSlotImage,
  updateCaseInsertImageSlotFit,
  updateCaseInsertImageSlotLayoutField,
} from '../caseInsert/imageSlotTransitions'
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
  ProjectCaseInsertImageFit,
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
    steamBackupBranding: { scale: 1, x: 50, y: 14, rotation: -90 },
    logo: { scale: 1, x: 50, y: 88, rotation: 0 },
  },
  right: {
    background: { scale: 1, x: 0, y: 0, rotation: 0 },
    steamBackupBranding: { scale: 1, x: 50, y: 14, rotation: 90 },
    logo: { scale: 1, x: 50, y: 88, rotation: 0 },
  },
}

function normalizeLabel(label: string) {
  return label.trim().toLocaleLowerCase()
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
        setCaseInsertImageSlotImage(slot, image),
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
    handleClearSpineImageSlot,
  }
}

export type JewelCaseSpineEditorActions = ReturnType<
  typeof useJewelCaseSpineEditor
>
