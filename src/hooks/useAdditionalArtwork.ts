import { imageImportFailure } from '../image/imageImportFailure.ts'
import { useProjectAsyncWork } from './useProjectAsyncWork.ts'
import { commitProjectAsyncValue } from '../lifecycle/projectAsyncWork.ts'
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
  const asyncWork = useProjectAsyncWork()
  const [projectAdditionalArtwork, setProjectAdditionalArtwork] =
    useState<ProjectAdditionalArtwork>(() => createDefaultProjectAdditionalArtwork())

  function clampProjectAdditionalArtworkToTemplate(template: DiscTemplate) {
    setProjectAdditionalArtwork((currentAdditionalArtwork) =>
      clampProjectAdditionalArtworkToSafeZone(currentAdditionalArtwork, template),
    )
  }

  function resetProjectAdditionalArtwork() {
    asyncWork.invalidateAll()
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

    const request = asyncWork.begin(`image:additional:${elementId}`)
    try {
      const importedImage = await readImportedImageAssetFromFile(file)
      return commitProjectAsyncValue(asyncWork, request, () => {
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
      })
    } catch (error) {
      asyncWork.fail(request, imageImportFailure(error), (failure) => {
        announceStatus(`Additional artwork import failed: ${failure.userMessage}`)
      })
    }
  }

  async function handleUseSteamArtworkAsAdditionalArtwork(
    elementId: string,
    asset: SteamArtworkAsset,
  ) {
    const request = asyncWork.begin(`image:additional:${elementId}`)
    try {
      const importedImage = await createImportedImageAssetFromDataUrl(
        await downloadSteamArtworkAsDataUrl(asset.url),
      )
      return commitProjectAsyncValue(asyncWork, request, () => {
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
      })
    } catch (error) {
      asyncWork.fail(request, imageImportFailure(error), (failure) => {
        announceStatus(`Steam artwork import failed: ${failure.userMessage}`)
      })
    }
  }

  async function handleUseLocalSteamScreenshotAsAdditionalArtwork(
    elementId: string,
    asset: LocalSteamScreenshotAsset,
  ) {
    const request = asyncWork.begin(`image:additional:${elementId}`)
    try {
      const importedImage = await createImportedImageAssetFromDataUrl(
        await readLocalImageAsDataUrl(asset.path),
      )
      return commitProjectAsyncValue(asyncWork, request, () => {
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
      })
    } catch (error) {
      asyncWork.fail(request, imageImportFailure(error), (failure) => {
        announceStatus(`Local screenshot import failed: ${failure.userMessage}`)
      })
    }
  }

  async function handleUseWebArtworkCandidateAsAdditionalArtwork(
    elementId: string,
    candidate: RemoteLogoCandidate,
  ) {
    const request = asyncWork.begin(`image:additional:${elementId}`)
    try {
      const importedImage = await createImportedImageAssetFromDataUrl(
        await downloadRemoteLogoCandidateAsDataUrl(candidate),
        candidate.label,
      )
      return commitProjectAsyncValue(asyncWork, request, () => {
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
      })
    } catch (error) {
      asyncWork.fail(request, imageImportFailure(error), (failure) => {
        announceStatus(`Web artwork import failed: ${failure.userMessage}`)
      })
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
    asyncWork.invalidateAll()
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
    asyncWork.invalidateAll()
    setProjectAdditionalArtwork((currentAdditionalArtwork) =>
      resetAdditionalArtworkElementFrame(currentAdditionalArtwork, elementId),
    )

    announceStatus('Reset additional artwork frame.')
  }

  function handleClearAdditionalArtworkElementImage(elementId: string) {
    asyncWork.invalidateAll()
    setProjectAdditionalArtwork((currentAdditionalArtwork) =>
      clearAdditionalArtworkElementImage(currentAdditionalArtwork, elementId),
    )

    announceStatus('Cleared additional artwork image.')
  }

  function handleRemoveAdditionalArtworkElement(elementId: string) {
    asyncWork.invalidateAll()
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
