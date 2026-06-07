import type { ReactNode } from 'react'
import type {
  JewelCaseSpineImageSlotKey,
  JewelCaseSpineImageSlotGroupKey,
} from '../../caseInsert/jewelCaseTransitions'
import {
  CASE_INSERT_ARTWORK_SECTION_LABELS,
} from '../../caseInsert/artworkPanelSections'
import {
  createJewelCasePreviewLayout,
} from '../../layout/caseInsertPreviewLayout'
import type {
  CaseInsertLayoutSliderRanges,
} from '../../layout/caseInsertElementSafeZone'
import {
  getJewelCaseSpineBackgroundLayoutSliderRanges,
  getJewelCaseSpineImageSlotLayoutSliderRanges,
  type JewelCaseSpineOverlayRole,
} from '../../layout/jewelCaseSpineLayout'
import type { CaseInsertBrandingSourceCatalog } from '../../caseInsert/brandingSlotSources'
import type { JewelCaseSpineSide } from '../../caseInsert/types'
import type { JewelCaseSpineEditorActions } from '../../hooks/useJewelCaseSpineEditor'
import type { LogoCandidateDiscoveryState } from '../../hooks/useLogoAssetDiscovery'
import { getProjectImageAssetStatus } from '../../project/projectAssetStatus'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextBlock,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseSpineState,
} from '../../project/projectTypes'
import type { LogoAssetKey } from '../../project/projectLogoAssets'
import {
  CaseInsertImageSourceControls,
  type CaseInsertImageSourceControlSource,
  type CaseInsertImageSourceCatalog,
} from './CaseInsertImageSourceControls'
import {
  CaseInsertImageSlotPlacementControls,
  type CaseInsertImageSlotPlacementField,
} from './CaseInsertImageSlotPlacementControls'
import { CaseInsertImageSlotFrameControls } from './CaseInsertImageSlotFrameControls'
import { CaseInsertImageSlotStatusCard } from './CaseInsertImageSlotStatusCard'
import {
  CaseInsertTitleArtworkControls,
  type CaseInsertTitleArtworkPlacementField,
} from './CaseInsertTitleArtworkControls'
import { CaseInsertBrandingSourceControls } from './CaseInsertBrandingSourceControls'
import type {
  CaseInsertBrandingSetupControlsProps,
} from './CaseInsertBrandingSetupControls'
import { CaseInsertLogoCandidateControls } from './CaseInsertLogoCandidateControls'
import { CaseInsertWorkflowSection } from './CaseInsertWorkflowSection'
import { PlusIcon } from '../sidebar/PanelIcons'
import { RepeatedVisualElementCard } from '../sidebar/RepeatedVisualElementCard'

export type CaseInsertSpineControlsProps = {
  spine: ProjectJewelCaseSpineState
  actions: JewelCaseSpineEditorActions
  imageSources: CaseInsertImageSourceCatalog
  brandingSources: CaseInsertBrandingSourceCatalog
  brandingControls: CaseInsertBrandingSetupControlsProps
  logoCandidateDiscovery: LogoCandidateDiscoveryState
  handleFindLogoCandidates: (logoKey: LogoAssetKey) => void | Promise<void>
}

const SPINE_SIDES: Array<{
  side: JewelCaseSpineSide
  label: string
}> = [
  { side: 'left', label: 'Left Spine' },
  { side: 'right', label: 'Right Spine' },
]

const TITLE_ORIENTATION_OPTIONS = [
  { value: -90, label: 'Read up' },
  { value: 90, label: 'Read down' },
] as const

const SPINE_BACKGROUND_PLACEMENT_FIELDS: CaseInsertImageSlotPlacementField[] = [
  { field: 'scale', label: 'Scale', min: 0.01, max: 4, step: 0.01 },
  { field: 'x', label: 'X', min: -100, max: 100, step: 0.1 },
  { field: 'y', label: 'Y', min: -100, max: 100, step: 0.1 },
]

const SPINE_OVERLAY_PLACEMENT_FIELDS: CaseInsertImageSlotPlacementField[] = [
  { field: 'scale', label: 'Scale', min: 0.35, max: 2, step: 0.01 },
  { field: 'x', label: 'Cross', min: 0, max: 100, step: 0.1 },
  { field: 'y', label: 'Length', min: 0, max: 100, step: 0.1 },
  { field: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1 },
]

