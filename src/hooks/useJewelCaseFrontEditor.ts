import {
  useCallback,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  addJewelCaseFrontRepeatedImageSlot,
  removeJewelCaseFrontRepeatedImageSlot,
  renameJewelCaseFrontRepeatedImageSlot,
  updateJewelCaseFrontImageSlot,
  updateJewelCaseFrontRepeatedImageSlot,
  type JewelCaseFrontImageSlotKey,
  type JewelCaseFrontRepeatedImageSlotKey,
} from '../caseInsert/frontCoverTransitions'
import {
  setCaseInsertImageSlotEnabled,
  setCaseInsertImageSlotImage,
  updateCaseInsertImageSlotFit,
  updateCaseInsertImageSlotLayoutField,
} from '../caseInsert/imageSlotTransitions'
import {
  setCaseInsertTextBlockEnabled,
  updateCaseInsertTextBlockLayoutField,
  updateCaseInsertTextBlockValue,
} from '../caseInsert/textTransitions'
import { updateProjectJewelCaseFront } from '../caseInsert/jewelCaseTransitions'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus'
import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextAlign,
  ProjectJewelCaseState,
} from '../project/projectTypes'
import {
  isImageFile,
  readImportedImageAssetFromFile,
} from '../utils/importedImageAsset'

type UseJewelCaseFrontEditorOptions = {
  setProjectJewelCase: Dispatch<SetStateAction<ProjectJewelCaseState>>
  announceStatus: (message: string) => void
}

const imageSlotLabels: Record<JewelCaseFrontImageSlotKey, string> = {
  background: 'front background',
  titleArtwork: 'front title artwork',
  calloutArtwork: 'front callout artwork',
}

const repeatedSlotLabels: Record<JewelCaseFrontRepeatedImageSlotKey, string> = {
  logoSlots: 'front logo',
  markSlots: 'front mark',
}

const defaultImageSlotLayouts: Record<
  JewelCaseFrontImageSlotKey,
  ProjectCaseInsertLayout
> = {
  background: { scale: 1, x: 0, y: 0, rotation: 0 },
  titleArtwork: { scale: 1, x: 50, y: 24, rotation: 0 },
  calloutArtwork: { scale: 1, x: 50, y: 62, rotation: 0 },
}

const defaultRepeatedSlotLayouts: Record<
  JewelCaseFrontRepeatedImageSlotKey,
  ProjectCaseInsertLayout
> = {
  logoSlots: { scale: 1, x: 20, y: 84, rotation: 0 },
  markSlots: { scale: 1, x: 82, y: 84, rotation: 0 },
}

