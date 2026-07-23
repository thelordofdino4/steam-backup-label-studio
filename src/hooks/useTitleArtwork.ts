import { useState, type ChangeEvent } from 'react'
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

type UseTitleArtworkOptions = {
  selectedDiscTemplate: DiscTemplate
  steamLogoPlacement: SteamLogoPlacement
  announceStatus: (message: string) => void
  onDiscGuidedSlotCompleted?: DiscGuidedSlotCompletionHandler
}

export function useTitleArtwork({
  selectedDiscTemplate,
  steamLogoPlacement,
  announceStatus,
  onDiscGuidedSlotCompleted = ignoreDiscGuidedSlotCompletion,
}: UseTitleArtworkOptions) {
  const [projectTitleArtwork, setProjectTitleArtwork] = useState<ProjectTitleArtwork>(() =>
    createDefaultProjectTitleArtwork(selectedDiscTemplate, steamLogoPlacement),
  )

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
    setProjectTitleArtwork((currentTitleArtwork) => {
      const nextTitleArtwork = updateTitleArtworkLayoutField(
        currentTitleArtwork,
        field,
        value,
      )
      const nextLayout = clampTitleArtworkLayoutToSafeZone(
        nextTitleArtwork.layout,
        selectedDiscTemplate,
        nextTitleArtwork.imageSize,
      )

      return setTitleArtworkLayout(nextTitleArtwork, nextLayout)
    })

    if (field === 'enabled' && value === true) {
      completeDiscGuidedSlotWhenSatisfied(
        onDiscGuidedSlotCompleted,
        DISC_GUIDED_COMPLETION_SLOT_IDS.gameTitle,
        isDiscGuidedTitleArtworkOwnerSatisfied({
          ...projectTitleArtwork,
          layout: {
            ...projectTitleArtwork.layout,
            enabled: true,
          },
        }),
      )
    }
  }

  function handleResetTitleArtworkLayout() {
    resetTitleArtworkLayoutForPlacement(steamLogoPlacement)
    announceStatus('Reset title artwork layout.')
  }

  function handleRestoreTitleArtworkDefault() {
    const nextTitleArtwork = clampProjectTitleArtworkToSafeZone(
      restoreTitleArtworkDefaultSteamLogo(projectTitleArtwork),
      selectedDiscTemplate,
    )
    setProjectTitleArtwork(nextTitleArtwork)
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

      const nextTitleArtwork = clampProjectTitleArtworkToSafeZone(
        setCustomTitleArtworkImage(
          projectTitleArtwork,
          importedImage,
          selectedDiscTemplate,
          steamLogoPlacement,
        ),
        selectedDiscTemplate,
      )
      setProjectTitleArtwork(nextTitleArtwork)
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
      projectTitleArtwork,
      selectedDiscTemplate,
      steamLogoPlacement,
    )

    setProjectTitleArtwork(titleArtworkImport.titleArtwork)
    completeDiscGuidedSlotWhenSatisfied(
      onDiscGuidedSlotCompleted,
      DISC_GUIDED_COMPLETION_SLOT_IDS.gameTitle,
      isDiscGuidedTitleArtworkOwnerSatisfied(titleArtworkImport.titleArtwork),
    )

    return titleArtworkImport
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
