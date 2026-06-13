import type { ReactNode } from 'react'
import type {
  CaseInsertImageSlotGroupKey,
  CaseInsertTemplatePaneId,
} from '../../caseInsert/templateSurfaces'
import type { CaseInsertTemplateEditorActions } from '../../hooks/useCaseInsertTemplateEditor'
import type { LogoCandidateDiscoveryState } from '../../hooks/useLogoAssetDiscovery'
import { getProjectImageAssetStatus } from '../../project/projectAssetStatus'
import {
  CASE_INSERT_MARK_BRANDING_SECTIONS,
} from '../../caseInsert/brandingPanelSections'
import {
  getEnabledCaseInsertMarkSlotForKind,
  getEnabledCaseInsertMarkSlotForSourcePrefix,
} from '../../caseInsert/brandingMarkPlacement'
import {
  getCaseInsertTemplateMarkPlacementFields,
} from '../../caseInsert/brandingMarkPlacementFields'
import type {
  CaseInsertBrandingMarkTarget,
  CaseInsertBrandingMarkTargetState,
} from '../../caseInsert/brandingMarkSlots'
import type {
  CaseInsertMarkLayerKind,
} from '../../caseInsert/brandingSlotSources'
import {
  getCaseInsertAdditionalLogoKey,
  getCaseInsertAdditionalLogoSlotsForKey,
  getCaseInsertPrimaryLogoSlot,
  getCaseInsertUnassignedAdditionalLogoSlots,
} from '../../caseInsert/brandingLogoSlots'
import {
  CASE_INSERT_ARTWORK_SECTION_LABELS,
} from '../../caseInsert/artworkPanelSections'
import {
  createJewelCasePreviewLayout,
} from '../../layout/caseInsertPreviewLayout'
import {
  RATING_BADGE_LAYOUT_PRESETS,
} from '../../layout/presets'
import {
  createRepeatedArtworkSummary,
} from '../../editor/repeatedArtwork'
import type {
  CaseInsertLayoutSliderRanges,
} from '../../layout/caseInsertElementSafeZone'
import {
  getJewelCaseBackBackgroundLayoutSliderRanges,
  getJewelCaseBackImageSlotLayoutSliderRanges,
} from '../../layout/jewelCaseBackLayout'
import {
  getJewelCaseFrontBackgroundLayoutSliderRanges,
  getJewelCaseFrontImageSlotLayoutSliderRanges,
} from '../../layout/jewelCaseFrontLayout'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertSurfaceState,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectMetadata,
} from '../../project/projectTypes'
import type { LogoAssetKey } from '../../project/projectLogoAssets'
import {
  getCaseInsertTextBlockInputState,
  getCaseInsertTextBlockPriority,
  getNextCaseInsertTextSource,
} from '../../caseInsert/textContent'
import {
  CASE_INSERT_TEXT_WIDTH_MAX,
  CASE_INSERT_TEXT_WIDTH_MIN,
  getCaseInsertTextBlockLayoutPresets,
  getCaseInsertTextLayoutWidth,
  getCaseInsertTextListLayoutPresets,
} from '../../caseInsert/textLayout'
import { EditorFeaturePanel } from '../editor/EditorPanel'
import { EditorArtworkFrameControls } from '../editor/EditorArtworkFrameControls'
import { EditorRangeField } from '../editor/EditorRangeField'
import { PlusIcon } from '../sidebar/PanelIcons'
import { RepeatedVisualElementCard } from '../sidebar/RepeatedVisualElementCard'
import {
  CaseInsertImageSourceControls,
  type CaseInsertImageSourceControlSource,
  type CaseInsertImageSourceCatalog,
} from './CaseInsertImageSourceControls'
import {
  CaseInsertImageSlotPlacementControls,
  type CaseInsertImageSlotPlacementField,
} from './CaseInsertImageSlotPlacementControls'
import { CaseInsertMarkPlacementControls } from './CaseInsertMarkPlacementControls'
import { CaseInsertImageSlotStatusCard } from './CaseInsertImageSlotStatusCard'
import {
  CaseInsertTitleArtworkControls,
  type CaseInsertTitleArtworkPlacementField,
} from './CaseInsertTitleArtworkControls'
import {
  CaseInsertMediaMarkSetupControls,
  CaseInsertPlatformMarkSetupControls,
  CaseInsertRatingBadgeSetupControls,
  CaseInsertTechnicalMarkSetupControls,
  type CaseInsertBrandingSetupControlsProps,
} from './CaseInsertBrandingSetupControls'
import { CaseInsertLogoSlotControls } from './CaseInsertLogoSlotControls'
import { CaseInsertSteamBannerControls } from './CaseInsertSteamBannerControls'
import {
  CaseInsertTextBackgroundFineTuneControls,
  CaseInsertTextOptionalStyleControls,
  CaseInsertTextSourceControls,
  CaseInsertTextStyleControls,
} from './CaseInsertTextStyleControls'
import { CaseInsertWorkflowSection } from './CaseInsertWorkflowSection'

