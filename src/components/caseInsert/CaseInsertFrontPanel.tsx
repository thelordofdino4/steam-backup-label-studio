import type {
  JewelCaseFrontImageSlotKey,
  JewelCaseFrontRepeatedImageSlotKey,
} from '../../caseInsert/frontCoverTransitions'
import type { JewelCaseFrontEditorActions } from '../../hooks/useJewelCaseFrontEditor'
import { getProjectImageAssetStatus } from '../../project/projectAssetStatus'
import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextBlock,
  ProjectJewelCaseFrontState,
} from '../../project/projectTypes'
import { PlusIcon } from '../sidebar/PanelIcons'
import {
  CaseInsertImageSourceControls,
  type CaseInsertImageSourceCatalog,
} from './CaseInsertImageSourceControls'

export type CaseInsertFrontPanelProps = {
  front: ProjectJewelCaseFrontState
  actions: JewelCaseFrontEditorActions
  imageSources: CaseInsertImageSourceCatalog
}

const IMAGE_FIT_OPTIONS: Array<{
  value: ProjectCaseInsertImageFit
  label: string
}> = [
  { value: 'cover', label: 'Cover region' },
  { value: 'contain', label: 'Contain full image' },
  { value: 'crop', label: 'Crop with offset' },
  { value: 'scale', label: 'Manual scale' },
]

const OVERLAY_POSITION_PRESETS = [
  { label: 'Top left', x: 20, y: 18 },
  { label: 'Top center', x: 50, y: 18 },
  { label: 'Top right', x: 80, y: 18 },
  { label: 'Center', x: 50, y: 50 },
  { label: 'Bottom left', x: 20, y: 84 },
  { label: 'Bottom center', x: 50, y: 84 },
  { label: 'Bottom right', x: 80, y: 84 },
] as const

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

function ImageSlotStatus({ slot }: { slot: ProjectCaseInsertImageSlot }) {
  if (!slot.imageDataUrl) {
    return <p className="hint">No image selected yet.</p>
  }

  const imageStatus = getImageStatus(slot)

  return (
    <div className="selected-lockup-card case-insert-image-status-card">
      <img src={slot.imageDataUrl} alt="" draggable={false} />
      <span>{imageStatus.summary}{formatImageSize(slot.imageSize)}</span>
    </div>
  )
}

