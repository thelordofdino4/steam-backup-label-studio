import { CaseInsertSteamBannerControls } from './CaseInsertSteamBannerControls'
import type {
  CaseInsertTemplateControlsProps,
} from './CaseInsertTemplateControls.types'

export function CaseInsertTemplateSteamBrandingControls({
  paneId,
  templateState,
  actions,
}: CaseInsertTemplateControlsProps) {
  if (paneId !== 'cover') {
    return null
  }

  return (
    <CaseInsertSteamBannerControls
      banner={templateState.steamBanner}
      idPrefix={`${paneId}-steam-banner`}
      targetKind="cover"
      onEnabledChange={(enabled) =>
        actions.handleSteamBannerEnabledChange(paneId, enabled)}
      onLockupUpload={(event) =>
        actions.handleSteamBannerLockupUpload(paneId, event)}
      onClearLockup={() =>
        actions.handleClearSteamBannerLockup(paneId)}
      onLayoutChange={(field, value) =>
        actions.handleSteamBannerLockupLayoutChange(
          paneId,
          field,
          value,
        )}
      onResetLayout={() =>
        actions.handleResetSteamBannerLockupLayout(paneId)}
      onUseTextFallbackChange={(useTextFallback) =>
        actions.handleSteamBannerUseTextFallbackChange(
          paneId,
          useTextFallback,
        )}
      onFallbackTextChange={(fallbackText) =>
        actions.handleSteamBannerFallbackTextChange(
          paneId,
          fallbackText,
        )}
      onColorChange={(field, value) =>
        actions.handleSteamBannerColorChange(paneId, field, value)}
      onResetColors={() =>
        actions.handleResetSteamBannerColors(paneId)}
    />
  )
}