export type CaseInsertTemplateControlsProps = {
  paneId: CaseInsertTemplatePaneId
  templateState: ProjectCaseInsertSurfaceState
  projectMetadata: ProjectMetadata
  actions: CaseInsertTemplateEditorActions
  imageSources: CaseInsertImageSourceCatalog
  getBrandingControls: (
    target: CaseInsertBrandingMarkTarget,
    targetState: CaseInsertBrandingMarkTargetState,
  ) => CaseInsertBrandingSetupControlsProps
  logoCandidateDiscovery: LogoCandidateDiscoveryState
  handleFindLogoCandidates: (logoKey: LogoAssetKey) => void | Promise<void>
}

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

const BACKGROUND_PLACEMENT_FIELDS: CaseInsertImageSlotPlacementField[] = [
  { field: 'scale', label: 'Scale', min: 0.01, max: 4, step: 0.01 },
  { field: 'x', label: 'X', min: -100, max: 100, step: 0.1 },
  { field: 'y', label: 'Y', min: -100, max: 100, step: 0.1 },
]

const TEMPLATE_OVERLAY_PLACEMENT_FIELDS: CaseInsertImageSlotPlacementField[] = [
  { field: 'scale', label: 'Scale', min: 0.25, max: 2.5, step: 0.01 },
  { field: 'x', label: 'X', min: 0, max: 100, step: 0.1 },
  { field: 'y', label: 'Y', min: 0, max: 100, step: 0.1 },
]

