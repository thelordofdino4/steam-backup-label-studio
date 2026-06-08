import type { ChangeEvent } from 'react'
import {
  CASE_INSERT_GAME_LOGO_EMPTY_HINT,
  canRestoreCaseInsertTitleArtworkDefaultSteamLogo,
  canUseCaseInsertTitleArtwork,
  getCaseInsertTitleArtworkDefaultSteamLogo,
  shouldRenderCaseInsertTitleArtwork,
} from '../../caseInsert/titleArtwork'
import { getProjectImageAssetStatus } from '../../project/projectAssetStatus'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
} from '../../project/projectTypes'
import type {
  CaseInsertImageSlotPlacementField,
} from './CaseInsertImageSlotPlacementControls'

export type CaseInsertTitleArtworkPlacementField =
  CaseInsertImageSlotPlacementField

export type CaseInsertTitleArtworkControlsProps = {
  fields: CaseInsertTitleArtworkPlacementField[]
  helpText: string
  onEnabledChange: (enabled: boolean) => void
  onLayoutChange: (
    field: Exclude<keyof ProjectCaseInsertLayout, 'width'>,
    value: number,
  ) => void
  onResetLayout: () => void
  onRestoreDefault: () => void
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  slot: ProjectCaseInsertImageSlot
  uploadId: string
}

function formatImageSize(size: ProjectCaseInsertImageSlot['imageSize']) {
  return size ? ` · ${size.width} x ${size.height}px` : ''
}

function getImageStatus(slot: ProjectCaseInsertImageSlot) {
  return getProjectImageAssetStatus({
    imageDataUrl: slot.imageDataUrl,
    provenance: slot.imageSource,
    fallbackLabel: slot.label,
  })
}

function RangeField({
  disabled,
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  disabled: boolean
  id: string
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onInput={(event) => onChange(Number(event.currentTarget.value))}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  )
}

export function CaseInsertTitleArtworkControls({
  fields,
  helpText,
  onEnabledChange,
  onLayoutChange,
  onResetLayout,
  onRestoreDefault,
  onUpload,
  slot,
  uploadId,
}: CaseInsertTitleArtworkControlsProps) {
  const hasTitleArtwork = canUseCaseInsertTitleArtwork(slot)
  const isFeatureEnabled = slot.enabled
  const isRenderable = shouldRenderCaseInsertTitleArtwork(slot)
  const defaultSteamLogo = getCaseInsertTitleArtworkDefaultSteamLogo(slot)
  const canRestoreDefaultSteamLogo =
    canRestoreCaseInsertTitleArtworkDefaultSteamLogo(slot)
  const imageStatus = getImageStatus(slot)

  return (
    <div className="feature-control-body title-artwork-control case-insert-title-artwork-control">
      <label className="field-label">
        <input
          type="checkbox"
          checked={isFeatureEnabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
        Show game logo
      </label>

      {!isFeatureEnabled ? null : (
        <>
          <span className="field-label spacing-top">Game logo image</span>
          <label
            className="secondary-button logo-upload-button"
            htmlFor={uploadId}
          >
            {hasTitleArtwork ? 'Replace game logo image' : 'Choose game logo image'}
          </label>
          <input
            id={uploadId}
            className="logo-file-input"
            type="file"
            accept="image/*"
            onChange={onUpload}
          />

          {hasTitleArtwork ? (
            <div className="selected-lockup-card logo-asset-status-card title-artwork-status-card">
              <img
                className="logo-asset-preview title-artwork-preview"
                src={slot.imageDataUrl ?? undefined}
                alt=""
                draggable={false}
              />
              <span>{imageStatus.summary}{formatImageSize(slot.imageSize)}</span>
            </div>
          ) : (
            <p className="hint">{CASE_INSERT_GAME_LOGO_EMPTY_HINT}</p>
          )}

          {canRestoreDefaultSteamLogo ? (
            <button
              className="secondary-button"
              type="button"
              onClick={onRestoreDefault}
            >
              Restore Steam default game logo
            </button>
          ) : null}

          {defaultSteamLogo ? (
            <p className="hint">Steam default: {defaultSteamLogo.sourceLabel}.</p>
          ) : null}

          <p className="hint">{helpText}</p>

          <div
            className="disc-text-layout-grid"
            aria-label="Game logo fine tuning controls"
          >
            {fields.map((field) => (
              <RangeField
                key={field.field}
                id={`${uploadId}-${field.field}`}
                label={field.label}
                min={field.min}
                max={field.max}
                step={field.step}
                value={slot.layout[field.field]}
                disabled={!isRenderable}
                onChange={(value) => onLayoutChange(field.field, value)}
              />
            ))}
          </div>

          <button
            className="secondary-button"
            type="button"
            disabled={!isRenderable}
            onClick={onResetLayout}
          >
            Reset game logo layout
          </button>
        </>
      )}
    </div>
  )
}
