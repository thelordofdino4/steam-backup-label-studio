import type { ReactNode } from 'react'
import type {
  JewelCaseSpineImageSlotKey,
  JewelCaseSpineImageSlotGroupKey,
} from '../../caseInsert/jewelCaseTransitions'
import {
  CASE_INSERT_ARTWORK_SECTION_LABELS,
} from '../../caseInsert/artworkPanelSections'
import {
  CASE_INSERT_MARK_BRANDING_SECTIONS,
} from '../../caseInsert/brandingPanelSections'
import {
  getEnabledCaseInsertMarkSlotForKind,
  getEnabledCaseInsertMarkSlotForSourcePrefix,
} from '../../caseInsert/brandingMarkPlacement'
import {
  getCaseInsertSpineMarkPlacementFields,
} from '../../caseInsert/brandingMarkPlacementFields'
import {
  getCaseInsertAdditionalLogoKey,
  getCaseInsertAdditionalLogoSlotsForKey,
  getCaseInsertPrimaryLogoSlot,
  getCaseInsertUnassignedAdditionalLogoSlots,
} from '../../caseInsert/brandingLogoSlots'
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
  getJewelCaseSpineBackgroundLayoutSliderRanges,
  getJewelCaseSpineImageSlotLayoutSliderRanges,
  type JewelCaseSpineOverlayRole,
} from '../../layout/jewelCaseSpineLayout'
import type {
  CaseInsertMarkLayerKind,
} from '../../caseInsert/brandingSlotSources'
import type {
  CaseInsertBrandingMarkTarget,
  CaseInsertBrandingMarkTargetState,
} from '../../caseInsert/brandingMarkSlots'
import type { JewelCaseSpineSide } from '../../caseInsert/types'
import type { JewelCaseSpineEditorActions } from '../../hooks/useJewelCaseSpineEditor'
import type { LogoCandidateDiscoveryState } from '../../hooks/useLogoAssetDiscovery'
import { getProjectImageAssetStatus } from '../../project/projectAssetStatus'
import type {
  PlatformMarkValue,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectPlatformMarkAsset,
  ProjectTechnicalMarkAsset,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextSource,
  ProjectMetadata,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseSpineState,
  TechnicalMarkValue,
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
} from '../../caseInsert/textLayout'
import type {
  CaseInsertTextStyleField,
  CaseInsertTextStyleValue,
} from '../../caseInsert/textStyles'
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
} from './CaseInsertBrandingSetupControls'
import type {
  CaseInsertBrandingSetupControlsProps,
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
import { EditorArtworkFrameControls } from '../editor/EditorArtworkFrameControls'
import { EditorFeaturePanel } from '../editor/EditorPanel'
import { EditorRangeField } from '../editor/EditorRangeField'
import { PlusIcon } from '../sidebar/PanelIcons'
import { RepeatedVisualElementCard } from '../sidebar/RepeatedVisualElementCard'

export type CaseInsertSpineControlsProps = {
  spine: ProjectJewelCaseSpineState
  projectMetadata: ProjectMetadata
  actions: JewelCaseSpineEditorActions
  imageSources: CaseInsertImageSourceCatalog
  getBrandingControls: (
    target: CaseInsertBrandingMarkTarget,
    targetState: CaseInsertBrandingMarkTargetState,
  ) => CaseInsertBrandingSetupControlsProps
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

function sortSpineTextBlocksForControls(
  textBlocks: ProjectCaseInsertTextBlock[],
) {
  return [...textBlocks].sort(
    (left, right) =>
      getCaseInsertTextBlockPriority(left) - getCaseInsertTextBlockPriority(right),
  )
}

function SpineTextLayoutPresetControl({
  id,
  presets,
  onApplyPreset,
}: {
  id: string
  presets: ReturnType<typeof getCaseInsertTextBlockLayoutPresets>
  onApplyPreset: (presetId: string) => void
}) {
  return (
    <label htmlFor={id}>
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

function SpineTitleControls({
  side,
  title,
  projectMetadata,
  actions,
}: {
  side: JewelCaseSpineSide
  title: ProjectCaseInsertTextBlock
  projectMetadata: ProjectMetadata
  actions: JewelCaseSpineEditorActions
}) {
  const onLayoutChange = (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => actions.handleSpineTitleLayoutChange(side, field, value)
  const inputState = getCaseInsertTextBlockInputState(
    title,
    projectMetadata,
  )
  const layoutPresets = getCaseInsertTextBlockLayoutPresets('spine', title)

  return (
    <div className="editor-text-control">
      <label className="checkbox-row editor-text-enable-row">
        <input
          type="checkbox"
          checked={title.enabled}
          onChange={(event) =>
            actions.handleSpineTitleEnabledChange(side, event.target.checked)}
        />
        <span>Game title</span>
      </label>

      {!title.enabled ? null : (
        <div className="editor-text-control-body">
          <CaseInsertTextOptionalStyleControls
            idPrefix={`${side}-spine-title`}
            label={title.label}
            style={title.style}
            avoidVisualElements={title.avoidVisualElements}
            onAvoidVisualElementsChange={(avoidVisualElements) =>
              actions.handleSpineTitleAvoidVisualElementsChange(
                side,
                avoidVisualElements,
              )}
            onStyleChange={(field, value) =>
              actions.handleSpineTitleStyleChange(side, field, value)}
          />

          <CaseInsertTextSourceControls
            label={title.label}
            source={title.source}
            isMetadataBacked={inputState.isMetadataBacked}
            isManualOverride={inputState.isManualOverride}
            onUseMetadataValue={() =>
              actions.handleSpineTitleValueChange(side, '', 'metadata')}
          />

          <CaseInsertTextStyleControls
            idPrefix={`${side}-spine-title`}
            label={title.label}
            style={title.style}
            source={title.source}
            onStyleChange={(field, value) =>
              actions.handleSpineTitleStyleChange(side, field, value)}
            onApplyStylePreset={(presetId) =>
              actions.handleApplySpineTitleStylePreset(side, presetId)}
          />

          <div
            className="editor-control-group"
            aria-label={`${title.label} text controls`}
          >
            <label className="field-label" htmlFor={`${side}-spine-title`}>
              Text value
            </label>
            <input
              id={`${side}-spine-title`}
              className="editor-text-input"
              type="text"
              value={inputState.value}
              placeholder={inputState.placeholder}
              onChange={(event) => {
                const value = event.target.value

                actions.handleSpineTitleValueChange(
                  side,
                  value,
                  getNextCaseInsertTextSource(title, value),
                )
              }}
            />
          </div>

          <div
            className="editor-control-group"
            aria-label={`${title.label} placement controls`}
          >
            <div className="editor-control-grid">
              <label htmlFor={`${side}-spine-title-align`}>
                <span>Align</span>
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
              </label>

              <label htmlFor={`${side}-spine-title-orientation`}>
                <span>Orientation</span>
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
              </label>

              <SpineTextLayoutPresetControl
                id={`${side}-spine-title-layout-preset`}
                presets={layoutPresets}
                onApplyPreset={(presetId) =>
                  actions.handleApplySpineTitleLayoutPreset(side, presetId)}
              />
            </div>
          </div>

          <div
            className="editor-control-group"
            aria-label={`${title.label} fine tuning controls`}
          >
            <div className="editor-control-grid">
              <EditorRangeField
                id={`${side}-spine-title-scale`}
                label="Scale"
                min={0.7}
                max={1.6}
                step={0.01}
                value={title.layout.scale}
                onChange={(value) => onLayoutChange('scale', value)}
              />
              <EditorRangeField
                id={`${side}-spine-title-width`}
                label="Width"
                min={CASE_INSERT_TEXT_WIDTH_MIN}
                max={CASE_INSERT_TEXT_WIDTH_MAX}
                step={1}
                value={getCaseInsertTextLayoutWidth(title.layout, 90)}
                onChange={(value) => onLayoutChange('width', value)}
              />
              <EditorRangeField
                id={`${side}-spine-title-x`}
                label="Cross"
                min={0}
                max={100}
                step={1}
                value={title.layout.x}
                onChange={(value) => onLayoutChange('x', value)}
              />
              <EditorRangeField
                id={`${side}-spine-title-y`}
                label="Length"
                min={0}
                max={100}
                step={1}
                value={title.layout.y}
                onChange={(value) => onLayoutChange('y', value)}
              />
              <CaseInsertTextBackgroundFineTuneControls
                idPrefix={`${side}-spine-title`}
                style={title.style}
                onStyleChange={(field, value) =>
                  actions.handleSpineTitleStyleChange(side, field, value)}
              />
            </div>
          </div>

          <div className="editor-control-group editor-action-group">
            <button
              className="secondary-button editor-text-reset-button"
              type="button"
              onClick={() => actions.handleResetSpineTitleLayout(side)}
            >
              Reset game title layout
            </button>
            <button
              className="secondary-button editor-text-reset-button"
              type="button"
              onClick={() => actions.handleResetSpineTitleStyle(side)}
            >
              Reset game title style
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SpineTextBlockControls({
  side,
  textBlock,
  projectMetadata,
  actions,
}: {
  side: JewelCaseSpineSide
  textBlock: ProjectCaseInsertTextBlock
  projectMetadata: ProjectMetadata
  actions: JewelCaseSpineEditorActions
}) {
  const onLayoutChange = (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => actions.handleSpineTextBlockLayoutChange(
    side,
    textBlock.id,
    field,
    value,
  )
  const onStyleChange = (
    field: CaseInsertTextStyleField,
    value: CaseInsertTextStyleValue,
  ) => actions.handleSpineTextBlockStyleChange(
    side,
    textBlock.id,
    field,
    value,
  )
  const onValueChange = (
    value: string,
    source?: ProjectCaseInsertTextSource,
  ) => actions.handleSpineTextBlockValueChange(
    side,
    textBlock.id,
    value,
    source,
  )
  const inputState = getCaseInsertTextBlockInputState(
    textBlock,
    projectMetadata,
  )
  const layoutPresets = getCaseInsertTextBlockLayoutPresets('spine', textBlock)

  return (
    <div className="editor-text-control">
      <label className="checkbox-row editor-text-enable-row">
        <input
          type="checkbox"
          checked={textBlock.enabled}
          onChange={(event) =>
            actions.handleSpineTextBlockEnabledChange(
              side,
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
              actions.handleSpineTextBlockAvoidVisualElementsChange(
                side,
                textBlock.id,
                avoidVisualElements,
              )}
            onStyleChange={onStyleChange}
          />

          <CaseInsertTextSourceControls
            label={textBlock.label}
            source={textBlock.source}
            isMetadataBacked={inputState.isMetadataBacked}
            isManualOverride={inputState.isManualOverride}
            onUseMetadataValue={() => onValueChange('', 'metadata')}
          />

          <CaseInsertTextStyleControls
            idPrefix={textBlock.id}
            label={textBlock.label}
            style={textBlock.style}
            source={textBlock.source}
            onStyleChange={onStyleChange}
            onApplyStylePreset={(presetId) =>
              actions.handleApplySpineTextBlockStylePreset(
                side,
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

                onValueChange(
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
                    actions.handleSpineTextBlockAlignChange(
                      side,
                      textBlock.id,
                      event.target.value as ProjectCaseInsertTextAlign,
                    )}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>

              <label htmlFor={`${textBlock.id}-orientation`}>
                <span>Orientation</span>
                <select
                  id={`${textBlock.id}-orientation`}
                  value={getTitleOrientationValue(textBlock)}
                  onChange={(event) =>
                    actions.handleSpineTextBlockOrientationChange(
                      side,
                      textBlock.id,
                      Number(event.target.value),
                    )}
                >
                  {TITLE_ORIENTATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <SpineTextLayoutPresetControl
                id={`${textBlock.id}-layout-preset`}
                presets={layoutPresets}
                onApplyPreset={(presetId) =>
                  actions.handleApplySpineTextBlockLayoutPreset(
                    side,
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
                min={0.5}
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
                label="Cross"
                min={0}
                max={100}
                step={1}
                value={textBlock.layout.x}
                onChange={(value) => onLayoutChange('x', value)}
              />
              <EditorRangeField
                id={`${textBlock.id}-y`}
                label="Length"
                min={0}
                max={100}
                step={1}
                value={textBlock.layout.y}
                onChange={(value) => onLayoutChange('y', value)}
              />
              <CaseInsertTextBackgroundFineTuneControls
                idPrefix={textBlock.id}
                style={textBlock.style}
                onStyleChange={onStyleChange}
              />
            </div>
          </div>

          <div className="editor-control-group editor-action-group">
            <button
              className="secondary-button editor-text-reset-button"
              type="button"
              onClick={() =>
                actions.handleResetSpineTextBlockLayout(side, textBlock.id)}
            >
              Reset {textBlock.label.toLocaleLowerCase()} layout
            </button>
            <button
              className="secondary-button editor-text-reset-button"
              type="button"
              onClick={() =>
                actions.handleResetSpineTextBlockStyle(side, textBlock.id)}
            >
              Reset {textBlock.label.toLocaleLowerCase()} style
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
      ? 'bundled generic'
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
    <EditorFeaturePanel title={CASE_INSERT_ARTWORK_SECTION_LABELS.additionalArtwork}>
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
            </>
          ) : null}
        </div>
    </EditorFeaturePanel>
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
    <EditorFeaturePanel
      title={label}
      className="case-insert-spine-side-section"
    >
      {children}
    </EditorFeaturePanel>
  )
}

function SpineBrandingFeatureSection({
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

function SpineMarkSetupControls({
  markKind,
  brandingControls,
  idPrefix,
  children,
  renderSupplementalUskLayoutControls,
  renderLayoutControls,
}: {
  markKind: CaseInsertMarkLayerKind
  brandingControls: CaseInsertBrandingSetupControlsProps
  idPrefix: string
  children?: ReactNode
  renderSupplementalUskLayoutControls?: () => ReactNode
  renderLayoutControls?: (
    value: PlatformMarkValue | TechnicalMarkValue,
    label: string,
    asset: ProjectPlatformMarkAsset | ProjectTechnicalMarkAsset,
    assetId?: string | null,
  ) => ReactNode
}) {
  const setupProps = {
    ...brandingControls,
    idPrefix,
  }

  if (markKind === 'rating') {
    return (
      <CaseInsertRatingBadgeSetupControls
        {...setupProps}
        renderSupplementalUskLayoutControls={renderSupplementalUskLayoutControls}
      >
        {children}
      </CaseInsertRatingBadgeSetupControls>
    )
  }

  if (markKind === 'media') {
    return (
      <CaseInsertMediaMarkSetupControls {...setupProps}>
        {children}
      </CaseInsertMediaMarkSetupControls>
    )
  }

  if (markKind === 'platform') {
    return (
      <CaseInsertPlatformMarkSetupControls
        {...setupProps}
        renderLayoutControls={
          renderLayoutControls as (
            value: PlatformMarkValue,
            label: string,
            asset: ProjectPlatformMarkAsset,
          ) => ReactNode
        }
      />
    )
  }

  return (
    <CaseInsertTechnicalMarkSetupControls
      {...setupProps}
      renderLayoutControls={
        renderLayoutControls as (
          value: TechnicalMarkValue,
          label: string,
          asset: ProjectTechnicalMarkAsset,
          assetId?: string | null,
        ) => ReactNode
      }
    />
  )
}

function SpineMarkPlacementControls({
  side,
  slot,
  idPrefix,
  layoutPresets,
  presetLabel,
  resetLabel,
  actions,
}: {
  side: JewelCaseSpineSide
  slot: ProjectCaseInsertImageSlot | null
  idPrefix: string
  layoutPresets?: typeof RATING_BADGE_LAYOUT_PRESETS
  presetLabel?: string
  resetLabel: string
  actions: JewelCaseSpineEditorActions
}) {
  return (
    <CaseInsertMarkPlacementControls
      fields={slot ? getCaseInsertSpineMarkPlacementFields(side, slot) : []}
      idPrefix={idPrefix}
      layoutPresets={layoutPresets}
      presetLabel={presetLabel}
      slot={slot}
      resetLabel={resetLabel}
      onLayoutChange={(field, value) => {
        if (!slot) return
        actions.handleSpineGroupedImageSlotLayoutChange(
          side,
          'markSlots',
          slot.id,
          field,
          value,
        )
      }}
      onResetLayout={() => {
        if (!slot) return
        actions.handleResetSpineGroupedImageSlotLayout(
          side,
          'markSlots',
          slot.id,
        )
      }}
    />
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
            <EditorFeaturePanel title={CASE_INSERT_ARTWORK_SECTION_LABELS.gameLogo}>
                <CaseInsertTitleArtworkControls
                  slot={state.titleArtwork}
                  uploadId={`${side}-spine-title-artwork-upload`}
                  fields={getSpineImageSlotPlacementFields(
                    side,
                    state.titleArtwork,
                    'titleArtwork',
                  )}
                  helpText="This is the game title/logo artwork on the spine. Steam import can seed the best available Steam title/logo artwork; Game title text stays independently available in the Text tab."
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
            </EditorFeaturePanel>
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
  getBrandingControls,
  logoCandidateDiscovery,
  handleFindLogoCandidates,
}: CaseInsertSpineControlsProps) {
  return (
    <>
      {SPINE_SIDES.map(({ side, label }) => {
        const state = getSpineSideState(spine, side)
        const developerLogoSlot = getCaseInsertPrimaryLogoSlot(
          state,
          'developer',
        )
        const publisherLogoSlot = getCaseInsertPrimaryLogoSlot(
          state,
          'publisher',
        )
        const additionalDeveloperLogoSlots =
          getCaseInsertAdditionalLogoSlotsForKey(state, 'developer')
        const additionalPublisherLogoSlots =
          getCaseInsertAdditionalLogoSlotsForKey(state, 'publisher')
        const unassignedAdditionalLogoSlots =
          getCaseInsertUnassignedAdditionalLogoSlots(state)
        const brandingControls = getBrandingControls(
          { type: 'spine', side },
          state,
        )

        return (
          <SpineSideSection key={side} label={label}>
            <SpineBrandingFeatureSection title="Steam banner">
              <CaseInsertSteamBannerControls
                banner={state.steamBanner}
                idPrefix={`${side}-spine-steam-banner`}
                targetKind="spine"
                onEnabledChange={(enabled) =>
                  actions.handleSpineSteamBannerEnabledChange(side, enabled)}
                onLockupUpload={(event) =>
                  actions.handleSpineSteamBannerLockupUpload(side, event)}
                onClearLockup={() =>
                  actions.handleClearSpineSteamBannerLockup(side)}
                onLayoutChange={(field, value) =>
                  actions.handleSpineSteamBannerLockupLayoutChange(
                    side,
                    field,
                    value,
                  )}
                onResetLayout={() =>
                  actions.handleResetSpineSteamBannerLockupLayout(side)}
                onUseTextFallbackChange={(useTextFallback) =>
                  actions.handleSpineSteamBannerUseTextFallbackChange(
                    side,
                    useTextFallback,
                  )}
                onFallbackTextChange={(fallbackText) =>
                  actions.handleSpineSteamBannerFallbackTextChange(
                    side,
                    fallbackText,
                  )}
                onColorChange={(field, value) =>
                  actions.handleSpineSteamBannerColorChange(
                    side,
                    field,
                    value,
                  )}
                onResetColors={() =>
                  actions.handleResetSpineSteamBannerColors(side)}
              />
            </SpineBrandingFeatureSection>
            <SpineBrandingFeatureSection title="Developer / publisher logos">
              <CaseInsertLogoSlotControls
                paneId="spine"
                logoKey="developer"
                slot={developerLogoSlot}
                uploadId={`${side}-spine-developer-logo-upload`}
                fields={developerLogoSlot
                  ? getSpineImageSlotPlacementFields(
                      side,
                      developerLogoSlot,
                      'logo',
                    )
                  : SPINE_OVERLAY_PLACEMENT_FIELDS}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onUseLogoCandidate={(logoKey, candidate) =>
                  actions.handleUseSpineLogoCandidate(
                    side,
                    logoKey,
                    candidate,
                  )}
                onEnabledChange={(enabled) =>
                  actions.handleSpinePrimaryLogoSlotEnabledChange(
                    side,
                    'developer',
                    enabled,
                  )}
                onUpload={(event) =>
                  actions.handleSpinePrimaryLogoSlotUpload(
                    side,
                    'developer',
                    event,
                  )}
                onLayoutChange={(field, value) =>
                  actions.handleSpinePrimaryLogoSlotLayoutChange(
                    side,
                    'developer',
                    field,
                    value,
                  )}
                onResetLayout={() =>
                  actions.handleResetSpinePrimaryLogoSlotLayout(
                    side,
                    'developer',
                  )}
                onClearImage={() =>
                  actions.handleClearSpinePrimaryLogoSlot(side, 'developer')}
              >
                <EditorFeaturePanel title="Additional developer logos">
                    {additionalDeveloperLogoSlots.length === 0 ? (
                      <p className="hint">No additional developer logos.</p>
                    ) : null}
                    {additionalDeveloperLogoSlots.map((slot, index) => (
                      <SpineGroupedImageSlotControls
                        key={slot.id}
                        side={side}
                        slotKey="logoSlots"
                        slot={slot}
                        uploadId={`${side}-spine-developer-logo-${slot.id}-${index + 1}-upload`}
                        imageSources={imageSources}
                        actions={actions}
                      />
                    ))}
                    <button
                      className="secondary-button icon-text-button spacing-top"
                      type="button"
                      onClick={() =>
                        actions.handleAddSpineAdditionalLogoSlot(
                          side,
                          'developer',
                        )}
                    >
                      <PlusIcon />
                      <span>Add additional logo</span>
                    </button>
                </EditorFeaturePanel>
              </CaseInsertLogoSlotControls>

              <CaseInsertLogoSlotControls
                paneId="spine"
                logoKey="publisher"
                slot={publisherLogoSlot}
                uploadId={`${side}-spine-publisher-logo-upload`}
                fields={publisherLogoSlot
                  ? getSpineImageSlotPlacementFields(
                      side,
                      publisherLogoSlot,
                      'logo',
                    )
                  : SPINE_OVERLAY_PLACEMENT_FIELDS}
                logoCandidateDiscovery={logoCandidateDiscovery}
                handleFindLogoCandidates={handleFindLogoCandidates}
                onUseLogoCandidate={(logoKey, candidate) =>
                  actions.handleUseSpineLogoCandidate(
                    side,
                    logoKey,
                    candidate,
                  )}
                onEnabledChange={(enabled) =>
                  actions.handleSpinePrimaryLogoSlotEnabledChange(
                    side,
                    'publisher',
                    enabled,
                  )}
                onUpload={(event) =>
                  actions.handleSpinePrimaryLogoSlotUpload(
                    side,
                    'publisher',
                    event,
                  )}
                onLayoutChange={(field, value) =>
                  actions.handleSpinePrimaryLogoSlotLayoutChange(
                    side,
                    'publisher',
                    field,
                    value,
                  )}
                onResetLayout={() =>
                  actions.handleResetSpinePrimaryLogoSlotLayout(
                    side,
                    'publisher',
                  )}
                onClearImage={() =>
                  actions.handleClearSpinePrimaryLogoSlot(side, 'publisher')}
              >
                <EditorFeaturePanel title="Additional publisher logos">
                    {additionalPublisherLogoSlots.length === 0 ? (
                      <p className="hint">No additional publisher logos.</p>
                    ) : null}
                    {additionalPublisherLogoSlots.map((slot, index) => (
                      <SpineGroupedImageSlotControls
                        key={slot.id}
                        side={side}
                        slotKey="logoSlots"
                        slot={slot}
                        uploadId={`${side}-spine-publisher-logo-${slot.id}-${index + 1}-upload`}
                        imageSources={imageSources}
                        actions={actions}
                      />
                    ))}
                    <button
                      className="secondary-button icon-text-button spacing-top"
                      type="button"
                      onClick={() =>
                        actions.handleAddSpineAdditionalLogoSlot(
                          side,
                          'publisher',
                        )}
                    >
                      <PlusIcon />
                      <span>Add additional logo</span>
                    </button>
                </EditorFeaturePanel>
              </CaseInsertLogoSlotControls>

              {unassignedAdditionalLogoSlots.length > 0 ? (
                <EditorFeaturePanel title="Unassigned additional logos">
                    {unassignedAdditionalLogoSlots.map((slot, index) => (
                      <SpineGroupedImageSlotControls
                        key={slot.id}
                        side={side}
                        slotKey="logoSlots"
                        slot={slot}
                        uploadId={`${side}-spine-logo-${slot.id}-${index + 1}-upload`}
                        imageSources={imageSources}
                        actions={actions}
                      />
                    ))}
                </EditorFeaturePanel>
              ) : null}
            </SpineBrandingFeatureSection>
            {CASE_INSERT_MARK_BRANDING_SECTIONS.map((section) => {
              return (
                <SpineBrandingFeatureSection
                  key={section.markKind}
                  title={section.title}
                >
                  <SpineMarkSetupControls
                    markKind={section.markKind}
                    brandingControls={brandingControls}
                    idPrefix={`${side}-spine-${section.markKind}`}
                    renderSupplementalUskLayoutControls={section.markKind === 'rating'
                      ? () => (
                          <SpineMarkPlacementControls
                            side={side}
                            slot={getEnabledCaseInsertMarkSlotForSourcePrefix(
                              state.markSlots,
                              'rating',
                              'case-rating:USK:',
                            )}
                            idPrefix={`${side}-spine-usk-rating-badge`}
                            layoutPresets={RATING_BADGE_LAYOUT_PRESETS}
                            presetLabel="USK layout preset"
                            resetLabel="Reset USK badge layout"
                            actions={actions}
                          />
                        )
                      : undefined}
                    renderLayoutControls={(value, markLabel, _asset, assetId) => {
                      if (section.markKind === 'platform') {
                        return (
                          <SpineMarkPlacementControls
                            side={side}
                            slot={getEnabledCaseInsertMarkSlotForSourcePrefix(
                              state.markSlots,
                              'platform',
                              `case-platform:${value}:`,
                            )}
                            idPrefix={`${side}-spine-platform-mark-${value}`}
                            resetLabel={`Reset ${markLabel} layout`}
                            actions={actions}
                          />
                        )
                      }

                      if (section.markKind === 'technical') {
                        return (
                          <SpineMarkPlacementControls
                            side={side}
                            slot={getEnabledCaseInsertMarkSlotForSourcePrefix(
                              state.markSlots,
                              'technical',
                              `case-technical:${value}:${assetId ?? 'primary'}`,
                            )}
                            idPrefix={`${side}-spine-technical-mark-${value}-${assetId ?? 'primary'}`}
                            resetLabel={`Reset ${markLabel} layout`}
                            actions={actions}
                          />
                        )
                      }

                      return null
                    }}
                  >
                    {section.markKind === 'rating' ? (
                      <SpineMarkPlacementControls
                        side={side}
                        slot={getEnabledCaseInsertMarkSlotForKind(
                          state.markSlots,
                          'rating',
                        )}
                        idPrefix={`${side}-spine-rating-badge`}
                        layoutPresets={RATING_BADGE_LAYOUT_PRESETS}
                        resetLabel="Reset rating badge layout"
                        actions={actions}
                      />
                    ) : null}
                    {section.markKind === 'media' ? (
                      <SpineMarkPlacementControls
                        side={side}
                        slot={getEnabledCaseInsertMarkSlotForKind(
                          state.markSlots,
                          'media',
                        )}
                        idPrefix={`${side}-spine-media-mark`}
                        resetLabel="Reset media mark layout"
                        actions={actions}
                      />
                    ) : null}
                  </SpineMarkSetupControls>
                </SpineBrandingFeatureSection>
              )
            })}
          </SpineSideSection>
        )
      })}
    </>
  )
}

export function CaseInsertSpineTextControls({
  spine,
  projectMetadata,
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
              projectMetadata={projectMetadata}
              actions={actions}
            />
            {sortSpineTextBlocksForControls(state.textBlocks).map((textBlock) => (
              <SpineTextBlockControls
                key={textBlock.id}
                side={side}
                textBlock={textBlock}
                projectMetadata={projectMetadata}
                actions={actions}
              />
            ))}
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
