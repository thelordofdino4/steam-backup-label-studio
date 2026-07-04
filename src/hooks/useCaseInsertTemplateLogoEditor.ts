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
  addCaseInsertTemplateAdditionalLogoSlot,
  clearCaseInsertTemplatePrimaryLogoSlotImage,
  resetCaseInsertTemplatePrimaryLogoSlotDefaultLayout,
  setCaseInsertTemplatePrimaryLogoSlotEnabled,
  setCaseInsertTemplatePrimaryLogoSlotImage,
  updateCaseInsertTemplatePrimaryLogoSlotLayoutValue,
} from '../caseInsert/templateSurfaceLogoActions'
import type {
  CaseInsertTemplatePaneId,
} from '../caseInsert/templateSurfaces'
import type {
  ProjectCaseInsertLayout,
  ProjectJewelCaseState,
} from '../project/projectTypes'
import type {
  LogoAssetKey,
} from '../project/projectLogoAssets'
import type {
  RemoteLogoCandidate,
} from '../steam/steamLogoCandidates'

type UseCaseInsertTemplateLogoEditorOptions = {
  setProjectJewelCase: Dispatch<SetStateAction<ProjectJewelCaseState>>
  announceStatus: (message: string) => void
}

export function useCaseInsertTemplateLogoEditor({
  setProjectJewelCase,
  announceStatus,
}: UseCaseInsertTemplateLogoEditorOptions) {
  function handlePrimaryLogoSlotEnabledChange(
    paneId: CaseInsertTemplatePaneId,
    logoKey: LogoAssetKey,
    enabled: boolean,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      setCaseInsertTemplatePrimaryLogoSlotEnabled(
        currentCaseInsert,
        paneId,
        logoKey,
        enabled,
      ),
    )
  }

  async function handlePrimaryLogoSlotUpload(
    paneId: CaseInsertTemplatePaneId,
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

    const image = await loadUploadedCaseInsertImageSlotImage({
      announceStatus,
      uploadFile,
    })

    if (!image) {
      return
    }

    setProjectJewelCase((currentCaseInsert) =>
      setCaseInsertTemplatePrimaryLogoSlotImage(
        currentCaseInsert,
        paneId,
        logoKey,
        image,
      ),
    )
    announceStatus(`Selected ${uploadFile.statusLabel} image.`)
  }

  function handlePrimaryLogoSlotLayoutChange(
    paneId: CaseInsertTemplatePaneId,
    logoKey: LogoAssetKey,
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      updateCaseInsertTemplatePrimaryLogoSlotLayoutValue(
        currentCaseInsert,
        paneId,
        logoKey,
        field,
        value,
      ),
    )
  }

  function handleResetPrimaryLogoSlotLayout(
    paneId: CaseInsertTemplatePaneId,
    logoKey: LogoAssetKey,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      resetCaseInsertTemplatePrimaryLogoSlotDefaultLayout(
        currentCaseInsert,
        paneId,
        logoKey,
      ),
    )
    announceStatus(`Reset ${normalizeCaseInsertLabel(getCaseInsertPrimaryLogoLabel(logoKey))} layout.`)
  }

  function handleClearPrimaryLogoSlot(
    paneId: CaseInsertTemplatePaneId,
    logoKey: LogoAssetKey,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      clearCaseInsertTemplatePrimaryLogoSlotImage(
        currentCaseInsert,
        paneId,
        logoKey,
      ),
    )
    announceStatus(`Cleared ${normalizeCaseInsertLabel(getCaseInsertPrimaryLogoLabel(logoKey))} image.`)
  }

  function handleAddAdditionalLogoSlot(
    paneId: CaseInsertTemplatePaneId,
    logoKey: LogoAssetKey,
  ) {
    setProjectJewelCase((currentCaseInsert) =>
      addCaseInsertTemplateAdditionalLogoSlot(currentCaseInsert, paneId, logoKey),
    )
    announceStatus(`Added additional ${logoKey} logo.`)
  }

  async function handleUseLogoCandidate(
    paneId: CaseInsertTemplatePaneId,
    logoKey: LogoAssetKey,
    candidate: RemoteLogoCandidate,
  ) {
    const label = getCaseInsertPrimaryLogoLabel(logoKey)
    announceStatus(`Adding ${candidate.label} to ${normalizeCaseInsertLabel(label)}...`)

    try {
      const image = await createLogoCandidateCaseInsertImageSlotImage(candidate)

      setProjectJewelCase((currentCaseInsert) =>
        setCaseInsertTemplatePrimaryLogoSlotImage(
          currentCaseInsert,
          paneId,
          logoKey,
          image,
        ),
      )
      announceStatus(`Added ${candidate.label} as the ${normalizeCaseInsertLabel(label)}.`)
    } catch (error) {
      announceStatus(`Logo candidate import failed for ${normalizeCaseInsertLabel(label)}: ${String(error)}`)
    }
  }

  return {
    handlePrimaryLogoSlotEnabledChange,
    handlePrimaryLogoSlotUpload,
    handlePrimaryLogoSlotLayoutChange,
    handleResetPrimaryLogoSlotLayout,
    handleClearPrimaryLogoSlot,
    handleAddAdditionalLogoSlot,
    handleUseLogoCandidate,
  }
}