export function useJewelCaseFrontEditor({
  setProjectJewelCase,
  announceStatus,
}: UseJewelCaseFrontEditorOptions) {
  const updateImageSlot = useCallback((
    slotKey: JewelCaseFrontImageSlotKey,
    updater: Parameters<typeof updateJewelCaseFrontImageSlot>[2],
  ) => {
    setProjectJewelCase((currentCaseInsert) =>
      updateJewelCaseFrontImageSlot(currentCaseInsert, slotKey, updater),
    )
  }, [setProjectJewelCase])

  const updateRepeatedImageSlot = useCallback((
    slotKey: JewelCaseFrontRepeatedImageSlotKey,
    slotId: string,
    updater: Parameters<typeof updateJewelCaseFrontRepeatedImageSlot>[3],
  ) => {
    setProjectJewelCase((currentCaseInsert) =>
      updateJewelCaseFrontRepeatedImageSlot(
        currentCaseInsert,
        slotKey,
        slotId,
        updater,
      ),
    )
  }, [setProjectJewelCase])

  async function importImageFile(
    file: File,
    fallbackLabel: string,
  ) {
    const importedImage = await readImportedImageAssetFromFile(file)

    return {
      imageDataUrl: importedImage.imageDataUrl,
      imageSize: importedImage.imageSize,
      imageSource: createProjectImageAssetProvenance({
        source: 'uploaded',
        sourceLabel: importedImage.fileName ?? fallbackLabel,
      }),
    }
  }

  async function handleFrontImageSlotUpload(
    slotKey: JewelCaseFrontImageSlotKey,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const label = imageSlotLabels[slotKey]

    if (!isImageFile(file)) {
      announceStatus(`Choose an image file for the ${label}.`)
      return
    }

    try {
      const image = await importImageFile(file, label)

      updateImageSlot(slotKey, (slot) => setCaseInsertImageSlotImage(slot, image))
      announceStatus(`Selected ${label} image.`)
    } catch {
      announceStatus(`The ${label} image could not be read.`)
    }
  }

  function handleFrontImageSlotEnabledChange(
    slotKey: JewelCaseFrontImageSlotKey,
    enabled: boolean,
  ) {
    updateImageSlot(slotKey, (slot) =>
      setCaseInsertImageSlotEnabled(slot, enabled),
    )
  }

  function handleFrontImageSlotFitChange(
    slotKey: JewelCaseFrontImageSlotKey,
    fit: ProjectCaseInsertImageFit,
  ) {
    updateImageSlot(slotKey, (slot) => updateCaseInsertImageSlotFit(slot, fit))
  }

  function handleFrontImageSlotLayoutChange(
    slotKey: JewelCaseFrontImageSlotKey,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    updateImageSlot(slotKey, (slot) =>
      updateCaseInsertImageSlotLayoutField(slot, field, value),
    )
  }

  function handleResetFrontImageSlotLayout(
    slotKey: JewelCaseFrontImageSlotKey,
  ) {
    updateImageSlot(slotKey, (slot) => ({
      ...slot,
      layout: defaultImageSlotLayouts[slotKey],
    }))
  }

  function handleClearFrontImageSlot(slotKey: JewelCaseFrontImageSlotKey) {
    updateImageSlot(slotKey, (slot) => ({
      ...slot,
      imageDataUrl: null,
      imageSize: null,
      imageSource: null,
    }))
    announceStatus(`Cleared ${imageSlotLabels[slotKey]} image.`)
  }

  function handleAddFrontRepeatedImageSlot(
    slotKey: JewelCaseFrontRepeatedImageSlotKey,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      addJewelCaseFrontRepeatedImageSlot(currentCaseInsert, slotKey),
    )
    announceStatus(`Added ${repeatedSlotLabels[slotKey]} slot.`)
  }

  function handleRemoveFrontRepeatedImageSlot(
    slotKey: JewelCaseFrontRepeatedImageSlotKey,
    slotId: string,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      removeJewelCaseFrontRepeatedImageSlot(
        currentCaseInsert,
        slotKey,
        slotId,
      ),
    )
    announceStatus(`Removed ${repeatedSlotLabels[slotKey]} slot.`)
  }

  function handleFrontRepeatedImageSlotEnabledChange(
    slotKey: JewelCaseFrontRepeatedImageSlotKey,
    slotId: string,
    enabled: boolean,
  ) {
    updateRepeatedImageSlot(slotKey, slotId, (slot) =>
      setCaseInsertImageSlotEnabled(slot, enabled),
    )
  }

  function handleFrontRepeatedImageSlotLabelChange(
    slotKey: JewelCaseFrontRepeatedImageSlotKey,
    slotId: string,
    label: string,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseFront(currentCaseInsert, (front) =>
        renameJewelCaseFrontRepeatedImageSlot(front, slotKey, slotId, label),
      ),
    )
  }

  async function handleFrontRepeatedImageSlotUpload(
    slotKey: JewelCaseFrontRepeatedImageSlotKey,
    slotId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const label = repeatedSlotLabels[slotKey]

    if (!isImageFile(file)) {
      announceStatus(`Choose an image file for the ${label}.`)
      return
    }

    try {
      const image = await importImageFile(file, label)

      updateRepeatedImageSlot(slotKey, slotId, (slot) =>
        setCaseInsertImageSlotImage(slot, image),
      )
      announceStatus(`Selected ${label} image.`)
    } catch {
      announceStatus(`The ${label} image could not be read.`)
    }
  }

  function handleFrontRepeatedImageSlotLayoutChange(
    slotKey: JewelCaseFrontRepeatedImageSlotKey,
    slotId: string,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    updateRepeatedImageSlot(slotKey, slotId, (slot) =>
      updateCaseInsertImageSlotLayoutField(slot, field, value),
    )
  }

  function handleResetFrontRepeatedImageSlotLayout(
    slotKey: JewelCaseFrontRepeatedImageSlotKey,
    slotId: string,
  ) {
    updateRepeatedImageSlot(slotKey, slotId, (slot) => ({
      ...slot,
      layout: defaultRepeatedSlotLayouts[slotKey],
    }))
  }

  function handleClearFrontRepeatedImageSlot(
    slotKey: JewelCaseFrontRepeatedImageSlotKey,
    slotId: string,
  ) {
    updateRepeatedImageSlot(slotKey, slotId, (slot) => ({
      ...slot,
      imageDataUrl: null,
      imageSize: null,
      imageSource: null,
    }))
    announceStatus(`Cleared ${repeatedSlotLabels[slotKey]} image.`)
  }

  function handleFrontCalloutTextEnabledChange(enabled: boolean) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseFront(currentCaseInsert, (front) => ({
        ...front,
        calloutText: setCaseInsertTextBlockEnabled(front.calloutText, enabled),
      })),
    )
  }

  function handleFrontCalloutTextValueChange(value: string) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseFront(currentCaseInsert, (front) => ({
        ...front,
        calloutText: updateCaseInsertTextBlockValue(front.calloutText, value),
      })),
    )
  }

  function handleFrontCalloutTextAlignChange(align: ProjectCaseInsertTextAlign) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseFront(currentCaseInsert, (front) => ({
        ...front,
        calloutText: {
          ...front.calloutText,
          align,
        },
      })),
    )
  }

  function handleFrontCalloutTextLayoutChange(
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseFront(currentCaseInsert, (front) => ({
        ...front,
        calloutText: updateCaseInsertTextBlockLayoutField(
          front.calloutText,
          field,
          value,
        ),
      })),
    )
  }

  function handleResetFrontCalloutTextLayout() {
    setProjectJewelCase((currentCaseInsert) =>
      updateProjectJewelCaseFront(currentCaseInsert, (front) => ({
        ...front,
        calloutText: {
          ...front.calloutText,
          layout: { scale: 1, x: 50, y: 82, rotation: 0 },
        },
      })),
    )
  }

  return {
    handleFrontImageSlotUpload,
    handleFrontImageSlotEnabledChange,
    handleFrontImageSlotFitChange,
    handleFrontImageSlotLayoutChange,
    handleResetFrontImageSlotLayout,
    handleClearFrontImageSlot,
    handleAddFrontRepeatedImageSlot,
    handleRemoveFrontRepeatedImageSlot,
    handleFrontRepeatedImageSlotEnabledChange,
    handleFrontRepeatedImageSlotLabelChange,
    handleFrontRepeatedImageSlotUpload,
    handleFrontRepeatedImageSlotLayoutChange,
    handleResetFrontRepeatedImageSlotLayout,
    handleClearFrontRepeatedImageSlot,
    handleFrontCalloutTextEnabledChange,
    handleFrontCalloutTextValueChange,
    handleFrontCalloutTextAlignChange,
    handleFrontCalloutTextLayoutChange,
    handleResetFrontCalloutTextLayout,
  }
}

export type JewelCaseFrontEditorActions = ReturnType<
  typeof useJewelCaseFrontEditor
>