const TEMPLATE_TITLE_ARTWORK_PLACEMENT_FIELDS:
CaseInsertTitleArtworkPlacementField[] = [
  { field: 'scale', label: 'Scale', min: 0.35, max: 5, step: 0.01 },
  { field: 'x', label: 'X', min: 0, max: 100, step: 0.1 },
  { field: 'y', label: 'Y', min: 0, max: 100, step: 0.1 },
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

function getTemplatePreviewLayout(paneId: CaseInsertTemplatePaneId) {
  return createJewelCasePreviewLayout(
    'jewelCase',
    paneId === 'cover' ? 'front' : 'back',
  )
}

function getTemplatePrimaryImagePlacementFields(
  paneId: CaseInsertTemplatePaneId,
  slotKey: 'background' | 'titleArtwork',
  slot: ProjectCaseInsertImageSlot,
) {
  const layout = getTemplatePreviewLayout(paneId)
  const fields = slotKey === 'background'
    ? BACKGROUND_PLACEMENT_FIELDS
    : TEMPLATE_TITLE_ARTWORK_PLACEMENT_FIELDS
  const ranges = paneId === 'cover'
    ? slotKey === 'background'
      ? getJewelCaseFrontBackgroundLayoutSliderRanges(slot, layout)
      : getJewelCaseFrontImageSlotLayoutSliderRanges(
          slot,
          layout,
          'titleArtwork',
        )
    : slotKey === 'background'
      ? getJewelCaseBackBackgroundLayoutSliderRanges(slot, layout)
      : getJewelCaseBackImageSlotLayoutSliderRanges(slot, layout, 'logo')

  return applyLayoutSliderRanges(fields, ranges)
}

function getTemplateGroupedImagePlacementFields(
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertImageSlotGroupKey,
  slot: ProjectCaseInsertImageSlot,
) {
  const layout = getTemplatePreviewLayout(paneId)

  const ranges = paneId === 'cover'
    ? getJewelCaseFrontImageSlotLayoutSliderRanges(
        slot,
        layout,
        slotKey === 'artworkSlots'
          ? 'calloutArtwork'
          : slotKey === 'logoSlots' ? 'logo' : 'mark',
      )
    : getJewelCaseBackImageSlotLayoutSliderRanges(
        slot,
        layout,
        slotKey === 'artworkSlots'
          ? 'artwork'
          : slotKey === 'markSlots' ? 'mark' : 'logo',
      )

  return applyLayoutSliderRanges(TEMPLATE_OVERLAY_PLACEMENT_FIELDS, ranges)
}

function getImageStatus(slot: ProjectCaseInsertImageSlot) {
  return getProjectImageAssetStatus({
    imageDataUrl: slot.imageDataUrl,
    provenance: slot.imageSource,
    fallbackLabel: slot.label,
  })
}

function getTextBlockControlPriority(textBlock: ProjectCaseInsertTextBlock) {
  return getCaseInsertTextBlockPriority(textBlock)
}

function sortTextBlocksForControls(textBlocks: ProjectCaseInsertTextBlock[]) {
  return [...textBlocks].sort(
    (left, right) =>
      getTextBlockControlPriority(left) - getTextBlockControlPriority(right),
  )
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

function TextLayoutPresetControl({
  id,
  presets,
  onApplyPreset,
}: {
  id: string
  presets: ReturnType<typeof getCaseInsertTextBlockLayoutPresets>
  onApplyPreset: (presetId: string) => void
}) {
  return (
    <label>
      <span>Layout preset</span>
      <select
        id={id}
        defaultValue=""
        onChange={(event) => {
          if (event.target.value) onApplyPreset(event.target.value)
          event.currentTarget.value = ''
        }}
      >
        <option value="">Choose preset...</option>
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function PrimaryImageSlotControls({
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
          {!slot.enabled ? ' Background art is hidden from preview and export.' : ''}
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

type GroupedImageSlotListProps = {
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

function GroupedImageSlotList({
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

function GroupedImageSlotSection({
  title,
  featureEnabled,
  onFeatureEnabledChange,
  ...slotListProps
}: GroupedImageSlotListProps & {
  title: string
  featureEnabled?: boolean
  onFeatureEnabledChange?: (enabled: boolean) => void
}) {
  return (
    <EditorFeaturePanel title={title}>
        {onFeatureEnabledChange ? (
          <div className="feature-control-body additional-artwork-control">
            <label className="field-label">
              <input
                type="checkbox"
                checked={Boolean(featureEnabled)}
                onChange={(event) =>
                  onFeatureEnabledChange(event.target.checked)}
              />
              Show additional artwork
            </label>

            {featureEnabled ? (
              <GroupedImageSlotList {...slotListProps} />
            ) : null}
          </div>
        ) : (
          <GroupedImageSlotList {...slotListProps} />
        )}
    </EditorFeaturePanel>
  )
}

function CaseInsertArtworkFeatureSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <EditorFeaturePanel title={title}>{children}</EditorFeaturePanel>
  )
}

function TextBlockControls({
  paneId,
  textBlock,
  projectMetadata,
  actions,
}: {
  paneId: CaseInsertTemplatePaneId
  textBlock: ProjectCaseInsertTextBlock
  projectMetadata: ProjectMetadata
  actions: CaseInsertTemplateEditorActions
}) {
  const onLayoutChange = (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => actions.handleTextBlockLayoutChange(
    paneId,
    textBlock.id,
    field,
    value,
  )
  const inputState = getCaseInsertTextBlockInputState(
    textBlock,
    projectMetadata,
  )
  const layoutPresets = getCaseInsertTextBlockLayoutPresets(paneId, textBlock)

  return (
    <div className="editor-text-control">
      <label className="checkbox-row editor-text-enable-row">
        <input
          type="checkbox"
          checked={textBlock.enabled}
          onChange={(event) =>
            actions.handleTextBlockEnabledChange(
              paneId,
              textBlock.id,
              event.target.checked,
            )}
        />
        <span>{textBlock.label}</span>
      </label>

      {!textBlock.enabled ? null : (
        <div className="editor-text-control-body">
          <CaseInsertTextOptionalStyleControls
            idPrefix={textBlock.id}
            label={textBlock.label}
            style={textBlock.style}
            avoidVisualElements={textBlock.avoidVisualElements}
            onAvoidVisualElementsChange={(avoidVisualElements) =>
              actions.handleTextBlockAvoidVisualElementsChange(
                paneId,
                textBlock.id,
                avoidVisualElements,
              )}
            onStyleChange={(field, value) =>
              actions.handleTextBlockStyleChange(
                paneId,
                textBlock.id,
                field,
                value,
              )}
          />

          <CaseInsertTextSourceControls
            label={textBlock.label}
            source={textBlock.source}
            isMetadataBacked={inputState.isMetadataBacked}
            isManualOverride={inputState.isManualOverride}
            onUseMetadataValue={() =>
              actions.handleTextBlockValueChange(
                paneId,
                textBlock.id,
                '',
                'metadata',
              )}
          />

          <CaseInsertTextStyleControls
            idPrefix={textBlock.id}
            label={textBlock.label}
            style={textBlock.style}
            source={textBlock.source}
            onStyleChange={(field, value) =>
              actions.handleTextBlockStyleChange(
                paneId,
                textBlock.id,
                field,
                value,
              )}
            onApplyStylePreset={(presetId) =>
              actions.handleApplyTextBlockStylePreset(
                paneId,
                textBlock.id,
                presetId,
              )}
          />

          <div
            className="editor-control-group"
            aria-label={`${textBlock.label} text controls`}
          >
            <label className="field-label" htmlFor={`${textBlock.id}-value`}>
              Text value
            </label>
            <input
              id={`${textBlock.id}-value`}
              className="editor-text-input"
              type="text"
              value={inputState.value}
              placeholder={inputState.placeholder}
              onChange={(event) => {
                const value = event.target.value

                actions.handleTextBlockValueChange(
                  paneId,
                  textBlock.id,
                  value,
                  getNextCaseInsertTextSource(textBlock, value),
                )
              }}
            />
          </div>

          <div
            className="editor-control-group"
            aria-label={`${textBlock.label} placement controls`}
          >
            <div className="editor-control-grid">
              <label htmlFor={`${textBlock.id}-align`}>
                <span>Align</span>
                <select
                  id={`${textBlock.id}-align`}
                  value={textBlock.align}
                  onChange={(event) =>
                    actions.handleTextBlockAlignChange(
                      paneId,
                      textBlock.id,
                      event.target.value as ProjectCaseInsertTextAlign,
                    )}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>

              <TextLayoutPresetControl
                id={`${textBlock.id}-placement`}
                presets={layoutPresets}
                onApplyPreset={(presetId) =>
                  actions.handleApplyTextBlockLayoutPreset(
                    paneId,
                    textBlock.id,
                    presetId,
                  )}
              />
            </div>
          </div>

          <div
            className="editor-control-group"
            aria-label={`${textBlock.label} fine tuning controls`}
          >
            <div className="editor-control-grid">
              <EditorRangeField
                id={`${textBlock.id}-scale`}
                label="Scale"
                min={0.7}
                max={1.8}
                step={0.01}
                value={textBlock.layout.scale}
                onChange={(value) => onLayoutChange('scale', value)}
              />
              <EditorRangeField
                id={`${textBlock.id}-width`}
                label="Width"
                min={CASE_INSERT_TEXT_WIDTH_MIN}
                max={CASE_INSERT_TEXT_WIDTH_MAX}
                step={1}
                value={getCaseInsertTextLayoutWidth(textBlock.layout)}
                onChange={(value) => onLayoutChange('width', value)}
              />
              <EditorRangeField
                id={`${textBlock.id}-x`}
                label="X"
                min={0}
                max={100}
                step={1}
                value={textBlock.layout.x}
                onChange={(value) => onLayoutChange('x', value)}
              />
              <EditorRangeField
                id={`${textBlock.id}-y`}
                label="Y"
                min={0}
                max={100}
                step={1}
                value={textBlock.layout.y}
                onChange={(value) => onLayoutChange('y', value)}
              />
              <CaseInsertTextBackgroundFineTuneControls
                idPrefix={textBlock.id}
                style={textBlock.style}
                onStyleChange={(field, value) =>
                  actions.handleTextBlockStyleChange(
                    paneId,
                    textBlock.id,
                    field,
                    value,
                  )}
              />
            </div>
          </div>

          <div className="editor-control-group editor-action-group">
            <button
              className="secondary-button editor-text-reset-button"
              type="button"
              onClick={() =>
                actions.handleResetTextBlockLayout(paneId, textBlock.id)}
            >
              Reset {textBlock.label.toLocaleLowerCase()} layout
            </button>
            <button
              className="secondary-button editor-text-reset-button"
              type="button"
              onClick={() =>
                actions.handleResetTextBlockStyle(paneId, textBlock.id)}
            >
              Reset {textBlock.label.toLocaleLowerCase()} style
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TextListControls({
  paneId,
  textList,
  actions,
}: {
  paneId: CaseInsertTemplatePaneId
  textList: ProjectCaseInsertTextList
  actions: CaseInsertTemplateEditorActions
}) {
  const onLayoutChange = (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => actions.handleTextListLayoutChange(paneId, textList.id, field, value)
  const layoutPresets = getCaseInsertTextListLayoutPresets(paneId)

  return (
    <div className="editor-text-control">
      <label className="checkbox-row editor-text-enable-row">
        <input
          type="checkbox"
          checked={textList.enabled}
          onChange={(event) =>
            actions.handleTextListEnabledChange(
              paneId,
              textList.id,
              event.target.checked,
            )}
        />
        <span>{textList.label}</span>
      </label>

      {!textList.enabled ? null : (
        <div className="editor-text-control-body">
          <CaseInsertTextOptionalStyleControls
            idPrefix={textList.id}
            label={textList.label}
            style={textList.style}
            avoidVisualElements={textList.avoidVisualElements}
            onAvoidVisualElementsChange={(avoidVisualElements) =>
              actions.handleTextListAvoidVisualElementsChange(
                paneId,
                textList.id,
                avoidVisualElements,
              )}
            onStyleChange={(field, value) =>
              actions.handleTextListStyleChange(
                paneId,
                textList.id,
                field,
                value,
              )}
          />

          <CaseInsertTextSourceControls
            label={textList.label}
            source={textList.source}
          />

          <CaseInsertTextStyleControls
            idPrefix={textList.id}
            label={textList.label}
            style={textList.style}
            source={textList.source}
            onStyleChange={(field, value) =>
              actions.handleTextListStyleChange(
                paneId,
                textList.id,
                field,
                value,
              )}
            onApplyStylePreset={(presetId) =>
              actions.handleApplyTextListStylePreset(
                paneId,
                textList.id,
                presetId,
              )}
          />

          <div
            className="editor-control-group"
            aria-label={`${textList.label} text controls`}
          >
            {textList.items.length === 0 ? (
              <p className="hint">No list items yet.</p>
            ) : null}
            {textList.items.map((item, index) => (
              <div className="case-insert-list-item-row" key={index}>
                <label
                  className="field-label"
                  htmlFor={`${textList.id}-${index + 1}`}
                >
                  Item {index + 1}
                </label>
                <input
                  id={`${textList.id}-${index + 1}`}
                  type="text"
                  value={item}
                  onChange={(event) =>
                    actions.handleTextListItemValueChange(
                      paneId,
                      textList.id,
                      index,
                      event.target.value,
                    )}
                />
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() =>
                    actions.handleRemoveTextListItem(
                      paneId,
                      textList.id,
                      index,
                    )}
                >
                  Delete
                </button>
              </div>
            ))}

            <button
              className="secondary-button icon-text-button spacing-top"
              type="button"
              onClick={() => actions.handleAddTextListItem(paneId, textList.id)}
            >
              <PlusIcon />
              <span>Add item</span>
            </button>
          </div>

          <div
            className="editor-control-group"
            aria-label={`${textList.label} placement controls`}
          >
            <div className="editor-control-grid">
              <TextLayoutPresetControl
                id={`${textList.id}-placement`}
                presets={layoutPresets}
                onApplyPreset={(presetId) =>
                  actions.handleApplyTextListLayoutPreset(
                    paneId,
                    textList.id,
                    presetId,
                  )}
              />
            </div>
          </div>

          <div
            className="editor-control-group"
            aria-label={`${textList.label} fine tuning controls`}
          >
            <div className="editor-control-grid">
              <EditorRangeField
                id={`${textList.id}-scale`}
                label="Scale"
                min={0.7}
                max={1.8}
                step={0.01}
                value={textList.layout.scale}
                onChange={(value) => onLayoutChange('scale', value)}
              />
              <EditorRangeField
                id={`${textList.id}-width`}
                label="Width"
                min={CASE_INSERT_TEXT_WIDTH_MIN}
                max={CASE_INSERT_TEXT_WIDTH_MAX}
                step={1}
                value={getCaseInsertTextLayoutWidth(textList.layout)}
                onChange={(value) => onLayoutChange('width', value)}
              />
              <EditorRangeField
                id={`${textList.id}-x`}
                label="X"
                min={0}
                max={100}
                step={1}
                value={textList.layout.x}
                onChange={(value) => onLayoutChange('x', value)}
              />
              <EditorRangeField
                id={`${textList.id}-y`}
                label="Y"
                min={0}
                max={100}
                step={1}
                value={textList.layout.y}
                onChange={(value) => onLayoutChange('y', value)}
              />
              <CaseInsertTextBackgroundFineTuneControls
                idPrefix={textList.id}
                style={textList.style}
                onStyleChange={(field, value) =>
                  actions.handleTextListStyleChange(
                    paneId,
                    textList.id,
                    field,
                    value,
                  )}
              />
            </div>
          </div>

          <div className="editor-control-group editor-action-group">
            <button
              className="secondary-button editor-text-reset-button"
              type="button"
              onClick={() =>
                actions.handleResetTextListLayout(paneId, textList.id)}
            >
              Reset {textList.label.toLocaleLowerCase()} layout
            </button>
            <button
              className="secondary-button editor-text-reset-button"
              type="button"
              onClick={() =>
                actions.handleResetTextListStyle(paneId, textList.id)}
            >
              Reset {textList.label.toLocaleLowerCase()} style
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function CaseInsertTemplateArtworkControls({
  paneId,
  templateState,
  actions,
  imageSources,
}: CaseInsertTemplateControlsProps) {
  return (
    <>
      <PrimaryImageSlotControls
        paneId={paneId}
        slotKey="background"
        slot={templateState.background}
        title="background"
        enableLabel="Show background art"
        uploadId={`${paneId}-background-upload`}
        isBackground
        imageSources={imageSources}
        actions={actions}
      />

      <CaseInsertArtworkFeatureSection
        title={CASE_INSERT_ARTWORK_SECTION_LABELS.gameLogo}
      >
        <CaseInsertTitleArtworkControls
          slot={templateState.titleArtwork}
          uploadId={`${paneId}-title-artwork-upload`}
          fields={getTemplatePrimaryImagePlacementFields(
            paneId,
            'titleArtwork',
            templateState.titleArtwork,
          )}
          helpText="This is the game title/logo artwork on the case insert. Steam import can seed the best available Steam title/logo artwork; template text stays independently available in the Text tab."
          onEnabledChange={(enabled) =>
            actions.handleImageSlotEnabledChange(
              paneId,
              'titleArtwork',
              enabled,
            )}
          onUpload={(event) =>
            actions.handleImageSlotUpload(
              paneId,
              'titleArtwork',
              templateState.titleArtwork.label,
              event,
            )}
          onLayoutChange={(field, value) =>
            actions.handleImageSlotLayoutChange(
              paneId,
              'titleArtwork',
              field,
              value,
            )}
          onResetLayout={() =>
            actions.handleResetImageSlotLayout(paneId, 'titleArtwork')}
          onRestoreDefault={() =>
            actions.handleRestoreTitleArtworkDefault(paneId)}
        />
      </CaseInsertArtworkFeatureSection>

      <GroupedImageSlotSection
        paneId={paneId}
        title={CASE_INSERT_ARTWORK_SECTION_LABELS.additionalArtwork}
        featureEnabled={templateState.additionalArtworkEnabled}
        onFeatureEnabledChange={(enabled) =>
          actions.handleAdditionalArtworkEnabledChange(paneId, enabled)}
        emptyHint="No additional artwork elements."
        addLabel="Add artwork element"
        slotKey="artworkSlots"
        slots={templateState.artworkSlots}
        imageSources={imageSources}
        actions={actions}
      />
    </>
  )
}

function CaseInsertBrandingFeatureSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <EditorFeaturePanel title={title} variant="branding">
      {children}
    </EditorFeaturePanel>
  )
}

function TemplateMarkPlacementControls({
  paneId,
  slot,
  idPrefix,
  layoutPresets,
  presetLabel,
  resetLabel,
  actions,
}: {
  paneId: CaseInsertTemplatePaneId
  slot: ProjectCaseInsertImageSlot | null
  idPrefix: string
  layoutPresets?: typeof RATING_BADGE_LAYOUT_PRESETS
  presetLabel?: string
  resetLabel: string
  actions: CaseInsertTemplateEditorActions
}) {
  return (
    <CaseInsertMarkPlacementControls
      fields={slot ? getCaseInsertTemplateMarkPlacementFields(paneId, slot) : []}
      idPrefix={idPrefix}
      layoutPresets={layoutPresets}
      slot={slot}
      presetLabel={presetLabel}
      resetLabel={resetLabel}
      onLayoutChange={(field, value) => {
        if (!slot) return
        actions.handleGroupedImageSlotLayoutChange(
          paneId,
          'markSlots',
          slot.id,
          field,
          value,
        )
      }}
      onResetLayout={() => {
        if (!slot) return
        actions.handleResetGroupedImageSlotLayout(
          paneId,
          'markSlots',
          slot.id,
        )
      }}
    />
  )
}

function getTemplateMarkSlotForSection(
  markSlots: ProjectCaseInsertImageSlot[],
  markKind: CaseInsertMarkLayerKind,
) {
  return getEnabledCaseInsertMarkSlotForKind(markSlots, markKind)
}

export function CaseInsertTemplateBrandingControls({
  paneId,
  templateState,
  actions,
  imageSources,
  getBrandingControls,
  logoCandidateDiscovery,
  handleFindLogoCandidates,
}: CaseInsertTemplateControlsProps) {
  const brandingControls = getBrandingControls(
    { type: 'template', paneId },
    templateState,
  )
  const developerLogoSlot = getCaseInsertPrimaryLogoSlot(
    templateState,
    'developer',
  )
  const publisherLogoSlot = getCaseInsertPrimaryLogoSlot(
    templateState,
    'publisher',
  )
  const additionalDeveloperLogoSlots =
    getCaseInsertAdditionalLogoSlotsForKey(templateState, 'developer')
  const additionalPublisherLogoSlots =
    getCaseInsertAdditionalLogoSlotsForKey(templateState, 'publisher')
  const unassignedAdditionalLogoSlots =
    getCaseInsertUnassignedAdditionalLogoSlots(templateState)

  return (
    <>
      {paneId === 'cover' ? (
        <CaseInsertBrandingFeatureSection title="Steam banner">
          <CaseInsertSteamBannerControls
            banner={templateState.steamBanner}
            idPrefix={`${paneId}-steam-banner`}
            targetKind="cover"
            onEnabledChange={(enabled) =>
              actions.handleSteamBannerEnabledChange(paneId, enabled)}
            onLockupUpload={(event) =>
              actions.handleSteamBannerLockupUpload(paneId, event)}
            onClearLockup={() =>
              actions.handleClearSteamBannerLockup(paneId)}
            onLayoutChange={(field, value) =>
              actions.handleSteamBannerLockupLayoutChange(
                paneId,
                field,
                value,
              )}
            onResetLayout={() =>
              actions.handleResetSteamBannerLockupLayout(paneId)}
            onUseTextFallbackChange={(useTextFallback) =>
              actions.handleSteamBannerUseTextFallbackChange(
                paneId,
                useTextFallback,
              )}
            onFallbackTextChange={(fallbackText) =>
              actions.handleSteamBannerFallbackTextChange(
                paneId,
                fallbackText,
              )}
            onColorChange={(field, value) =>
              actions.handleSteamBannerColorChange(paneId, field, value)}
            onResetColors={() =>
              actions.handleResetSteamBannerColors(paneId)}
          />
        </CaseInsertBrandingFeatureSection>
      ) : null}

      <CaseInsertBrandingFeatureSection title="Developer / publisher logos">
        <CaseInsertLogoSlotControls
          paneId={paneId}
          logoKey="developer"
          slot={developerLogoSlot}
          uploadId={`${paneId}-developer-logo-upload`}
          fields={developerLogoSlot
            ? getTemplateGroupedImagePlacementFields(
                paneId,
                'logoSlots',
                developerLogoSlot,
              )
            : TEMPLATE_OVERLAY_PLACEMENT_FIELDS}
          logoCandidateDiscovery={logoCandidateDiscovery}
          handleFindLogoCandidates={handleFindLogoCandidates}
          onUseLogoCandidate={(logoKey, candidate) =>
            actions.handleUseLogoCandidate(paneId, logoKey, candidate)}
          onEnabledChange={(enabled) =>
            actions.handlePrimaryLogoSlotEnabledChange(
              paneId,
              'developer',
              enabled,
            )}
          onUpload={(event) =>
            actions.handlePrimaryLogoSlotUpload(
              paneId,
              'developer',
              event,
            )}
          onLayoutChange={(field, value) =>
            actions.handlePrimaryLogoSlotLayoutChange(
              paneId,
              'developer',
              field,
              value,
            )}
          onResetLayout={() =>
            actions.handleResetPrimaryLogoSlotLayout(paneId, 'developer')}
          onClearImage={() =>
            actions.handleClearPrimaryLogoSlot(paneId, 'developer')}
        >
          <EditorFeaturePanel title="Additional developer logos">
              <GroupedImageSlotList
                paneId={paneId}
                emptyHint="No additional developer logos."
                addLabel="Add additional logo"
                slotKey="logoSlots"
                slots={additionalDeveloperLogoSlots}
                imageSources={imageSources}
                actions={actions}
                onAddSlot={() =>
                  actions.handleAddAdditionalLogoSlot(paneId, 'developer')}
              />
          </EditorFeaturePanel>
        </CaseInsertLogoSlotControls>

        <CaseInsertLogoSlotControls
          paneId={paneId}
          logoKey="publisher"
          slot={publisherLogoSlot}
          uploadId={`${paneId}-publisher-logo-upload`}
          fields={publisherLogoSlot
            ? getTemplateGroupedImagePlacementFields(
                paneId,
                'logoSlots',
                publisherLogoSlot,
              )
            : TEMPLATE_OVERLAY_PLACEMENT_FIELDS}
          logoCandidateDiscovery={logoCandidateDiscovery}
          handleFindLogoCandidates={handleFindLogoCandidates}
          onUseLogoCandidate={(logoKey, candidate) =>
            actions.handleUseLogoCandidate(paneId, logoKey, candidate)}
          onEnabledChange={(enabled) =>
            actions.handlePrimaryLogoSlotEnabledChange(
              paneId,
              'publisher',
              enabled,
            )}
          onUpload={(event) =>
            actions.handlePrimaryLogoSlotUpload(
              paneId,
              'publisher',
              event,
            )}
          onLayoutChange={(field, value) =>
            actions.handlePrimaryLogoSlotLayoutChange(
              paneId,
              'publisher',
              field,
              value,
            )}
          onResetLayout={() =>
            actions.handleResetPrimaryLogoSlotLayout(paneId, 'publisher')}
          onClearImage={() =>
            actions.handleClearPrimaryLogoSlot(paneId, 'publisher')}
        >
          <EditorFeaturePanel title="Additional publisher logos">
              <GroupedImageSlotList
                paneId={paneId}
                emptyHint="No additional publisher logos."
                addLabel="Add additional logo"
                slotKey="logoSlots"
                slots={additionalPublisherLogoSlots}
                imageSources={imageSources}
                actions={actions}
                onAddSlot={() =>
                  actions.handleAddAdditionalLogoSlot(paneId, 'publisher')}
              />
          </EditorFeaturePanel>
        </CaseInsertLogoSlotControls>

        {unassignedAdditionalLogoSlots.length > 0 ? (
          <EditorFeaturePanel title="Unassigned additional logos">
              <GroupedImageSlotList
                paneId={paneId}
                emptyHint="No unassigned additional logos."
                addLabel="Add additional logo"
                slotKey="logoSlots"
                slots={unassignedAdditionalLogoSlots}
                imageSources={imageSources}
                actions={actions}
                showAddButton={false}
              />
          </EditorFeaturePanel>
        ) : null}
      </CaseInsertBrandingFeatureSection>

      {CASE_INSERT_MARK_BRANDING_SECTIONS.map((section) => (
        <CaseInsertBrandingFeatureSection
          key={section.markKind}
          title={section.title}
        >
          {section.markKind === 'rating' ? (
            <CaseInsertRatingBadgeSetupControls
              {...brandingControls}
              idPrefix={`${paneId}-${section.markKind}`}
              renderSupplementalUskLayoutControls={() => (
                <TemplateMarkPlacementControls
                  paneId={paneId}
                  slot={getEnabledCaseInsertMarkSlotForSourcePrefix(
                    templateState.markSlots,
                    'rating',
                    'case-rating:USK:',
                  )}
                  idPrefix={`${paneId}-usk-rating-badge`}
                  layoutPresets={RATING_BADGE_LAYOUT_PRESETS}
                  presetLabel="USK layout preset"
                  resetLabel="Reset USK badge layout"
                  actions={actions}
                />
              )}
            >
              <TemplateMarkPlacementControls
                paneId={paneId}
                slot={getTemplateMarkSlotForSection(
                  templateState.markSlots,
                  'rating',
                )}
                idPrefix={`${paneId}-rating-badge`}
                layoutPresets={RATING_BADGE_LAYOUT_PRESETS}
                resetLabel="Reset rating badge layout"
                actions={actions}
              />
            </CaseInsertRatingBadgeSetupControls>
          ) : null}
          {section.markKind === 'media' ? (
            <CaseInsertMediaMarkSetupControls
              {...brandingControls}
              idPrefix={`${paneId}-${section.markKind}`}
            >
              <TemplateMarkPlacementControls
                paneId={paneId}
                slot={getTemplateMarkSlotForSection(
                  templateState.markSlots,
                  'media',
                )}
                idPrefix={`${paneId}-media-mark`}
                resetLabel="Reset media mark layout"
                actions={actions}
              />
            </CaseInsertMediaMarkSetupControls>
          ) : null}
          {section.markKind === 'platform' ? (
            <CaseInsertPlatformMarkSetupControls
              {...brandingControls}
              idPrefix={`${paneId}-${section.markKind}`}
              renderLayoutControls={(value, label) => (
                <TemplateMarkPlacementControls
                  paneId={paneId}
                  slot={getEnabledCaseInsertMarkSlotForSourcePrefix(
                    templateState.markSlots,
                    'platform',
                    `case-platform:${value}:`,
                  )}
                  idPrefix={`${paneId}-platform-mark-${value}`}
                  resetLabel={`Reset ${label} layout`}
                  actions={actions}
                />
              )}
            />
          ) : null}
          {section.markKind === 'technical' ? (
            <CaseInsertTechnicalMarkSetupControls
              {...brandingControls}
              idPrefix={`${paneId}-${section.markKind}`}
              renderLayoutControls={(value, label, _asset, assetId) => (
                <TemplateMarkPlacementControls
                  paneId={paneId}
                  slot={getEnabledCaseInsertMarkSlotForSourcePrefix(
                    templateState.markSlots,
                    'technical',
                    `case-technical:${value}:${assetId ?? 'primary'}`,
                  )}
                  idPrefix={`${paneId}-technical-mark-${value}-${assetId ?? 'primary'}`}
                  resetLabel={`Reset ${label} layout`}
                  actions={actions}
                />
              )}
            />
          ) : null}
        </CaseInsertBrandingFeatureSection>
      ))}
    </>
  )
}

export function CaseInsertTemplateTextControls({
  paneId,
  templateState,
  projectMetadata,
  actions,
}: CaseInsertTemplateControlsProps) {
  const textBlocks = sortTextBlocksForControls(templateState.textBlocks)
  const leadingTextBlocks = paneId === 'tray'
    ? textBlocks.filter((textBlock) =>
        getTextBlockControlPriority(textBlock) <= 90)
    : textBlocks
  const trailingTextBlocks = paneId === 'tray'
    ? textBlocks.filter((textBlock) =>
        getTextBlockControlPriority(textBlock) > 90)
    : []

  return (
    <div className="editor-text-control-list">
      {leadingTextBlocks.map((textBlock) => (
        <TextBlockControls
          key={textBlock.id}
          paneId={paneId}
          textBlock={textBlock}
          projectMetadata={projectMetadata}
          actions={actions}
        />
      ))}
      {templateState.textLists.map((textList) => (
        <TextListControls
          key={textList.id}
          paneId={paneId}
          textList={textList}
          actions={actions}
        />
      ))}
      {trailingTextBlocks.map((textBlock) => (
        <TextBlockControls
          key={textBlock.id}
          paneId={paneId}
          textBlock={textBlock}
          projectMetadata={projectMetadata}
          actions={actions}
        />
      ))}
    </div>
  )
}

export function CaseInsertTemplateWorkflowControls(
  props: CaseInsertTemplateControlsProps,
) {
  return (
    <>
      <CaseInsertWorkflowSection title="Artwork" spacingTop={false}>
        <CaseInsertTemplateArtworkControls {...props} />
      </CaseInsertWorkflowSection>
      <CaseInsertWorkflowSection title="Branding" variant="branding">
        <CaseInsertTemplateBrandingControls {...props} />
      </CaseInsertWorkflowSection>
      <CaseInsertWorkflowSection title="Text">
        <CaseInsertTemplateTextControls {...props} />
      </CaseInsertWorkflowSection>
    </>
  )
}
