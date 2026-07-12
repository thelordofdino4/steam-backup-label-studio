import {
  applyDiscRolePresetToState,
  type DiscRolePreset,
  type DiscRolePresetApplicationState,
  type DiscRolePresetFeatureOwner,
} from '../layout/discRolePresets.ts'
import type { ProjectDiscNumberArtwork } from '../project/projectTypes'
import type { DiscTemplate } from '../types/template'

type ValueSetter<T> = (value: T) => void
type TemplateClamp = (template: DiscTemplate) => void

type PreservedDiscTextStateKey =
  | 'metadata'
  | 'discTextValues'
  | 'discTextValueSources'
  | 'discTextTitleValue'
  | 'discTextHtmlSources'
  | 'discTextStyles'

export type DiscRolePresetCurrentState = Omit<
  DiscRolePresetApplicationState,
  PreservedDiscTextStateKey
> &
  Required<
    Pick<DiscRolePresetApplicationState, PreservedDiscTextStateKey>
  > & {
    projectDiscNumberArtwork: ProjectDiscNumberArtwork
  }

export type DiscRolePresetBackgroundRestoreState = {
  backgroundScale: DiscRolePresetCurrentState['background']['scale']
  backgroundOffset: DiscRolePresetCurrentState['background']['offset']
  backgroundImageUrl: DiscRolePresetCurrentState['background']['imageDataUrl']
  backgroundImageSource: NonNullable<
    DiscRolePresetCurrentState['background']['imageSource']
  > | null
  backgroundImageSize: NonNullable<
    DiscRolePresetCurrentState['background']['imageSize']
  > | null
  isBackgroundArtworkEnabled: DiscRolePresetCurrentState['background']['enabled']
}

export type DiscRolePresetDiscTextRestoreState = {
  projectDiscNumberArtwork: ProjectDiscNumberArtwork
  discTextSettings: DiscRolePresetCurrentState['discTextSettings']
  discTextValues: DiscRolePresetCurrentState['discTextValues']
  discTextValueSources: DiscRolePresetCurrentState['discTextValueSources']
  discTextTitleValue: DiscRolePresetCurrentState['discTextTitleValue']
  discTextHtmlSources: DiscRolePresetCurrentState['discTextHtmlSources']
  discTextLayout: DiscRolePresetCurrentState['discTextLayout']
  discTextStyles: DiscRolePresetCurrentState['discTextStyles']
}

export type DiscRolePresetOwnerActions = {
  restoreBackgroundImageState:
    ValueSetter<DiscRolePresetBackgroundRestoreState>
  setProjectTitleArtwork:
    ValueSetter<DiscRolePresetCurrentState['titleArtwork']>
  clampProjectTitleArtworkToTemplate: TemplateClamp
  restoreDiscTextState: ValueSetter<DiscRolePresetDiscTextRestoreState>
  clampDiscTextLayoutToTemplate: TemplateClamp
  setProjectLogoAssets: ValueSetter<DiscRolePresetCurrentState['logoAssets']>
  clampProjectLogoAssetsToTemplate: TemplateClamp
  setProjectRatingBadge:
    ValueSetter<DiscRolePresetCurrentState['ratingBadge']>
  clampProjectRatingBadgeToTemplate: TemplateClamp
  setProjectMediaMark: ValueSetter<DiscRolePresetCurrentState['mediaMark']>
  clampProjectMediaMarkToTemplate: TemplateClamp
  setProjectPlatformMarks:
    ValueSetter<DiscRolePresetCurrentState['platformMarks']>
  clampProjectPlatformMarksToTemplate: TemplateClamp
  setProjectTechnicalMarks:
    ValueSetter<DiscRolePresetCurrentState['technicalMarks']>
  clampProjectTechnicalMarksToTemplate: TemplateClamp
}

export type DiscRolePresetOwnerApplicationResult =
  | {
      applied: false
      preset: null
      state: DiscRolePresetApplicationState
      dispatchedOwners: readonly []
    }
  | {
      applied: true
      preset: DiscRolePreset
      state: DiscRolePresetApplicationState
      dispatchedOwners: readonly DiscRolePresetFeatureOwner[]
    }

