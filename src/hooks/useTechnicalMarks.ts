import { useState, type ChangeEvent } from 'react'
import { clampProjectTechnicalMarksToSafeZone } from '../layout/discElementSafeZone'
import {
  clearTechnicalMarkImage,
  createDefaultProjectTechnicalMarks,
  resetProjectTechnicalMarkLayout,
  updateTechnicalMarkLabel,
  updateTechnicalMarkLayoutField,
  updateTechnicalMarkSource,
  updateTechnicalMarkToggle,
  type TechnicalMarkLayoutField,
} from '../project/projectTechnicalMarks'
import { applyImportedTechnicalMark } from '../project/projectVisualAssetImport'
import type {
  ProjectTechnicalMarks,
  TechnicalMarkSource,
  TechnicalMarkValue,
} from '../project/projectTypes'
import type { DiscTemplate } from '../types/template'
import { isImageFile, readImportedImageAssetFromFile } from '../utils/importedImageAsset'

type UseTechnicalMarksOptions = {
  selectedDiscTemplate: DiscTemplate
  announceStatus: (message: string) => void
}

export function useTechnicalMarks({
  selectedDiscTemplate,
  announceStatus,
}: UseTechnicalMarksOptions) {
  const [projectTechnicalMarks, setProjectTechnicalMarks] =
    useState<ProjectTechnicalMarks>(() => createDefaultProjectTechnicalMarks())

  function clampProjectTechnicalMarksToTemplate(template: DiscTemplate) {
    setProjectTechnicalMarks((currentMarks) =>
      clampProjectTechnicalMarksToSafeZone(currentMarks, template),
    )
  }

  function resetProjectTechnicalMarks() {
    setProjectTechnicalMarks(createDefaultProjectTechnicalMarks())
  }

  function handleTechnicalMarkToggle(value: TechnicalMarkValue, enabled: boolean) {
    setProjectTechnicalMarks((currentMarks) =>
      clampProjectTechnicalMarksToSafeZone(
        updateTechnicalMarkToggle(
          currentMarks,
          value,
          enabled,
          selectedDiscTemplate,
        ),
        selectedDiscTemplate,
      ),
    )
  }

  async function handleTechnicalMarkUpload(
    value: TechnicalMarkValue,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isImageFile(file)) {
      announceStatus('Choose an image file for the technical mark.')
      return
    }

    try {
      const importedImage = await readImportedImageAssetFromFile(file)

      setProjectTechnicalMarks((currentMarks) =>
        applyImportedTechnicalMark(
          currentMarks,
          value,
          importedImage,
          selectedDiscTemplate,
        ),
      )

      announceStatus(`Using ${file.name} as the technical mark.`)
    } catch (error) {
      announceStatus(`Technical mark import failed: ${String(error)}`)
    }
  }

  function handleTechnicalMarkSourceChange(
    value: TechnicalMarkValue,
    source: TechnicalMarkSource,
  ) {
    setProjectTechnicalMarks((currentMarks) =>
      clampProjectTechnicalMarksToSafeZone(
        updateTechnicalMarkSource(currentMarks, value, source),
        selectedDiscTemplate,
      ),
    )
  }

  function handleTechnicalMarkLayoutChange(
    technicalValue: TechnicalMarkValue,
    field: TechnicalMarkLayoutField,
    layoutValue: boolean | number,
  ) {
    setProjectTechnicalMarks((currentMarks) =>
      clampProjectTechnicalMarksToSafeZone(
        updateTechnicalMarkLayoutField(currentMarks, technicalValue, field, layoutValue),
        selectedDiscTemplate,
      ),
    )
  }

  function handleTechnicalMarkLabelChange(value: TechnicalMarkValue, label: string) {
    setProjectTechnicalMarks((currentMarks) =>
      updateTechnicalMarkLabel(currentMarks, value, label),
    )
  }

  function handleClearTechnicalMarkImage(value: TechnicalMarkValue) {
    setProjectTechnicalMarks((currentMarks) =>
      clampProjectTechnicalMarksToSafeZone(
        clearTechnicalMarkImage(currentMarks, value),
        selectedDiscTemplate,
      ),
    )

    announceStatus('Cleared custom technical mark image.')
  }

  function handleResetTechnicalMarkLayout(value: TechnicalMarkValue) {
    setProjectTechnicalMarks((currentMarks) =>
      clampProjectTechnicalMarksToSafeZone(
        resetProjectTechnicalMarkLayout(currentMarks, value, selectedDiscTemplate),
        selectedDiscTemplate,
      ),
    )

    announceStatus('Reset technical mark layout.')
  }

  return {
    projectTechnicalMarks,
    setProjectTechnicalMarks,
    clampProjectTechnicalMarksToTemplate,
    resetProjectTechnicalMarks,
    handleTechnicalMarkToggle,
    handleTechnicalMarkUpload,
    handleTechnicalMarkSourceChange,
    handleTechnicalMarkLayoutChange,
    handleTechnicalMarkLabelChange,
    handleClearTechnicalMarkImage,
    handleResetTechnicalMarkLayout,
  }
}
