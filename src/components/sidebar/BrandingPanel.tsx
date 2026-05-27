import { useState, type ChangeEvent } from 'react'
import type { SteamLogoPlacement } from '../../discText'
import { RATING_BADGE_LAYOUT_PRESETS } from '../../layoutPresets'
import { MEDIA_MARK_OPTIONS, PLATFORM_MARK_OPTIONS, getEnabledPlatformMarkValues, getMediaMarkLabel, getPlatformMarkLabel, getPlatformMarkValuesForRemember, getPlatformMarkValuesForRestore } from '../../project/projectMediaMark'
import { getActiveRatingSystemForBadge, getRatingMetadataForBadgeEnabled, getRatingMetadataForSystemChange, getRatingValuesForSystem } from '../../project/projectMetadata'
import type { BackgroundImageSize, GameRatingSystem, LogoAssetLayout, MediaMarkLayout, MediaMarkSource, MediaMarkValue, PlatformMarkLayout, PlatformMarkSource, PlatformMarkValue, ProjectLogoAssets, ProjectMediaMark, ProjectMetadata, ProjectPlatformMarks, ProjectRatingBadge, RatingBadgeLayout, RatingBadgeSource, SteamBannerColors, SteamBannerLockupLayout } from '../../project/projectTypes'
import { createSteamLogoPlacementMemory, getEnabledSteamLogoPlacement, getNextSteamLogoPlacementMemory } from '../../steamBanner'