export type ApplyDiscRolePresetToOwnersParams = {
  presetId: string
  currentState: DiscRolePresetCurrentState
  selectedDiscTemplate: DiscTemplate
  actions: DiscRolePresetOwnerActions
}

export function applyDiscRolePresetToOwners({
  presetId,
  currentState,
  selectedDiscTemplate,
  actions,
}: ApplyDiscRolePresetToOwnersParams): DiscRolePresetOwnerApplicationResult {
  const result = applyDiscRolePresetToState(
    currentState,
    presetId,
    selectedDiscTemplate,
  )

  if (!result.applied || !result.preset) {
    return {
      applied: false,
      preset: null,
      state: result.state,
      dispatchedOwners: [],
    }
  }

  const dispatchedOwners: DiscRolePresetFeatureOwner[] = []

  for (const ownerPlan of result.preset.updatePlan) {
    if (
      dispatchDiscRolePresetOwner(
        ownerPlan.owner,
        result.state,
        currentState,
        selectedDiscTemplate,
        actions,
      )
    ) {
      dispatchedOwners.push(ownerPlan.owner)
    }
  }

  return {
    applied: true,
    preset: result.preset,
    state: result.state,
    dispatchedOwners,
  }
}

function dispatchDiscRolePresetOwner(
  owner: DiscRolePresetFeatureOwner,
  nextState: DiscRolePresetApplicationState,
  currentState: DiscRolePresetCurrentState,
  selectedDiscTemplate: DiscTemplate,
  actions: DiscRolePresetOwnerActions,
): boolean {
  switch (owner) {
    case 'backgroundImage':
      actions.restoreBackgroundImageState({
        backgroundScale: nextState.background.scale,
        backgroundOffset: nextState.background.offset,
        backgroundImageUrl: nextState.background.imageDataUrl,
        backgroundImageSource: nextState.background.imageSource ?? null,
        backgroundImageSize: nextState.background.imageSize ?? null,
        isBackgroundArtworkEnabled: nextState.background.enabled,
      })
      return true
    case 'titleArtwork':
      actions.setProjectTitleArtwork(nextState.titleArtwork)
      actions.clampProjectTitleArtworkToTemplate(selectedDiscTemplate)
      return true
    case 'discText':
      actions.restoreDiscTextState({
        projectDiscNumberArtwork: currentState.projectDiscNumberArtwork,
        discTextSettings: nextState.discTextSettings,
        discTextValues: currentState.discTextValues,
        discTextValueSources: currentState.discTextValueSources,
        discTextTitleValue: currentState.discTextTitleValue,
        discTextHtmlSources: currentState.discTextHtmlSources,
        discTextLayout: nextState.discTextLayout,
        discTextStyles: currentState.discTextStyles,
      })
      actions.clampDiscTextLayoutToTemplate(selectedDiscTemplate)
      return true
    case 'ratingBadge':
      actions.setProjectRatingBadge(nextState.ratingBadge)
      actions.clampProjectRatingBadgeToTemplate(selectedDiscTemplate)
      return true
    case 'mediaMark':
      actions.setProjectMediaMark(nextState.mediaMark)
      actions.clampProjectMediaMarkToTemplate(selectedDiscTemplate)
      return true
    case 'platformMarks':
      actions.setProjectPlatformMarks(nextState.platformMarks)
      actions.clampProjectPlatformMarksToTemplate(selectedDiscTemplate)
      return true
    case 'technicalMarks':
      actions.setProjectTechnicalMarks(nextState.technicalMarks)
      actions.clampProjectTechnicalMarksToTemplate(selectedDiscTemplate)
      return true
    case 'logoAssets':
      actions.setProjectLogoAssets(nextState.logoAssets)
      actions.clampProjectLogoAssetsToTemplate(selectedDiscTemplate)
      return true
    case 'additionalArtwork':
      return false
  }
}