function FitSelect({
  id,
  fit,
  onFitChange,
}: {
  id: string
  fit: ProjectCaseInsertImageFit
  onFitChange: (fit: ProjectCaseInsertImageFit) => void
}) {
  return (
    <>
      <label className="field-label spacing-top" htmlFor={id}>Image fit</label>
      <select
        id={id}
        value={fit}
        onChange={(event) =>
          onFitChange(event.target.value as ProjectCaseInsertImageFit)}
      >
        {IMAGE_FIT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  )
}

function RangeField({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <>
      <label className="field-label spacing-top" htmlFor={id}>
        {label}
        <span>{Number(value).toFixed(step < 1 ? 2 : 0)}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </>
  )
}

function OverlayPositionPreset({
  id,
  onLayoutChange,
}: {
  id: string
  onLayoutChange: (field: keyof ProjectCaseInsertLayout, value: number) => void
}) {
  return (
    <>
      <label className="field-label spacing-top" htmlFor={id}>Placement</label>
      <select
        id={id}
        defaultValue=""
        onChange={(event) => {
          const preset = OVERLAY_POSITION_PRESETS.find(
            (candidate) => candidate.label === event.target.value,
          )

          if (!preset) {
            return
          }

          onLayoutChange('x', preset.x)
          onLayoutChange('y', preset.y)
          event.currentTarget.value = ''
        }}
      >
        <option value="">Choose preset...</option>
        {OVERLAY_POSITION_PRESETS.map((preset) => (
          <option key={preset.label} value={preset.label}>
            {preset.label}
          </option>
        ))}
      </select>
    </>
  )
}

function FrontImageSlotControls({
  slotKey,
  slot,
  title,
  enableLabel,
  uploadId,
  isBackground = false,
  imageSources,
  actions,
}: {
  slotKey: JewelCaseFrontImageSlotKey
  slot: ProjectCaseInsertImageSlot
  title: string
  enableLabel: string
  uploadId: string
  isBackground?: boolean
  imageSources: CaseInsertImageSourceCatalog
  actions: JewelCaseFrontEditorActions
}) {
  const onLayoutChange = (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => actions.handleFrontImageSlotLayoutChange(slotKey, field, value)

  return (
    <div className="case-insert-control-card">
      <label className="field-label">
        <input
          type="checkbox"
          checked={slot.enabled}
          onChange={(event) =>
            actions.handleFrontImageSlotEnabledChange(
              slotKey,
              event.target.checked,
            )}
        />
        {enableLabel}
      </label>

      {!slot.enabled ? null : (
        <>
          <CaseInsertImageSourceControls
            {...imageSources}
            uploadId={uploadId}
            title={title}
            hasImage={Boolean(slot.imageDataUrl)}
            imageSource={slot.imageSource}
            onUpload={(event) =>
              actions.handleFrontImageSlotUpload(slotKey, event)}
            onUseSteamArtwork={(asset) =>
              actions.handleUseFrontImageSlotSteamArtwork(slotKey, asset)}
            onUseLocalSteamScreenshot={(asset) =>
              actions.handleUseFrontImageSlotLocalSteamScreenshot(
                slotKey,
                asset,
              )}
          />

          <ImageSlotStatus slot={slot} />

          {isBackground ? (
            <>
              <FitSelect
                id={`${uploadId}-fit`}
                fit={slot.fit}
                onFitChange={(fit) =>
                  actions.handleFrontImageSlotFitChange(slotKey, fit)}
              />
              {slot.fit === 'crop' || slot.fit === 'scale' ? (
                <RangeField
                  id={`${uploadId}-scale`}
                  label="Scale"
                  min={0.5}
                  max={2.5}
                  step={0.01}
                  value={slot.layout.scale}
                  onChange={(value) => onLayoutChange('scale', value)}
                />
              ) : null}
              {slot.fit === 'crop' ? (
                <>
                  <RangeField
                    id={`${uploadId}-crop-x`}
                    label="Crop X"
                    min={-100}
                    max={100}
                    step={1}
                    value={slot.layout.x}
                    onChange={(value) => onLayoutChange('x', value)}
                  />
                  <RangeField
                    id={`${uploadId}-crop-y`}
                    label="Crop Y"
                    min={-100}
                    max={100}
                    step={1}
                    value={slot.layout.y}
                    onChange={(value) => onLayoutChange('y', value)}
                  />
                </>
              ) : null}
            </>
          ) : (
            <>
              <OverlayPositionPreset
                id={`${uploadId}-placement`}
                onLayoutChange={onLayoutChange}
              />
              <RangeField
                id={`${uploadId}-scale`}
                label="Scale"
                min={0.25}
                max={2.5}
                step={0.01}
                value={slot.layout.scale}
                onChange={(value) => onLayoutChange('scale', value)}
              />
              <RangeField
                id={`${uploadId}-x`}
                label="X position"
                min={0}
                max={100}
                step={1}
                value={slot.layout.x}
                onChange={(value) => onLayoutChange('x', value)}
              />
              <RangeField
                id={`${uploadId}-y`}
                label="Y position"
                min={0}
                max={100}
                step={1}
                value={slot.layout.y}
                onChange={(value) => onLayoutChange('y', value)}
              />
            </>
          )}

          <div className="button-row spacing-top">
            <button
              className="secondary-button"
              type="button"
              onClick={() => actions.handleResetFrontImageSlotLayout(slotKey)}
            >
              Reset layout
            </button>
            {slot.imageDataUrl ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() => actions.handleClearFrontImageSlot(slotKey)}
              >
                Clear image
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

function RepeatedImageSlotControls({
  slotKey,
  slot,
  uploadId,
  imageSources,
  actions,
}: {
  slotKey: JewelCaseFrontRepeatedImageSlotKey
  slot: ProjectCaseInsertImageSlot
  uploadId: string
  imageSources: CaseInsertImageSourceCatalog
  actions: JewelCaseFrontEditorActions
}) {
  const onLayoutChange = (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => actions.handleFrontRepeatedImageSlotLayoutChange(
    slotKey,
    slot.id,
    field,
    value,
  )

  return (
    <div className="case-insert-control-card">
      <label className="field-label">
        <input
          type="checkbox"
          checked={slot.enabled}
          onChange={(event) =>
            actions.handleFrontRepeatedImageSlotEnabledChange(
              slotKey,
              slot.id,
              event.target.checked,
            )}
        />
        Show {slot.label}
      </label>

      {!slot.enabled ? null : (
        <>
          <label className="field-label spacing-top" htmlFor={`${uploadId}-label`}>
            Label
          </label>
          <input
            id={`${uploadId}-label`}
            type="text"
            value={slot.label}
            onChange={(event) =>
              actions.handleFrontRepeatedImageSlotLabelChange(
                slotKey,
                slot.id,
                event.target.value,
              )}
          />

          <CaseInsertImageSourceControls
            {...imageSources}
            uploadId={uploadId}
            title={slot.label}
            hasImage={Boolean(slot.imageDataUrl)}
            imageSource={slot.imageSource}
            onUpload={(event) =>
              actions.handleFrontRepeatedImageSlotUpload(
                slotKey,
                slot.id,
                event,
              )}
            onUseSteamArtwork={(asset) =>
              actions.handleUseFrontRepeatedImageSlotSteamArtwork(
                slotKey,
                slot.id,
                asset,
              )}
            onUseLocalSteamScreenshot={(asset) =>
              actions.handleUseFrontRepeatedImageSlotLocalSteamScreenshot(
                slotKey,
                slot.id,
                asset,
              )}
          />

          <ImageSlotStatus slot={slot} />

          <OverlayPositionPreset
            id={`${uploadId}-placement`}
            onLayoutChange={onLayoutChange}
          />
          <RangeField
            id={`${uploadId}-scale`}
            label="Scale"
            min={0.25}
            max={2.5}
            step={0.01}
            value={slot.layout.scale}
            onChange={(value) => onLayoutChange('scale', value)}
          />
          <RangeField
            id={`${uploadId}-x`}
            label="X position"
            min={0}
            max={100}
            step={1}
            value={slot.layout.x}
            onChange={(value) => onLayoutChange('x', value)}
          />
          <RangeField
            id={`${uploadId}-y`}
            label="Y position"
            min={0}
            max={100}
            step={1}
            value={slot.layout.y}
            onChange={(value) => onLayoutChange('y', value)}
          />

          <div className="button-row spacing-top">
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                actions.handleResetFrontRepeatedImageSlotLayout(
                  slotKey,
                  slot.id,
                )}
            >
              Reset layout
            </button>
            {slot.imageDataUrl ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  actions.handleClearFrontRepeatedImageSlot(slotKey, slot.id)}
              >
                Clear image
              </button>
            ) : null}
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                actions.handleRemoveFrontRepeatedImageSlot(slotKey, slot.id)}
            >
              Delete slot
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function RepeatedImageSlotSection({
  title,
  emptyHint,
  addLabel,
  slotKey,
  slots,
  imageSources,
  actions,
}: {
  title: string
  emptyHint: string
  addLabel: string
  slotKey: JewelCaseFrontRepeatedImageSlotKey
  slots: ProjectCaseInsertImageSlot[]
  imageSources: CaseInsertImageSourceCatalog
  actions: JewelCaseFrontEditorActions
}) {
  return (
    <details className="feature-section-card metadata-details collapsible-panel spacing-top">
      <summary className="panel-summary">{title}</summary>
      <div className="panel-content">
        {slots.length === 0 ? <p className="hint">{emptyHint}</p> : null}
        {slots.map((slot, index) => (
          <RepeatedImageSlotControls
            key={slot.id}
            slotKey={slotKey}
            slot={slot}
            uploadId={`${slotKey}-${index + 1}-upload`}
            imageSources={imageSources}
            actions={actions}
          />
        ))}
        <button
          className="secondary-button icon-text-button spacing-top"
          type="button"
          onClick={() => actions.handleAddFrontRepeatedImageSlot(slotKey)}
        >
          <PlusIcon />
          <span>{addLabel}</span>
        </button>
      </div>
    </details>
  )
}

function CalloutTextControls({
  textBlock,
  actions,
}: {
  textBlock: ProjectCaseInsertTextBlock
  actions: JewelCaseFrontEditorActions
}) {
  const onLayoutChange = (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => actions.handleFrontCalloutTextLayoutChange(field, value)

  return (
    <div className="case-insert-control-card">
      <label className="field-label">
        <input
          type="checkbox"
          checked={textBlock.enabled}
          onChange={(event) =>
            actions.handleFrontCalloutTextEnabledChange(event.target.checked)}
        />
        Show callout text
      </label>

      {!textBlock.enabled ? null : (
        <>
          <label className="field-label spacing-top" htmlFor="front-callout-value">
            Callout text
          </label>
          <textarea
            id="front-callout-value"
            rows={3}
            value={textBlock.value}
            onChange={(event) =>
              actions.handleFrontCalloutTextValueChange(event.target.value)}
          />

          <label className="field-label spacing-top" htmlFor="front-callout-align">
            Alignment
          </label>
          <select
            id="front-callout-align"
            value={textBlock.align}
            onChange={(event) =>
              actions.handleFrontCalloutTextAlignChange(
                event.target.value as ProjectCaseInsertTextAlign,
              )}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>

          <OverlayPositionPreset
            id="front-callout-placement"
            onLayoutChange={onLayoutChange}
          />
          <RangeField
            id="front-callout-scale"
            label="Scale"
            min={0.7}
            max={1.8}
            step={0.01}
            value={textBlock.layout.scale}
            onChange={(value) => onLayoutChange('scale', value)}
          />
          <RangeField
            id="front-callout-x"
            label="X position"
            min={0}
            max={100}
            step={1}
            value={textBlock.layout.x}
            onChange={(value) => onLayoutChange('x', value)}
          />
          <RangeField
            id="front-callout-y"
            label="Y position"
            min={0}
            max={100}
            step={1}
            value={textBlock.layout.y}
            onChange={(value) => onLayoutChange('y', value)}
          />

          <button
            className="secondary-button spacing-top"
            type="button"
            onClick={actions.handleResetFrontCalloutTextLayout}
          >
            Reset layout
          </button>
        </>
      )}
    </div>
  )
}

export function CaseInsertFrontPanel({
  front,
  actions,
  imageSources,
}: CaseInsertFrontPanelProps) {
  return (
    <details className="panel collapsible-panel" open>
      <summary className="panel-summary">Front Cover</summary>
      <div className="panel-content">
        <FrontImageSlotControls
          slotKey="background"
          slot={front.background}
          title="front background"
          enableLabel="Show front background artwork"
          uploadId="front-background-upload"
          isBackground
          imageSources={imageSources}
          actions={actions}
        />

        <FrontImageSlotControls
          slotKey="titleArtwork"
          slot={front.titleArtwork}
          title="front title/logo artwork"
          enableLabel="Show front title/logo artwork"
          uploadId="front-title-artwork-upload"
          imageSources={imageSources}
          actions={actions}
        />

        <FrontImageSlotControls
          slotKey="calloutArtwork"
          slot={front.calloutArtwork}
          title="front callout artwork"
          enableLabel="Show front callout artwork"
          uploadId="front-callout-artwork-upload"
          imageSources={imageSources}
          actions={actions}
        />

        <RepeatedImageSlotSection
          title="Front Logos"
          emptyHint="Add developer, publisher, studio, or distributor logos for the front cover."
          addLabel="Add front logo"
          slotKey="logoSlots"
          slots={front.logoSlots}
          imageSources={imageSources}
          actions={actions}
        />

        <RepeatedImageSlotSection
          title="Front Marks"
          emptyHint="Add rating, media, platform, or technology marks for the front cover."
          addLabel="Add front mark"
          slotKey="markSlots"
          slots={front.markSlots}
          imageSources={imageSources}
          actions={actions}
        />

        <details className="feature-section-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">Front Callout Text</summary>
          <div className="panel-content">
            <CalloutTextControls
              textBlock={front.calloutText}
              actions={actions}
            />
          </div>
        </details>
      </div>
    </details>
  )
}
