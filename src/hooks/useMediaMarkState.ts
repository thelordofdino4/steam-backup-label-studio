import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { clampMediaMarkLayoutToSafeZone } from '../layout/discElementSafeZone'
import {
  completeDiscGuidedSlotWhenSatisfied,
  DISC_GUIDED_COMPLETION_SLOT_IDS,
  ignoreDiscGuidedSlotCompletion,
  isDiscGuidedMediaMarkOwnerSatisfied,
  type DiscGuidedSlotCompletionHandler,
} from '../guidedPresets/discGuidedCompletion.ts'
import {
  clearMediaMarkImage,
  createDefaultProjectMediaMark,
  resetProjectMediaMarkLayout,
  updateMediaMarkLayoutField,
  updateMediaMarkSource,
  updateMediaMarkTheme,
  updateMediaMarkValue,
  type MediaMarkLayoutField,
} from '../project/projectMediaMark'
import { applyImportedMediaMark } from '../project/projectVisualAssetImport'
import type {
  MediaMarkSource,
  MediaMarkTheme,
  MediaMarkValue,
  ProjectMediaMark,
} from '../project/projectTypes'
import type { DiscTemplate } from '../types/template'
import {
  isImageFile,
  readImportedImageAssetFromFile,
} from '../utils/importedImageAsset'
import { preserveDiscPointOwnerPlacement } from '../presets/discPresetOwnerPlacement.ts'

type UseMediaMarkStateOptions = {
  selectedDiscTemplate: DiscTemplate
  announceStatus: (message: string) => void
  applyActivePresetPlacement?: (
    mediaMark: ProjectMediaMark,
  ) => ProjectMediaMark | null
  onDiscGuidedSlotCompleted?: DiscGuidedSlotCompletionHandler
}

function clampMediaMarkToTemplate(
  mediaMark: ProjectMediaMark,
  template: DiscTemplate,
) {
  return {
    ...mediaMark,
    layout: clampMediaMarkLayoutToSafeZone(mediaMark, template),
  }
}

export function useMediaMarkState({
  selectedDiscTemplate,
  announceStatus,
  applyActivePresetPlacement = (mediaMark) => mediaMark,
  onDiscGuidedSlotCompleted = ignoreDiscGuidedSlotCompletion,
}: UseMediaMarkStateOptions) {
  const [projectMediaMark, setProjectMediaMark] = useState<ProjectMediaMark>(() =>
    createDefaultProjectMediaMark(selectedDiscTemplate),
  )
  const projectMediaMarkRef = useRef(projectMediaMark)

  useEffect(() => {
    projectMediaMarkRef.current = projectMediaMark
  }, [projectMediaMark])

  function applySemanticMediaMarkChange(mediaMark: ProjectMediaMark) {
    const fittedMediaMark = applyActivePresetPlacement(mediaMark) ?? {
      ...mediaMark,
      layout: preserveDiscPointOwnerPlacement(
        mediaMark.layout,
        projectMediaMarkRef.current.layout,
      ),
    }
    projectMediaMarkRef.current = fittedMediaMark
    setProjectMediaMark(fittedMediaMark)
    return fittedMediaMark
  }

  function clampProjectMediaMarkToTemplate(template: DiscTemplate) {
    setProjectMediaMark((currentMark) => {
      const layout = clampMediaMarkLayoutToSafeZone(currentMark, template)

      if (
        layout.x === currentMark.layout.x &&
        layout.y === currentMark.layout.y
      ) {
        return currentMark
      }

      return {
        ...currentMark,
        layout,
      }
    })
  }

  function resetProjectMediaMark(template: DiscTemplate = selectedDiscTemplate) {
    setProjectMediaMark(createDefaultProjectMediaMark(template))
  }

  function completeMediaMarkIfSatisfied(mediaMark: ProjectMediaMark) {
    completeDiscGuidedSlotWhenSatisfied(
      onDiscGuidedSlotCompleted,
      DISC_GUIDED_COMPLETION_SLOT_IDS.mediaFormatMark,
      isDiscGuidedMediaMarkOwnerSatisfied(mediaMark),
    )
  }

  async function handleMediaMarkUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isImageFile(file)) {
      announceStatus('Choose an image file for the media mark.')
      return
    }

    try {
      const importedImage = await readImportedImageAssetFromFile(file)
      const nextMark = applyImportedMediaMark(
        projectMediaMarkRef.current,
        importedImage,
        selectedDiscTemplate,
      )

      const finalMark = applySemanticMediaMarkChange(nextMark)
      completeMediaMarkIfSatisfied(finalMark)

      announceStatus(`Using ${file.name} as the media mark.`)
      return finalMark
    } catch (error) {
      announceStatus(`Media mark import failed: ${String(error)}`)
    }
  }

  function handleMediaMarkValueChange(value: MediaMarkValue) {
    const nextMark = updateMediaMarkValue(projectMediaMarkRef.current, value)
    const finalMark = applySemanticMediaMarkChange(nextMark)
    completeMediaMarkIfSatisfied(finalMark)
  }

  function handleMediaMarkSourceChange(source: MediaMarkSource) {
    const nextMark = clampMediaMarkToTemplate(
      updateMediaMarkSource(projectMediaMarkRef.current, source),
      selectedDiscTemplate,
    )
    const finalMark = applySemanticMediaMarkChange(nextMark)
    completeMediaMarkIfSatisfied(finalMark)
  }

  function handleMediaMarkThemeChange(theme: MediaMarkTheme) {
    const nextMark = updateMediaMarkTheme(projectMediaMarkRef.current, theme)
    const finalMark = applySemanticMediaMarkChange(nextMark)
    completeMediaMarkIfSatisfied(finalMark)
  }

  function handleMediaMarkLayoutChange(
    field: MediaMarkLayoutField,
    value: boolean | number,
  ) {
    const nextMark = clampMediaMarkToTemplate(
      updateMediaMarkLayoutField(
        projectMediaMarkRef.current,
        field,
        value,
      ),
      selectedDiscTemplate,
    )
    let finalMark = nextMark
    if (field === 'enabled' && value === true) {
      finalMark = applySemanticMediaMarkChange(nextMark)
    } else {
      projectMediaMarkRef.current = nextMark
      setProjectMediaMark(nextMark)
    }

    if (field === 'enabled' && value === true) {
      completeMediaMarkIfSatisfied(finalMark)
    }
  }

  function handleClearMediaMarkImage() {
    applySemanticMediaMarkChange(
      clampMediaMarkToTemplate(
        clearMediaMarkImage(projectMediaMarkRef.current),
        selectedDiscTemplate,
      ),
    )

    announceStatus('Cleared custom media mark image.')
  }

  function handleResetMediaMarkLayout() {
    setProjectMediaMark((currentMark) =>
      clampMediaMarkToTemplate(
        resetProjectMediaMarkLayout(
          currentMark,
          selectedDiscTemplate,
        ),
        selectedDiscTemplate,
      ),
    )

    announceStatus('Reset media mark layout.')
  }

  return {
    projectMediaMark,
    setProjectMediaMark,
    clampProjectMediaMarkToTemplate,
    resetProjectMediaMark,
    handleMediaMarkUpload,
    handleMediaMarkValueChange,
    handleMediaMarkSourceChange,
    handleMediaMarkThemeChange,
    handleMediaMarkLayoutChange,
    handleClearMediaMarkImage,
    handleResetMediaMarkLayout,
  }
}
