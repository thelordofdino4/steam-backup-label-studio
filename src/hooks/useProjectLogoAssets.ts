import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  clampLogoAssetLayoutToSafeZone,
  clampProjectLogoAssetsToSafeZone,
} from '../layout/discElementSafeZone'
import {
  DISC_GUIDED_COMPLETION_SLOT_IDS,
  ignoreDiscGuidedSlotCompletion,
  type DiscGuidedSlotCompletionHandler,
} from '../guidedPresets/discGuidedCompletion.ts'
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
import type {
  ProjectImageAssetProvenance,
  ProjectLogoAssets,
} from '../project/projectTypes'
import type { DiscTemplate } from '../types/template'
import {
  isImageFile,
  readImportedImageAssetFromFile,
  type ImportedImageAsset,
} from '../utils/importedImageAsset'
import { preserveDiscPointOwnerPlacement } from '../presets/discPresetOwnerPlacement.ts'

type UseProjectLogoAssetsOptions = {
  selectedDiscTemplate: DiscTemplate
  announceStatus: (message: string) => void
  applyActivePresetPlacement?: (
    logoAssets: ProjectLogoAssets,
    logoKey: LogoAssetKey,
  ) => ProjectLogoAssets | null
  onDiscGuidedSlotCompleted?: DiscGuidedSlotCompletionHandler
}

export function useProjectLogoAssets({
  selectedDiscTemplate,
  announceStatus,
  applyActivePresetPlacement = (logoAssets) => logoAssets,
  onDiscGuidedSlotCompleted = ignoreDiscGuidedSlotCompletion,
}: UseProjectLogoAssetsOptions) {
  const [projectLogoAssets, setProjectLogoAssets] = useState<ProjectLogoAssets>(() =>
    createDefaultProjectLogoAssets(selectedDiscTemplate),
  )
  const projectLogoAssetsRef = useRef(projectLogoAssets)

  useEffect(() => {
    projectLogoAssetsRef.current = projectLogoAssets
  }, [projectLogoAssets])

  function commitProjectLogoAssets(logoAssets: ProjectLogoAssets) {
    projectLogoAssetsRef.current = logoAssets
    setProjectLogoAssets(logoAssets)
  }

  function applySemanticPrimaryLogoChange(
    logoAssets: ProjectLogoAssets,
    logoKey: LogoAssetKey,
  ) {
    const fittedLogoAssets = applyActivePresetPlacement(
      logoAssets,
      logoKey,
    ) ?? (logoKey === 'developer'
      ? {
          ...logoAssets,
          developerLogoLayout: preserveDiscPointOwnerPlacement(
            logoAssets.developerLogoLayout,
            projectLogoAssetsRef.current.developerLogoLayout,
          ),
        }
      : {
          ...logoAssets,
          publisherLogoLayout: preserveDiscPointOwnerPlacement(
            logoAssets.publisherLogoLayout,
            projectLogoAssetsRef.current.publisherLogoLayout,
          ),
        })
    commitProjectLogoAssets(fittedLogoAssets)
    return fittedLogoAssets
  }

  function applyLogoAssetImport(
    logoKey: LogoAssetKey,
    importedImage: ImportedImageAsset,
    imageSource: ProjectImageAssetProvenance | null = null,
    additionalLogoId?: string,
  ) {
    const nextLogoAssets = applyImportedLogoAsset(
      projectLogoAssetsRef.current,
      logoKey,
      importedImage,
      selectedDiscTemplate,
      imageSource,
      additionalLogoId,
    )

    if (additionalLogoId) {
      commitProjectLogoAssets(nextLogoAssets)
      return nextLogoAssets
    }

    return applySemanticPrimaryLogoChange(nextLogoAssets, logoKey)
  }

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

      applyLogoAssetImport(
        logoKey,
        importedImage,
        createProjectImageAssetProvenance({
          source: 'uploaded',
          sourceLabel: file.name,
        }),
        additionalLogoId,
      )

      if (!additionalLogoId) {
        onDiscGuidedSlotCompleted(
          logoKey === 'developer'
            ? DISC_GUIDED_COMPLETION_SLOT_IDS.developerLogo
            : DISC_GUIDED_COMPLETION_SLOT_IDS.publisherLogo,
        )
      }

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
    const nextLogoAssets = updateLogoAssetLayoutField(
        projectLogoAssetsRef.current,
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
    const clampedLogoAssets = setLogoAssetLayout(
      nextLogoAssets,
      logoKey,
      nextLayout,
      additionalLogoId,
    )
    if (!additionalLogoId && field === 'enabled' && value === true) {
      applySemanticPrimaryLogoChange(clampedLogoAssets, logoKey)
    } else {
      commitProjectLogoAssets(clampedLogoAssets)
    }

    if (!additionalLogoId && field === 'enabled' && value === true) {
      onDiscGuidedSlotCompleted(
        logoKey === 'developer'
          ? DISC_GUIDED_COMPLETION_SLOT_IDS.developerLogo
          : DISC_GUIDED_COMPLETION_SLOT_IDS.publisherLogo,
      )
    }
  }

  function handleClearLogoAsset(logoKey: LogoAssetKey, additionalLogoId?: string) {
    const nextLogoAssets = clearLogoAsset(
        projectLogoAssetsRef.current,
        logoKey,
        additionalLogoId,
      )
    const nextLayout = clampLogoAssetLayoutToSafeZone(
      getLogoAssetLayout(nextLogoAssets, logoKey, additionalLogoId),
      selectedDiscTemplate,
      getLogoAssetSize(nextLogoAssets, logoKey, additionalLogoId),
    )
    const clampedLogoAssets = setLogoAssetLayout(
      nextLogoAssets,
      logoKey,
      nextLayout,
      additionalLogoId,
    )
    if (additionalLogoId) {
      commitProjectLogoAssets(clampedLogoAssets)
    } else {
      applySemanticPrimaryLogoChange(clampedLogoAssets, logoKey)
    }

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
    applyLogoAssetImport,
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
