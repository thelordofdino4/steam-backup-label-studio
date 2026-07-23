import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { clampProjectPlatformMarksToSafeZone } from '../layout/discElementSafeZone'
import {
  completeDiscGuidedSlotWhenSatisfied,
  DISC_GUIDED_COMPLETION_SLOT_IDS,
  ignoreDiscGuidedSlotCompletion,
  isDiscGuidedPlatformMarksOwnerSatisfied,
  type DiscGuidedSlotCompletionHandler,
} from '../guidedPresets/discGuidedCompletion.ts'
import {
  clearPlatformMarkImage,
  createDefaultProjectPlatformMarks,
  markProjectPlatformMarksManual,
  resetProjectPlatformMarkLayout,
  updatePlatformMarkLayoutField,
  updatePlatformMarkSource,
  updatePlatformMarkTheme,
  updatePlatformMarkToggle,
  type PlatformMarkLayoutField,
} from '../project/projectPlatformMarks'
import { applyImportedPlatformMark } from '../project/projectVisualAssetImport'
import type {
  PlatformMarkSource,
  PlatformMarkTheme,
  PlatformMarkValue,
  ProjectPlatformMarks,
} from '../project/projectTypes'
import type { SteamImportedGame } from '../steam/steamApi'
import type { DiscTemplate } from '../types/template'
import {
  isImageFile,
  readImportedImageAssetFromFile,
} from '../utils/importedImageAsset'

type UsePlatformMarksStateOptions = {
  selectedDiscTemplate: DiscTemplate
  selectedSteamGame: SteamImportedGame | null
  announceStatus: (message: string) => void
  applyActivePresetPlacement?: (
    platformMarks: ProjectPlatformMarks,
  ) => ProjectPlatformMarks
  onDiscGuidedSlotCompleted?: DiscGuidedSlotCompletionHandler
}

