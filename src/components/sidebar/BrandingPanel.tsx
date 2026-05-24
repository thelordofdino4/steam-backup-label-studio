import type { ChangeEvent } from 'react'
import type { SteamLogoPlacement } from '../../discText'
import type { BackgroundImageSize, SteamBannerColors, SteamBannerLockupLayout } from '../../project/projectTypes'

export type BrandingPanelProps = {
  steamLogoPlacement: SteamLogoPlacement
  handleSteamLogoPlacementChange: (placement: SteamLogoPlacement) => void
  steamBannerLockupImageUrl: string | null
  steamBannerLockupImageSize: BackgroundImageSize | null
  steamBannerLockupLayout: SteamBannerLockupLayout
  steamBannerColors: SteamBannerColors
  handleSteamBannerLockupUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleClearSteamBannerLockup: () => void
  handleSteamBannerLockupLayoutChange: (
    field: keyof SteamBannerLockupLayout,
    value: number,
  ) => void
  handleResetSteamBannerLockupLayout: () => void
  handleSteamBannerColorChange: (field: keyof SteamBannerColors, value: string) => void
  handleResetSteamBannerColors: () => void
}

export function BrandingPanel({
  steamLogoPlacement,
  handleSteamLogoPlacementChange,
  steamBannerLockupImageUrl,
  steamBannerLockupImageSize,
  steamBannerLockupLayout,
  steamBannerColors,
  handleSteamBannerLockupUpload,
  handleClearSteamBannerLockup,
  handleSteamBannerLockupLayoutChange,
  handleResetSteamBannerLockupLayout,
  handleSteamBannerColorChange,
  handleResetSteamBannerColors,
}: BrandingPanelProps) {
  return (
    <details className="panel collapsible-panel" open>
      <summary className="panel-summary">Branding</summary>
      <div className="panel-content">
      <label className="field-label" htmlFor="steam-logo-placement">
        Placement
      </label>
      <select
        id="steam-logo-placement"
        value={steamLogoPlacement}
        onChange={(event) =>
          handleSteamLogoPlacementChange(event.target.value as SteamLogoPlacement)
        }
      >
        <option value="top">Top center</option>
        <option value="bottom">Bottom center</option>
        <option value="none">None</option>
      </select>

      <label className="field-label spacing-top" htmlFor="steam-banner-gradient-start">
        Gradient start
      </label>
      <input
        id="steam-banner-gradient-start"
        type="color"
        value={steamBannerColors.gradientStart}
        disabled={steamLogoPlacement === 'none'}
        onChange={(event) =>
          handleSteamBannerColorChange('gradientStart', event.target.value)
        }
      />

      <label className="field-label spacing-top" htmlFor="steam-banner-gradient-end">
        Gradient end
      </label>
      <input
        id="steam-banner-gradient-end"
        type="color"
        value={steamBannerColors.gradientEnd}
        disabled={steamLogoPlacement === 'none'}
        onChange={(event) =>
          handleSteamBannerColorChange('gradientEnd', event.target.value)
        }
      />

      <label className="field-label spacing-top" htmlFor="steam-banner-accent">
        Accent strip
      </label>
      <input
        id="steam-banner-accent"
        type="color"
        value={steamBannerColors.accent}
        disabled={steamLogoPlacement === 'none'}
        onChange={(event) =>
          handleSteamBannerColorChange('accent', event.target.value)
        }
      />

      <button
        className="secondary-button"
        type="button"
        disabled={steamLogoPlacement === 'none'}
        onClick={handleResetSteamBannerColors}
      >
        Reset banner colors
      </button>

      <label className="field-label spacing-top" htmlFor="steam-banner-lockup-upload">
        Banner lockup image
      </label>
      <input
        id="steam-banner-lockup-upload"
        type="file"
        accept="image/*"
        onChange={handleSteamBannerLockupUpload}
      />

      {steamBannerLockupImageUrl ? (
        <div className="selected-lockup-card">
          <span>
            Banner lockup active
            {steamBannerLockupImageSize
              ? ` · ${steamBannerLockupImageSize.width}×${steamBannerLockupImageSize.height}`
              : ''}
          </span>
          <button
            className="secondary-button"
            type="button"
            onClick={handleClearSteamBannerLockup}
          >
            Reset to default lockup
          </button>
        </div>
      ) : (
        <p className="hint">
          Using the bundled default Steam banner lockup image. Upload a PNG to override it.
        </p>
      )}

      <div className="spacing-top">
        <label className="field-label" htmlFor="steam-banner-lockup-scale">
          Lockup scale
        </label>
        <input
          id="steam-banner-lockup-scale"
          type="range"
          min="0.5"
          max="1.5"
          step="0.01"
          value={steamBannerLockupLayout.scale}
          disabled={steamLogoPlacement === 'none'}
          onChange={(event) =>
            handleSteamBannerLockupLayoutChange('scale', Number(event.target.value))
          }
        />
      </div>

      <label className="field-label spacing-top" htmlFor="steam-banner-lockup-offset-x">
        Lockup X offset
      </label>
      <input
        id="steam-banner-lockup-offset-x"
        type="range"
        min="-20"
        max="20"
        step="0.1"
        value={steamBannerLockupLayout.offsetX}
        disabled={steamLogoPlacement === 'none'}
        onChange={(event) =>
          handleSteamBannerLockupLayoutChange('offsetX', Number(event.target.value))
        }
      />

      <label className="field-label spacing-top" htmlFor="steam-banner-lockup-offset-y">
        Lockup Y offset
      </label>
      <input
        id="steam-banner-lockup-offset-y"
        type="range"
        min="-20"
        max="20"
        step="0.1"
        value={steamBannerLockupLayout.offsetY}
        disabled={steamLogoPlacement === 'none'}
        onChange={(event) =>
          handleSteamBannerLockupLayoutChange('offsetY', Number(event.target.value))
        }
      />

      <button
        className="secondary-button"
        type="button"
        disabled={steamLogoPlacement === 'none'}
        onClick={handleResetSteamBannerLockupLayout}
      >
        Reset lockup layout
      </button>
      </div>
    </details>
  )
}
