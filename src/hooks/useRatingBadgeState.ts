import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { clampProjectRatingBadgeToSafeZone } from '../layout/discElementSafeZone'
import {
  completeDiscGuidedSlotWhenSatisfied,
  DISC_GUIDED_COMPLETION_SLOT_IDS,
  ignoreDiscGuidedSlotCompletion,
  isDiscGuidedRatingBadgeOwnerSatisfied,
  type DiscGuidedSlotCompletionHandler,
} from '../guidedPresets/discGuidedCompletion.ts'
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
  ProjectMetadata,
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
  projectMetadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'>
  announceStatus: (message: string) => void
  onDiscGuidedSlotCompleted?: DiscGuidedSlotCompletionHandler
}

export function useRatingBadgeState({
  selectedDiscTemplate,
  projectMetadata,
  announceStatus,
  onDiscGuidedSlotCompleted = ignoreDiscGuidedSlotCompletion,
}: UseRatingBadgeStateOptions) {
  const [projectRatingBadge, setProjectRatingBadge] = useState<ProjectRatingBadge>(() =>
    createDefaultProjectRatingBadge(selectedDiscTemplate),
  )
  const projectRatingBadgeRef = useRef(projectRatingBadge)

  useEffect(() => {
    projectRatingBadgeRef.current = projectRatingBadge
  }, [projectRatingBadge])

  function clampProjectRatingBadgeToTemplate(template: DiscTemplate) {
    setProjectRatingBadge((currentBadge) =>
      clampProjectRatingBadgeToSafeZone(currentBadge, template, projectMetadata),
    )
  }

  function resetProjectRatingBadge(template: DiscTemplate = selectedDiscTemplate) {
    setProjectRatingBadge(createDefaultProjectRatingBadge(template))
  }

  function completeRatingBadgeIfSatisfied(
    ratingBadge: ProjectRatingBadge,
    metadata: Pick<ProjectMetadata, 'ratingSystem'> = projectMetadata,
  ) {
    completeDiscGuidedSlotWhenSatisfied(
      onDiscGuidedSlotCompleted,
      DISC_GUIDED_COMPLETION_SLOT_IDS.ratingBadge,
      isDiscGuidedRatingBadgeOwnerSatisfied(metadata, ratingBadge),
    )
  }

  function setRatingBadgeEnabled(enabled: boolean) {
    const currentBadge = projectRatingBadgeRef.current
    const nextBadge = clampProjectRatingBadgeToSafeZone(
      {
        ...currentBadge,
        layout: {
          ...currentBadge.layout,
          enabled,
        },
      },
      selectedDiscTemplate,
      projectMetadata,
    )

    projectRatingBadgeRef.current = nextBadge
    setProjectRatingBadge(nextBadge)
    if (enabled) completeRatingBadgeIfSatisfied(nextBadge)
  }

  function setRatingBadgeEnabledForAppliedCandidate(candidate: RatingBoardCandidate) {
    const enabled = candidate.applyKind !== 'none' && candidate.ratingSystem !== 'none'
    const candidateMetadata = enabled
      ? {
          ratingSystem: candidate.ratingSystem,
          ratingValue: candidate.ratingValue,
        }
      : projectMetadata

    const currentBadge = projectRatingBadgeRef.current
    const nextBadge = clampProjectRatingBadgeToSafeZone(
      {
        ...currentBadge,
        layout: {
          ...currentBadge.layout,
          enabled,
        },
      },
      selectedDiscTemplate,
      candidateMetadata,
    )
    projectRatingBadgeRef.current = nextBadge
    setProjectRatingBadge(nextBadge)
    if (enabled) completeRatingBadgeIfSatisfied(nextBadge, candidateMetadata)
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
      const nextBadge = applyImportedRatingBadge(
        projectRatingBadgeRef.current,
        importedImage,
        selectedDiscTemplate,
      )

      projectRatingBadgeRef.current = nextBadge
      setProjectRatingBadge(nextBadge)
      completeRatingBadgeIfSatisfied(nextBadge)

      announceStatus(`Using ${file.name} as the rating badge.`)
      return nextBadge
    } catch (error) {
      announceStatus(`Rating badge import failed: ${String(error)}`)
    }
  }

  function handleRatingBadgeSourceChange(source: RatingBadgeSource) {
    const nextBadge = clampProjectRatingBadgeToSafeZone(
      updateRatingBadgeSource(projectRatingBadgeRef.current, source),
      selectedDiscTemplate,
      projectMetadata,
    )
    projectRatingBadgeRef.current = nextBadge
    setProjectRatingBadge(nextBadge)
    completeRatingBadgeIfSatisfied(nextBadge)
  }

  function handleRatingBadgeLayoutChange(
    field: RatingBadgeLayoutField,
    value: boolean | number,
  ) {
    setProjectRatingBadge((currentBadge) => {
      const nextBadge = updateRatingBadgeLayoutField(currentBadge, field, value)

      return clampProjectRatingBadgeToSafeZone(
        nextBadge,
        selectedDiscTemplate,
        projectMetadata,
      )
    })

    if (field === 'enabled' && value === true) {
      completeRatingBadgeIfSatisfied({
        ...projectRatingBadgeRef.current,
        layout: {
          ...projectRatingBadgeRef.current.layout,
          enabled: true,
        },
      })
    }
  }

  function handleSupplementalUskRatingBadgeEnabledChange(enabled: boolean) {
    setProjectRatingBadge((currentBadge) =>
      clampProjectRatingBadgeToSafeZone(
        updateSupplementalUskRatingBadgeEnabledState(currentBadge, enabled),
        selectedDiscTemplate,
        projectMetadata,
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
        projectMetadata,
      ),
    )
  }

  function handleClearRatingBadgeImage() {
    setProjectRatingBadge((currentBadge) => {
      const nextBadge = clearRatingBadgeImage(currentBadge)

      return clampProjectRatingBadgeToSafeZone(
        nextBadge,
        selectedDiscTemplate,
        projectMetadata,
      )
    })

    announceStatus('Cleared custom rating badge image.')
  }

  function handleResetRatingBadgeLayout() {
    setProjectRatingBadge((currentBadge) => {
      const nextBadge = resetProjectRatingBadgeLayout(
        currentBadge,
        selectedDiscTemplate,
      )

      return clampProjectRatingBadgeToSafeZone(
        nextBadge,
        selectedDiscTemplate,
        projectMetadata,
      )
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
        projectMetadata,
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
