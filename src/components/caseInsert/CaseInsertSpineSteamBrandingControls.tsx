import { CaseInsertSteamBannerControls } from './CaseInsertSteamBannerControls'
import {
  CaseInsertSpineControlSections,
} from './CaseInsertSpineControlSections'
import type {
  CaseInsertSpineControlsProps,
} from './CaseInsertSpineControls.types'

export function CaseInsertSpineSteamBrandingControls({
  spine,
  actions,
}: CaseInsertSpineControlsProps) {
  return (
    <CaseInsertSpineControlSections
      spine={spine}
      renderControls={({ side }) => {
        const state = spine[side]

        return (
          <CaseInsertSteamBannerControls
            banner={state.steamBanner}
            idPrefix={`${side}-spine-steam-banner`}
            targetKind="spine"
            onEnabledChange={(enabled) =>
              actions.handleSpineSteamBannerEnabledChange(side, enabled)}
            onLockupUpload={(event) =>
              actions.handleSpineSteamBannerLockupUpload(side, event)}
            onClearLockup={() =>
              actions.handleClearSpineSteamBannerLockup(side)}
            onLayoutChange={(field, value) =>
              actions.handleSpineSteamBannerLockupLayoutChange(
                side,
                field,
                value,
              )}
            onResetLayout={() =>
              actions.handleResetSpineSteamBannerLockupLayout(side)}
            onUseTextFallbackChange={(useTextFallback) =>
              actions.handleSpineSteamBannerUseTextFallbackChange(
                side,
                useTextFallback,
              )}
            onFallbackTextChange={(fallbackText) =>
              actions.handleSpineSteamBannerFallbackTextChange(
                side,
                fallbackText,
              )}
            onColorChange={(field, value) =>
              actions.handleSpineSteamBannerColorChange(
                side,
                field,
                value,
              )}
            onResetColors={() =>
              actions.handleResetSpineSteamBannerColors(side)}
          />
        )
      }}
    />
  )
}
