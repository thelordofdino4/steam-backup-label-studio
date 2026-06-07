import { useState, type ChangeEvent } from 'react'
import {
  clampAdditionalArtworkElementLayoutToSafeZone,
  clampProjectAdditionalArtworkToSafeZone,
} from '../layout/discElementSafeZone'
import { readLocalImageAsDataUrl, type LocalSteamScreenshotAsset } from '../local/localArtwork'
import {
  addAdditionalArtworkElement,
  clearAdditionalArtworkElementImage,
  createDefaultProjectAdditionalArtwork,
  getAdditionalArtworkElementImageSize,
  getAdditionalArtworkElementLayout,
  removeAdditionalArtworkElement,
  resetAdditionalArtworkElementFrame,
  resetProjectAdditionalArtworkElementLayout,
  setAdditionalArtworkElementLayout,
  setAdditionalArtworkEnabled,
  updateAdditionalArtworkElementLabel,
  updateAdditionalArtworkElementFrameField,
  updateAdditionalArtworkElementLayoutField,
  type AdditionalArtworkFrameField,
  type AdditionalArtworkLayoutField,
} from '../project/projectAdditionalArtwork'
import { applyImportedAdditionalArtwork } from '../project/projectVisualAssetImport'
import type { ProjectAdditionalArtwork } from '../project/projectTypes'
import { downloadSteamArtworkAsDataUrl, type SteamArtworkAsset } from '../steam/steamApi'
import {
  downloadRemoteLogoCandidateAsDataUrl,
  type RemoteLogoCandidate,
} from '../steam/steamLogoCandidates'
import type { DiscTemplate } from '../types/template'
import {
  createImportedImageAssetFromDataUrl,
  isImageFile,
  readImportedImageAssetFromFile,
} from '../utils/importedImageAsset'

type UseAdditionalArtworkOptions = {
  selectedDiscTemplate: DiscTemplate
  announceStatus: (message: string) => void
}

