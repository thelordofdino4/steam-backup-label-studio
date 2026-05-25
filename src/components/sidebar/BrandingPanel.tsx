import type { ChangeEvent } from 'react'
import type { SteamLogoPlacement } from '../../discText'
import type { BackgroundImageSize, LogoAssetLayout, ProjectLogoAssets, SteamBannerColors, SteamBannerLockupLayout } from '../../project/projectTypes'

export type BrandingPanelProps = {
  steamLogoPlacement: SteamLogoPlacement
  handleSteamLogoPlacementChange: (placement: SteamLogoPlacement) => void
  steamBannerLockupImageUrl: string | null
  steamBannerLockupImageSize: BackgroundImageSize | null
  steamBannerLockupLayout: SteamBannerLockupLayout
  steamBannerColors: SteamBannerColors
  projectLogoAssets: ProjectLogoAssets
  handleSteamBannerLockupUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleClearSteamBannerLockup: () => void
  handleSteamBannerLockupLayoutChange: (
    field: keyof SteamBannerLockupLayout,
    value: number,
  ) => void
  handleResetSteamBannerLockupLayout: () => void
  handleSteamBannerColorChange: (field: keyof SteamBannerColors, value: string) => void
  handleResetSteamBannerColors: () => void
  handleLogoAssetUpload: (
    logoKey: 'developer' | 'publisher',
    event: ChangeEvent<HTMLInputElement>,
  ) => void | Promise<void>
  handleLogoAssetLayoutChange: (
    logoKey: 'developer' | 'publisher',
    field: keyof LogoAssetLayout,
    value: boolean | number,
  ) => void
  handleClearLogoAsset: (logoKey: 'developer' | 'publisher') => void
  handleResetLogoAssetLayout: (logoKey: 'developer' | 'publisher') => void
}

const LOGO_ALIGNMENT_PRESETS = [
  { label: 'Top left', x: 22, y: 22 },
  { label: 'Top center', x: 50, y: 22 },
  { label: 'Top right', x: 78, y: 22 },
  { label: 'Left center', x: 22, y: 50 },
  { label: 'Right center', x: 78, y: 50 },
  { label: 'Bottom left', x: 22, y: 78 },
  { label: 'Bottom center', x: 50, y: 78 },
  { label: 'Bottom right', x: 78, y: 78 },
  { label: 'Stacked left upper', x: 22, y: 62 },
  { label: 'Stacked left lower', x: 22, y: 72 },
  { label: 'Stacked right upper', x: 78, y: 62 },
  { label: 'Stacked right lower', x: 78, y: 72 },
] as const

function formatLogoSize(size: BackgroundImageSize | null) {
  return size ? ` · ${size.width}×${size.height}` : ''
}

