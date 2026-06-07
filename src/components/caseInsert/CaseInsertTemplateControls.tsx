import type { ReactNode } from 'react'
import type {
  CaseInsertImageSlotGroupKey,
  CaseInsertTemplatePaneId,
} from '../../caseInsert/templateSurfaces'
import type { CaseInsertTemplateEditorActions } from '../../hooks/useCaseInsertTemplateEditor'
import type { LogoCandidateDiscoveryState } from '../../hooks/useLogoAssetDiscovery'
import { getProjectImageAssetStatus } from '../../project/projectAssetStatus'
import {
  type CaseInsertBrandingSourceCatalog,
} from '../../caseInsert/brandingSlotSources'
import {
  CASE_INSERT_MARK_BRANDING_SECTIONS,
} from '../../caseInsert/brandingPanelSections'
import {
  getCaseInsertAdditionalLogoSlots,
  getCaseInsertPrimaryLogoSlot,
} from '../../caseInsert/brandingLogoSlots'
import {
  isCaseInsertMarkKindEnabled,
  isCaseInsertMarkSlotVisible,
} from '../../caseInsert/brandingVisibility'
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
} from '../../project/projectTypes'
import type { LogoAssetKey } from '../../project/projectLogoAssets'
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
import { CaseInsertImageSlotFrameControls } from './CaseInsertImageSlotFrameControls'
import { CaseInsertImageSlotStatusCard } from './CaseInsertImageSlotStatusCard'
import {
  CaseInsertTitleArtworkControls,
  type CaseInsertTitleArtworkPlacementField,
} from './CaseInsertTitleArtworkControls'
import { CaseInsertBrandingSourceControls } from './CaseInsertBrandingSourceControls'
import {
  CaseInsertMediaMarkSetupControls,
  CaseInsertPlatformMarkSetupControls,
  CaseInsertRatingBadgeSetupControls,
  CaseInsertTechnicalMarkSetupControls,
  type CaseInsertBrandingSetupControlsProps,
} from './CaseInsertBrandingSetupControls'
import { CaseInsertLogoSlotControls } from './CaseInsertLogoSlotControls'
import { CaseInsertWorkflowSection } from './CaseInsertWorkflowSection'

export type CaseInsertTemplateControlsProps = {
  paneId: CaseInsertTemplatePaneId
  templateState: ProjectCaseInsertSurfaceState
  actions: CaseInsertTemplateEditorActions
  imageSources: CaseInsertImageSourceCatalog
  brandingSources: CaseInsertBrandingSourceCatalog
  brandingControls: CaseInsertBrandingSetupControlsProps
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

function getPositionPresets(paneId: CaseInsertTemplatePaneId) {
  return paneId === 'cover' ? COVER_POSITION_PRESETS : TRAY_POSITION_PRESETS
}

function getTextBlockRows(textBlock: ProjectCaseInsertTextBlock) {
  if (textBlock.id.includes('description')) return 5
  if (textBlock.id.includes('requirements')) return 4

  return 3
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
  const summary = [
    slot.enabled ? 'shown' : 'hidden',
    slot.imageDataUrl ? slotImageStatus.summary : 'no image',
    slotKey === 'artworkSlots'
      ? slot.frame.enabled ? `${slot.frame.shape} frame` : 'no frame'
      : null,
    `fit ${slot.fit}`,
    `scale ${slot.layout.scale.toFixed(2)}`,
  ].filter(Boolean).join(' · ')

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
          <CaseInsertImageSlotFrameControls
            idPrefix={uploadId}
            slot={slot}
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
      <button
        className="secondary-button icon-text-button spacing-top"
        type="button"
        onClick={onAddSlot ?? (() =>
          actions.handleAddGroupedImageSlot(paneId, slotKey))}
      >
        <PlusIcon />
        <span>{addLabel}</span>
      </button>
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
    <details className="feature-section-card metadata-details collapsible-panel spacing-top">
      <summary className="panel-summary">{title}</summary>
      <div className="panel-content">
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
      </div>
    </details>
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
    <details className="feature-section-card metadata-details collapsible-panel spacing-top">
      <summary className="panel-summary">{title}</summary>
      <div className="panel-content">{children}</div>
    </details>
  )
}

