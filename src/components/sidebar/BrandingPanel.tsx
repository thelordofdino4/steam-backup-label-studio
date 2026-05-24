import type { ChangeEvent } from 'react'
import type { SteamLogoPlacement } from '../../discText'
import type { BackgroundImageSize } from '../../project/projectTypes'

export type BrandingPanelProps = {
  steamLogoPlacement: SteamLogoPlacement
  handleSteamLogoPlacementChange: (placement: SteamLogoPlacement) => void
  steamBannerLockupImageUrl: string | null
  steamBannerLockupImageSize: BackgroundImageSize | null
  handleSteamBannerLockupUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleClearSteamBannerLockup: () => void
}

export function BrandingPanel({
  steamLogoPlacement,
  handleSteamLogoPlacementChange,
  steamBannerLockupImageUrl,
  steamBannerLockupImageSize,
  handleSteamBannerLockupUpload,
  handleClearSteamBannerLockup,
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
      </div>
    </details>
  )
}
