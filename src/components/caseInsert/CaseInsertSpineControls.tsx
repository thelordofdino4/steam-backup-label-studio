import type { ReactNode } from 'react'
import type {
  JewelCaseSpineImageSlotKey,
} from '../../caseInsert/jewelCaseTransitions'
import type { CaseInsertBrandingSourceCatalog } from '../../caseInsert/brandingSlotSources'
import type { JewelCaseSpineSide } from '../../caseInsert/types'
import type { JewelCaseSpineEditorActions } from '../../hooks/useJewelCaseSpineEditor'
import { getProjectImageAssetStatus } from '../../project/projectAssetStatus'
import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextBlock,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseSpineState,
} from '../../project/projectTypes'
import {
  CaseInsertImageSourceControls,
  type CaseInsertImageSourceCatalog,
} from './CaseInsertImageSourceControls'
import { CaseInsertBrandingSourceControls } from './CaseInsertBrandingSourceControls'
import { CaseInsertWorkflowSection } from './CaseInsertWorkflowSection'

export type CaseInsertSpineControlsProps = {
  spine: ProjectJewelCaseSpineState
  actions: JewelCaseSpineEditorActions
  imageSources: CaseInsertImageSourceCatalog
  brandingSources: CaseInsertBrandingSourceCatalog
}

const SPINE_SIDES: Array<{
  side: JewelCaseSpineSide
  label: string
}> = [
  { side: 'left', label: 'Left Spine' },
  { side: 'right', label: 'Right Spine' },
]

const IMAGE_FIT_OPTIONS: Array<{
  value: ProjectCaseInsertImageFit
  label: string
}> = [
  { value: 'cover', label: 'Cover region' },
  { value: 'contain', label: 'Contain full image' },
  { value: 'crop', label: 'Crop with offset' },
  { value: 'scale', label: 'Manual scale' },
]

