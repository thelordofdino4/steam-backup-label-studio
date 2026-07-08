import type {
  CaseInsertImageSlotGroupKey,
  CaseInsertTemplatePaneId,
} from '../../caseInsert/templateSurfaces'
import {
  getCaseInsertAdditionalLogoKey,
} from '../../caseInsert/brandingLogoSlots'
import {
  createRepeatedArtworkSummary,
} from '../../editor/repeatedArtwork'
import type { CaseInsertTemplateEditorActions } from '../../hooks/useCaseInsertTemplateEditor'
import { getProjectImageAssetStatus } from '../../project/projectAssetStatus'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
} from '../../project/projectTypes'
import { EditorArtworkFrameControls } from '../editor/EditorArtworkFrameControls'
import { EditorFeaturePanel } from '../editor/EditorPanel'
import { OptionalFeatureSection } from '../editor/OptionalFeatureSection'
import { PlusIcon } from '../sidebar/PanelIcons'
import { RepeatedVisualElementCard } from '../sidebar/RepeatedVisualElementCard'
import {
  CaseInsertImageSlotPlacementControls,
} from './CaseInsertImageSlotPlacementControls'
import { CaseInsertImageSlotStatusCard } from './CaseInsertImageSlotStatusCard'
import {
  CaseInsertImageSourceControls,
  type CaseInsertImageSourceCatalog,
  type CaseInsertImageSourceControlSource,
} from './CaseInsertImageSourceControls'
import {
  getTemplateGroupedImagePlacementFields,
  getTemplatePrimaryImagePlacementFields,
} from './CaseInsertTemplateControlPlacement'

const COVER_POSITION_PRESETS = [
  { label: 'Top left', x: 20, y: 18 },
  { label: 'Top center', x: 50, y: 18 },
  { label: 'Top right', x: 80, y: 18 },
  { label: 'Center', x: 50, y: 50 },
  { label: 'Bottom left', x: 20, y: 84 },
  { label: 'Bottom center', x: 50, y: 84 },
  { label: 'Bottom right', x: 80, y: 84 },
] as const

const TRAY_POSITION_PRESETS = [
  { label: 'Top left', x: 18, y: 16 },
  { label: 'Top center', x: 50, y: 16 },
  { label: 'Top right', x: 82, y: 16 },
  { label: 'Center', x: 50, y: 50 },
  { label: 'Bottom left', x: 18, y: 88 },
  { label: 'Bottom center', x: 50, y: 88 },
  { label: 'Bottom right', x: 82, y: 88 },
] as const

function getImageStatus(slot: ProjectCaseInsertImageSlot) {
  return getProjectImageAssetStatus({
    imageDataUrl: slot.imageDataUrl,
    provenance: slot.imageSource,
    fallbackLabel: slot.label,
  })
}

function getPositionPresets(paneId: CaseInsertTemplatePaneId) {
  return paneId === 'cover' ? COVER_POSITION_PRESETS : TRAY_POSITION_PRESETS
}

