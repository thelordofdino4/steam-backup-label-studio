import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { SteamLogoPlacement } from '../discText/index'
import {
  completeDiscGuidedSlotWhenSatisfied,
  DISC_GUIDED_COMPLETION_SLOT_IDS,
  ignoreDiscGuidedSlotCompletion,
  isDiscGuidedTitleArtworkOwnerSatisfied,
  type DiscGuidedSlotCompletionHandler,
} from '../guidedPresets/discGuidedCompletion.ts'
import {
  clampProjectTitleArtworkToSafeZone,
  clampTitleArtworkLayoutToSafeZone,
} from '../layout/discElementSafeZone'
import {
  createDefaultProjectTitleArtwork,
  resetProjectTitleArtworkLayout,
  restoreTitleArtworkDefaultSteamLogo,
  setCustomTitleArtworkImage,
  setTitleArtworkLayout,
  updateTitleArtworkLayoutField,
  type TitleArtworkLayoutField,
} from '../project/projectTitleArtwork'
import type { ProjectTitleArtwork } from '../project/projectTypes'
import { createSteamTitleArtworkImport } from '../steam/steamTitleArtworkImport'
import type { SteamImportedGame } from '../steam/steamApi'
import type { DiscTemplate } from '../types/template'
import {
  isImageFile,
  readImportedImageAssetFromFile,
} from '../utils/importedImageAsset'
import { preserveDiscPointOwnerPlacement } from '../presets/discPresetOwnerPlacement.ts'

type UseTitleArtworkOptions = {
  selectedDiscTemplate: DiscTemplate
  steamLogoPlacement: SteamLogoPlacement
  announceStatus: (message: string) => void
  applyActivePresetPlacement?: (
    titleArtwork: ProjectTitleArtwork,
  ) => ProjectTitleArtwork | null
  onDiscGuidedSlotCompleted?: DiscGuidedSlotCompletionHandler
}

