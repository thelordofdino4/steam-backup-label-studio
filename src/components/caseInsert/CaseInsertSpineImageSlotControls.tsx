import type {
  JewelCaseSpineImageSlotGroupKey,
  JewelCaseSpineImageSlotKey,
} from '../../caseInsert/jewelCaseTransitions'
import {
  CASE_INSERT_ARTWORK_SECTION_LABELS,
} from '../../caseInsert/artworkPanelSections'
import type { JewelCaseSpineSide } from '../../caseInsert/types'
import {
  createRepeatedArtworkSummary,
} from '../../editor/repeatedArtwork'
import type {
  JewelCaseSpineEditorActions,
} from '../../hooks/useJewelCaseSpineEditor'
import type {
  JewelCaseSpineOverlayRole,
} from '../../layout/jewelCaseSpineLayout'
import {
  getCaseInsertAdditionalLogoKey,
} from '../../caseInsert/brandingLogoSlots'
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
  getSpineImageSlotPlacementFields,
  getSpinePrimaryImageSlotRole,
} from './CaseInsertSpineControlPlacement'

function getImageStatus(slot: ProjectCaseInsertImageSlot) {
  return getProjectImageAssetStatus({
    imageDataUrl: slot.imageDataUrl,
    provenance: slot.imageSource,
    fallbackLabel: slot.label,
  })
}

export function SpineImageSlotControls({
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
      ) : null}
    </div>
  )
}

export function SpineGroupedImageSlotControls({
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
  const role: JewelCaseSpineOverlayRole = slotKey === 'artworkSlots'
    ? 'artwork'
    : slotKey === 'logoSlots' ? 'logo' : 'mark'
  const renderFineTuneControls = (
    source: CaseInsertImageSourceControlSource,
    sectionLabel: string,
  ) => (
    <CaseInsertImageSlotPlacementControls
      featureEnabled={slot.enabled}
      fields={getSpineImageSlotPlacementFields(side, slot, role)}
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
  const slotTitle = slot.label.trim() ||
    (slotKey === 'logoSlots' ? 'Spine logo' : 'Spine artwork')
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
        allowSteamArtwork={slotKey !== 'markSlots'}
        allowWebArtwork={slotKey !== 'markSlots'}
        allowLocalSteamScreenshots={slotKey !== 'markSlots'}
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
        </>
      ) : null}
    </RepeatedVisualElementCard>
  )
}

export function SpineGroupedImageSlotSection({
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
    <EditorFeaturePanel title={CASE_INSERT_ARTWORK_SECTION_LABELS.additionalArtwork}>
      <OptionalFeatureSection
        className="feature-control-body additional-artwork-control"
        enabled={featureEnabled}
        enableLabel="Show additional artwork"
        onEnabledChange={(enabled) =>
          actions.handleSpineAdditionalArtworkEnabledChange(side, enabled)}
      >
        {slots.length === 0 ? (
          <p className="hint">No additional artwork elements.</p>
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
          <span>Add artwork element</span>
        </button>
      </OptionalFeatureSection>
    </EditorFeaturePanel>
  )
}