const SPINE_TITLE_ARTWORK_PLACEMENT_FIELDS:
CaseInsertTitleArtworkPlacementField[] = [
  { field: 'scale', label: 'Scale', min: 0.35, max: 5, step: 0.01 },
  { field: 'x', label: 'Cross', min: 0, max: 100, step: 0.1 },
  { field: 'y', label: 'Length', min: 0, max: 100, step: 0.1 },
  { field: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1 },
]

function applyLayoutSliderRanges<
  T extends {
    field: keyof ProjectCaseInsertLayout
    max: number
    min: number
  },
>(fields: T[], ranges: CaseInsertLayoutSliderRanges): T[] {
  return fields.map((field) => {
    if (field.field !== 'x' && field.field !== 'y') {
      return field
    }

    return {
      ...field,
      min: ranges[field.field].min,
      max: ranges[field.field].max,
    }
  })
}

function getSpinePreviewLayout() {
  return createJewelCasePreviewLayout('jewelCase', 'back')
}

function getSpineImageSlotPlacementFields(
  side: JewelCaseSpineSide,
  slot: ProjectCaseInsertImageSlot,
  role: JewelCaseSpineOverlayRole | 'background',
) {
  const layout = getSpinePreviewLayout()
  const fields = role === 'titleArtwork'
    ? SPINE_TITLE_ARTWORK_PLACEMENT_FIELDS
    : role === 'background'
      ? SPINE_BACKGROUND_PLACEMENT_FIELDS
      : SPINE_OVERLAY_PLACEMENT_FIELDS
  const ranges = role === 'background'
    ? getJewelCaseSpineBackgroundLayoutSliderRanges(side, slot, layout)
    : getJewelCaseSpineImageSlotLayoutSliderRanges(side, slot, layout, role)

  return applyLayoutSliderRanges(fields, ranges)
}

