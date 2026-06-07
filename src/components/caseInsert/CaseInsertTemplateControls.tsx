import type { ReactNode } from 'react'
import type {
  CaseInsertImageSlotGroupKey,
  CaseInsertTemplatePaneId,
} from '../../caseInsert/templateSurfaces'
import type { CaseInsertTemplateEditorActions } from '../../hooks/useCaseInsertTemplateEditor'
import { getProjectImageAssetStatus } from '../../project/projectAssetStatus'
import {
  getCaseInsertMarkLayerKind,
  type CaseInsertBrandingSourceCatalog,
  type CaseInsertMarkLayerKind,
} from '../../caseInsert/brandingSlotSources'
import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertSurfaceState,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
} from '../../project/projectTypes'
import { PlusIcon } from '../sidebar/PanelIcons'
import { RepeatedVisualElementCard } from '../sidebar/RepeatedVisualElementCard'
import {
  CaseInsertImageSourceControls,
  type CaseInsertImageSourceControlSource,
  type CaseInsertImageSourceCatalog,
} from './CaseInsertImageSourceControls'
import { CaseInsertBrandingSourceControls } from './CaseInsertBrandingSourceControls'
import { CaseInsertWorkflowSection } from './CaseInsertWorkflowSection'

export type CaseInsertTemplateControlsProps = {
  paneId: CaseInsertTemplatePaneId
  templateState: ProjectCaseInsertSurfaceState
  actions: CaseInsertTemplateEditorActions
  imageSources: CaseInsertImageSourceCatalog
  brandingSources: CaseInsertBrandingSourceCatalog
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

const CASE_INSERT_MARK_BRANDING_SECTIONS: Array<{
  title: string
  emptyHint: string
  addLabel: string
  markKind: CaseInsertMarkLayerKind
  sourceSectionIds: readonly string[]
}> = [
  {
    title: 'Rating badge',
    emptyHint: 'No rating badges.',
    addLabel: 'Add rating badge',
    markKind: 'rating',
    sourceSectionIds: ['rating'],
  },
  {
    title: 'Media format mark',
    emptyHint: 'No media format marks.',
    addLabel: 'Add media format mark',
    markKind: 'media',
    sourceSectionIds: ['media'],
  },
  {
    title: 'Operating system marks',
    emptyHint: 'No operating system marks.',
    addLabel: 'Add operating system mark',
    markKind: 'platform',
    sourceSectionIds: ['platform'],
  },
  {
    title: 'Technical marks',
    emptyHint: 'No technical marks.',
    addLabel: 'Add technical mark',
    markKind: 'technical',
    sourceSectionIds: ['technical'],
  },
]

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

function getPositionPresets(paneId: CaseInsertTemplatePaneId) {
  return paneId === 'cover' ? COVER_POSITION_PRESETS : TRAY_POSITION_PRESETS
}

function getTextBlockRows(textBlock: ProjectCaseInsertTextBlock) {
  if (textBlock.id.includes('description')) return 5
  if (textBlock.id.includes('requirements')) return 4

  return 3
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

function isCaseInsertImageSourceControlActive(
  imageSource: ProjectCaseInsertImageSlot['imageSource'],
  source: CaseInsertImageSourceControlSource,
) {
  if (!imageSource) return source === 'local-file'

  switch (source) {
    case 'steam-artwork':
    case 'web-artwork':
    case 'local-steam-screenshot':
      return imageSource.source === source
    case 'local-file':
      return ![
        'steam-artwork',
        'web-artwork',
        'local-steam-screenshot',
      ].includes(imageSource.source)
  }
}

function CaseInsertImageSlotFineTuneControls({
  paneId,
  uploadId,
  slot,
  source,
  sectionLabel,
  isBackground,
  onFitChange,
  onFitToRegion,
  onLayoutChange,
  onResetLayout,
  onClearImage,
  featureEnabled,
}: {
  paneId: CaseInsertTemplatePaneId
  uploadId: string
  slot: ProjectCaseInsertImageSlot
  source: CaseInsertImageSourceControlSource
  sectionLabel: string
  isBackground: boolean
  onFitChange: (fit: ProjectCaseInsertImageFit) => void
  onFitToRegion?: () => void
  onLayoutChange: (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => void
  onResetLayout: () => void
  onClearImage: () => void
  featureEnabled: boolean
}) {
  if (!featureEnabled) {
    return null
  }

  const isActiveSource = isCaseInsertImageSourceControlActive(
    slot.imageSource,
    source,
  )
  const controlsDisabled = !slot.imageDataUrl || !isActiveSource
  const sourceName = sectionLabel.toLocaleLowerCase()
  const statusMessage = !slot.imageDataUrl
    ? `Choose ${sourceName} to unlock fit, scale, position, reset, and clear controls here.`
    : isActiveSource
      ? `These controls adjust the current image from ${sourceName}.`
      : `Inactive while another image source controls this slot.`

  return (
    <fieldset
      className="case-insert-source-layout-controls"
      disabled={controlsDisabled}
      aria-label={`${sectionLabel} placement controls`}
    >
      <legend>Placement</legend>
      <p className="hint">{statusMessage}</p>
      <ImageSlotStatus slot={slot} />

      {isBackground ? (
        <>
          <button
            className="secondary-button spacing-top"
            type="button"
            onClick={onFitToRegion}
          >
            Fit image
          </button>
          <RangeField
            id={`${uploadId}-${source}-scale`}
            label="Scale"
            min={0.01}
            max={4}
            step={0.01}
            value={slot.layout.scale}
            onChange={(value) => onLayoutChange('scale', value)}
          />
          <RangeField
            id={`${uploadId}-${source}-x`}
            label="X position"
            min={-100}
            max={100}
            step={1}
            value={slot.layout.x}
            onChange={(value) => onLayoutChange('x', value)}
          />
          <RangeField
            id={`${uploadId}-${source}-y`}
            label="Y position"
            min={-100}
            max={100}
            step={1}
            value={slot.layout.y}
            onChange={(value) => onLayoutChange('y', value)}
          />
        </>
      ) : (
        <>
          <FitSelect
            id={`${uploadId}-${source}-fit`}
            fit={slot.fit}
            onFitChange={onFitChange}
          />
          <OverlayPositionPreset
            id={`${uploadId}-${source}-placement`}
            paneId={paneId}
            onLayoutChange={onLayoutChange}
          />
          <RangeField
            id={`${uploadId}-${source}-scale`}
            label="Scale"
            min={0.25}
            max={2.5}
            step={0.01}
            value={slot.layout.scale}
            onChange={(value) => onLayoutChange('scale', value)}
          />
          <RangeField
            id={`${uploadId}-${source}-x`}
            label="X position"
            min={0}
            max={100}
            step={1}
            value={slot.layout.x}
            onChange={(value) => onLayoutChange('x', value)}
          />
          <RangeField
            id={`${uploadId}-${source}-y`}
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
          onClick={onResetLayout}
        >
          Reset layout
        </button>
        {slot.imageDataUrl ? (
          <button
            className="secondary-button"
            type="button"
            onClick={onClearImage}
          >
            Clear image
          </button>
        ) : null}
      </div>
    </fieldset>
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
    <>
      <label className="field-label spacing-top" htmlFor={id}>Placement</label>
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
    </>
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
    <CaseInsertImageSlotFineTuneControls
      paneId={paneId}
      uploadId={uploadId}
      slot={slot}
      source={source}
      sectionLabel={sectionLabel}
      isBackground={isBackground}
      onFitChange={(fit) =>
        actions.handleImageSlotFitChange(paneId, slotKey, fit)}
      onFitToRegion={() =>
        actions.handleFitImageSlotToRegion(paneId, slotKey, slot.label)}
      onLayoutChange={onLayoutChange}
      onResetLayout={() => actions.handleResetImageSlotLayout(paneId, slotKey)}
      onClearImage={() =>
        actions.handleClearImageSlot(paneId, slotKey, slot.label)}
      featureEnabled={slot.enabled}
    />
  )

  const shouldShowSources = isBackground || slot.enabled
  const className = isBackground
    ? 'case-insert-primary-slot-control case-insert-background-control'
    : 'case-insert-control-card case-insert-primary-slot-control'

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
    <CaseInsertImageSlotFineTuneControls
      paneId={paneId}
      uploadId={uploadId}
      slot={slot}
      source={source}
      sectionLabel={sectionLabel}
      isBackground={false}
      onFitChange={(fit) =>
        actions.handleGroupedImageSlotFitChange(
          paneId,
          slotKey,
          slot.id,
          fit,
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
      featureEnabled={slot.enabled}
    />
  )
  const slotTitle = slot.label.trim() || 'Visual slot'
  const slotImageStatus = getImageStatus(slot)
  const summary = [
    slot.enabled ? 'shown' : 'hidden',
    slot.imageDataUrl ? slotImageStatus.summary : 'no image',
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
  ...slotListProps
}: GroupedImageSlotListProps & {
  title: string
}) {
  return (
    <details className="feature-section-card metadata-details collapsible-panel spacing-top">
      <summary className="panel-summary">{title}</summary>
      <div className="panel-content">
        <GroupedImageSlotList {...slotListProps} />
      </div>
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

      {paneId === 'cover' ? (
        <PrimaryImageSlotControls
          paneId={paneId}
          slotKey="titleArtwork"
          slot={templateState.titleArtwork}
          title="title/logo artwork"
          enableLabel="Show title/logo artwork"
          uploadId={`${paneId}-title-artwork-upload`}
          imageSources={imageSources}
          actions={actions}
        />
      ) : null}

      <GroupedImageSlotSection
        paneId={paneId}
        title={paneId === 'cover' ? 'Artwork' : 'Screenshots'}
        emptyHint={paneId === 'cover' ? 'No artwork slots.' : 'No screenshots.'}
        addLabel={paneId === 'cover' ? 'Add artwork slot' : 'Add screenshot slot'}
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
}: CaseInsertTemplateControlsProps) {
  return (
    <>
      <CaseInsertBrandingFeatureSection title="Developer / publisher logos">
        <CaseInsertBrandingSourceControls
          brandingSources={brandingSources}
          sectionIds={['logos']}
          showSectionTitles={false}
          onUseSource={(source) =>
            actions.handleUseBrandingSlotSource(paneId, source)}
        />
        <GroupedImageSlotList
          paneId={paneId}
          emptyHint="No logos."
          addLabel="Add logo"
          slotKey="logoSlots"
          slots={templateState.logoSlots}
          imageSources={imageSources}
          actions={actions}
        />
      </CaseInsertBrandingFeatureSection>

      {CASE_INSERT_MARK_BRANDING_SECTIONS.map((section) => {
        const visibleMarkSlots = templateState.markSlots.filter((slot) =>
          getCaseInsertMarkLayerKind(slot.imageSource?.sourceId) ===
            section.markKind)

        return (
          <CaseInsertBrandingFeatureSection
            key={section.markKind}
            title={section.title}
          >
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