export function usePlatformMarksState({
  selectedDiscTemplate,
  selectedSteamGame,
  announceStatus,
  applyActivePresetPlacement = (platformMarks) => platformMarks,
  onDiscGuidedSlotCompleted = ignoreDiscGuidedSlotCompletion,
}: UsePlatformMarksStateOptions) {
  const [projectPlatformMarks, setProjectPlatformMarks] =
    useState<ProjectPlatformMarks>(() => createDefaultProjectPlatformMarks())
  const projectPlatformMarksRef = useRef(projectPlatformMarks)

  useEffect(() => {
    projectPlatformMarksRef.current = projectPlatformMarks
  }, [projectPlatformMarks])

  function markCurrentProjectPlatformMarksManual(marks: ProjectPlatformMarks) {
    return markProjectPlatformMarksManual(marks, selectedSteamGame?.appId ?? null)
  }

  function finalizeEligibilityChange(nextMarks: ProjectPlatformMarks) {
    const finalMarks = applyActivePresetPlacement(nextMarks)
    projectPlatformMarksRef.current = finalMarks
    return finalMarks
  }

  function completePlatformMarksIfSatisfied(platformMarks: ProjectPlatformMarks) {
    completeDiscGuidedSlotWhenSatisfied(
      onDiscGuidedSlotCompleted,
      DISC_GUIDED_COMPLETION_SLOT_IDS.operatingSystemMarks,
      isDiscGuidedPlatformMarksOwnerSatisfied(platformMarks),
    )
  }

  function clampProjectPlatformMarksToTemplate(template: DiscTemplate) {
    setProjectPlatformMarks((currentMarks) =>
      clampProjectPlatformMarksToSafeZone(currentMarks, template),
    )
  }

  function resetProjectPlatformMarks() {
    setProjectPlatformMarks(createDefaultProjectPlatformMarks())
  }

  function handlePlatformMarkToggle(value: PlatformMarkValue, enabled: boolean) {
    const nextMarks = finalizeEligibilityChange(
      markCurrentProjectPlatformMarksManual(
        clampProjectPlatformMarksToSafeZone(
          updatePlatformMarkToggle(
            projectPlatformMarksRef.current,
            value,
            enabled,
            selectedDiscTemplate,
          ),
          selectedDiscTemplate,
        ),
      ),
    )
    setProjectPlatformMarks(nextMarks)
    if (enabled) completePlatformMarksIfSatisfied(nextMarks)
  }

  async function handlePlatformMarkUpload(
    value: PlatformMarkValue,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isImageFile(file)) {
      announceStatus('Choose an image file for the platform mark.')
      return
    }

    try {
      const importedImage = await readImportedImageAssetFromFile(file)
      const nextMarks = finalizeEligibilityChange(
        markCurrentProjectPlatformMarksManual(
          applyImportedPlatformMark(
            projectPlatformMarksRef.current,
            value,
            importedImage,
            selectedDiscTemplate,
          ),
        ),
      )

      projectPlatformMarksRef.current = nextMarks
      setProjectPlatformMarks(nextMarks)
      completePlatformMarksIfSatisfied(nextMarks)

      announceStatus(`Using ${file.name} as the platform mark.`)
      return nextMarks
    } catch (error) {
      announceStatus(`Platform mark import failed: ${String(error)}`)
    }
  }

  function handlePlatformMarkSourceChange(value: PlatformMarkValue, source: PlatformMarkSource) {
    const nextMarks = finalizeEligibilityChange(
      markCurrentProjectPlatformMarksManual(
        clampProjectPlatformMarksToSafeZone(
          updatePlatformMarkSource(
            projectPlatformMarksRef.current,
            value,
            source,
          ),
          selectedDiscTemplate,
        ),
      ),
    )
    setProjectPlatformMarks(nextMarks)
    completePlatformMarksIfSatisfied(nextMarks)
  }

  function handlePlatformMarkThemeChange(value: PlatformMarkValue, theme: PlatformMarkTheme) {
    const nextMarks = finalizeEligibilityChange(
      markCurrentProjectPlatformMarksManual(
        updatePlatformMarkTheme(
          projectPlatformMarksRef.current,
          value,
          theme,
          selectedDiscTemplate,
        ),
      ),
    )
    setProjectPlatformMarks(nextMarks)
    completePlatformMarksIfSatisfied(nextMarks)
  }

  function handlePlatformMarkLayoutChange(
    platformValue: PlatformMarkValue,
    field: PlatformMarkLayoutField,
    layoutValue: boolean | number,
  ) {
    const nextMarks = clampProjectPlatformMarksToSafeZone(
      updatePlatformMarkLayoutField(
        projectPlatformMarksRef.current,
        platformValue,
        field,
        layoutValue,
      ),
      selectedDiscTemplate,
    )
    const manualMarks = markCurrentProjectPlatformMarksManual(nextMarks)
    const finalMarks = field === 'enabled'
      ? finalizeEligibilityChange(manualMarks)
      : manualMarks
    projectPlatformMarksRef.current = finalMarks
    setProjectPlatformMarks(finalMarks)

    if (field === 'enabled' && layoutValue === true) {
      completePlatformMarksIfSatisfied(finalMarks)
    }
  }

  function handleClearPlatformMarkImage(value: PlatformMarkValue) {
    setProjectPlatformMarks((currentMarks) => {
      const nextMarks = clampProjectPlatformMarksToSafeZone(
        clearPlatformMarkImage(currentMarks, value),
        selectedDiscTemplate,
      )

      return finalizeEligibilityChange(
        markCurrentProjectPlatformMarksManual(nextMarks),
      )
    })

    announceStatus('Cleared custom platform mark image.')
  }

  function handleResetPlatformMarkLayout(value: PlatformMarkValue) {
    setProjectPlatformMarks((currentMarks) => {
      const nextMarks = clampProjectPlatformMarksToSafeZone(
        resetProjectPlatformMarkLayout(currentMarks, value, selectedDiscTemplate),
        selectedDiscTemplate,
      )

      return markCurrentProjectPlatformMarksManual(nextMarks)
    })

    announceStatus('Reset platform mark layout.')
  }

  function applyProjectPlatformMarksEligibilityChange(
    nextMarks: ProjectPlatformMarks,
  ) {
    const finalMarks = finalizeEligibilityChange(nextMarks)
    setProjectPlatformMarks(finalMarks)
    completePlatformMarksIfSatisfied(finalMarks)
    return finalMarks
  }

  return {
    projectPlatformMarks,
    setProjectPlatformMarks,
    clampProjectPlatformMarksToTemplate,
    resetProjectPlatformMarks,
    handlePlatformMarkToggle,
    handlePlatformMarkUpload,
    handlePlatformMarkSourceChange,
    handlePlatformMarkThemeChange,
    handlePlatformMarkLayoutChange,
    handleClearPlatformMarkImage,
    handleResetPlatformMarkLayout,
    applyProjectPlatformMarksEligibilityChange,
  }
}
