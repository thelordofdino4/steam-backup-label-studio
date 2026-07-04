import type {
  ChangeEvent,
  Dispatch,
  SetStateAction,
} from 'react'
import {
  createUploadedCaseInsertImageSlotImage,
} from '../caseInsert/imageSlotSourceImport'
import {
  resetJewelCaseSpineSteamBannerColors,
  resetJewelCaseSpineSteamBannerLockupDefaultLayout,
  resetJewelCaseSpineSteamBannerLockupImage,
  setCustomJewelCaseSpineSteamBannerLockupImage,
  setJewelCaseSpineSteamBannerEnabled,
  setJewelCaseSpineSteamBannerUseTextFallback,
  updateJewelCaseSpineSteamBannerColor,
  updateJewelCaseSpineSteamBannerFallbackText,
  updateJewelCaseSpineSteamBannerLockupLayoutValue,
} from '../caseInsert/jewelCaseSpineSteamBannerActions'
import type {
  CaseInsertSteamBannerColorField,
  CaseInsertSteamBannerLayoutField,
} from '../caseInsert/steamBanner'
import type { JewelCaseSpineSide } from '../caseInsert/types'
import type {
  ProjectJewelCaseState,
} from '../project/projectTypes'
import { isImageFile } from '../utils/importedImageAsset'

type UseJewelCaseSpineSteamBannerEditorOptions = {
  setProjectJewelCase: Dispatch<SetStateAction<ProjectJewelCaseState>>
  announceStatus: (message: string) => void
}

export function useJewelCaseSpineSteamBannerEditor({
  setProjectJewelCase,
  announceStatus,
}: UseJewelCaseSpineSteamBannerEditorOptions) {
  function handleSpineSteamBannerEnabledChange(
    side: JewelCaseSpineSide,
    enabled: boolean,
  ) {
    setProjectJewelCase((state) =>
      setJewelCaseSpineSteamBannerEnabled(state, side, enabled),
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

      setProjectJewelCase((state) =>
        setCustomJewelCaseSpineSteamBannerLockupImage(state, side, image),
      )
      announceStatus(`Using ${file.name} as the ${side} spine Steam banner icon.`)
    } catch {
      announceStatus('The Steam spine banner icon could not be read.')
    }
  }

  function handleClearSpineSteamBannerLockup(side: JewelCaseSpineSide) {
    setProjectJewelCase((state) =>
      resetJewelCaseSpineSteamBannerLockupImage(state, side),
    )
    announceStatus(`Reset ${side} spine Steam banner icon to the default asset.`)
  }

  function handleSpineSteamBannerLockupLayoutChange(
    side: JewelCaseSpineSide,
    field: CaseInsertSteamBannerLayoutField,
    value: number,
  ) {
    setProjectJewelCase((state) =>
      updateJewelCaseSpineSteamBannerLockupLayoutValue(
        state,
        side,
        field,
        value,
      ),
    )
  }

  function handleResetSpineSteamBannerLockupLayout(side: JewelCaseSpineSide) {
    setProjectJewelCase((state) =>
      resetJewelCaseSpineSteamBannerLockupDefaultLayout(state, side),
    )
    announceStatus(`Reset ${side} spine Steam banner icon layout.`)
  }

  function handleSpineSteamBannerUseTextFallbackChange(
    side: JewelCaseSpineSide,
    useTextFallback: boolean,
  ) {
    setProjectJewelCase((state) =>
      setJewelCaseSpineSteamBannerUseTextFallback(
        state,
        side,
        useTextFallback,
      ),
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
    setProjectJewelCase((state) =>
      updateJewelCaseSpineSteamBannerFallbackText(state, side, fallbackText),
    )
  }

  function handleSpineSteamBannerColorChange(
    side: JewelCaseSpineSide,
    field: CaseInsertSteamBannerColorField,
    value: string,
  ) {
    setProjectJewelCase((state) =>
      updateJewelCaseSpineSteamBannerColor(state, side, field, value),
    )
  }

  function handleResetSpineSteamBannerColors(side: JewelCaseSpineSide) {
    setProjectJewelCase((state) =>
      resetJewelCaseSpineSteamBannerColors(state, side),
    )
    announceStatus(`Reset ${side} spine Steam banner colors.`)
  }

  return {
    handleSpineSteamBannerEnabledChange,
    handleSpineSteamBannerLockupUpload,
    handleClearSpineSteamBannerLockup,
    handleSpineSteamBannerLockupLayoutChange,
    handleResetSpineSteamBannerLockupLayout,
    handleSpineSteamBannerUseTextFallbackChange,
    handleSpineSteamBannerFallbackTextChange,
    handleSpineSteamBannerColorChange,
    handleResetSpineSteamBannerColors,
  }
}