export type BrandingPanelProps = {
  steamLogoPlacement: SteamLogoPlacement
  handleSteamLogoPlacementChange: (placement: SteamLogoPlacement) => void
  steamBannerLockupImageUrl: string | null
  steamBannerLockupImageSize: BackgroundImageSize | null
  steamBannerLockupLayout: SteamBannerLockupLayout
  steamBannerColors: SteamBannerColors
  projectLogoAssets: ProjectLogoAssets
  projectMetadata: ProjectMetadata
  projectRatingBadge: ProjectRatingBadge
  projectMediaMark: ProjectMediaMark
  projectPlatformMarks: ProjectPlatformMarks
  handleProjectMetadataChange: (field: keyof ProjectMetadata, value: string) => void
  handleSteamBannerLockupUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleClearSteamBannerLockup: () => void
  handleSteamBannerLockupLayoutChange: (field: keyof SteamBannerLockupLayout, value: number) => void
  handleResetSteamBannerLockupLayout: () => void
  handleSteamBannerColorChange: (field: keyof SteamBannerColors, value: string) => void
  handleResetSteamBannerColors: () => void
  handleLogoAssetUpload: (logoKey: 'developer' | 'publisher', event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleLogoAssetLayoutChange: (logoKey: 'developer' | 'publisher', field: keyof LogoAssetLayout, value: boolean | number) => void
  handleClearLogoAsset: (logoKey: 'developer' | 'publisher') => void
  handleResetLogoAssetLayout: (logoKey: 'developer' | 'publisher') => void
  handleRatingBadgeUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleRatingBadgeSourceChange: (source: RatingBadgeSource) => void
  handleRatingBadgeLayoutChange: (field: keyof RatingBadgeLayout, value: boolean | number) => void
  handleClearRatingBadgeImage: () => void
  handleResetRatingBadgeLayout: () => void
  handleMediaMarkUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handleMediaMarkValueChange: (value: MediaMarkValue) => void
  handleMediaMarkSourceChange: (source: MediaMarkSource) => void
  handleMediaMarkLayoutChange: (field: keyof MediaMarkLayout, value: boolean | number) => void
  handleClearMediaMarkImage: () => void
  handleResetMediaMarkLayout: () => void
  handlePlatformMarkToggle: (value: PlatformMarkValue, enabled: boolean) => void
  handlePlatformMarkUpload: (value: PlatformMarkValue, event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  handlePlatformMarkSourceChange: (value: PlatformMarkValue, source: PlatformMarkSource) => void
  handlePlatformMarkLayoutChange: (platformValue: PlatformMarkValue, field: keyof PlatformMarkLayout, layoutValue: boolean | number) => void
  handleClearPlatformMarkImage: (value: PlatformMarkValue) => void
  handleResetPlatformMarkLayout: (value: PlatformMarkValue) => void
}

type LogoKey = 'developer' | 'publisher'

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

function SteamBannerControls({
  steamLogoPlacement,
  steamBannerLockupImageUrl,
  steamBannerLockupLayout,
  steamBannerColors,
  handleSteamLogoPlacementChange,
  handleSteamBannerLockupUpload,
  handleClearSteamBannerLockup,
  handleSteamBannerLockupLayoutChange,
  handleResetSteamBannerLockupLayout,
  handleSteamBannerColorChange,
  handleResetSteamBannerColors,
}: Pick<
  BrandingPanelProps,
  | 'steamLogoPlacement'
  | 'steamBannerLockupImageUrl'
  | 'steamBannerLockupLayout'
  | 'steamBannerColors'
  | 'handleSteamLogoPlacementChange'
  | 'handleSteamBannerLockupUpload'
  | 'handleClearSteamBannerLockup'
  | 'handleSteamBannerLockupLayoutChange'
  | 'handleResetSteamBannerLockupLayout'
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

  return (
    <div className="logo-asset-card">
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

          <span className="field-label spacing-top">Banner lockup image</span>
          <label className="secondary-button logo-upload-button" htmlFor="steam-banner-lockup-upload">Choose banner lockup image</label>
          <input id="steam-banner-lockup-upload" className="logo-file-input" type="file" accept="image/*" onChange={handleSteamBannerLockupUpload} />

          {!steamBannerLockupImageUrl && (
            <p className="hint">Using the bundled default Steam banner lockup image. Upload a PNG to override it.</p>
          )}

          <label className="field-label spacing-top" htmlFor="steam-banner-lockup-scale">Lockup scale</label>
          <input id="steam-banner-lockup-scale" type="range" min="0.5" max="1.5" step="0.01" value={steamBannerLockupLayout.scale} onChange={(event) => handleSteamBannerLockupLayoutChange('scale', Number(event.target.value))} />

          <label className="field-label spacing-top" htmlFor="steam-banner-lockup-offset-x">Lockup X offset</label>
          <input id="steam-banner-lockup-offset-x" type="range" min="-20" max="20" step="0.1" value={steamBannerLockupLayout.offsetX} onChange={(event) => handleSteamBannerLockupLayoutChange('offsetX', Number(event.target.value))} />

          <label className="field-label spacing-top" htmlFor="steam-banner-lockup-offset-y">Lockup Y offset</label>
          <input id="steam-banner-lockup-offset-y" type="range" min="-20" max="20" step="0.1" value={steamBannerLockupLayout.offsetY} onChange={(event) => handleSteamBannerLockupLayoutChange('offsetY', Number(event.target.value))} />

          {steamBannerLockupImageUrl && <button className="secondary-button" type="button" onClick={handleClearSteamBannerLockup}>Reset to default lockup</button>}
          <button className="secondary-button" type="button" onClick={handleResetSteamBannerColors}>Reset banner colors</button>
          <button className="secondary-button" type="button" onClick={handleResetSteamBannerLockupLayout}>Reset lockup layout</button>
        </>
      )}
    </div>
  )
}

