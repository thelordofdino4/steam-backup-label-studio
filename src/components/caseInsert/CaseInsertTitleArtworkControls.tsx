import type { ChangeEvent } from 'react'
import {
  CASE_INSERT_GAME_LOGO_EMPTY_HINT,
  canRestoreCaseInsertTitleArtworkDefaultSteamLogo,
  canUseCaseInsertTitleArtwork,
  getCaseInsertTitleArtworkDefaultSteamLogo,
  shouldRenderCaseInsertTitleArtwork,
} from '../../caseInsert/titleArtwork'
import type {
  ProjectCaseInsertImageSlot,
} from '../../project/projectTypes'
import type {
  CaseInsertImageLayoutField,
  CaseInsertImageSlotPlacementField,
} from './CaseInsertImageSlotPlacementControls'
import { EditorImageAssetStatusCard } from '../editor/EditorImageAssetStatusCard'
import { EditorRangeField } from '../editor/EditorRangeField'
import { OptionalFeatureSection } from '../editor/OptionalFeatureSection'

export type CaseInsertTitleArtworkPlacementField =
  CaseInsertImageSlotPlacementField

export type CaseInsertTitleArtworkControlsProps = {
  fields: CaseInsertTitleArtworkPlacementField[]
  helpText: string
  onEnabledChange: (enabled: boolean) => void
  onLayoutChange: (
    field: CaseInsertImageLayoutField,
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

  return (
    <OptionalFeatureSection
      className="feature-control-body title-artwork-control case-insert-title-artwork-control"
      enabled={isFeatureEnabled}
      enableLabel="Show game logo"
      onEnabledChange={onEnabledChange}
      actions={(
        <button
          className="secondary-button"
          type="button"
          disabled={!isRenderable}
          onClick={onResetLayout}
        >
          Reset game logo layout
        </button>
      )}
    >
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

      <EditorImageAssetStatusCard
        cardClassName="title-artwork-status-card"
        emptyHint={CASE_INSERT_GAME_LOGO_EMPTY_HINT}
        fallbackLabel={slot.label}
        formatSize={formatImageSize}
        imageDataUrl={slot.imageDataUrl}
        imageSize={slot.imageSize}
        imageSource={slot.imageSource}
        previewClassName="title-artwork-preview"
        statusText="summary"
      />

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
        className="editor-control-grid"
        aria-label="Game logo fine tuning controls"
      >
        {fields.map((field) => (
          <EditorRangeField
            key={field.field}
            id={`${uploadId}-${field.field}`}
            label={field.label}
            min={field.min}
            max={field.max}
            step={field.step}
            value={slot.layout[field.field]}
            disabled={!isRenderable}
            onInput={(value) => onLayoutChange(field.field, value)}
            onChange={(value) => onLayoutChange(field.field, value)}
          />
        ))}
      </div>
    </OptionalFeatureSection>
  )
}