export function useTitleArtwork({
  selectedDiscTemplate,
  steamLogoPlacement,
  announceStatus,
  applyActivePresetPlacement = (titleArtwork) => titleArtwork,
  onDiscGuidedSlotCompleted = ignoreDiscGuidedSlotCompletion,
}: UseTitleArtworkOptions) {
  const [projectTitleArtwork, setProjectTitleArtwork] = useState<ProjectTitleArtwork>(() =>
    createDefaultProjectTitleArtwork(selectedDiscTemplate, steamLogoPlacement),
  )
  const projectTitleArtworkRef = useRef(projectTitleArtwork)

  useEffect(() => {
    projectTitleArtworkRef.current = projectTitleArtwork
  }, [projectTitleArtwork])

  function commitProjectTitleArtwork(titleArtwork: ProjectTitleArtwork) {
    projectTitleArtworkRef.current = titleArtwork
    setProjectTitleArtwork(titleArtwork)
  }

  function applySemanticTitleArtworkChange(
    titleArtwork: ProjectTitleArtwork,
  ) {
    const fittedTitleArtwork = applyActivePresetPlacement(titleArtwork) ?? {
      ...titleArtwork,
      layout: preserveDiscPointOwnerPlacement(
        titleArtwork.layout,
        projectTitleArtworkRef.current.layout,
      ),
    }
    commitProjectTitleArtwork(fittedTitleArtwork)
    return fittedTitleArtwork
  }

  function clampProjectTitleArtworkToTemplate(template: DiscTemplate) {
    setProjectTitleArtwork((currentTitleArtwork) =>
      clampProjectTitleArtworkToSafeZone(currentTitleArtwork, template),
    )
  }

  function resetProjectTitleArtwork(
    template: DiscTemplate = selectedDiscTemplate,
    placement: SteamLogoPlacement = steamLogoPlacement,
  ) {
    setProjectTitleArtwork(
      createDefaultProjectTitleArtwork(template, placement),
    )
  }

  function resetTitleArtworkLayoutForPlacement(placement: SteamLogoPlacement) {
    setProjectTitleArtwork((currentTitleArtwork) =>
      clampProjectTitleArtworkToSafeZone(
        resetProjectTitleArtworkLayout(
          currentTitleArtwork,
          selectedDiscTemplate,
          placement,
        ),
        selectedDiscTemplate,
      ),
    )
  }

  function handleTitleArtworkLayoutChange(
    field: TitleArtworkLayoutField,
    value: boolean | number,
  ) {
    const nextTitleArtwork = updateTitleArtworkLayoutField(
      projectTitleArtworkRef.current,
      field,
      value,
    )
    const nextLayout = clampTitleArtworkLayoutToSafeZone(
      nextTitleArtwork.layout,
      selectedDiscTemplate,
      nextTitleArtwork.imageSize,
    )
    const clampedTitleArtwork = setTitleArtworkLayout(
      nextTitleArtwork,
      nextLayout,
    )
    let finalTitleArtwork = clampedTitleArtwork
    if (field === 'enabled' && value === true) {
      finalTitleArtwork = applySemanticTitleArtworkChange(clampedTitleArtwork)
    } else {
      commitProjectTitleArtwork(clampedTitleArtwork)
    }

    if (field === 'enabled' && value === true) {
      completeDiscGuidedSlotWhenSatisfied(
        onDiscGuidedSlotCompleted,
        DISC_GUIDED_COMPLETION_SLOT_IDS.gameTitle,
        isDiscGuidedTitleArtworkOwnerSatisfied(finalTitleArtwork),
      )
    }
  }

  function handleResetTitleArtworkLayout() {
    resetTitleArtworkLayoutForPlacement(steamLogoPlacement)
    announceStatus('Reset title artwork layout.')
  }

  function handleRestoreTitleArtworkDefault() {
    const nextTitleArtwork = applySemanticTitleArtworkChange(
      clampProjectTitleArtworkToSafeZone(
        restoreTitleArtworkDefaultSteamLogo(projectTitleArtworkRef.current),
        selectedDiscTemplate,
      ),
    )
    completeDiscGuidedSlotWhenSatisfied(
      onDiscGuidedSlotCompleted,
      DISC_GUIDED_COMPLETION_SLOT_IDS.gameTitle,
      isDiscGuidedTitleArtworkOwnerSatisfied(nextTitleArtwork),
    )
    announceStatus('Restored game logo to the Steam default logo.')
  }

  async function handleTitleArtworkUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isImageFile(file)) {
      announceStatus('Choose an image file for the game logo.')
      return
    }

    try {
      const importedImage = await readImportedImageAssetFromFile(file)

      const nextTitleArtwork = applySemanticTitleArtworkChange(
        clampProjectTitleArtworkToSafeZone(
          setCustomTitleArtworkImage(
            projectTitleArtworkRef.current,
            importedImage,
            selectedDiscTemplate,
            steamLogoPlacement,
          ),
          selectedDiscTemplate,
        ),
      )
      completeDiscGuidedSlotWhenSatisfied(
        onDiscGuidedSlotCompleted,
        DISC_GUIDED_COMPLETION_SLOT_IDS.gameTitle,
        isDiscGuidedTitleArtworkOwnerSatisfied(nextTitleArtwork),
      )
      announceStatus('Custom game logo artwork selected.')
    } catch {
      announceStatus('Game logo image could not be read.')
    }
  }

  async function applySteamTitleArtworkImport(importedGame: SteamImportedGame) {
    const titleArtworkImport = await createSteamTitleArtworkImport(
      importedGame,
      projectTitleArtworkRef.current,
      selectedDiscTemplate,
      steamLogoPlacement,
    )
    const fittedTitleArtwork = titleArtworkImport.placementRefitRequired
      ? applySemanticTitleArtworkChange(titleArtworkImport.titleArtwork)
      : titleArtworkImport.titleArtwork
    if (!titleArtworkImport.placementRefitRequired) {
      commitProjectTitleArtwork(fittedTitleArtwork)
    }

    completeDiscGuidedSlotWhenSatisfied(
      onDiscGuidedSlotCompleted,
      DISC_GUIDED_COMPLETION_SLOT_IDS.gameTitle,
      isDiscGuidedTitleArtworkOwnerSatisfied(fittedTitleArtwork),
    )

    return {
      ...titleArtworkImport,
      titleArtwork: fittedTitleArtwork,
    }
  }

  return {
    projectTitleArtwork,
    setProjectTitleArtwork,
    clampProjectTitleArtworkToTemplate,
    resetProjectTitleArtwork,
    resetTitleArtworkLayoutForPlacement,
    handleTitleArtworkLayoutChange,
    handleResetTitleArtworkLayout,
    handleRestoreTitleArtworkDefault,
    handleTitleArtworkUpload,
    applySteamTitleArtworkImport,
  }
}