function TextBlockControls({
  paneId,
  textBlock,
  actions,
}: {
  paneId: CaseInsertTemplatePaneId
  textBlock: ProjectCaseInsertTextBlock
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

  return (
    <div className="disc-text-control">
      <label className="checkbox-row disc-text-enable-row">
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
        <div className="disc-text-control-body">
          <div className="disc-text-control-group">
            <label className="field-label" htmlFor={`${textBlock.id}-value`}>
              Text value
            </label>
            <textarea
              id={`${textBlock.id}-value`}
              rows={getTextBlockRows(textBlock)}
              value={textBlock.value}
              onChange={(event) =>
                actions.handleTextBlockValueChange(
                  paneId,
                  textBlock.id,
                  event.target.value,
                )}
            />
          </div>

          <div className="disc-text-control-group">
            <label className="field-label" htmlFor={`${textBlock.id}-align`}>
              Alignment
            </label>
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
          </div>

          <div className="disc-text-control-group">
            <OverlayPositionPreset
              id={`${textBlock.id}-placement`}
              paneId={paneId}
              onLayoutChange={onLayoutChange}
            />
            <RangeField
              id={`${textBlock.id}-scale`}
              label="Scale"
              min={0.7}
              max={1.8}
              step={0.01}
              value={textBlock.layout.scale}
              onChange={(value) => onLayoutChange('scale', value)}
            />
            <RangeField
              id={`${textBlock.id}-x`}
              label="X position"
              min={0}
              max={100}
              step={1}
              value={textBlock.layout.x}
              onChange={(value) => onLayoutChange('x', value)}
            />
            <RangeField
              id={`${textBlock.id}-y`}
              label="Y position"
              min={0}
              max={100}
              step={1}
              value={textBlock.layout.y}
              onChange={(value) => onLayoutChange('y', value)}
            />
          </div>

          <div className="disc-text-control-group disc-text-action-group">
            <button
              className="secondary-button disc-text-reset-button"
              type="button"
              onClick={() =>
                actions.handleResetTextBlockLayout(paneId, textBlock.id)}
            >
              Reset {textBlock.label.toLocaleLowerCase()} layout
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

  return (
    <div className="disc-text-control">
      <label className="checkbox-row disc-text-enable-row">
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
        <div className="disc-text-control-body">
          <div className="disc-text-control-group">
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

          <div className="disc-text-control-group">
            <OverlayPositionPreset
              id={`${textList.id}-placement`}
              paneId={paneId}
              onLayoutChange={onLayoutChange}
            />
            <RangeField
              id={`${textList.id}-scale`}
              label="Scale"
              min={0.7}
              max={1.8}
              step={0.01}
              value={textList.layout.scale}
              onChange={(value) => onLayoutChange('scale', value)}
            />
            <RangeField
              id={`${textList.id}-x`}
              label="X position"
              min={0}
              max={100}
              step={1}
              value={textList.layout.x}
              onChange={(value) => onLayoutChange('x', value)}
            />
            <RangeField
              id={`${textList.id}-y`}
              label="Y position"
              min={0}
              max={100}
              step={1}
              value={textList.layout.y}
              onChange={(value) => onLayoutChange('y', value)}
            />
          </div>

          <div className="disc-text-control-group disc-text-action-group">
            <button
              className="secondary-button disc-text-reset-button"
              type="button"
              onClick={() =>
                actions.handleResetTextListLayout(paneId, textList.id)}
            >
              Reset {textList.label.toLocaleLowerCase()} layout
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
          helpText="This is the game title/logo artwork on the case insert. Steam import can seed the Steam CDN logo when available; template text stays independently available in the Text tab."
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
        emptyHint="No additional artwork slots."
        addLabel="Add artwork slot"
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
    <details className="branding-feature-card metadata-details collapsible-panel spacing-top">
      <summary className="panel-summary">{title}</summary>
      <div className="panel-content">{children}</div>
    </details>
  )
}

export function CaseInsertTemplateBrandingControls({
  paneId,
  templateState,
  actions,
  imageSources,
  brandingSources,
  brandingControls,
  logoCandidateDiscovery,
  handleFindLogoCandidates,
}: CaseInsertTemplateControlsProps) {
  const developerLogoSlot = getCaseInsertPrimaryLogoSlot(
    templateState,
    'developer',
  )
  const publisherLogoSlot = getCaseInsertPrimaryLogoSlot(
    templateState,
    'publisher',
  )
  const additionalLogoSlots = getCaseInsertAdditionalLogoSlots(templateState)

  return (
    <>
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
        />

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
        />

        <details className="feature-section-card metadata-details collapsible-panel spacing-top">
          <summary className="panel-summary">Additional logos</summary>
          <div className="panel-content">
            <GroupedImageSlotList
              paneId={paneId}
              emptyHint="No additional logos."
              addLabel="Add additional logo"
              slotKey="logoSlots"
              slots={additionalLogoSlots}
              imageSources={imageSources}
              actions={actions}
            />
          </div>
        </details>
      </CaseInsertBrandingFeatureSection>

      {CASE_INSERT_MARK_BRANDING_SECTIONS.map((section) => {
        const isFeatureEnabled = isCaseInsertMarkKindEnabled(
          section.markKind,
          brandingSources,
        )
        const visibleMarkSlots = templateState.markSlots.filter((slot) =>
          isCaseInsertMarkSlotVisible(
            slot,
            section.markKind,
            brandingSources,
          ))

        return (
          <CaseInsertBrandingFeatureSection
            key={section.markKind}
            title={section.title}
          >
            {section.markKind === 'rating' ? (
              <CaseInsertRatingBadgeSetupControls {...brandingControls} />
            ) : null}
            {section.markKind === 'media' ? (
              <CaseInsertMediaMarkSetupControls {...brandingControls} />
            ) : null}
            {section.markKind === 'platform' ? (
              <CaseInsertPlatformMarkSetupControls {...brandingControls} />
            ) : null}
            {section.markKind === 'technical' ? (
              <CaseInsertTechnicalMarkSetupControls {...brandingControls} />
            ) : null}
            {isFeatureEnabled ? (
              <>
                <CaseInsertBrandingSourceControls
                  brandingSources={brandingSources}
                  sectionIds={section.sourceSectionIds}
                  showSectionTitles={false}
                  onUseSource={(source) =>
                    actions.handleUseBrandingSlotSource(paneId, source)}
                />
                <GroupedImageSlotList
                  paneId={paneId}
                  emptyHint={section.emptyHint}
                  addLabel={section.addLabel}
                  slotKey="markSlots"
                  slots={visibleMarkSlots}
                  imageSources={imageSources}
                  actions={actions}
                  onAddSlot={() =>
                    actions.handleAddBrandingMarkSlot(paneId, section.markKind)}
                />
              </>
            ) : null}
          </CaseInsertBrandingFeatureSection>
        )
      })}
    </>
  )
}

export function CaseInsertTemplateTextControls({
  paneId,
  templateState,
  actions,
}: CaseInsertTemplateControlsProps) {
  return (
    <div className="disc-text-control-list">
      {templateState.textBlocks.map((textBlock) => (
        <TextBlockControls
          key={textBlock.id}
          paneId={paneId}
          textBlock={textBlock}
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
