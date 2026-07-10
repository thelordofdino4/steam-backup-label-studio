import type { Ref } from 'react'
import { getLogoAssetLayoutSliderRanges } from '../../../layout/discElementSafeZone'
import { getLogoAssetSource } from '../../../project/projectLogoAssets'
import type {
  BackgroundImageSize,
  LogoAssetLayout,
  ProjectAdditionalLogoAsset,
  ProjectImageAssetProvenance,
} from '../../../project/projectTypes'
import {
  createLogoAssetSummary,
  type LogoAlignmentPreset,
} from '../../../editor/logoAsset'
import { EditorLogoAssetControls } from '../../editor/EditorLogoAssetControls'
import { OptionalFeatureSection } from '../../editor/OptionalFeatureSection'
import { PlusIcon } from '../PanelIcons'
import { RepeatedVisualElementCard } from '../RepeatedVisualElementCard'
import { formatLogoSize } from './helpers'
import type { BrandingPanelProps, LogoKey } from './types'

const LOGO_ALIGNMENT_PRESETS: readonly LogoAlignmentPreset[] = [
  { label: 'Top left', x: 22, y: 22 },
  { label: 'Top center', x: 50, y: 22 },
  { label: 'Top right', x: 78, y: 22 },
  { label: 'Left center', x: 22, y: 50 },
  { label: 'Right center', x: 78, y: 50 },
  { label: 'Bottom left', x: 22, y: 78 },
  { label: 'Bottom center', x: 50, y: 78 },
  { label: 'Bottom right', x: 78, y: 78 },
  { label: 'Stacked left upper', x: 22, y: 62 },
  { label: 'Stacked left lower', x: 22, y: 72 },
  { label: 'Stacked right upper', x: 78, y: 62 },
  { label: 'Stacked right lower', x: 78, y: 72 },
] as const

function LogoAssetControlBody({
  logoKey,
  label,
  imageDataUrl,
  imageSource,
  imageSize,
  layout,
  uploadControlRef,
  uploadId,
  controlIdPrefix,
  additionalLogoId,
  selectedDiscTemplate,
  handleLogoAssetUpload,
  logoCandidateDiscovery,
  handleFindLogoCandidates,
  handleApplyLogoCandidate,
  handleLogoAssetLayoutChange,
  handleClearLogoAsset,
  handleResetLogoAssetLayout,
}: Pick<
  BrandingPanelProps,
  | 'selectedDiscTemplate'
  | 'handleLogoAssetUpload'
  | 'logoCandidateDiscovery'
  | 'handleFindLogoCandidates'
  | 'handleApplyLogoCandidate'
  | 'handleLogoAssetLayoutChange'
  | 'handleClearLogoAsset'
  | 'handleResetLogoAssetLayout'
> & {
  logoKey: LogoKey
  label: string
  imageDataUrl: string | null
  imageSource: ProjectImageAssetProvenance | null
  imageSize: BackgroundImageSize | null
  layout: LogoAssetLayout
  uploadControlRef?: Ref<HTMLInputElement>
  uploadId: string
  controlIdPrefix: string
  additionalLogoId?: string
}) {
  const sliderRanges = getLogoAssetLayoutSliderRanges(
    layout,
    selectedDiscTemplate,
    imageSize,
  )
  const updateLayout = (field: keyof LogoAssetLayout, value: boolean | number) =>
    handleLogoAssetLayoutChange(logoKey, field, value, additionalLogoId)

  return (
    <EditorLogoAssetControls
      logoKey={logoKey}
      label={label}
      candidateLabel={label}
      imageDataUrl={imageDataUrl}
      imageSource={imageSource}
      imageSize={imageSize}
      uploadId={uploadId}
      controlIdPrefix={controlIdPrefix}
      alignmentPresets={LOGO_ALIGNMENT_PRESETS}
      fields={[
        {
          id: `${controlIdPrefix}-scale`,
          label: 'Scale',
          min: 0.25,
          max: 2,
          step: 0.01,
          value: layout.scale,
          onChange: (value) => updateLayout('scale', value),
        },
        {
          id: `${controlIdPrefix}-x`,
          label: 'X position',
          min: sliderRanges.x.min,
          max: sliderRanges.x.max,
          step: 0.1,
          value: layout.x,
          onChange: (value) => updateLayout('x', value),
        },
        {
          id: `${controlIdPrefix}-y`,
          label: 'Y position',
          min: sliderRanges.y.min,
          max: sliderRanges.y.max,
          step: 0.1,
          value: layout.y,
          onChange: (value) => updateLayout('y', value),
        },
      ]}
      formatSize={formatLogoSize}
      logoCandidateDiscovery={logoCandidateDiscovery}
      handleFindLogoCandidates={handleFindLogoCandidates}
      handleApplyLogoCandidate={(candidate) =>
        handleApplyLogoCandidate(logoKey, candidate, additionalLogoId)}
      onUpload={(event) =>
        handleLogoAssetUpload(logoKey, event, additionalLogoId)}
      uploadControlRef={uploadControlRef}
      onApplyAlignmentPreset={(preset) => {
        updateLayout('x', preset.x)
        updateLayout('y', preset.y)
      }}
      onResetLayout={() =>
        handleResetLogoAssetLayout(logoKey, additionalLogoId)}
      onClearImage={() => handleClearLogoAsset(logoKey, additionalLogoId)}
    />
  )
}

