import { useState, type ChangeEvent } from 'react'
import { clampProjectRatingBadgeToSafeZone } from '../layout/discElementSafeZone'
import {
  clearRatingBadgeImage,
  createDefaultProjectRatingBadge,
  resetProjectRatingBadgeLayout,
  resetSupplementalUskRatingBadgeLayout,
  updateRatingBadgeLayoutField,
  updateRatingBadgeSource,
  updateSupplementalUskRatingBadgeEnabledState,
  updateSupplementalUskRatingBadgeLayoutField,
  updateSupplementalUskRatingBadgeValue,
  type RatingBadgeLayoutField,
} from '../project/projectRatingBadge'
import { applyImportedRatingBadge } from '../project/projectVisualAssetImport'
import type {
  ProjectRatingBadge,
  RatingBadgeSource,
} from '../project/projectTypes'
import type { RatingBoardCandidate } from '../steam/steamMetadataCandidates'
import type { DiscTemplate } from '../types/template'
import {
  isImageFile,
  readImportedImageAssetFromFile,
} from '../utils/importedImageAsset'

type UseRatingBadgeStateOptions = {
  selectedDiscTemplate: DiscTemplate
  announceStatus: (message: string) => void
}

export function useRatingBadgeState({
  selectedDiscTemplate,
  announceStatus,
}: UseRatingBadgeStateOptions) {
  const [projectRatingBadge, setProjectRatingBadge] = useState<ProjectRatingBadge>(() =>
    createDefaultProjectRatingBadge(selectedDiscTemplate),
  )

  function clampProjectRatingBadgeToTemplate(template: DiscTemplate) {
    setProjectRatingBadge((currentBadge) =>
      clampProjectRatingBadgeToSafeZone(currentBadge, template),
    )
  }

  function resetProjectRatingBadge(template: DiscTemplate = selectedDiscTemplate) {
    setProjectRatingBadge(createDefaultProjectRatingBadge(template))
  }

  function setRatingBadgeEnabled(enabled: boolean) {
    setProjectRatingBadge((currentBadge) => {
      const nextBadge = {
        ...currentBadge,
        layout: {
          ...currentBadge.layout,
          enabled,
        },
      }

      return clampProjectRatingBadgeToSafeZone(nextBadge, selectedDiscTemplate)
    })
  }

  function setRatingBadgeEnabledForAppliedCandidate(candidate: RatingBoardCandidate) {
    setRatingBadgeEnabled(candidate.applyKind !== 'none' && candidate.ratingSystem !== 'none')
  }

  async function handleRatingBadgeUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isImageFile(file)) {
      announceStatus('Choose an image file for the rating badge.')
      return
    }

    try {
      const importedImage = await readImportedImageAssetFromFile(file)

      setProjectRatingBadge((currentBadge) =>
        applyImportedRatingBadge(
          currentBadge,
          importedImage,
          selectedDiscTemplate,
        ),
      )

      announceStatus(`Using ${file.name} as the rating badge.`)
    } catch (error) {
      announceStatus(`Rating badge import failed: ${String(error)}`)
    }
  }

  function handleRatingBadgeSourceChange(source: RatingBadgeSource) {
    setProjectRatingBadge((currentBadge) => {
      const nextBadge = updateRatingBadgeSource(currentBadge, source)

      return clampProjectRatingBadgeToSafeZone(nextBadge, selectedDiscTemplate)
    })
  }

  function handleRatingBadgeLayoutChange(
    field: RatingBadgeLayoutField,
    value: boolean | number,
  ) {
    setProjectRatingBadge((currentBadge) => {
      const nextBadge = updateRatingBadgeLayoutField(currentBadge, field, value)

      return clampProjectRatingBadgeToSafeZone(nextBadge, selectedDiscTemplate)
    })
  }

  function handleSupplementalUskRatingBadgeEnabledChange(enabled: boolean) {
    setProjectRatingBadge((currentBadge) =>
      clampProjectRatingBadgeToSafeZone(
        updateSupplementalUskRatingBadgeEnabledState(currentBadge, enabled),
        selectedDiscTemplate,
      ),
    )
  }

  function handleSupplementalUskRatingBadgeValueChange(ratingValue: string) {
    setProjectRatingBadge((currentBadge) =>
      updateSupplementalUskRatingBadgeValue(currentBadge, ratingValue),
    )
  }

  function handleSupplementalUskRatingBadgeLayoutChange(
    field: RatingBadgeLayoutField,
    value: boolean | number,
  ) {
    setProjectRatingBadge((currentBadge) =>
      clampProjectRatingBadgeToSafeZone(
        updateSupplementalUskRatingBadgeLayoutField(currentBadge, field, value),
        selectedDiscTemplate,
      ),
    )
  }

  function handleClearRatingBadgeImage() {
    setProjectRatingBadge((currentBadge) => {
      const nextBadge = clearRatingBadgeImage(currentBadge)

      return clampProjectRatingBadgeToSafeZone(nextBadge, selectedDiscTemplate)
    })

    announceStatus('Cleared custom rating badge image.')
  }

  function handleResetRatingBadgeLayout() {
    setProjectRatingBadge((currentBadge) => {
      const nextBadge = resetProjectRatingBadgeLayout(
        currentBadge,
        selectedDiscTemplate,
      )

      return clampProjectRatingBadgeToSafeZone(nextBadge, selectedDiscTemplate)
    })

    announceStatus('Reset rating badge layout.')
  }

  function handleResetSupplementalUskRatingBadgeLayout() {
    setProjectRatingBadge((currentBadge) =>
      clampProjectRatingBadgeToSafeZone(
        resetSupplementalUskRatingBadgeLayout(
          currentBadge,
          selectedDiscTemplate,
        ),
        selectedDiscTemplate,
      ),
    )

    announceStatus('Reset additional USK badge layout.')
  }

  return {
    projectRatingBadge,
    setProjectRatingBadge,
    clampProjectRatingBadgeToTemplate,
    resetProjectRatingBadge,
    setRatingBadgeEnabled,
    setRatingBadgeEnabledForAppliedCandidate,
    handleRatingBadgeUpload,
    handleRatingBadgeSourceChange,
    handleRatingBadgeLayoutChange,
    handleSupplementalUskRatingBadgeEnabledChange,
    handleSupplementalUskRatingBadgeValueChange,
    handleSupplementalUskRatingBadgeLayoutChange,
    handleClearRatingBadgeImage,
    handleResetRatingBadgeLayout,
    handleResetSupplementalUskRatingBadgeLayout,
  }
}