const TITLE_ORIENTATION_OPTIONS = [
  { value: -90, label: 'Read up' },
  { value: 90, label: 'Read down' },
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

function getTitleOrientationValue(textBlock: ProjectCaseInsertTextBlock) {
  return textBlock.layout.rotation === 90 ? 90 : -90
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

function SpineTitleControls({
  side,
  title,
  actions,
}: {
  side: JewelCaseSpineSide
  title: ProjectCaseInsertTextBlock
  actions: JewelCaseSpineEditorActions
}) {
  const onLayoutChange = (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => actions.handleSpineTitleLayoutChange(side, field, value)

  return (
    <div className="disc-text-control">
      <label className="checkbox-row disc-text-enable-row">
        <input
          type="checkbox"
          checked={title.enabled}
          onChange={(event) =>
            actions.handleSpineTitleEnabledChange(side, event.target.checked)}
        />
        <span>Title text</span>
      </label>

      {!title.enabled ? null : (
        <div className="disc-text-control-body">
          <div className="disc-text-control-group">
            <label className="field-label" htmlFor={`${side}-spine-title`}>
              Text value
            </label>
            <input
              id={`${side}-spine-title`}
              type="text"
              value={title.value}
              onChange={(event) =>
                actions.handleSpineTitleValueChange(side, event.target.value)}
            />
          </div>

          <div className="disc-text-control-group">
            <label
              className="field-label"
              htmlFor={`${side}-spine-title-align`}
            >
              Alignment
            </label>
            <select
              id={`${side}-spine-title-align`}
              value={title.align}
              onChange={(event) =>
                actions.handleSpineTitleAlignChange(
                  side,
                  event.target.value as ProjectCaseInsertTextAlign,
                )}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>

            <label
              className="field-label spacing-top"
              htmlFor={`${side}-spine-title-orientation`}
            >
              Orientation
            </label>
            <select
              id={`${side}-spine-title-orientation`}
              value={getTitleOrientationValue(title)}
              onChange={(event) =>
                actions.handleSpineTitleOrientationChange(
                  side,
                  Number(event.target.value),
                )}
            >
              {TITLE_ORIENTATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="disc-text-control-group">
            <RangeField
              id={`${side}-spine-title-scale`}
              label="Scale"
              min={0.7}
              max={1.6}
              step={0.01}
              value={title.layout.scale}
              onChange={(value) => onLayoutChange('scale', value)}
            />
            <RangeField
              id={`${side}-spine-title-x`}
              label="Cross position"
              min={0}
              max={100}
              step={1}
              value={title.layout.x}
              onChange={(value) => onLayoutChange('x', value)}
            />
            <RangeField
              id={`${side}-spine-title-y`}
              label="Length position"
              min={0}
              max={100}
              step={1}
              value={title.layout.y}
              onChange={(value) => onLayoutChange('y', value)}
            />
          </div>

          <div className="disc-text-control-group disc-text-action-group">
            <button
              className="secondary-button disc-text-reset-button"
              type="button"
              onClick={() => actions.handleResetSpineTitleLayout(side)}
            >
              Reset title text layout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SpineImageSlotControls({
  side,
  slotKey,
  slot,
  title,
  enableLabel,
  uploadId,
  isBackground = false,
  imageSources,
  actions,
}: {
  side: JewelCaseSpineSide
  slotKey: JewelCaseSpineImageSlotKey
  slot: ProjectCaseInsertImageSlot
  title: string
  enableLabel: string
  uploadId: string
  isBackground?: boolean
  imageSources: CaseInsertImageSourceCatalog
  actions: JewelCaseSpineEditorActions
}) {
  const onLayoutChange = (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => actions.handleSpineImageSlotLayoutChange(side, slotKey, field, value)

  return (
    <div className="case-insert-control-card">
      <label className="field-label">
        <input
          type="checkbox"
          checked={slot.enabled}
          onChange={(event) =>
            actions.handleSpineImageSlotEnabledChange(
              side,
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
              actions.handleSpineImageSlotUpload(
                side,
                slotKey,
                slot.label,
                event,
              )}
            onUseSteamArtwork={(asset) =>
              actions.handleUseSpineImageSlotSteamArtwork(
                side,
                slotKey,
                slot.label,
                asset,
              )}
            onUseLocalSteamScreenshot={(asset) =>
              actions.handleUseSpineImageSlotLocalSteamScreenshot(
                side,
                slotKey,
                slot.label,
                asset,
              )}
            onUseWebArtworkCandidate={(candidate) =>
              actions.handleUseSpineImageSlotWebArtwork(
                side,
                slotKey,
                slot.label,
                candidate,
              )}
            allowWebArtwork={isBackground}
          />

          <ImageSlotStatus slot={slot} />

          {isBackground ? (
            <>
              <FitSelect
                id={`${uploadId}-fit`}
                fit={slot.fit}
                onFitChange={(fit) =>
                  actions.handleSpineImageSlotFitChange(side, slotKey, fit)}
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
              <RangeField
                id={`${uploadId}-scale`}
                label="Scale"
                min={0.35}
                max={2}
                step={0.01}
                value={slot.layout.scale}
                onChange={(value) => onLayoutChange('scale', value)}
              />
              <RangeField
                id={`${uploadId}-x`}
                label="Cross position"
                min={0}
                max={100}
                step={1}
                value={slot.layout.x}
                onChange={(value) => onLayoutChange('x', value)}
              />
              <RangeField
                id={`${uploadId}-y`}
                label="Length position"
                min={0}
                max={100}
                step={1}
                value={slot.layout.y}
                onChange={(value) => onLayoutChange('y', value)}
              />
              <RangeField
                id={`${uploadId}-rotation`}
                label="Rotation"
                min={-180}
                max={180}
                step={1}
                value={slot.layout.rotation}
                onChange={(value) => onLayoutChange('rotation', value)}
              />
            </>
          )}

          <div className="button-row spacing-top">
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                actions.handleResetSpineImageSlotLayout(side, slotKey)}
            >
              Reset layout
            </button>
            {slot.imageDataUrl ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  actions.handleClearSpineImageSlot(side, slotKey, slot.label)}
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

function SpineSideSection({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <details className="feature-section-card metadata-details collapsible-panel spacing-top" open>
      <summary className="panel-summary">{label}</summary>
      <div className="panel-content">{children}</div>
    </details>
  )
}

function getSpineSideState(
  spine: ProjectJewelCaseSpineState,
  side: JewelCaseSpineSide,
): ProjectJewelCaseSpineSideState {
  return spine[side]
}

export function CaseInsertSpineArtworkControls({
  spine,
  actions,
  imageSources,
}: CaseInsertSpineControlsProps) {
  return (
    <>
      {SPINE_SIDES.map(({ side, label }) => {
        const state = getSpineSideState(spine, side)

        return (
          <SpineSideSection key={side} label={label}>
            <SpineImageSlotControls
              side={side}
              slotKey="background"
              slot={state.background}
              title={`${label} background`}
              enableLabel="Show spine background artwork"
              uploadId={`${side}-spine-background-upload`}
              isBackground
              imageSources={imageSources}
              actions={actions}
            />
          </SpineSideSection>
        )
      })}
    </>
  )
}

export function CaseInsertSpineBrandingControls({
  spine,
  actions,
  imageSources,
  brandingSources,
}: CaseInsertSpineControlsProps) {
  return (
    <>
      {SPINE_SIDES.map(({ side, label }) => {
        const state = getSpineSideState(spine, side)

        return (
          <SpineSideSection key={side} label={label}>
            <CaseInsertBrandingSourceControls
              brandingSources={brandingSources}
              allowedSlotKeys={['logoSlots']}
              onUseSource={(source) =>
                actions.handleUseSpineBrandingSource(side, source)}
            />
            <SpineImageSlotControls
              side={side}
              slotKey="steamBackupBranding"
              slot={state.steamBackupBranding}
              title={`${label} Steam Backup branding`}
              enableLabel="Show Steam Backup branding"
              uploadId={`${side}-spine-steam-backup-branding-upload`}
              imageSources={imageSources}
              actions={actions}
            />
            <SpineImageSlotControls
              side={side}
              slotKey="logo"
              slot={state.logo}
              title={`${label} company mark`}
              enableLabel="Show company mark"
              uploadId={`${side}-spine-logo-upload`}
              imageSources={imageSources}
              actions={actions}
            />
          </SpineSideSection>
        )
      })}
    </>
  )
}

export function CaseInsertSpineTextControls({
  spine,
  actions,
}: CaseInsertSpineControlsProps) {
  return (
    <>
      {SPINE_SIDES.map(({ side, label }) => {
        const state = getSpineSideState(spine, side)

        return (
          <SpineSideSection key={side} label={label}>
            <SpineTitleControls
              side={side}
              title={state.title}
              actions={actions}
            />
          </SpineSideSection>
        )
      })}
    </>
  )
}

export function CaseInsertSpineWorkflowControls(
  props: CaseInsertSpineControlsProps,
) {
  return (
    <>
      <CaseInsertWorkflowSection title="Artwork" spacingTop={false}>
        <CaseInsertSpineArtworkControls {...props} />
      </CaseInsertWorkflowSection>
      <CaseInsertWorkflowSection title="Branding" variant="branding">
        <CaseInsertSpineBrandingControls {...props} />
      </CaseInsertWorkflowSection>
      <CaseInsertWorkflowSection title="Text">
        <CaseInsertSpineTextControls {...props} />
      </CaseInsertWorkflowSection>
    </>
  )
}
