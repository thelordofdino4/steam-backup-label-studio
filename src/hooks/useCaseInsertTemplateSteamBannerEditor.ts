import type {
  ChangeEvent,
  Dispatch,
  SetStateAction,
} from 'react'
import {
  createUploadedCaseInsertImageSlotImage,
} from '../caseInsert/imageSlotSourceImport'
import type {
  CaseInsertSteamBannerColorField,
  CaseInsertSteamBannerLayoutField,
} from '../caseInsert/steamBanner'
import {
  resetCaseInsertTemplateSteamBannerColors,
  resetCaseInsertTemplateSteamBannerLockupDefaultLayout,
  resetCaseInsertTemplateSteamBannerLockupImage,
  setCaseInsertTemplateSteamBannerEnabled,
  setCaseInsertTemplateSteamBannerUseTextFallback,
  setCustomCaseInsertTemplateSteamBannerLockupImage,
  updateCaseInsertTemplateSteamBannerColor,
  updateCaseInsertTemplateSteamBannerFallbackText,
  updateCaseInsertTemplateSteamBannerLockupLayoutValue,
} from '../caseInsert/templateSurfaceSteamBannerActions'
import type {
  CaseInsertTemplatePaneId,
} from '../caseInsert/templateSurfaces'
import type {
  ProjectJewelCaseState,
} from '../project/projectTypes'
import { isImageFile } from '../utils/importedImageAsset'

type UseCaseInsertTemplateSteamBannerEditorOptions = {
  setProjectJewelCase: Dispatch<SetStateAction<ProjectJewelCaseState>>
  announceStatus: (message: string) => void
}

export function useCaseInsertTemplateSteamBannerEditor({
  setProjectJewelCase,
  announceStatus,
}: UseCaseInsertTemplateSteamBannerEditorOptions) {
  function handleSteamBannerEnabledChange(
    paneId: CaseInsertTemplatePaneId,
    enabled: boolean,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      setCaseInsertTemplateSteamBannerEnabled(currentCaseInsert, paneId, enabled),
    )
  }

  async function handleSteamBannerLockupUpload(
    paneId: CaseInsertTemplatePaneId,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isImageFile(file)) {
      announceStatus('Choose an image file for the Steam banner lockup.')
      return
    }

    try {
      const image = await createUploadedCaseInsertImageSlotImage(
        file,
        'Steam banner lockup',
      )

      setProjectJewelCase((currentCaseInsert) =>
        setCustomCaseInsertTemplateSteamBannerLockupImage(
          currentCaseInsert, paneId, image,
        ),
      )
      announceStatus(`Using ${file.name} as the Steam banner lockup.`)
    } catch {
      announceStatus('The Steam banner lockup image could not be read.')
    }
  }

  function handleClearSteamBannerLockup(paneId: CaseInsertTemplatePaneId) {
    setProjectJewelCase((currentCaseInsert) =>
      resetCaseInsertTemplateSteamBannerLockupImage(currentCaseInsert, paneId),
    )
    announceStatus('Reset Steam banner lockup image to the default asset.')
  }

  function handleSteamBannerLockupLayoutChange(
    paneId: CaseInsertTemplatePaneId,
    field: CaseInsertSteamBannerLayoutField,
    value: number,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateSteamBannerLockupLayoutValue(
        currentCaseInsert, paneId, field, value,
      ),
    )
  }

  function handleResetSteamBannerLockupLayout(
    paneId: CaseInsertTemplatePaneId,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      resetCaseInsertTemplateSteamBannerLockupDefaultLayout(
        currentCaseInsert, paneId,
      ),
    )
    announceStatus('Reset Steam banner lockup layout to the default position.')
  }

  function handleSteamBannerUseTextFallbackChange(
    paneId: CaseInsertTemplatePaneId,
    useTextFallback: boolean,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      setCaseInsertTemplateSteamBannerUseTextFallback(
        currentCaseInsert, paneId, useTextFallback,
      ),
    )
    announceStatus(
      useTextFallback
        ? 'Using saved text for the Steam banner lockup.'
        : 'Using the Steam banner lockup image.',
    )
  }

  function handleSteamBannerFallbackTextChange(
    paneId: CaseInsertTemplatePaneId,
    fallbackText: string,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateSteamBannerFallbackText(
        currentCaseInsert, paneId, fallbackText,
      ),
    )
  }

  function handleSteamBannerColorChange(
    paneId: CaseInsertTemplatePaneId,
    field: CaseInsertSteamBannerColorField,
    value: string,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplateSteamBannerColor(
        currentCaseInsert, paneId, field, value,
      ),
    )
  }

  function handleResetSteamBannerColors(paneId: CaseInsertTemplatePaneId) {
    setProjectJewelCase((currentCaseInsert) =>
      resetCaseInsertTemplateSteamBannerColors(currentCaseInsert, paneId),
    )
    announceStatus('Reset Steam banner colors to the default palette.')
  }

  return {
    handleSteamBannerEnabledChange,
    handleSteamBannerLockupUpload,
    handleClearSteamBannerLockup,
    handleSteamBannerLockupLayoutChange,
    handleResetSteamBannerLockupLayout,
    handleSteamBannerUseTextFallbackChange,
    handleSteamBannerFallbackTextChange,
    handleSteamBannerColorChange,
    handleResetSteamBannerColors,
  }
}