export function useAdditionalArtwork({
  selectedDiscTemplate,
  announceStatus,
}: UseAdditionalArtworkOptions) {
  const [projectAdditionalArtwork, setProjectAdditionalArtwork] =
    useState<ProjectAdditionalArtwork>(() => createDefaultProjectAdditionalArtwork())

  function clampProjectAdditionalArtworkToTemplate(template: DiscTemplate) {
    setProjectAdditionalArtwork((currentAdditionalArtwork) =>
      clampProjectAdditionalArtworkToSafeZone(currentAdditionalArtwork, template),
    )
  }

  function resetProjectAdditionalArtwork() {
    setProjectAdditionalArtwork(createDefaultProjectAdditionalArtwork())
  }

  function handleAdditionalArtworkEnabledChange(enabled: boolean) {
    setProjectAdditionalArtwork((currentAdditionalArtwork) =>
      setAdditionalArtworkEnabled(currentAdditionalArtwork, enabled),
    )
  }

  function handleAddAdditionalArtworkElement() {
    setProjectAdditionalArtwork((currentAdditionalArtwork) =>
      clampProjectAdditionalArtworkToSafeZone(
        addAdditionalArtworkElement(currentAdditionalArtwork, selectedDiscTemplate),
        selectedDiscTemplate,
      ),
    )
    announceStatus('Added an additional artwork element.')
  }

  async function handleAdditionalArtworkUpload(
    elementId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isImageFile(file)) {
      announceStatus('Choose an image file for additional artwork.')
      return
    }

    try {
      const importedImage = await readImportedImageAssetFromFile(file)

      setProjectAdditionalArtwork((currentAdditionalArtwork) =>
        applyImportedAdditionalArtwork(
          currentAdditionalArtwork,
          elementId,
          importedImage,
          selectedDiscTemplate,
          {
            source: 'custom',
            sourceId: null,
            sourceLabel: file.name,
          },
        ),
      )

      announceStatus(`Using ${file.name} as additional artwork.`)
    } catch (error) {
      announceStatus(`Additional artwork import failed: ${String(error)}`)
    }
  }

  async function handleUseSteamArtworkAsAdditionalArtwork(
    elementId: string,
    asset: SteamArtworkAsset,
  ) {
    try {
      const importedImage = await createImportedImageAssetFromDataUrl(
        await downloadSteamArtworkAsDataUrl(asset.url),
      )

      setProjectAdditionalArtwork((currentAdditionalArtwork) =>
        applyImportedAdditionalArtwork(
          currentAdditionalArtwork,
          elementId,
          importedImage,
          selectedDiscTemplate,
          {
            source: 'steam-artwork',
            sourceId: asset.id,
            sourceLabel: asset.label,
          },
        ),
      )

      announceStatus(`Using ${asset.label} as additional artwork.`)
    } catch (error) {
      announceStatus(`Steam artwork import failed: ${String(error)}`)
    }
  }

  async function handleUseLocalSteamScreenshotAsAdditionalArtwork(
    elementId: string,
    asset: LocalSteamScreenshotAsset,
  ) {
    try {
      const importedImage = await createImportedImageAssetFromDataUrl(
        await readLocalImageAsDataUrl(asset.path),
      )

      setProjectAdditionalArtwork((currentAdditionalArtwork) =>
        applyImportedAdditionalArtwork(
          currentAdditionalArtwork,
          elementId,
          importedImage,
          selectedDiscTemplate,
          {
            source: 'local-steam-screenshot',
            sourceId: asset.id,
            sourceLabel: asset.label,
          },
        ),
      )

      announceStatus(`Using ${asset.label} as additional artwork.`)
    } catch (error) {
      announceStatus(`Local screenshot import failed: ${String(error)}`)
    }
  }

  async function handleUseWebArtworkCandidateAsAdditionalArtwork(
    elementId: string,
    candidate: RemoteLogoCandidate,
  ) {
    try {
      const importedImage = await createImportedImageAssetFromDataUrl(
        await downloadRemoteLogoCandidateAsDataUrl(candidate),
        candidate.label,
      )

      setProjectAdditionalArtwork((currentAdditionalArtwork) =>
        applyImportedAdditionalArtwork(
          currentAdditionalArtwork,
          elementId,
          importedImage,
          selectedDiscTemplate,
          {
            source: 'web-artwork',
            sourceId: candidate.id,
            sourceLabel: candidate.label,
          },
        ),
      )

      announceStatus(`Using ${candidate.label} as additional artwork.`)
    } catch (error) {
      announceStatus(`Web artwork import failed: ${String(error)}`)
    }
  }

  function handleAdditionalArtworkLayoutChange(
    elementId: string,
    field: AdditionalArtworkLayoutField,
    value: boolean | number,
  ) {
    setProjectAdditionalArtwork((currentAdditionalArtwork) => {
      const nextAdditionalArtwork = updateAdditionalArtworkElementLayoutField(
        currentAdditionalArtwork,
        elementId,
        field,
        value,
      )
      const nextLayout = clampAdditionalArtworkElementLayoutToSafeZone(
        getAdditionalArtworkElementLayout(nextAdditionalArtwork, elementId),
        selectedDiscTemplate,
        getAdditionalArtworkElementImageSize(nextAdditionalArtwork, elementId),
      )

      return setAdditionalArtworkElementLayout(
        nextAdditionalArtwork,
        elementId,
        nextLayout,
      )
    })
  }

  function handleAdditionalArtworkLabelChange(elementId: string, label: string) {
    setProjectAdditionalArtwork((currentAdditionalArtwork) =>
      updateAdditionalArtworkElementLabel(currentAdditionalArtwork, elementId, label),
    )
  }

  function handleResetAdditionalArtworkElementLayout(elementId: string) {
    setProjectAdditionalArtwork((currentAdditionalArtwork) =>
      clampProjectAdditionalArtworkToSafeZone(
        resetProjectAdditionalArtworkElementLayout(
          currentAdditionalArtwork,
          elementId,
          selectedDiscTemplate,
        ),
        selectedDiscTemplate,
      ),
    )

    announceStatus('Reset additional artwork layout.')
  }

  function handleAdditionalArtworkFrameChange(
    elementId: string,
    field: AdditionalArtworkFrameField,
    value: boolean | number | string,
  ) {
    setProjectAdditionalArtwork((currentAdditionalArtwork) =>
      updateAdditionalArtworkElementFrameField(
        currentAdditionalArtwork,
        elementId,
        field,
        value,
      ),
    )
  }

  function handleResetAdditionalArtworkElementFrame(elementId: string) {
    setProjectAdditionalArtwork((currentAdditionalArtwork) =>
      resetAdditionalArtworkElementFrame(currentAdditionalArtwork, elementId),
    )

    announceStatus('Reset additional artwork frame.')
  }

  function handleClearAdditionalArtworkElementImage(elementId: string) {
    setProjectAdditionalArtwork((currentAdditionalArtwork) =>
      clearAdditionalArtworkElementImage(currentAdditionalArtwork, elementId),
    )

    announceStatus('Cleared additional artwork image.')
  }

  function handleRemoveAdditionalArtworkElement(elementId: string) {
    setProjectAdditionalArtwork((currentAdditionalArtwork) =>
      removeAdditionalArtworkElement(currentAdditionalArtwork, elementId),
    )

    announceStatus('Deleted additional artwork element.')
  }

  return {
    projectAdditionalArtwork,
    setProjectAdditionalArtwork,
    clampProjectAdditionalArtworkToTemplate,
    resetProjectAdditionalArtwork,
    handleAdditionalArtworkEnabledChange,
    handleAddAdditionalArtworkElement,
    handleAdditionalArtworkUpload,
    handleUseSteamArtworkAsAdditionalArtwork,
    handleUseWebArtworkCandidateAsAdditionalArtwork,
    handleUseLocalSteamScreenshotAsAdditionalArtwork,
    handleAdditionalArtworkLayoutChange,
    handleAdditionalArtworkLabelChange,
    handleResetAdditionalArtworkElementLayout,
    handleAdditionalArtworkFrameChange,
    handleResetAdditionalArtworkElementFrame,
    handleClearAdditionalArtworkElementImage,
    handleRemoveAdditionalArtworkElement,
  }
}