function LogoAssetControls({
  logoKey,
  label,
  imageDataUrl,
  imageSize,
  layout,
  handleLogoAssetUpload,
  handleLogoAssetLayoutChange,
  handleClearLogoAsset,
  handleResetLogoAssetLayout,
}: {
  logoKey: 'developer' | 'publisher'
  label: string
  imageDataUrl: string | null
  imageSize: BackgroundImageSize | null
  layout: LogoAssetLayout
  handleLogoAssetUpload: (
    logoKey: 'developer' | 'publisher',
    event: ChangeEvent<HTMLInputElement>,
  ) => void | Promise<void>
  handleLogoAssetLayoutChange: (
    logoKey: 'developer' | 'publisher',
    field: keyof LogoAssetLayout,
    value: boolean | number,
  ) => void
  handleClearLogoAsset: (logoKey: 'developer' | 'publisher') => void
  handleResetLogoAssetLayout: (logoKey: 'developer' | 'publisher') => void
}) {
  const uploadId = `${logoKey}-logo-upload`

  return (
    <div className="logo-asset-card">
      <span className="field-label">
        {label} logo
      </span>
      <label className="secondary-button logo-upload-button" htmlFor={uploadId}>
        Choose {label.toLowerCase()} logo
      </label>
      <input
        id={uploadId}
        className="logo-file-input"
        type="file"
        accept="image/*"
        onChange={(event) => handleLogoAssetUpload(logoKey, event)}
      />

      {imageDataUrl ? (
        <div className="selected-lockup-card logo-asset-status-card">
          <img
            className="logo-asset-preview"
            src={imageDataUrl}
            alt=""
            draggable={false}
          />
          <span>
            {label} logo active{formatLogoSize(imageSize)}
          </span>
          <button
            className="secondary-button"
            type="button"
            onClick={() => handleClearLogoAsset(logoKey)}
          >
            Clear logo
          </button>
        </div>
      ) : (
        <p className="hint">Upload a transparent PNG or logo image for this slot.</p>
      )}

      <label className="field-label spacing-top">
        <input
          type="checkbox"
          checked={layout.enabled}
          disabled={!imageDataUrl}
          onChange={(event) =>
            handleLogoAssetLayoutChange(logoKey, 'enabled', event.target.checked)
          }
        />
        Show {label.toLowerCase()} logo
      </label>

      <label className="field-label spacing-top" htmlFor={`${logoKey}-logo-alignment-preset`}>
        Align logo
      </label>
      <select
        id={`${logoKey}-logo-alignment-preset`}
        defaultValue=""
        disabled={!imageDataUrl}
        onChange={(event) => {
          const preset = LOGO_ALIGNMENT_PRESETS.find(
            (candidate) => candidate.label === event.target.value,
          )

          if (!preset) {
            return
          }

          handleLogoAssetLayoutChange(logoKey, 'x', preset.x)
          handleLogoAssetLayoutChange(logoKey, 'y', preset.y)
          event.currentTarget.value = ''
        }}
      >
        <option value="">Choose preset...</option>
        {LOGO_ALIGNMENT_PRESETS.map((preset) => (
          <option key={preset.label} value={preset.label}>
            {preset.label}
          </option>
        ))}
      </select>

      <label className="field-label spacing-top" htmlFor={`${logoKey}-logo-scale`}>
        Scale
      </label>
      <input
        id={`${logoKey}-logo-scale`}
        type="range"
        min="0.25"
        max="2"
        step="0.01"
        value={layout.scale}
        disabled={!imageDataUrl}
        onChange={(event) =>
          handleLogoAssetLayoutChange(logoKey, 'scale', Number(event.target.value))
        }
      />

      <label className="field-label spacing-top" htmlFor={`${logoKey}-logo-x`}>
        X position
      </label>
      <input
        id={`${logoKey}-logo-x`}
        type="range"
        min="0"
        max="100"
        step="0.1"
        value={layout.x}
        disabled={!imageDataUrl}
        onChange={(event) =>
          handleLogoAssetLayoutChange(logoKey, 'x', Number(event.target.value))
        }
      />

      <label className="field-label spacing-top" htmlFor={`${logoKey}-logo-y`}>
        Y position
      </label>
      <input
        id={`${logoKey}-logo-y`}
        type="range"
        min="0"
        max="100"
        step="0.1"
        value={layout.y}
        disabled={!imageDataUrl}
        onChange={(event) =>
          handleLogoAssetLayoutChange(logoKey, 'y', Number(event.target.value))
        }
      />

      <button
        className="secondary-button"
        type="button"
        disabled={!imageDataUrl}
        onClick={() => handleResetLogoAssetLayout(logoKey)}
      >
        Reset logo layout
      </button>
    </div>
  )
}

export function BrandingPanel({
  steamLogoPlacement,
  handleSteamLogoPlacementChange,
  steamBannerLockupImageUrl,
  steamBannerLockupImageSize,
  steamBannerLockupLayout,
  steamBannerColors,
  projectLogoAssets,
  handleSteamBannerLockupUpload,
  handleClearSteamBannerLockup,
  handleSteamBannerLockupLayoutChange,
  handleResetSteamBannerLockupLayout,
  handleSteamBannerColorChange,
  handleResetSteamBannerColors,
  handleLogoAssetUpload,
  handleLogoAssetLayoutChange,
  handleClearLogoAsset,
  handleResetLogoAssetLayout,
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

      <details className="metadata-details collapsible-panel spacing-top">
        <summary className="panel-summary">Developer / publisher logos</summary>
        <div className="panel-content">
          <LogoAssetControls
            logoKey="developer"
            label="Developer"
            imageDataUrl={projectLogoAssets.developerLogoDataUrl}
            imageSize={projectLogoAssets.developerLogoSize}
            layout={projectLogoAssets.developerLogoLayout}
            handleLogoAssetUpload={handleLogoAssetUpload}
            handleLogoAssetLayoutChange={handleLogoAssetLayoutChange}
            handleClearLogoAsset={handleClearLogoAsset}
            handleResetLogoAssetLayout={handleResetLogoAssetLayout}
          />

          <LogoAssetControls
            logoKey="publisher"
            label="Publisher"
            imageDataUrl={projectLogoAssets.publisherLogoDataUrl}
            imageSize={projectLogoAssets.publisherLogoSize}
            layout={projectLogoAssets.publisherLogoLayout}
            handleLogoAssetUpload={handleLogoAssetUpload}
            handleLogoAssetLayoutChange={handleLogoAssetLayoutChange}
            handleClearLogoAsset={handleClearLogoAsset}
            handleResetLogoAssetLayout={handleResetLogoAssetLayout}
          />
        </div>
      </details>
      </div>
    </details>
  )
}
