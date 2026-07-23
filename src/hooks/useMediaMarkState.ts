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

type UseMediaMarkStateOptions = {
  selectedDiscTemplate: DiscTemplate
  announceStatus: (message: string) => void
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
  onDiscGuidedSlotCompleted = ignoreDiscGuidedSlotCompletion,
}: UseMediaMarkStateOptions) {
  const [projectMediaMark, setProjectMediaMark] = useState<ProjectMediaMark>(() =>
    createDefaultProjectMediaMark(selectedDiscTemplate),
  )
  const projectMediaMarkRef = useRef(projectMediaMark)

  useEffect(() => {
    projectMediaMarkRef.current = projectMediaMark
  }, [projectMediaMark])

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

      projectMediaMarkRef.current = nextMark
      setProjectMediaMark(nextMark)
      completeMediaMarkIfSatisfied(nextMark)

      announceStatus(`Using ${file.name} as the media mark.`)
      return nextMark
    } catch (error) {
      announceStatus(`Media mark import failed: ${String(error)}`)
    }
  }

  function handleMediaMarkValueChange(value: MediaMarkValue) {
    const nextMark = updateMediaMarkValue(projectMediaMarkRef.current, value)
    projectMediaMarkRef.current = nextMark
    setProjectMediaMark(nextMark)
    completeMediaMarkIfSatisfied(nextMark)
  }

  function handleMediaMarkSourceChange(source: MediaMarkSource) {
    const nextMark = clampMediaMarkToTemplate(
      updateMediaMarkSource(projectMediaMarkRef.current, source),
      selectedDiscTemplate,
    )
    projectMediaMarkRef.current = nextMark
    setProjectMediaMark(nextMark)
    completeMediaMarkIfSatisfied(nextMark)
  }

  function handleMediaMarkThemeChange(theme: MediaMarkTheme) {
    const nextMark = updateMediaMarkTheme(projectMediaMarkRef.current, theme)
    projectMediaMarkRef.current = nextMark
    setProjectMediaMark(nextMark)
    completeMediaMarkIfSatisfied(nextMark)
  }

  function handleMediaMarkLayoutChange(
    field: MediaMarkLayoutField,
    value: boolean | number,
  ) {
    setProjectMediaMark((currentMark) =>
      clampMediaMarkToTemplate(
        updateMediaMarkLayoutField(currentMark, field, value),
        selectedDiscTemplate,
      ),
    )

    if (field === 'enabled' && value === true) {
      completeMediaMarkIfSatisfied({
        ...projectMediaMarkRef.current,
        layout: {
          ...projectMediaMarkRef.current.layout,
          enabled: true,
        },
      })
    }
  }

  function handleClearMediaMarkImage() {
    setProjectMediaMark((currentMark) =>
      clampMediaMarkToTemplate(
        clearMediaMarkImage(currentMark),
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
