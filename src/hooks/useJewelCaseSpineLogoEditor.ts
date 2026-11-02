import { imageImportFailure } from '../image/imageImportFailure.ts'
import { useProjectAsyncWork } from './useProjectAsyncWork.ts'
import { commitProjectAsyncValue } from '../lifecycle/projectAsyncWork.ts'
import type {
  ChangeEvent,
  Dispatch,
  SetStateAction,
} from 'react'
import {
  getCaseInsertPrimaryLogoLabel,
} from '../caseInsert/brandingLogoSlots'
import {
  normalizeCaseInsertLabel,
} from '../caseInsert/labelText'
import {
  createLogoCandidateCaseInsertImageSlotImage,
  getCaseInsertImageSlotUploadFile,
  loadUploadedCaseInsertImageSlotImage,
} from '../caseInsert/imageSlotSourceImport'
import {
  addJewelCaseSpineAdditionalLogoSlot,
  clearJewelCaseSpinePrimaryLogoSlotImage,
  resetJewelCaseSpinePrimaryLogoSlotDefaultLayout,
  setJewelCaseSpinePrimaryLogoSlotEnabled,
  setJewelCaseSpinePrimaryLogoSlotImage,
  updateJewelCaseSpinePrimaryLogoSlotLayoutValue,
} from '../caseInsert/jewelCaseSpineLogoActions'
import type {
  JewelCaseSpineSide,
} from '../caseInsert/types'
import type {
  LogoAssetKey,
} from '../project/projectLogoAssets'
import type {
  ProjectCaseInsertLayout,
  ProjectJewelCaseState,
} from '../project/projectTypes'
import type {
  RemoteLogoCandidate,
} from '../steam/steamLogoCandidates'

type UseJewelCaseSpineLogoEditorOptions = {
  setProjectJewelCase: Dispatch<SetStateAction<ProjectJewelCaseState>>
  announceStatus: (message: string) => void
}

export function useJewelCaseSpineLogoEditor({
  setProjectJewelCase,
  announceStatus,
}: UseJewelCaseSpineLogoEditorOptions) {
  const asyncWork = useProjectAsyncWork()
  function handleAddSpineAdditionalLogoSlot(
    side: JewelCaseSpineSide,
    logoKey: LogoAssetKey,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      addJewelCaseSpineAdditionalLogoSlot(currentCaseInsert, side, logoKey),
    )
    announceStatus(`Added ${side} spine additional ${logoKey} logo.`)
  }

  function handleSpinePrimaryLogoSlotEnabledChange(
    side: JewelCaseSpineSide,
    logoKey: LogoAssetKey,
    enabled: boolean,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      setJewelCaseSpinePrimaryLogoSlotEnabled(
        currentCaseInsert,
        side,
        logoKey,
        enabled,
      ),
    )
  }

  async function handleSpinePrimaryLogoSlotUpload(
    side: JewelCaseSpineSide,
    logoKey: LogoAssetKey,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const label = getCaseInsertPrimaryLogoLabel(logoKey)
    const uploadFile = getCaseInsertImageSlotUploadFile({
      announceStatus,
      event,
      label,
    })

    if (!uploadFile) {
      return
    }

    const request = asyncWork.begin(`image:spine:${side}:logo:${logoKey}`)
    const image = await loadUploadedCaseInsertImageSlotImage({
      announceStatus: (message) => { if (asyncWork.isCurrent(request)) announceStatus(message) },
      onFailure: (failure) => { asyncWork.fail(request, failure, () => { announceStatus(failure.userMessage) }) },
      uploadFile,
    })
    if (!image) {
      asyncWork.publish(request, () => {})
      return
    }

    asyncWork.commit(request, () => {
      setProjectJewelCase((currentCaseInsert) =>
        setJewelCaseSpinePrimaryLogoSlotImage(
          currentCaseInsert,
          side,
          logoKey,
          image,
        ),
      )
      announceStatus(`Selected ${side} spine ${uploadFile.statusLabel} image.`)

    })
  }

  function handleSpinePrimaryLogoSlotLayoutChange(
    side: JewelCaseSpineSide,
    logoKey: LogoAssetKey,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateJewelCaseSpinePrimaryLogoSlotLayoutValue(
        currentCaseInsert,
        side,
        logoKey,
        field,
        value,
      ),
    )
  }

  function handleResetSpinePrimaryLogoSlotLayout(
    side: JewelCaseSpineSide,
    logoKey: LogoAssetKey,
  ) {
    asyncWork.invalidateAll()
    setProjectJewelCase((currentCaseInsert) =>
      resetJewelCaseSpinePrimaryLogoSlotDefaultLayout(
        currentCaseInsert,
        side,
        logoKey,
      ),
    )
  }

  function handleClearSpinePrimaryLogoSlot(
    side: JewelCaseSpineSide,
    logoKey: LogoAssetKey,
  ) {
    asyncWork.invalidateAll()
    setProjectJewelCase((currentCaseInsert) =>
      clearJewelCaseSpinePrimaryLogoSlotImage(
        currentCaseInsert,
        side,
        logoKey,
      ),
    )
    announceStatus(
      `Cleared ${side} spine ${normalizeCaseInsertLabel(getCaseInsertPrimaryLogoLabel(logoKey))} image.`,
    )
  }

  async function handleUseSpineLogoCandidate(
    side: JewelCaseSpineSide,
    logoKey: LogoAssetKey,
    candidate: RemoteLogoCandidate,
  ) {
    const label = getCaseInsertPrimaryLogoLabel(logoKey)
    announceStatus(`Adding ${candidate.label} to the ${side} spine...`)

    const request = asyncWork.begin(`image:spine:${side}:logo:${logoKey}`)
    try {
      const image = await createLogoCandidateCaseInsertImageSlotImage(candidate)
      return commitProjectAsyncValue(asyncWork, request, () => {
        setProjectJewelCase((currentCaseInsert) =>
          setJewelCaseSpinePrimaryLogoSlotImage(
            currentCaseInsert,
            side,
            logoKey,
            image,
          ),
        )
        announceStatus(`Added ${candidate.label} as the ${side} spine ${normalizeCaseInsertLabel(label)}.`)
      })
    } catch (error) {
      asyncWork.fail(request, imageImportFailure(error), (failure) => {
        announceStatus(`Logo candidate import failed for ${side} spine ${normalizeCaseInsertLabel(label)}: ${failure.userMessage}`)
      })
    }
  }

  return {
    handleAddSpineAdditionalLogoSlot,
    handleSpinePrimaryLogoSlotEnabledChange,
    handleSpinePrimaryLogoSlotUpload,
    handleSpinePrimaryLogoSlotLayoutChange,
    handleResetSpinePrimaryLogoSlotLayout,
    handleClearSpinePrimaryLogoSlot,
    handleUseSpineLogoCandidate,
  }
}
