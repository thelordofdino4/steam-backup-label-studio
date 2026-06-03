import { useState, type ChangeEvent } from 'react'
import { clampProjectPlatformMarksToSafeZone } from '../layout/discElementSafeZone'
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
} from '../project/projectMediaMark'
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
}

export function usePlatformMarksState({
  selectedDiscTemplate,
  selectedSteamGame,
  announceStatus,
}: UsePlatformMarksStateOptions) {
  const [projectPlatformMarks, setProjectPlatformMarks] =
    useState<ProjectPlatformMarks>(() => createDefaultProjectPlatformMarks())

  function markCurrentProjectPlatformMarksManual(marks: ProjectPlatformMarks) {
    return markProjectPlatformMarksManual(marks, selectedSteamGame?.appId ?? null)
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
    setProjectPlatformMarks((currentMarks) => {
      const nextMarks = clampProjectPlatformMarksToSafeZone(
        updatePlatformMarkToggle(
          currentMarks,
          value,
          enabled,
          selectedDiscTemplate,
        ),
        selectedDiscTemplate,
      )

      return markCurrentProjectPlatformMarksManual(nextMarks)
    })
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

      setProjectPlatformMarks((currentMarks) => {
        const nextMarks = applyImportedPlatformMark(
          currentMarks,
          value,
          importedImage,
          selectedDiscTemplate,
        )

        return markCurrentProjectPlatformMarksManual(nextMarks)
      })

      announceStatus(`Using ${file.name} as the platform mark.`)
    } catch (error) {
      announceStatus(`Platform mark import failed: ${String(error)}`)
    }
  }

  function handlePlatformMarkSourceChange(value: PlatformMarkValue, source: PlatformMarkSource) {
    setProjectPlatformMarks((currentMarks) => {
      const nextMarks = clampProjectPlatformMarksToSafeZone(
        updatePlatformMarkSource(currentMarks, value, source),
        selectedDiscTemplate,
      )

      return markCurrentProjectPlatformMarksManual(nextMarks)
    })
  }

  function handlePlatformMarkThemeChange(value: PlatformMarkValue, theme: PlatformMarkTheme) {
    setProjectPlatformMarks((currentMarks) => {
      const nextMarks = updatePlatformMarkTheme(
        currentMarks,
        value,
        theme,
        selectedDiscTemplate,
      )

      return markCurrentProjectPlatformMarksManual(nextMarks)
    })
  }

  function handlePlatformMarkLayoutChange(
    platformValue: PlatformMarkValue,
    field: PlatformMarkLayoutField,
    layoutValue: boolean | number,
  ) {
    setProjectPlatformMarks((currentMarks) => {
      const nextMarks = clampProjectPlatformMarksToSafeZone(
        updatePlatformMarkLayoutField(currentMarks, platformValue, field, layoutValue),
        selectedDiscTemplate,
      )

      return markCurrentProjectPlatformMarksManual(nextMarks)
    })
  }

  function handleClearPlatformMarkImage(value: PlatformMarkValue) {
    setProjectPlatformMarks((currentMarks) => {
      const nextMarks = clampProjectPlatformMarksToSafeZone(
        clearPlatformMarkImage(currentMarks, value),
        selectedDiscTemplate,
      )

      return markCurrentProjectPlatformMarksManual(nextMarks)
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
  }
}
