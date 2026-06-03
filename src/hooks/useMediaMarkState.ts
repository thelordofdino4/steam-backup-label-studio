import { useState, type ChangeEvent } from 'react'
import { clampMediaMarkLayoutToSafeZone } from '../layout/discElementSafeZone'
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
}: UseMediaMarkStateOptions) {
  const [projectMediaMark, setProjectMediaMark] = useState<ProjectMediaMark>(() =>
    createDefaultProjectMediaMark(selectedDiscTemplate),
  )

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

      setProjectMediaMark((currentMark) =>
        applyImportedMediaMark(
          currentMark,
          importedImage,
          selectedDiscTemplate,
        ),
      )

      announceStatus(`Using ${file.name} as the media mark.`)
    } catch (error) {
      announceStatus(`Media mark import failed: ${String(error)}`)
    }
  }

  function handleMediaMarkValueChange(value: MediaMarkValue) {
    setProjectMediaMark((currentMark) =>
      updateMediaMarkValue(currentMark, value),
    )
  }

  function handleMediaMarkSourceChange(source: MediaMarkSource) {
    setProjectMediaMark((currentMark) =>
      clampMediaMarkToTemplate(
        updateMediaMarkSource(currentMark, source),
        selectedDiscTemplate,
      ),
    )
  }

  function handleMediaMarkThemeChange(theme: MediaMarkTheme) {
    setProjectMediaMark((currentMark) =>
      updateMediaMarkTheme(currentMark, theme),
    )
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
