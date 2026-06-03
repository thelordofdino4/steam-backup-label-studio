import { useState, type ChangeEvent } from 'react'
import {
  clampLogoAssetLayoutToSafeZone,
  clampProjectLogoAssetsToSafeZone,
} from '../layout/discElementSafeZone'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus'
import {
  addAdditionalLogoAsset,
  clearLogoAsset,
  createDefaultProjectLogoAssets,
  getLogoAssetLayout,
  getLogoAssetSize,
  removeAdditionalLogoAsset,
  resetProjectLogoAssetLayout,
  setLogoAssetLayout,
  updateAdditionalLogoAssetLabel,
  updateLogoAssetLayoutField,
  type LogoAssetKey,
  type LogoAssetLayoutField,
} from '../project/projectLogoAssets'
import { applyImportedLogoAsset } from '../project/projectVisualAssetImport'
import type { ProjectLogoAssets } from '../project/projectTypes'
import type { DiscTemplate } from '../types/template'
import {
  isImageFile,
  readImportedImageAssetFromFile,
} from '../utils/importedImageAsset'

type UseProjectLogoAssetsOptions = {
  selectedDiscTemplate: DiscTemplate
  announceStatus: (message: string) => void
}

export function useProjectLogoAssets({
  selectedDiscTemplate,
  announceStatus,
}: UseProjectLogoAssetsOptions) {
  const [projectLogoAssets, setProjectLogoAssets] = useState<ProjectLogoAssets>(() =>
    createDefaultProjectLogoAssets(selectedDiscTemplate),
  )

  function clampProjectLogoAssetsToTemplate(template: DiscTemplate) {
    setProjectLogoAssets((currentLogoAssets) =>
      clampProjectLogoAssetsToSafeZone(currentLogoAssets, template),
    )
  }

  function resetProjectLogoAssets(template: DiscTemplate = selectedDiscTemplate) {
    setProjectLogoAssets(createDefaultProjectLogoAssets(template))
  }

  async function handleLogoAssetUpload(
    logoKey: LogoAssetKey,
    event: ChangeEvent<HTMLInputElement>,
    additionalLogoId?: string,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isImageFile(file)) {
      announceStatus('Choose an image file for the logo asset.')
      return
    }

    try {
      const importedImage = await readImportedImageAssetFromFile(file)

      setProjectLogoAssets((currentLogoAssets) =>
        applyImportedLogoAsset(
          currentLogoAssets,
          logoKey,
          importedImage,
          selectedDiscTemplate,
          createProjectImageAssetProvenance({
            source: 'uploaded',
            sourceLabel: file.name,
          }),
          additionalLogoId,
        ),
      )

      announceStatus(
        `Using ${file.name} as the ${additionalLogoId ? `additional ${logoKey}` : logoKey} logo.`,
      )
    } catch (error) {
      announceStatus(`Logo import failed: ${String(error)}`)
    }
  }

  function handleLogoAssetLayoutChange(
    logoKey: LogoAssetKey,
    field: LogoAssetLayoutField,
    value: boolean | number,
    additionalLogoId?: string,
  ) {
    setProjectLogoAssets((currentLogoAssets) => {
      const nextLogoAssets = updateLogoAssetLayoutField(
        currentLogoAssets,
        logoKey,
        field,
        value,
        additionalLogoId,
      )
      const nextLayout = clampLogoAssetLayoutToSafeZone(
        getLogoAssetLayout(nextLogoAssets, logoKey, additionalLogoId),
        selectedDiscTemplate,
        getLogoAssetSize(nextLogoAssets, logoKey, additionalLogoId),
      )

      return setLogoAssetLayout(nextLogoAssets, logoKey, nextLayout, additionalLogoId)
    })
  }

  function handleClearLogoAsset(logoKey: LogoAssetKey, additionalLogoId?: string) {
    setProjectLogoAssets((currentLogoAssets) => {
      const nextLogoAssets = clearLogoAsset(
        currentLogoAssets,
        logoKey,
        additionalLogoId,
      )
      const nextLayout = clampLogoAssetLayoutToSafeZone(
        getLogoAssetLayout(nextLogoAssets, logoKey, additionalLogoId),
        selectedDiscTemplate,
        getLogoAssetSize(nextLogoAssets, logoKey, additionalLogoId),
      )

      return setLogoAssetLayout(nextLogoAssets, logoKey, nextLayout, additionalLogoId)
    })

    announceStatus(`Cleared ${additionalLogoId ? `additional ${logoKey}` : logoKey} logo asset.`)
  }

  function handleResetLogoAssetLayout(logoKey: LogoAssetKey, additionalLogoId?: string) {
    setProjectLogoAssets((currentLogoAssets) => {
      const nextLogoAssets = resetProjectLogoAssetLayout(
        currentLogoAssets,
        logoKey,
        selectedDiscTemplate,
        additionalLogoId,
      )
      const nextLayout = clampLogoAssetLayoutToSafeZone(
        getLogoAssetLayout(nextLogoAssets, logoKey, additionalLogoId),
        selectedDiscTemplate,
        getLogoAssetSize(nextLogoAssets, logoKey, additionalLogoId),
      )

      return setLogoAssetLayout(nextLogoAssets, logoKey, nextLayout, additionalLogoId)
    })

    announceStatus(`Reset ${additionalLogoId ? `additional ${logoKey}` : logoKey} logo layout.`)
  }

  function handleAddAdditionalLogoAsset(logoKey: LogoAssetKey) {
    setProjectLogoAssets((currentLogoAssets) =>
      addAdditionalLogoAsset(currentLogoAssets, logoKey, selectedDiscTemplate),
    )
    announceStatus(`Added an additional ${logoKey} logo.`)
  }

  function handleRemoveAdditionalLogoAsset(
    logoKey: LogoAssetKey,
    additionalLogoId: string,
  ) {
    setProjectLogoAssets((currentLogoAssets) =>
      removeAdditionalLogoAsset(currentLogoAssets, logoKey, additionalLogoId),
    )
    announceStatus(`Deleted an additional ${logoKey} logo.`)
  }

  function handleAdditionalLogoAssetLabelChange(
    logoKey: LogoAssetKey,
    additionalLogoId: string,
    label: string,
  ) {
    setProjectLogoAssets((currentLogoAssets) =>
      updateAdditionalLogoAssetLabel(
        currentLogoAssets,
        logoKey,
        additionalLogoId,
        label,
      ),
    )
  }

  return {
    projectLogoAssets,
    setProjectLogoAssets,
    clampProjectLogoAssetsToTemplate,
    resetProjectLogoAssets,
    handleLogoAssetUpload,
    handleLogoAssetLayoutChange,
    handleClearLogoAsset,
    handleResetLogoAssetLayout,
    handleAddAdditionalLogoAsset,
    handleRemoveAdditionalLogoAsset,
    handleAdditionalLogoAssetLabelChange,
  }
}
