import type { ChangeEvent } from 'react'
import type {
  CaseInsertSteamBannerColorField,
  CaseInsertSteamBannerLayoutField,
  CaseInsertSteamBannerTargetKind,
} from '../../caseInsert/steamBanner'
import {
  getProjectImageAssetStatus,
} from '../../project/projectAssetStatus'
import type {
  ProjectCaseInsertSteamBanner,
} from '../../project/projectTypes'

export type CaseInsertSteamBannerControlsProps = {
  banner: ProjectCaseInsertSteamBanner
  idPrefix: string
  targetKind: CaseInsertSteamBannerTargetKind
  onEnabledChange: (enabled: boolean) => void
  onLockupUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  onClearLockup: () => void
  onLayoutChange: (
    field: CaseInsertSteamBannerLayoutField,
    value: number,
  ) => void
  onResetLayout: () => void
  onUseTextFallbackChange: (useTextFallback: boolean) => void
  onFallbackTextChange: (fallbackText: string) => void
  onColorChange: (
    field: CaseInsertSteamBannerColorField,
    value: string,
  ) => void
  onResetColors: () => void
}

type CaseInsertSteamBannerLayoutControl = {
  field: CaseInsertSteamBannerLayoutField
  label: string
  min: number
  max: number
  step: number
}

const COVER_LOCKUP_LAYOUT_CONTROLS:
CaseInsertSteamBannerLayoutControl[] = [
  { field: 'scale', label: 'Lockup scale', min: 0.5, max: 1.5, step: 0.01 },
  { field: 'x', label: 'Lockup X position', min: -20, max: 20, step: 0.1 },
  { field: 'y', label: 'Lockup Y position', min: -20, max: 20, step: 0.1 },
]

const SPINE_LOCKUP_LAYOUT_CONTROLS:
CaseInsertSteamBannerLayoutControl[] = [
  { field: 'scale', label: 'Lockup scale', min: 0.5, max: 1.5, step: 0.01 },
  { field: 'x', label: 'Lockup cross position', min: -100, max: 100, step: 0.1 },
  { field: 'y', label: 'Lockup length position', min: -100, max: 100, step: 0.1 },
  { field: 'rotation', label: 'Lockup rotation', min: -180, max: 180, step: 1 },
]

function getLayoutControls(targetKind: CaseInsertSteamBannerTargetKind) {
  return targetKind === 'spine'
    ? SPINE_LOCKUP_LAYOUT_CONTROLS
    : COVER_LOCKUP_LAYOUT_CONTROLS
}

export function CaseInsertSteamBannerControls({
  banner,
  idPrefix,
  targetKind,
  onEnabledChange,
  onLockupUpload,
  onClearLockup,
  onLayoutChange,
  onResetLayout,
  onUseTextFallbackChange,
  onFallbackTextChange,
  onColorChange,
  onResetColors,
}: CaseInsertSteamBannerControlsProps) {
  const lockupStatus = getProjectImageAssetStatus({
    imageDataUrl: banner.lockupImageDataUrl,
    provenance: banner.lockupImageSource,
    fallbackLabel: targetKind === 'spine'
      ? 'Default Steam spine icon'
      : 'Default Steam banner lockup',
  })
  const hasCustomLockupImage = banner.lockupImageSource?.source !== 'built-in'

  return (
    <div className="feature-control-body">
      <label className="field-label">
        <input
          type="checkbox"
          checked={banner.enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
        Show Steam banner
      </label>

      {!banner.enabled ? null : (
        <>
          <label
            className="field-label spacing-top"
            htmlFor={`${idPrefix}-gradient-start`}
          >
            Gradient start
          </label>
          <input
            id={`${idPrefix}-gradient-start`}
            type="color"
            value={banner.colors.gradientStart}
            onChange={(event) =>
              onColorChange('gradientStart', event.target.value)}
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
            value={banner.colors.gradientEnd}
            onChange={(event) =>
              onColorChange('gradientEnd', event.target.value)}
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
            value={banner.colors.accent}
            onChange={(event) => onColorChange('accent', event.target.value)}
          />

          <label className="field-label spacing-top">
            <input
              type="checkbox"
              checked={banner.useTextFallback}
              onChange={(event) =>
                onUseTextFallbackChange(event.target.checked)}
            />
            Use text fallback for lockup
          </label>

          {banner.useTextFallback ? (
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
                value={banner.fallbackText}
                onChange={(event) => onFallbackTextChange(event.target.value)}
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

          {getLayoutControls(targetKind).map((field) => (
            <div key={field.field}>
              <label
                className="field-label spacing-top"
                htmlFor={`${idPrefix}-${field.field}`}
              >
                {field.label}
              </label>
              <input
                id={`${idPrefix}-${field.field}`}
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={banner.lockupLayout[field.field]}
                onInput={(event) =>
                  onLayoutChange(field.field, Number(event.currentTarget.value))}
                onChange={(event) =>
                  onLayoutChange(field.field, Number(event.currentTarget.value))}
              />
            </div>
          ))}

          {!banner.useTextFallback && hasCustomLockupImage ? (
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