function OverlayPositionPreset({
  id,
  paneId,
  onLayoutChange,
}: {
  id: string
  paneId: CaseInsertTemplatePaneId
  onLayoutChange: (field: keyof ProjectCaseInsertLayout, value: number) => void
}) {
  const presets = getPositionPresets(paneId)

  return (
    <label>
      <span>Preset</span>
      <select
        id={id}
        defaultValue=""
        onChange={(event) => {
          const preset = presets.find(
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
        {presets.map((preset) => (
          <option key={preset.label} value={preset.label}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function PrimaryImageSlotControls({
  paneId,
  slotKey,
  slot,
  title,
  enableLabel,
  uploadId,
  isBackground = false,
  imageSources,
  actions,
}: {
  paneId: CaseInsertTemplatePaneId
  slotKey: 'background' | 'titleArtwork'
  slot: ProjectCaseInsertImageSlot
  title: string
  enableLabel: string
  uploadId: string
  isBackground?: boolean
  imageSources: CaseInsertImageSourceCatalog
  actions: CaseInsertTemplateEditorActions
}) {
  const onLayoutChange = (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => actions.handleImageSlotLayoutChange(paneId, slotKey, field, value)
  const renderFineTuneControls = (
    source: CaseInsertImageSourceControlSource,
    sectionLabel: string,
  ) => (
    <CaseInsertImageSlotPlacementControls
      beforeRangeControls={!isBackground ? (
        <OverlayPositionPreset
          id={`${uploadId}-${source}-placement`}
          paneId={paneId}
          onLayoutChange={onLayoutChange}
        />
      ) : null}
      featureEnabled={slot.enabled}
      fields={getTemplatePrimaryImagePlacementFields(paneId, slotKey, slot)}
      onFitToRegion={() =>
        actions.handleFitImageSlotToRegion(paneId, slotKey, slot.label)}
      onLayoutChange={onLayoutChange}
      onResetLayout={() => actions.handleResetImageSlotLayout(paneId, slotKey)}
      onClearImage={() =>
        actions.handleClearImageSlot(paneId, slotKey, slot.label)}
      sectionLabel={sectionLabel}
      showFitButton={isBackground}
      uploadId={uploadId}
      slot={slot}
      source={source}
    />
  )

  const shouldShowSources = isBackground || slot.enabled
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
            actions.handleImageSlotEnabledChange(
              paneId,
              slotKey,
              event.target.checked,
            )}
        />
        {enableLabel}
      </label>

      {isBackground ? (
        <p className="hint">
          Current background: {imageStatus.summary}. {imageStatus.availabilityLabel}
          {!slot.enabled ? ' Background image is hidden from preview and export.' : ''}
        </p>
      ) : null}

      {shouldShowSources ? (
        <CaseInsertImageSourceControls
          {...imageSources}
          uploadId={uploadId}
          title={title}
          hasImage={Boolean(slot.imageDataUrl)}
          imageSource={slot.imageSource}
          onUpload={(event) =>
            actions.handleImageSlotUpload(paneId, slotKey, slot.label, event)}
          onUseSteamArtwork={(asset) =>
            actions.handleUseImageSlotSteamArtwork(
              paneId,
              slotKey,
              slot.label,
              asset,
            )}
          onUseLocalSteamScreenshot={(asset) =>
            actions.handleUseImageSlotLocalSteamScreenshot(
              paneId,
              slotKey,
              slot.label,
              asset,
            )}
          onUseWebArtworkCandidate={(candidate) =>
            actions.handleUseImageSlotWebArtwork(
              paneId,
              slotKey,
              slot.label,
              candidate,
            )}
          renderFineTuneControls={renderFineTuneControls}
        />
      ) : null}
    </div>
  )
}

function GroupedImageSlotControls({
  paneId,
  slotKey,
  slot,
  uploadId,
  imageSources,
  actions,
}: {
  paneId: CaseInsertTemplatePaneId
  slotKey: CaseInsertImageSlotGroupKey
  slot: ProjectCaseInsertImageSlot
  uploadId: string
  imageSources: CaseInsertImageSourceCatalog
  actions: CaseInsertTemplateEditorActions
}) {
  const onLayoutChange = (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => actions.handleGroupedImageSlotLayoutChange(
    paneId,
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
      beforeRangeControls={
        <OverlayPositionPreset
          id={`${uploadId}-${source}-placement`}
          paneId={paneId}
          onLayoutChange={onLayoutChange}
        />
      }
      featureEnabled={slot.enabled}
      fields={getTemplateGroupedImagePlacementFields(
        paneId,
        slotKey,
        slot,
      )}
      onLayoutChange={onLayoutChange}
      onResetLayout={() =>
        actions.handleResetGroupedImageSlotLayout(
          paneId,
          slotKey,
          slot.id,
        )}
      onClearImage={() =>
        actions.handleClearGroupedImageSlot(
          paneId,
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
  const slotTitle = slot.label.trim() || 'Visual slot'
  const slotImageStatus = getImageStatus(slot)
  const emptyImageSummary =
    slotKey === 'logoSlots' && getCaseInsertAdditionalLogoKey(slot)
      ? 'built-in default'
      : 'no image'
  const summary = createRepeatedArtworkSummary({
    enabled: slot.enabled,
    imageSummary: slot.imageDataUrl ? slotImageStatus.summary : emptyImageSummary,
    frame: slotKey === 'artworkSlots' ? slot.frame : null,
    details: [`fit ${slot.fit}`, `scale ${slot.layout.scale.toFixed(2)}`],
  })

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
        actions.handleGroupedImageSlotEnabledChange(
          paneId,
          slotKey,
          slot.id,
          enabled,
        )}
      onLabelChange={(label) =>
        actions.handleGroupedImageSlotLabelChange(
          paneId,
          slotKey,
          slot.id,
          label,
        )}
      onDelete={() =>
        actions.handleRemoveGroupedImageSlot(paneId, slotKey, slot.id)}
    >
      <CaseInsertImageSourceControls
        {...imageSources}
        uploadId={uploadId}
        title={slotTitle}
        hasImage={Boolean(slot.imageDataUrl)}
        imageSource={slot.imageSource}
        allowSteamArtwork={slotKey === 'artworkSlots'}
        onUpload={(event) =>
          actions.handleGroupedImageSlotUpload(
            paneId,
            slotKey,
            slot.id,
            slotTitle,
            event,
          )}
        onUseSteamArtwork={(asset) =>
          actions.handleUseGroupedImageSlotSteamArtwork(
            paneId,
            slotKey,
            slot.id,
            slotTitle,
            asset,
          )}
        onUseLocalSteamScreenshot={(asset) =>
          actions.handleUseGroupedImageSlotLocalSteamScreenshot(
            paneId,
            slotKey,
            slot.id,
            slotTitle,
            asset,
          )}
        onUseWebArtworkCandidate={(candidate) =>
          actions.handleUseGroupedImageSlotWebArtwork(
            paneId,
            slotKey,
            slot.id,
            slotTitle,
            candidate,
          )}
        allowWebArtwork={slotKey === 'artworkSlots'}
        allowLocalSteamScreenshots={slotKey === 'artworkSlots'}
        renderFineTuneControls={renderFineTuneControls}
      />
      {slotKey === 'artworkSlots' ? (
        <>
          <CaseInsertImageSlotStatusCard
            slot={slot}
            emptyHint="No image is selected yet. Upload a local image or use an imported artwork source."
          />
          <EditorArtworkFrameControls
            idPrefix={uploadId}
            frame={slot.frame}
            onFrameChange={(field, value) =>
              actions.handleGroupedImageSlotFrameChange(
                paneId,
                slotKey,
                slot.id,
                field,
                value,
              )}
            onResetFrame={() =>
              actions.handleResetGroupedImageSlotFrame(
                paneId,
                slotKey,
                slot.id,
              )}
          />
        </>
      ) : null}
    </RepeatedVisualElementCard>
  )
}

export type GroupedImageSlotListProps = {
  paneId: CaseInsertTemplatePaneId
  emptyHint: string
  addLabel: string
  slotKey: CaseInsertImageSlotGroupKey
  slots: ProjectCaseInsertImageSlot[]
  imageSources: CaseInsertImageSourceCatalog
  actions: CaseInsertTemplateEditorActions
  onAddSlot?: () => void
  showAddButton?: boolean
}

export function GroupedImageSlotList({
  paneId,
  emptyHint,
  addLabel,
  slotKey,
  slots,
  imageSources,
  actions,
  onAddSlot,
  showAddButton = true,
}: GroupedImageSlotListProps) {
  return (
    <>
      {slots.length === 0 ? <p className="hint">{emptyHint}</p> : null}
      {slots.map((slot, index) => (
        <GroupedImageSlotControls
          key={slot.id}
          paneId={paneId}
          slotKey={slotKey}
          slot={slot}
          uploadId={`${paneId}-${slotKey}-${slot.id}-${index + 1}-upload`}
          imageSources={imageSources}
          actions={actions}
        />
      ))}
      {showAddButton ? (
        <button
          className="secondary-button icon-text-button spacing-top"
          type="button"
          onClick={onAddSlot ?? (() =>
            actions.handleAddGroupedImageSlot(paneId, slotKey))}
        >
          <PlusIcon />
          <span>{addLabel}</span>
        </button>
      ) : null}
    </>
  )
}

export function GroupedImageSlotSection({
  title,
  featureEnabled,
  onFeatureEnabledChange,
  enableLabel = 'Show additional artwork',
  ...slotListProps
}: GroupedImageSlotListProps & {
  title: string
  featureEnabled?: boolean
  onFeatureEnabledChange?: (enabled: boolean) => void
  enableLabel?: string
}) {
  return (
    <EditorFeaturePanel title={title}>
      {onFeatureEnabledChange ? (
        <OptionalFeatureSection
          className="feature-control-body additional-artwork-control"
          enabled={Boolean(featureEnabled)}
          enableLabel={enableLabel}
          onEnabledChange={onFeatureEnabledChange}
        >
          <GroupedImageSlotList {...slotListProps} />
        </OptionalFeatureSection>
      ) : (
        <GroupedImageSlotList {...slotListProps} />
      )}
    </EditorFeaturePanel>
  )
}