function getSpinePrimaryImageSlotRole(
  slotKey: JewelCaseSpineImageSlotKey,
): JewelCaseSpineOverlayRole | 'background' {
  switch (slotKey) {
    case 'background':
      return 'background'
    case 'titleArtwork':
      return 'titleArtwork'
    case 'steamBackupBranding':
      return 'branding'
    case 'logo':
      return 'logo'
  }
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
  beforeSourceControls,
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
  beforeSourceControls?: ReactNode
  isBackground?: boolean
  imageSources: CaseInsertImageSourceCatalog
  actions: JewelCaseSpineEditorActions
}) {
  const onLayoutChange = (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => actions.handleSpineImageSlotLayoutChange(side, slotKey, field, value)
  const renderFineTuneControls = (
    source: CaseInsertImageSourceControlSource,
    sectionLabel: string,
  ) => (
    <CaseInsertImageSlotPlacementControls
      featureEnabled={slot.enabled}
      fields={getSpineImageSlotPlacementFields(
        side,
        slot,
        getSpinePrimaryImageSlotRole(slotKey),
      )}
      onFitToRegion={() =>
        actions.handleFitSpineImageSlotToRegion(side, slotKey, slot.label)}
      onLayoutChange={onLayoutChange}
      onResetLayout={() =>
        actions.handleResetSpineImageSlotLayout(side, slotKey)}
      onClearImage={() =>
        actions.handleClearSpineImageSlot(side, slotKey, slot.label)}
      sectionLabel={sectionLabel}
      showFitButton={isBackground}
      uploadId={uploadId}
      slot={slot}
      source={source}
    />
  )
  const shouldShowSources = isBackground || slot.enabled
  const allowSharedArtworkSources = isBackground || slotKey === 'titleArtwork'
  const className = isBackground
    ? 'logo-asset-card artwork-feature-card case-insert-primary-slot-control case-insert-background-control'
    : 'feature-control-body case-insert-primary-slot-control'
  const imageStatus = getImageStatus(slot)

  return (
    <div className={className}>
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

      {isBackground ? (
        <p className="hint">
          Current background: {imageStatus.summary}. {imageStatus.availabilityLabel}
          {!slot.enabled ? ' Background art is hidden from preview and export.' : ''}
        </p>
      ) : null}

      {shouldShowSources ? (
        <>
          {beforeSourceControls}
          <CaseInsertImageSourceControls
            {...imageSources}
            uploadId={uploadId}
            title={title}
            hasImage={Boolean(slot.imageDataUrl)}
            imageSource={slot.imageSource}
            allowSteamArtwork={allowSharedArtworkSources}
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
            allowWebArtwork={allowSharedArtworkSources}
            allowLocalSteamScreenshots={allowSharedArtworkSources}
            renderFineTuneControls={renderFineTuneControls}
          />
        </>
      ) : null}
    </div>
  )
}

function SpineGroupedImageSlotControls({
  side,
  slotKey,
  slot,
  uploadId,
  imageSources,
  actions,
}: {
  side: JewelCaseSpineSide
  slotKey: JewelCaseSpineImageSlotGroupKey
  slot: ProjectCaseInsertImageSlot
  uploadId: string
  imageSources: CaseInsertImageSourceCatalog
  actions: JewelCaseSpineEditorActions
}) {
  const onLayoutChange = (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => actions.handleSpineGroupedImageSlotLayoutChange(
    side,
    slotKey,
    slot.id,
    field,
    value,
  )
  const renderFineTuneControls = (
    source: CaseInsertImageSourceControlSource,
    sectionLabel: string,
  ) => (
    <CaseInsertImageSlotPlacementControls
      featureEnabled={slot.enabled}
      fields={getSpineImageSlotPlacementFields(side, slot, 'artwork')}
      onLayoutChange={onLayoutChange}
      onResetLayout={() =>
        actions.handleResetSpineGroupedImageSlotLayout(
          side,
          slotKey,
          slot.id,
        )}
      onClearImage={() =>
        actions.handleClearSpineGroupedImageSlot(
          side,
          slotKey,
          slot.id,
          slotTitle,
        )}
      sectionLabel={sectionLabel}
      uploadId={uploadId}
      slot={slot}
      source={source}
    />
  )
  const slotTitle = slot.label.trim() || 'Spine artwork'
  const slotImageStatus = getImageStatus(slot)
  const summary = [
    slot.enabled ? 'shown' : 'hidden',
    slot.imageDataUrl ? slotImageStatus.summary : 'no image',
    slot.frame.enabled ? `${slot.frame.shape} frame` : 'no frame',
    `fit ${slot.fit}`,
    `scale ${slot.layout.scale.toFixed(2)}`,
  ].join(' · ')

  return (
    <RepeatedVisualElementCard
      title={slotTitle}
      label={slot.label}
      labelInputId={`${uploadId}-label`}
      enabled={slot.enabled}
      enableLabel={`Show ${slotTitle.toLocaleLowerCase()}`}
      summary={summary}
      deleteLabel={`Delete ${slotTitle.toLocaleLowerCase()}`}
      onEnabledChange={(enabled) =>
        actions.handleSpineGroupedImageSlotEnabledChange(
          side,
          slotKey,
          slot.id,
          enabled,
        )}
      onLabelChange={(label) =>
        actions.handleSpineGroupedImageSlotLabelChange(
          side,
          slotKey,
          slot.id,
          label,
        )}
      onDelete={() =>
        actions.handleRemoveSpineGroupedImageSlot(side, slotKey, slot.id)}
    >
      <CaseInsertImageSourceControls
        {...imageSources}
        uploadId={uploadId}
        title={slotTitle}
        hasImage={Boolean(slot.imageDataUrl)}
        imageSource={slot.imageSource}
        onUpload={(event) =>
          actions.handleSpineGroupedImageSlotUpload(
            side,
            slotKey,
            slot.id,
            slotTitle,
            event,
          )}
        onUseSteamArtwork={(asset) =>
          actions.handleUseSpineGroupedImageSlotSteamArtwork(
            side,
            slotKey,
            slot.id,
            slotTitle,
            asset,
          )}
        onUseLocalSteamScreenshot={(asset) =>
          actions.handleUseSpineGroupedImageSlotLocalSteamScreenshot(
            side,
            slotKey,
            slot.id,
            slotTitle,
            asset,
          )}
        onUseWebArtworkCandidate={(candidate) =>
          actions.handleUseSpineGroupedImageSlotWebArtwork(
            side,
            slotKey,
            slot.id,
            slotTitle,
            candidate,
          )}
        renderFineTuneControls={renderFineTuneControls}
      />
      <CaseInsertImageSlotStatusCard
        slot={slot}
        emptyHint="No image is selected yet. Upload a local image or use an imported artwork source."
      />
      <CaseInsertImageSlotFrameControls
        idPrefix={uploadId}
        slot={slot}
        onFrameChange={(field, value) =>
          actions.handleSpineGroupedImageSlotFrameChange(
            side,
            slotKey,
            slot.id,
            field,
            value,
          )}
        onResetFrame={() =>
          actions.handleResetSpineGroupedImageSlotFrame(
            side,
            slotKey,
            slot.id,
          )}
      />
    </RepeatedVisualElementCard>
  )
}

function SpineGroupedImageSlotSection({
  side,
  featureEnabled,
  slots,
  imageSources,
  actions,
}: {
  side: JewelCaseSpineSide
  featureEnabled: boolean
  slots: ProjectCaseInsertImageSlot[]
  imageSources: CaseInsertImageSourceCatalog
  actions: JewelCaseSpineEditorActions
}) {
  return (
    <details className="feature-section-card metadata-details collapsible-panel spacing-top">
      <summary className="panel-summary">
        {CASE_INSERT_ARTWORK_SECTION_LABELS.additionalArtwork}
      </summary>
      <div className="panel-content">
        <div className="feature-control-body additional-artwork-control">
          <label className="field-label">
            <input
              type="checkbox"
              checked={featureEnabled}
              onChange={(event) =>
                actions.handleSpineAdditionalArtworkEnabledChange(
                  side,
                  event.target.checked,
                )}
            />
            Show additional artwork
          </label>

          {featureEnabled ? (
            <>
              {slots.length === 0 ? (
                <p className="hint">No additional artwork slots.</p>
              ) : null}
              {slots.map((slot, index) => (
                <SpineGroupedImageSlotControls
                  key={slot.id}
                  side={side}
                  slotKey="artworkSlots"
                  slot={slot}
                  uploadId={`${side}-spine-artwork-${slot.id}-${index + 1}-upload`}
                  imageSources={imageSources}
                  actions={actions}
                />
              ))}
              <button
                className="secondary-button icon-text-button spacing-top"
                type="button"
                onClick={() =>
                  actions.handleAddSpineGroupedImageSlot(side, 'artworkSlots')}
              >
                <PlusIcon />
                <span>Add artwork slot</span>
              </button>
            </>
          ) : null}
        </div>
      </div>
    </details>
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
    <details className="feature-section-card metadata-details collapsible-panel spacing-top case-insert-spine-side-section">
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
            <details className="feature-section-card metadata-details collapsible-panel spacing-top">
              <summary className="panel-summary">
                {CASE_INSERT_ARTWORK_SECTION_LABELS.gameLogo}
              </summary>
              <div className="panel-content">
                <CaseInsertTitleArtworkControls
                  slot={state.titleArtwork}
                  uploadId={`${side}-spine-title-artwork-upload`}
                  fields={getSpineImageSlotPlacementFields(
                    side,
                    state.titleArtwork,
                    'titleArtwork',
                  )}
                  helpText="This is the game title/logo artwork on the spine. Steam import can seed the Steam CDN logo when available; spine title text stays independently available in the Text tab."
                  onEnabledChange={(enabled) =>
                    actions.handleSpineImageSlotEnabledChange(
                      side,
                      'titleArtwork',
                      enabled,
                    )}
                  onUpload={(event) =>
                    actions.handleSpineImageSlotUpload(
                      side,
                      'titleArtwork',
                      state.titleArtwork.label,
                      event,
                    )}
                  onLayoutChange={(field, value) =>
                    actions.handleSpineImageSlotLayoutChange(
                      side,
                      'titleArtwork',
                      field,
                      value,
                    )}
                  onResetLayout={() =>
                    actions.handleResetSpineImageSlotLayout(side, 'titleArtwork')}
                  onRestoreDefault={() =>
                    actions.handleRestoreSpineTitleArtworkDefault(side)}
                />
              </div>
            </details>
            <SpineGroupedImageSlotSection
              side={side}
              featureEnabled={state.additionalArtworkEnabled}
              slots={state.artworkSlots}
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
  logoCandidateDiscovery,
  handleFindLogoCandidates,
}: CaseInsertSpineControlsProps) {
  return (
    <>
      {SPINE_SIDES.map(({ side, label }) => {
        const state = getSpineSideState(spine, side)

        return (
          <SpineSideSection key={side} label={label}>
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
              beforeSourceControls={
                <>
                  <CaseInsertLogoCandidateControls
                    logoCandidateDiscovery={logoCandidateDiscovery}
                    handleFindLogoCandidates={handleFindLogoCandidates}
                    onUseLogoCandidate={(logoKey, candidate) =>
                      actions.handleUseSpineLogoCandidate(
                        side,
                        logoKey,
                        candidate,
                      )}
                  />
                  <CaseInsertBrandingSourceControls
                    brandingSources={brandingSources}
                    allowedSlotKeys={['logoSlots']}
                    onUseSource={(source) =>
                      actions.handleUseSpineBrandingSource(side, source)}
                  />
                </>
              }
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
