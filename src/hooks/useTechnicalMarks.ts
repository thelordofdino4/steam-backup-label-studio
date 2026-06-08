import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { clampProjectTechnicalMarksToSafeZone } from '../layout/discElementSafeZone'
import {
  addTechnicalMarkAsset,
  clearTechnicalMarkImage,
  createDefaultProjectTechnicalMarks,
  removeTechnicalMarkAsset,
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
  const [projectTechnicalMarks, setProjectTechnicalMarksState] =
    useState<ProjectTechnicalMarks>(() => createDefaultProjectTechnicalMarks())
  const projectTechnicalMarksRef = useRef<ProjectTechnicalMarks>(
    projectTechnicalMarks,
  )
  const setProjectTechnicalMarks: Dispatch<
    SetStateAction<ProjectTechnicalMarks>
  > = (action) => {
    setProjectTechnicalMarksState((currentMarks) => {
      const nextMarks = typeof action === 'function'
        ? (action as (marks: ProjectTechnicalMarks) => ProjectTechnicalMarks)(
            currentMarks,
          )
        : action

      projectTechnicalMarksRef.current = nextMarks
      return nextMarks
    })
  }

  useEffect(() => {
    projectTechnicalMarksRef.current = projectTechnicalMarks
  }, [projectTechnicalMarks])

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
    assetId?: string | null,
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

      const nextMarks = applyImportedTechnicalMark(
        projectTechnicalMarksRef.current,
        value,
        importedImage,
        selectedDiscTemplate,
        assetId,
      )

      setProjectTechnicalMarks(nextMarks)
      announceStatus(`Using ${file.name} as the technical mark.`)

      return nextMarks
    } catch (error) {
      announceStatus(`Technical mark import failed: ${String(error)}`)
    }
  }

  function handleTechnicalMarkSourceChange(
    value: TechnicalMarkValue,
    source: TechnicalMarkSource,
    assetId?: string | null,
  ) {
    setProjectTechnicalMarks((currentMarks) =>
      clampProjectTechnicalMarksToSafeZone(
        updateTechnicalMarkSource(currentMarks, value, source, assetId),
        selectedDiscTemplate,
      ),
    )
  }

  function handleTechnicalMarkLayoutChange(
    technicalValue: TechnicalMarkValue,
    field: TechnicalMarkLayoutField,
    layoutValue: boolean | number,
    assetId?: string | null,
  ) {
    setProjectTechnicalMarks((currentMarks) =>
      clampProjectTechnicalMarksToSafeZone(
        updateTechnicalMarkLayoutField(
          currentMarks,
          technicalValue,
          field,
          layoutValue,
          assetId,
        ),
        selectedDiscTemplate,
      ),
    )
  }

  function handleTechnicalMarkLabelChange(
    value: TechnicalMarkValue,
    label: string,
    assetId?: string | null,
  ) {
    setProjectTechnicalMarks((currentMarks) =>
      updateTechnicalMarkLabel(currentMarks, value, label, assetId),
    )
  }

  function handleClearTechnicalMarkImage(
    value: TechnicalMarkValue,
    assetId?: string | null,
  ) {
    setProjectTechnicalMarks((currentMarks) =>
      clampProjectTechnicalMarksToSafeZone(
        clearTechnicalMarkImage(currentMarks, value, assetId),
        selectedDiscTemplate,
      ),
    )

    announceStatus('Cleared custom technical mark image.')
  }

  function handleResetTechnicalMarkLayout(
    value: TechnicalMarkValue,
    assetId?: string | null,
  ) {
    setProjectTechnicalMarks((currentMarks) =>
      clampProjectTechnicalMarksToSafeZone(
        resetProjectTechnicalMarkLayout(
          currentMarks,
          value,
          selectedDiscTemplate,
          assetId,
        ),
        selectedDiscTemplate,
      ),
    )

    announceStatus('Reset technical mark layout.')
  }

  function handleAddTechnicalMarkAsset(value: TechnicalMarkValue) {
    const nextMarks = clampProjectTechnicalMarksToSafeZone(
      addTechnicalMarkAsset(
        projectTechnicalMarksRef.current,
        value,
        selectedDiscTemplate,
      ),
      selectedDiscTemplate,
    )

    setProjectTechnicalMarks(nextMarks)
    return nextMarks
  }

  function handleRemoveTechnicalMarkAsset(
    value: TechnicalMarkValue,
    assetId: string,
  ) {
    const nextMarks = removeTechnicalMarkAsset(
      projectTechnicalMarksRef.current,
      value,
      assetId,
    )

    setProjectTechnicalMarks(nextMarks)
    return nextMarks
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
    handleAddTechnicalMarkAsset,
    handleRemoveTechnicalMarkAsset,
  }
}