function LogoAssetControls({ logoKey, label, imageDataUrl, imageSize, layout, handleLogoAssetUpload, handleLogoAssetLayoutChange, handleClearLogoAsset, handleResetLogoAssetLayout }: Pick<BrandingPanelProps, 'handleLogoAssetUpload' | 'handleLogoAssetLayoutChange' | 'handleClearLogoAsset' | 'handleResetLogoAssetLayout'> & { logoKey: LogoKey; label: string; imageDataUrl: string | null; imageSize: BackgroundImageSize | null; layout: LogoAssetLayout }) {
  const uploadId = `${logoKey}-logo-upload`
  const hasLogoImage = Boolean(imageDataUrl)

  return (
    <div className="logo-asset-card">
      <label className="field-label">
        <input type="checkbox" checked={layout.enabled} onChange={(event) => handleLogoAssetLayoutChange(logoKey, 'enabled', event.target.checked)} />
        Show {label.toLowerCase()} logo
      </label>

      {!layout.enabled ? null : (
        <>
          <label className="secondary-button logo-upload-button" htmlFor={uploadId}>{hasLogoImage ? `Replace ${label.toLowerCase()} logo` : `Choose ${label.toLowerCase()} logo`}</label>
          <input id={uploadId} className="logo-file-input" type="file" accept="image/*" onChange={(event) => handleLogoAssetUpload(logoKey, event)} />

          {hasLogoImage ? (
            <div className="selected-lockup-card logo-asset-status-card">
              <img className="logo-asset-preview" src={imageDataUrl ?? undefined} alt="" draggable={false} />
              <span>{label} logo active{formatLogoSize(imageSize)}</span>
            </div>
          ) : (
            <p className="hint">No uploaded {label.toLowerCase()} logo is selected yet. The editor shows a temporary placeholder so you can place the element; upload an image to render your actual logo.</p>
          )}

          <label className="field-label spacing-top" htmlFor={`${logoKey}-logo-alignment-preset`}>Align logo</label>
          <select id={`${logoKey}-logo-alignment-preset`} defaultValue="" onChange={(event) => {
            const preset = LOGO_ALIGNMENT_PRESETS.find((candidate) => candidate.label === event.target.value)
            if (!preset) return
            handleLogoAssetLayoutChange(logoKey, 'x', preset.x)
            handleLogoAssetLayoutChange(logoKey, 'y', preset.y)
            event.currentTarget.value = ''
          }}>
            <option value="">Choose preset...</option>
            {LOGO_ALIGNMENT_PRESETS.map((preset) => <option key={preset.label} value={preset.label}>{preset.label}</option>)}
          </select>

          <label className="field-label spacing-top" htmlFor={`${logoKey}-logo-scale`}>Scale</label>
          <input id={`${logoKey}-logo-scale`} type="range" min="0.25" max="2" step="0.01" value={layout.scale} onChange={(event) => handleLogoAssetLayoutChange(logoKey, 'scale', Number(event.target.value))} />

          <label className="field-label spacing-top" htmlFor={`${logoKey}-logo-x`}>X position</label>
          <input id={`${logoKey}-logo-x`} type="range" min="0" max="100" step="0.1" value={layout.x} onChange={(event) => handleLogoAssetLayoutChange(logoKey, 'x', Number(event.target.value))} />

          <label className="field-label spacing-top" htmlFor={`${logoKey}-logo-y`}>Y position</label>
          <input id={`${logoKey}-logo-y`} type="range" min="0" max="100" step="0.1" value={layout.y} onChange={(event) => handleLogoAssetLayoutChange(logoKey, 'y', Number(event.target.value))} />

          <button className="secondary-button" type="button" onClick={() => handleResetLogoAssetLayout(logoKey)}>Reset logo layout</button>
          {hasLogoImage && <button className="secondary-button" type="button" onClick={() => handleClearLogoAsset(logoKey)}>Clear logo</button>}
        </>
      )}
    </div>
  )
}

