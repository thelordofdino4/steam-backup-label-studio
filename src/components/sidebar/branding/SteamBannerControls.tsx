import { useState } from 'react'
import {
  createSteamLogoPlacementMemory,
  getEnabledSteamLogoPlacement,
  getNextSteamLogoPlacementMemory,
} from '../../../branding/steamBanner'
import type { SteamLogoPlacement } from '../../../discText/index'
import {
  EditorSteamBannerControls,
  type EditorSteamBannerLayoutControl,
} from '../../editor/EditorSteamBannerControls'
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

  const placementControls = (
    <>
      <label
        className="field-label spacing-top"
        htmlFor="steam-logo-placement"
      >
        Placement
      </label>
      <select
        id="steam-logo-placement"
        value={steamLogoPlacement}
        onChange={(event) =>
          updatePlacement(event.target.value as SteamLogoPlacement)}
      >
        <option value="top">Top center</option>
        <option value="bottom">Bottom center</option>
      </select>
    </>
  )

  const layoutControls: EditorSteamBannerLayoutControl[] = [
    {
      id: 'steam-banner-lockup-scale',
      label: 'Lockup scale',
      min: 0.5,
      max: 1.5,
      step: 0.01,
      value: steamBannerLockupLayout.scale,
      onChange: (value) =>
        handleSteamBannerLockupLayoutChange('scale', value),
    },
    {
      id: 'steam-banner-lockup-offset-x',
      label: 'Lockup X offset',
      min: -20,
      max: 20,
      step: 0.1,
      value: steamBannerLockupLayout.offsetX,
      onChange: (value) =>
        handleSteamBannerLockupLayoutChange('offsetX', value),
    },
    {
      id: 'steam-banner-lockup-offset-y',
      label: 'Lockup Y offset',
      min: -20,
      max: 20,
      step: 0.1,
      value: steamBannerLockupLayout.offsetY,
      onChange: (value) =>
        handleSteamBannerLockupLayoutChange('offsetY', value),
    },
  ]

  return (
    <EditorSteamBannerControls
      idPrefix="steam-banner"
      enabled={isEnabled}
      colors={steamBannerColors}
      lockupImageUrl={steamBannerLockupImageUrl}
      lockupImageSource={steamBannerLockupImageSource}
      useTextFallback={steamBannerUseTextFallback}
      fallbackText={steamBannerFallbackText}
      layoutControls={layoutControls}
      placementControls={placementControls}
      onEnabledChange={toggleEnabled}
      onLockupUpload={handleSteamBannerLockupUpload}
      onClearLockup={handleClearSteamBannerLockup}
      onUseTextFallbackChange={handleSteamBannerUseTextFallbackChange}
      onFallbackTextChange={handleSteamBannerFallbackTextChange}
      onColorChange={handleSteamBannerColorChange}
      onResetColors={handleResetSteamBannerColors}
      onResetLayout={handleResetSteamBannerLockupLayout}
    />
  )
}
