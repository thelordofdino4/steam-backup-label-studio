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
import { preserveDiscPointOwnerPlacement } from '../presets/discPresetOwnerPlacement.ts'

type UseRatingBadgeStateOptions = {
  selectedDiscTemplate: DiscTemplate
  projectMetadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'>
  announceStatus: (message: string) => void
  applyActivePresetPlacement?: (
    ratingBadge: ProjectRatingBadge,
    metadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'>,
  ) => ProjectRatingBadge | null
  onDiscGuidedSlotCompleted?: DiscGuidedSlotCompletionHandler
}

export function useRatingBadgeState({
  selectedDiscTemplate,
  projectMetadata,
  announceStatus,
  applyActivePresetPlacement = (ratingBadge) => ratingBadge,
  onDiscGuidedSlotCompleted = ignoreDiscGuidedSlotCompletion,
}: UseRatingBadgeStateOptions) {
  const [projectRatingBadge, setProjectRatingBadge] = useState<ProjectRatingBadge>(() =>
    createDefaultProjectRatingBadge(selectedDiscTemplate),
  )
  const projectRatingBadgeRef = useRef(projectRatingBadge)

  useEffect(() => {
    projectRatingBadgeRef.current = projectRatingBadge
  }, [projectRatingBadge])

  function commitProjectRatingBadge(ratingBadge: ProjectRatingBadge) {
    projectRatingBadgeRef.current = ratingBadge
    setProjectRatingBadge(ratingBadge)
  }

  function applySemanticRatingBadgeChange(
    ratingBadge: ProjectRatingBadge,
    metadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'> =
      projectMetadata,
  ) {
    const fittedRatingBadge = applyActivePresetPlacement(
      ratingBadge,
      metadata,
    ) ?? {
      ...ratingBadge,
      layout: preserveDiscPointOwnerPlacement(
        ratingBadge.layout,
        projectRatingBadgeRef.current.layout,
      ),
    }
    commitProjectRatingBadge(fittedRatingBadge)
    return fittedRatingBadge
  }

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

    const finalBadge = enabled
      ? applySemanticRatingBadgeChange(nextBadge)
      : nextBadge
    if (!enabled) commitProjectRatingBadge(nextBadge)
    if (enabled) completeRatingBadgeIfSatisfied(finalBadge)
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
    const finalBadge = enabled
      ? applySemanticRatingBadgeChange(nextBadge, candidateMetadata)
      : nextBadge
    if (!enabled) commitProjectRatingBadge(nextBadge)
    if (enabled) completeRatingBadgeIfSatisfied(finalBadge, candidateMetadata)
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

      const finalBadge = applySemanticRatingBadgeChange(nextBadge)
      completeRatingBadgeIfSatisfied(finalBadge)

      announceStatus(`Using ${file.name} as the rating badge.`)
      return finalBadge
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
    const finalBadge = applySemanticRatingBadgeChange(nextBadge)
    completeRatingBadgeIfSatisfied(finalBadge)
  }

  function handleRatingBadgeLayoutChange(
    field: RatingBadgeLayoutField,
    value: boolean | number,
  ) {
    const nextBadge = clampProjectRatingBadgeToSafeZone(
      updateRatingBadgeLayoutField(
        projectRatingBadgeRef.current,
        field,
        value,
      ),
      selectedDiscTemplate,
      projectMetadata,
    )
    let finalBadge = nextBadge
    if (field === 'enabled' && value === true) {
      finalBadge = applySemanticRatingBadgeChange(nextBadge)
    } else {
      commitProjectRatingBadge(nextBadge)
    }

    if (field === 'enabled' && value === true) {
      completeRatingBadgeIfSatisfied(finalBadge)
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
    applySemanticRatingBadgeChange(
      clampProjectRatingBadgeToSafeZone(
        clearRatingBadgeImage(projectRatingBadgeRef.current),
        selectedDiscTemplate,
        projectMetadata,
      ),
    )

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