function RatingBadgeControls({ projectMetadata, projectRatingBadge, handleProjectMetadataChange, handleRatingBadgeUpload, handleRatingBadgeSourceChange, handleRatingBadgeLayoutChange, handleClearRatingBadgeImage, handleResetRatingBadgeLayout }: Pick<BrandingPanelProps, 'projectMetadata' | 'projectRatingBadge' | 'handleProjectMetadataChange' | 'handleRatingBadgeUpload' | 'handleRatingBadgeSourceChange' | 'handleRatingBadgeLayoutChange' | 'handleClearRatingBadgeImage' | 'handleResetRatingBadgeLayout'>) {
  const isBadgeEnabled = projectRatingBadge.layout.enabled
  const activeRatingSystem = getActiveRatingSystemForBadge(projectMetadata.ratingSystem)
  const hasRatingValue = projectMetadata.ratingValue.trim().length > 0
  const ratingLabel = projectMetadata.ratingSystem === 'none' ? 'No rating selected' : `${projectMetadata.ratingSystem}${hasRatingValue ? ` ${projectMetadata.ratingValue}` : ''}`
  const isCustomBadgeSource = projectRatingBadge.source === 'custom'

  const handleEnabledChange = (enabled: boolean) => {
    if (enabled) {
      const nextMetadata = getRatingMetadataForBadgeEnabled(projectMetadata)
      handleProjectMetadataChange('ratingSystem', nextMetadata.ratingSystem)
      handleProjectMetadataChange('ratingValue', nextMetadata.ratingValue)
    }
    handleRatingBadgeLayoutChange('enabled', enabled)
  }

  const applyRatingBadgePreset = (presetId: string) => {
    const preset = RATING_BADGE_LAYOUT_PRESETS.find((candidate) => candidate.id === presetId)
    if (!preset) return
    handleRatingBadgeLayoutChange('x', preset.x)
    handleRatingBadgeLayoutChange('y', preset.y)
    handleRatingBadgeLayoutChange('scale', preset.scale)
  }

  return (
    <div className="logo-asset-card">
      <label className="field-label"><input type="checkbox" checked={isBadgeEnabled} onChange={(event) => handleEnabledChange(event.target.checked)} /> Show rating badge</label>
      {!isBadgeEnabled ? null : (
        <>
          <label className="field-label spacing-top" htmlFor="branding-rating-system">Rating system</label>
          <select id="branding-rating-system" value={activeRatingSystem} onChange={(event) => {
            const nextSystem = event.target.value as GameRatingSystem
            const nextMetadata = getRatingMetadataForSystemChange(projectMetadata, nextSystem)
            handleProjectMetadataChange('ratingSystem', nextMetadata.ratingSystem)
            handleProjectMetadataChange('ratingValue', nextMetadata.ratingValue)
          }}>
            <option value="ESRB">ESRB</option>
            <option value="PEGI">PEGI</option>
            <option value="custom">Custom</option>
          </select>

          <label className="field-label spacing-top" htmlFor="branding-rating-value">Rating value</label>
          {activeRatingSystem === 'custom' ? (
            <input id="branding-rating-value" type="text" value={projectMetadata.ratingValue} placeholder="Custom rating label..." onChange={(event) => handleProjectMetadataChange('ratingValue', event.target.value)} />
          ) : (
            <select id="branding-rating-value" value={projectMetadata.ratingValue} onChange={(event) => handleProjectMetadataChange('ratingValue', event.target.value)}>
              {getRatingValuesForSystem(activeRatingSystem).map((value) => <option key={value} value={value}>{activeRatingSystem === 'PEGI' ? `PEGI ${value}` : value}</option>)}
            </select>
          )}

          <p className="hint">Current metadata rating: {ratingLabel}. Rating values are manual for now.</p>
          {!hasRatingValue && <p className="hint">Choose a rating value so the enabled badge has meaningful text.</p>}

          <label className="field-label spacing-top" htmlFor="rating-badge-source">Badge source</label>
          <select id="rating-badge-source" value={projectRatingBadge.source} onChange={(event) => handleRatingBadgeSourceChange(event.target.value as RatingBadgeSource)}>
            <option value="placeholder">Built-in placeholder</option>
            <option value="custom">Custom image</option>
          </select>

          {isCustomBadgeSource ? (
            <>
              <span className="field-label spacing-top">Custom badge image</span>
              <label className="secondary-button logo-upload-button" htmlFor="rating-badge-upload">Choose custom badge</label>
              <input id="rating-badge-upload" className="logo-file-input" type="file" accept="image/*" onChange={handleRatingBadgeUpload} />

              {projectRatingBadge.customImageDataUrl ? (
                <div className="selected-lockup-card logo-asset-status-card">
                  <img className="logo-asset-preview" src={projectRatingBadge.customImageDataUrl} alt="" draggable={false} />
                  <span>Custom rating badge active{formatLogoSize(projectRatingBadge.customImageSize)}</span>
                </div>
              ) : <p className="hint">No custom badge image is selected yet. The generated badge placeholder remains visible until you upload an image.</p>}
            </>
          ) : <p className="hint">Using the built-in placeholder badge.</p>}

          <label className="field-label spacing-top" htmlFor="rating-badge-layout-preset">Layout preset</label>
          <select id="rating-badge-layout-preset" defaultValue="" onChange={(event) => {
            applyRatingBadgePreset(event.target.value)
            event.currentTarget.value = ''
          }}>
            <option value="">Choose preset...</option>
            {RATING_BADGE_LAYOUT_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select>

          <label className="field-label spacing-top" htmlFor="rating-badge-scale">Scale</label>
          <input id="rating-badge-scale" type="range" min="0.25" max="2" step="0.01" value={projectRatingBadge.layout.scale} onChange={(event) => handleRatingBadgeLayoutChange('scale', Number(event.target.value))} />
          <label className="field-label spacing-top" htmlFor="rating-badge-x">X position</label>
          <input id="rating-badge-x" type="range" min="0" max="100" step="0.1" value={projectRatingBadge.layout.x} onChange={(event) => handleRatingBadgeLayoutChange('x', Number(event.target.value))} />
          <label className="field-label spacing-top" htmlFor="rating-badge-y">Y position</label>
          <input id="rating-badge-y" type="range" min="0" max="100" step="0.1" value={projectRatingBadge.layout.y} onChange={(event) => handleRatingBadgeLayoutChange('y', Number(event.target.value))} />
          <button className="secondary-button" type="button" onClick={handleResetRatingBadgeLayout}>Reset rating badge layout</button>
          {isCustomBadgeSource && projectRatingBadge.customImageDataUrl && <button className="secondary-button" type="button" onClick={handleClearRatingBadgeImage}>Clear custom badge</button>}
        </>
      )}
    </div>
  )
}

function MediaMarkControls({ projectMediaMark, handleMediaMarkUpload, handleMediaMarkValueChange, handleMediaMarkSourceChange, handleMediaMarkLayoutChange, handleClearMediaMarkImage, handleResetMediaMarkLayout }: Pick<BrandingPanelProps, 'projectMediaMark' | 'handleMediaMarkUpload' | 'handleMediaMarkValueChange' | 'handleMediaMarkSourceChange' | 'handleMediaMarkLayoutChange' | 'handleClearMediaMarkImage' | 'handleResetMediaMarkLayout'>) {
  const isEnabled = projectMediaMark.layout.enabled
  const isCustomMediaMarkSource = projectMediaMark.source === 'custom'
  return (
    <div className="logo-asset-card">
      <label className="field-label"><input type="checkbox" checked={isEnabled} onChange={(event) => handleMediaMarkLayoutChange('enabled', event.target.checked)} /> Show media format mark</label>
      {!isEnabled ? null : (
        <>
          <label className="field-label spacing-top" htmlFor="media-mark-value">Format</label>
          <select id="media-mark-value" value={projectMediaMark.value} onChange={(event) => handleMediaMarkValueChange(event.target.value as MediaMarkValue)}>
            {MEDIA_MARK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <label className="field-label spacing-top" htmlFor="media-mark-source">Mark source</label>
          <select id="media-mark-source" value={projectMediaMark.source} onChange={(event) => handleMediaMarkSourceChange(event.target.value as MediaMarkSource)}>
            <option value="placeholder">Built-in placeholder</option>
            <option value="custom">Custom image</option>
          </select>
          <p className="hint">Current media mark: {getMediaMarkLabel(projectMediaMark.value)}.</p>
          {isCustomMediaMarkSource ? (
            <>
              <span className="field-label spacing-top">Custom mark image</span>
              <label className="secondary-button logo-upload-button" htmlFor="media-mark-upload">Choose custom mark</label>
              <input id="media-mark-upload" className="logo-file-input" type="file" accept="image/*" onChange={handleMediaMarkUpload} />
              {projectMediaMark.customImageDataUrl ? (
                <div className="selected-lockup-card logo-asset-status-card">
                  <img className="logo-asset-preview" src={projectMediaMark.customImageDataUrl} alt="" draggable={false} />
                  <span>Custom media mark active{formatLogoSize(projectMediaMark.customImageSize)}</span>
                </div>
              ) : <p className="hint">No custom media mark image is selected yet. The generated mark placeholder remains visible until you upload an image.</p>}
            </>
          ) : <p className="hint">Using the built-in placeholder mark.</p>}
          <label className="field-label spacing-top" htmlFor="media-mark-scale">Scale</label>
          <input id="media-mark-scale" type="range" min="0.25" max="2" step="0.01" value={projectMediaMark.layout.scale} onChange={(event) => handleMediaMarkLayoutChange('scale', Number(event.target.value))} />
          <label className="field-label spacing-top" htmlFor="media-mark-x">X position</label>
          <input id="media-mark-x" type="range" min="0" max="100" step="0.1" value={projectMediaMark.layout.x} onChange={(event) => handleMediaMarkLayoutChange('x', Number(event.target.value))} />
          <label className="field-label spacing-top" htmlFor="media-mark-y">Y position</label>
          <input id="media-mark-y" type="range" min="0" max="100" step="0.1" value={projectMediaMark.layout.y} onChange={(event) => handleMediaMarkLayoutChange('y', Number(event.target.value))} />
          <button className="secondary-button" type="button" onClick={handleResetMediaMarkLayout}>Reset media mark layout</button>
          {isCustomMediaMarkSource && projectMediaMark.customImageDataUrl && <button className="secondary-button" type="button" onClick={handleClearMediaMarkImage}>Clear custom mark</button>}
        </>
      )}
    </div>
  )
}

function PlatformMarkControls({ projectPlatformMarks, handlePlatformMarkToggle, handlePlatformMarkUpload, handlePlatformMarkSourceChange, handlePlatformMarkLayoutChange, handleClearPlatformMarkImage, handleResetPlatformMarkLayout }: Pick<BrandingPanelProps, 'projectPlatformMarks' | 'handlePlatformMarkToggle' | 'handlePlatformMarkUpload' | 'handlePlatformMarkSourceChange' | 'handlePlatformMarkLayoutChange' | 'handleClearPlatformMarkImage' | 'handleResetPlatformMarkLayout'>) {
  const [rememberedValues, setRememberedValues] = useState<PlatformMarkValue[]>([])
  const enabledValues = getEnabledPlatformMarkValues(projectPlatformMarks)
  const isEnabled = enabledValues.length > 0
  const currentLabel = projectPlatformMarks.values.length > 0 ? projectPlatformMarks.values.map(getPlatformMarkLabel).join(', ') : 'None selected'

  const toggleEnabled = (enabled: boolean) => {
    if (enabled) {
      const valuesToRestore = getPlatformMarkValuesForRestore(projectPlatformMarks, rememberedValues)
      valuesToRestore.forEach((value) => projectPlatformMarks.values.includes(value) ? handlePlatformMarkLayoutChange(value, 'enabled', true) : handlePlatformMarkToggle(value, true))
      return
    }
    setRememberedValues(getPlatformMarkValuesForRemember(projectPlatformMarks))
    projectPlatformMarks.values.forEach((value) => handlePlatformMarkLayoutChange(value, 'enabled', false))
  }

  return (
    <div>
      <label className="field-label"><input type="checkbox" checked={isEnabled} onChange={(event) => toggleEnabled(event.target.checked)} /> Show platform marks</label>
      {!isEnabled ? null : (
        <>
          <div className="platform-mark-selection-group spacing-top">
            <span className="field-label">Platforms</span>
            <div className="disc-mark-checkbox-list">
              {PLATFORM_MARK_OPTIONS.map((option) => (
                <label key={option.value} className="field-label"><input type="checkbox" checked={projectPlatformMarks.values.includes(option.value)} onChange={(event) => handlePlatformMarkToggle(option.value, event.target.checked)} /> {option.label}</label>
              ))}
            </div>
          </div>
          <p className="hint">Current platform marks: {currentLabel}. Each selected platform mark has its own image and layout.</p>
          {projectPlatformMarks.values.map((value) => {
            const asset = projectPlatformMarks.assets[value]
            const label = getPlatformMarkLabel(value)
            const uploadId = `platform-mark-upload-${value}`
            if (!asset) return null
            const isCustomPlatformMarkSource = asset.source === 'custom'
            return (
              <div key={value} className="logo-asset-card spacing-top">
                <span className="field-label">{label} platform mark</span>
                <label className="field-label spacing-top" htmlFor={`platform-mark-source-${value}`}>Mark source</label>
                <select id={`platform-mark-source-${value}`} value={asset.source} onChange={(event) => handlePlatformMarkSourceChange(value, event.target.value as PlatformMarkSource)}>
                  <option value="placeholder">Built-in placeholder</option>
                  <option value="custom">Custom image</option>
                </select>
                {isCustomPlatformMarkSource ? (
                  <>
                    <span className="field-label spacing-top">Custom platform image</span>
                    <label className="secondary-button logo-upload-button" htmlFor={uploadId}>Choose custom {label}</label>
                    <input id={uploadId} className="logo-file-input" type="file" accept="image/*" onChange={(event) => handlePlatformMarkUpload(value, event)} />
                    {asset.customImageDataUrl ? (
                      <div className="selected-lockup-card logo-asset-status-card">
                        <img className="logo-asset-preview" src={asset.customImageDataUrl} alt="" draggable={false} />
                        <span>Custom {label} mark active{formatLogoSize(asset.customImageSize)}</span>
                      </div>
                    ) : <p className="hint">No custom {label} platform image is selected yet. The generated platform placeholder remains visible until you upload an image.</p>}
                  </>
                ) : <p className="hint">Using a generic internal placeholder.</p>}
                <label className="field-label spacing-top" htmlFor={`platform-mark-scale-${value}`}>Scale</label>
                <input id={`platform-mark-scale-${value}`} type="range" min="0.25" max="2" step="0.01" value={asset.layout.scale} onChange={(event) => handlePlatformMarkLayoutChange(value, 'scale', Number(event.target.value))} />
                <label className="field-label spacing-top" htmlFor={`platform-mark-x-${value}`}>X position</label>
                <input id={`platform-mark-x-${value}`} type="range" min="0" max="100" step="0.1" value={asset.layout.x} onChange={(event) => handlePlatformMarkLayoutChange(value, 'x', Number(event.target.value))} />
                <label className="field-label spacing-top" htmlFor={`platform-mark-y-${value}`}>Y position</label>
                <input id={`platform-mark-y-${value}`} type="range" min="0" max="100" step="0.1" value={asset.layout.y} onChange={(event) => handlePlatformMarkLayoutChange(value, 'y', Number(event.target.value))} />
                <button className="secondary-button" type="button" onClick={() => handleResetPlatformMarkLayout(value)}>Reset {label} layout</button>
                {isCustomPlatformMarkSource && asset.customImageDataUrl && <button className="secondary-button" type="button" onClick={() => handleClearPlatformMarkImage(value)}>Clear custom {label}</button>}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

export function BrandingPanel(props: BrandingPanelProps) {
  const { projectLogoAssets } = props
  return (
    <details className="panel collapsible-panel" open>
      <summary className="panel-summary">Branding</summary>
      <div className="panel-content">
        <SteamBannerControls {...props} />
        <details className="metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">Developer / publisher logos</summary>
          <div className="panel-content">
            <LogoAssetControls logoKey="developer" label="Developer" imageDataUrl={projectLogoAssets.developerLogoDataUrl} imageSize={projectLogoAssets.developerLogoSize} layout={projectLogoAssets.developerLogoLayout} {...props} />
            <LogoAssetControls logoKey="publisher" label="Publisher" imageDataUrl={projectLogoAssets.publisherLogoDataUrl} imageSize={projectLogoAssets.publisherLogoSize} layout={projectLogoAssets.publisherLogoLayout} {...props} />
          </div>
        </details>
        <details className="metadata-details collapsible-panel spacing-top"><summary className="panel-summary">Rating badge</summary><div className="panel-content"><RatingBadgeControls {...props} /></div></details>
        <details className="metadata-details collapsible-panel spacing-top"><summary className="panel-summary">Media format mark</summary><div className="panel-content"><MediaMarkControls {...props} /></div></details>
        <details className="metadata-details collapsible-panel spacing-top"><summary className="panel-summary">Platform marks</summary><div className="panel-content"><PlatformMarkControls {...props} /></div></details>
      </div>
    </details>
  )
}
