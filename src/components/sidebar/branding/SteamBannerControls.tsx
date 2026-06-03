import { useState } from 'react'
import {
  createSteamLogoPlacementMemory,
  getEnabledSteamLogoPlacement,
  getNextSteamLogoPlacementMemory,
} from '../../../branding/steamBanner'
import type { SteamLogoPlacement } from '../../../discText/index'
import { getProjectImageAssetStatus } from '../../../project/projectAssetStatus'
import type { BrandingPanelProps } from './types'

export function SteamBannerControls({
  steamLogoPlacement,
  steamBannerLockupImageUrl,
  steamBannerLockupImageSource,
  steamBannerLockupLayout,
  steamBannerUseTextFallback,
  steamBannerFallbackText,
  steamBannerColors,
  handleSteamLogoPlacementChange,
  handleSteamBannerLockupUpload,
  handleClearSteamBannerLockup,
  handleSteamBannerLockupLayoutChange,
  handleResetSteamBannerLockupLayout,
  handleSteamBannerUseTextFallbackChange,
  handleSteamBannerFallbackTextChange,
  handleSteamBannerColorChange,
  handleResetSteamBannerColors,
}: Pick<
  BrandingPanelProps,
  | 'steamLogoPlacement'
  | 'steamBannerLockupImageUrl'
  | 'steamBannerLockupImageSource'
  | 'steamBannerLockupLayout'
  | 'steamBannerUseTextFallback'
  | 'steamBannerFallbackText'
  | 'steamBannerColors'
  | 'handleSteamLogoPlacementChange'
  | 'handleSteamBannerLockupUpload'
  | 'handleClearSteamBannerLockup'
  | 'handleSteamBannerLockupLayoutChange'
  | 'handleResetSteamBannerLockupLayout'
  | 'handleSteamBannerUseTextFallbackChange'
  | 'handleSteamBannerFallbackTextChange'
  | 'handleSteamBannerColorChange'
  | 'handleResetSteamBannerColors'
>) {
  const isEnabled = steamLogoPlacement !== 'none'
  const lockupStatus = getProjectImageAssetStatus({
    imageDataUrl: steamBannerLockupImageUrl,
    provenance: steamBannerLockupImageSource,
    fallbackLabel: 'Default Steam banner lockup',
  })
  const hasCustomLockupImage = steamBannerLockupImageSource?.source !== 'built-in'
  const [lastPlacement, setLastPlacement] = useState<SteamLogoPlacement>(
    createSteamLogoPlacementMemory(steamLogoPlacement),
  )

  const toggleEnabled = (enabled: boolean) => {
    if (enabled) {
      handleSteamLogoPlacementChange(getEnabledSteamLogoPlacement(lastPlacement))
      return
    }

    setLastPlacement(getNextSteamLogoPlacementMemory(lastPlacement, steamLogoPlacement))
    handleSteamLogoPlacementChange('none')
  }

  const updatePlacement = (placement: SteamLogoPlacement) => {
    setLastPlacement(getNextSteamLogoPlacementMemory(lastPlacement, placement))
    handleSteamLogoPlacementChange(placement)
  }

  return (
    <div className="feature-control-body">
      <label className="field-label">
        <input type="checkbox" checked={isEnabled} onChange={(event) => toggleEnabled(event.target.checked)} />
        Show Steam banner
      </label>

      {!isEnabled ? null : (
        <>
          <label className="field-label spacing-top" htmlFor="steam-logo-placement">Placement</label>
          <select id="steam-logo-placement" value={steamLogoPlacement} onChange={(event) => updatePlacement(event.target.value as SteamLogoPlacement)}>
            <option value="top">Top center</option>
            <option value="bottom">Bottom center</option>
          </select>

          <label className="field-label spacing-top" htmlFor="steam-banner-gradient-start">Gradient start</label>
          <input id="steam-banner-gradient-start" type="color" value={steamBannerColors.gradientStart} onChange={(event) => handleSteamBannerColorChange('gradientStart', event.target.value)} />

          <label className="field-label spacing-top" htmlFor="steam-banner-gradient-end">Gradient end</label>
          <input id="steam-banner-gradient-end" type="color" value={steamBannerColors.gradientEnd} onChange={(event) => handleSteamBannerColorChange('gradientEnd', event.target.value)} />

          <label className="field-label spacing-top" htmlFor="steam-banner-accent">Accent strip</label>
          <input id="steam-banner-accent" type="color" value={steamBannerColors.accent} onChange={(event) => handleSteamBannerColorChange('accent', event.target.value)} />

          <label className="field-label spacing-top">
            <input
              type="checkbox"
              checked={steamBannerUseTextFallback}
              onChange={(event) =>
                handleSteamBannerUseTextFallbackChange(event.target.checked)
              }
            />
            Use text fallback for lockup
          </label>

          {steamBannerUseTextFallback ? (
            <>
              <label className="field-label spacing-top" htmlFor="steam-banner-fallback-text">Fallback lockup text</label>
              <input
                id="steam-banner-fallback-text"
                type="text"
                value={steamBannerFallbackText}
                onChange={(event) =>
                  handleSteamBannerFallbackTextChange(event.target.value)
                }
              />
              <p className="hint">Blank text renders as STEAM.</p>
            </>
          ) : (
            <>
              <span className="field-label spacing-top">Banner lockup image</span>
              <label className="secondary-button logo-upload-button" htmlFor="steam-banner-lockup-upload">Choose banner lockup image</label>
              <input id="steam-banner-lockup-upload" className="logo-file-input" type="file" accept="image/*" onChange={handleSteamBannerLockupUpload} />

              <p className="hint">
                Banner lockup: {lockupStatus.summary}. {lockupStatus.availabilityLabel}
              </p>
            </>
          )}

          <label className="field-label spacing-top" htmlFor="steam-banner-lockup-scale">Lockup scale</label>
          <input id="steam-banner-lockup-scale" type="range" min="0.5" max="1.5" step="0.01" value={steamBannerLockupLayout.scale} onChange={(event) => handleSteamBannerLockupLayoutChange('scale', Number(event.target.value))} />

          <label className="field-label spacing-top" htmlFor="steam-banner-lockup-offset-x">Lockup X offset</label>
          <input id="steam-banner-lockup-offset-x" type="range" min="-20" max="20" step="0.1" value={steamBannerLockupLayout.offsetX} onChange={(event) => handleSteamBannerLockupLayoutChange('offsetX', Number(event.target.value))} />

          <label className="field-label spacing-top" htmlFor="steam-banner-lockup-offset-y">Lockup Y offset</label>
          <input id="steam-banner-lockup-offset-y" type="range" min="-20" max="20" step="0.1" value={steamBannerLockupLayout.offsetY} onChange={(event) => handleSteamBannerLockupLayoutChange('offsetY', Number(event.target.value))} />

          {!steamBannerUseTextFallback && hasCustomLockupImage && <button className="secondary-button" type="button" onClick={handleClearSteamBannerLockup}>Reset to default lockup</button>}
          <button className="secondary-button" type="button" onClick={handleResetSteamBannerColors}>Reset banner colors</button>
          <button className="secondary-button" type="button" onClick={handleResetSteamBannerLockupLayout}>Reset lockup layout</button>
        </>
      )}
    </div>
  )
}