function AdditionalLogoAssetControls({
  logoKey,
  label,
  logoAsset,
  additionalLogoIndex,
  handleLogoAssetLayoutChange,
  handleAdditionalLogoAssetLabelChange,
  handleRemoveAdditionalLogoAsset,
  ...props
}: Pick<
  BrandingPanelProps,
  | 'selectedDiscTemplate'
  | 'handleLogoAssetUpload'
  | 'logoCandidateDiscovery'
  | 'handleFindLogoCandidates'
  | 'handleApplyLogoCandidate'
  | 'handleLogoAssetLayoutChange'
  | 'handleClearLogoAsset'
  | 'handleResetLogoAssetLayout'
  | 'handleAdditionalLogoAssetLabelChange'
  | 'handleRemoveAdditionalLogoAsset'
> & {
  logoKey: LogoKey
  label: string
  logoAsset: ProjectAdditionalLogoAsset
  additionalLogoIndex: number
}) {
  const uploadId = `${logoKey}-additional-logo-${additionalLogoIndex + 1}`
  const additionalLabel = `Additional ${label.toLowerCase()}`
  const deleteLabel = `Delete ${additionalLabel} logo`
  const summary = createLogoAssetSummary({
    enabled: logoAsset.layout.enabled,
    hasImage: Boolean(logoAsset.imageDataUrl),
    scale: logoAsset.layout.scale,
  })

  return (
    <RepeatedVisualElementCard
      title={`${additionalLabel} ${additionalLogoIndex + 1}`}
      label={logoAsset.label}
      labelInputId={`${uploadId}-label`}
      enabled={logoAsset.layout.enabled}
      enableLabel={`Show ${additionalLabel} logo`}
      summary={summary}
      deleteLabel={deleteLabel}
      onEnabledChange={(enabled) =>
        handleLogoAssetLayoutChange(logoKey, 'enabled', enabled, logoAsset.id)}
      onLabelChange={(nextLabel) =>
        handleAdditionalLogoAssetLabelChange(logoKey, logoAsset.id, nextLabel)}
      onDelete={() => handleRemoveAdditionalLogoAsset(logoKey, logoAsset.id)}
    >
        <LogoAssetControlBody
          {...props}
          logoKey={logoKey}
          label={additionalLabel}
          imageDataUrl={logoAsset.imageDataUrl}
          imageSource={logoAsset.imageSource ?? null}
          imageSize={logoAsset.imageSize}
          layout={logoAsset.layout}
          uploadId={uploadId}
          controlIdPrefix={uploadId}
          additionalLogoId={logoAsset.id}
          handleLogoAssetLayoutChange={handleLogoAssetLayoutChange}
        />
    </RepeatedVisualElementCard>
  )
}

export function LogoAssetControls({
  logoKey,
  label,
  imageDataUrl,
  imageSize,
  layout,
  enableControlRef,
  uploadControlRef,
  projectLogoAssets,
  handleLogoAssetLayoutChange,
  handleAddAdditionalLogoAsset,
  ...props
}: Pick<
  BrandingPanelProps,
  | 'selectedDiscTemplate'
  | 'projectLogoAssets'
  | 'handleLogoAssetUpload'
  | 'logoCandidateDiscovery'
  | 'handleFindLogoCandidates'
  | 'handleApplyLogoCandidate'
  | 'handleLogoAssetLayoutChange'
  | 'handleClearLogoAsset'
  | 'handleResetLogoAssetLayout'
  | 'handleAddAdditionalLogoAsset'
  | 'handleAdditionalLogoAssetLabelChange'
  | 'handleRemoveAdditionalLogoAsset'
> & {
  logoKey: LogoKey
  label: string
  imageDataUrl: string | null
  imageSize: BackgroundImageSize | null
  layout: LogoAssetLayout
  enableControlRef?: Ref<HTMLInputElement>
  uploadControlRef?: Ref<HTMLInputElement>
}) {
  const uploadId = `${logoKey}-logo-upload`
  const additionalLogos = logoKey === 'developer'
    ? projectLogoAssets.additionalDeveloperLogos
    : projectLogoAssets.additionalPublisherLogos

  return (
    <OptionalFeatureSection
      className="logo-asset-card"
      enabled={layout.enabled}
      enableControlRef={enableControlRef}
      enableLabel={`Show ${label.toLowerCase()} logo`}
      onEnabledChange={(enabled) =>
        handleLogoAssetLayoutChange(logoKey, 'enabled', enabled)}
    >
      <LogoAssetControlBody
        {...props}
        logoKey={logoKey}
        label={label}
        imageDataUrl={imageDataUrl}
        imageSource={getLogoAssetSource(projectLogoAssets, logoKey)}
        imageSize={imageSize}
        layout={layout}
        uploadControlRef={uploadControlRef}
        uploadId={uploadId}
        controlIdPrefix={`${logoKey}-logo`}
        handleLogoAssetLayoutChange={handleLogoAssetLayoutChange}
      />

      {additionalLogos.map((logoAsset, index) => (
        <AdditionalLogoAssetControls
          key={logoAsset.id}
          {...props}
          logoKey={logoKey}
          label={label}
          logoAsset={logoAsset}
          additionalLogoIndex={index}
          handleLogoAssetLayoutChange={handleLogoAssetLayoutChange}
        />
      ))}

      <button
        className="secondary-button icon-text-button"
        type="button"
        onClick={() => handleAddAdditionalLogoAsset(logoKey)}
      >
        <PlusIcon />
        <span>Add additional logo</span>
      </button>
    </OptionalFeatureSection>
  )
}
