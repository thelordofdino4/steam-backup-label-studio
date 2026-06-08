import type { ChangeEvent, ReactNode } from 'react'
import {
  getDefaultSteamBannerLockupSourceLabel,
  isCustomSteamBannerLockupSource,
  type SteamBannerColorField,
  type SteamBannerLockupImageKind,
} from '../../branding/steamBannerDefaults'
import { getProjectImageAssetStatus } from '../../project/projectAssetStatus'
import type {
  ProjectImageAssetProvenance,
  SteamBannerColors,
} from '../../project/projectTypes'
import { EditorStackedRangeField } from './EditorRangeField'

export type EditorSteamBannerLayoutControl = {
  id: string
  label: string
  max: number | string
  min: number | string
  onChange: (value: number) => void
  onInput?: (value: number) => void
  step: number | string
  value: number
}

export type EditorSteamBannerControlsProps = {
  colors: SteamBannerColors
  enabled: boolean
  fallbackText: string
  idPrefix: string
  layoutControls: EditorSteamBannerLayoutControl[]
  lockupImageSource?: ProjectImageAssetProvenance | null
  lockupImageUrl?: string | null
  lockupKind?: SteamBannerLockupImageKind
  onClearLockup: () => void
  onColorChange: (field: SteamBannerColorField, value: string) => void
  onEnabledChange: (enabled: boolean) => void
  onFallbackTextChange: (fallbackText: string) => void
  onLockupUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  onResetColors: () => void
  onResetLayout: () => void
  onUseTextFallbackChange: (useTextFallback: boolean) => void
  placementControls?: ReactNode
  useTextFallback: boolean
}

export function EditorSteamBannerControls({
  colors,
  enabled,
  fallbackText,
  idPrefix,
  layoutControls,
  lockupImageSource,
  lockupImageUrl,
  lockupKind = 'banner-lockup',
  onClearLockup,
  onColorChange,
  onEnabledChange,
  onFallbackTextChange,
  onLockupUpload,
  onResetColors,
  onResetLayout,
  onUseTextFallbackChange,
  placementControls,
  useTextFallback,
}: EditorSteamBannerControlsProps) {
  const defaultLockupLabel = getDefaultSteamBannerLockupSourceLabel(lockupKind)
  const lockupStatus = getProjectImageAssetStatus({
    imageDataUrl: lockupImageUrl,
    provenance: lockupImageSource,
    fallbackLabel: defaultLockupLabel,
  })
  const hasCustomLockupImage = isCustomSteamBannerLockupSource(lockupImageSource)

  return (
    <div className="feature-control-body">
      <label className="field-label">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
        Show Steam banner
      </label>

      {!enabled ? null : (
        <>
          {placementControls}

          <label
            className="field-label spacing-top"
            htmlFor={`${idPrefix}-gradient-start`}
          >
            Gradient start
          </label>
          <input
            id={`${idPrefix}-gradient-start`}
            type="color"
            value={colors.gradientStart}
            onChange={(event) => onColorChange('gradientStart', event.target.value)}
          />

          <label
            className="field-label spacing-top"
            htmlFor={`${idPrefix}-gradient-end`}
          >
            Gradient end
          </label>
          <input
            id={`${idPrefix}-gradient-end`}
            type="color"
            value={colors.gradientEnd}
            onChange={(event) => onColorChange('gradientEnd', event.target.value)}
          />

          <label
            className="field-label spacing-top"
            htmlFor={`${idPrefix}-accent`}
          >
            Accent strip
          </label>
          <input
            id={`${idPrefix}-accent`}
            type="color"
            value={colors.accent}
            onChange={(event) => onColorChange('accent', event.target.value)}
          />

          <label className="field-label spacing-top">
            <input
              type="checkbox"
              checked={useTextFallback}
              onChange={(event) =>
                onUseTextFallbackChange(event.target.checked)}
            />
            Use text fallback for lockup
          </label>

          {useTextFallback ? (
            <>
              <label
                className="field-label spacing-top"
                htmlFor={`${idPrefix}-fallback-text`}
              >
                Fallback lockup text
              </label>
              <input
                id={`${idPrefix}-fallback-text`}
                type="text"
                value={fallbackText}
                onChange={(event) =>
                  onFallbackTextChange(event.target.value)}
              />
              <p className="hint">Blank text renders as STEAM.</p>
            </>
          ) : (
            <>
              <span className="field-label spacing-top">
                Banner lockup image
              </span>
              <label
                className="secondary-button logo-upload-button"
                htmlFor={`${idPrefix}-lockup-upload`}
              >
                Choose banner lockup image
              </label>
              <input
                id={`${idPrefix}-lockup-upload`}
                className="logo-file-input"
                type="file"
                accept="image/*"
                onChange={onLockupUpload}
              />
              <p className="hint">
                Banner lockup: {lockupStatus.summary}.{' '}
                {lockupStatus.availabilityLabel}
              </p>
            </>
          )}

          {layoutControls.map((control) => (
            <EditorStackedRangeField
              key={control.id}
              id={control.id}
              label={control.label}
              min={control.min}
              max={control.max}
              step={control.step}
              value={control.value}
              onInput={control.onInput}
              onChange={control.onChange}
            />
          ))}

          {!useTextFallback && hasCustomLockupImage ? (
            <button
              className="secondary-button"
              type="button"
              onClick={onClearLockup}
            >
              Reset to default lockup
            </button>
          ) : null}
          <button
            className="secondary-button"
            type="button"
            onClick={onResetColors}
          >
            Reset banner colors
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={onResetLayout}
          >
            Reset lockup layout
          </button>
        </>
      )}
    </div>
  )
}
