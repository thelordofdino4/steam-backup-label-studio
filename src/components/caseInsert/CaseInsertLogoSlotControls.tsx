import type { ChangeEvent, ReactNode } from 'react'
import {
  type CaseInsertLogoSurfaceId,
  createCaseInsertLogoFallbackProvenance,
  getCaseInsertLogoSlotRenderInfo,
  getCaseInsertPrimaryLogoLabel,
  getDefaultCaseInsertPrimaryLogoLayout,
} from '../../caseInsert/brandingLogoSlots'
import {
  getLogoAssetKindLabel,
  type LogoAlignmentPreset,
} from '../../editor/logoAsset'
import type { LogoCandidateDiscoveryState } from '../../hooks/useLogoAssetDiscovery'
import type { LogoAssetKey } from '../../project/projectLogoAssets'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
} from '../../project/projectTypes'
import type { RemoteLogoCandidate } from '../../steam/steamLogoCandidates'
import { formatLogoSize } from '../sidebar/branding/helpers'
import { EditorLogoAssetControls } from '../editor/EditorLogoAssetControls'
import { OptionalFeatureSection } from '../editor/OptionalFeatureSection'
import type {
  CaseInsertImageSlotPlacementField,
} from './CaseInsertImageSlotPlacementControls'

const CASE_INSERT_LOGO_ALIGNMENT_PRESETS: readonly LogoAlignmentPreset[] = [
  { label: 'Top left', x: 20, y: 18 },
  { label: 'Top center', x: 50, y: 18 },
  { label: 'Top right', x: 80, y: 18 },
  { label: 'Left center', x: 20, y: 50 },
  { label: 'Center', x: 50, y: 50 },
  { label: 'Right center', x: 80, y: 50 },
  { label: 'Bottom left', x: 20, y: 84 },
  { label: 'Bottom center', x: 50, y: 84 },
  { label: 'Bottom right', x: 80, y: 84 },
  { label: 'Stacked left upper', x: 20, y: 72 },
  { label: 'Stacked left lower', x: 20, y: 84 },
  { label: 'Stacked right upper', x: 80, y: 72 },
  { label: 'Stacked right lower', x: 80, y: 84 },
] as const

export function CaseInsertLogoSlotControls({
  paneId,
  logoKey,
  slot,
  uploadId,
  fields,
  logoCandidateDiscovery,
  handleFindLogoCandidates,
  onUseLogoCandidate,
  onEnabledChange,
  onUpload,
  onLayoutChange,
  onResetLayout,
  onClearImage,
  children,
}: {
  paneId: CaseInsertLogoSurfaceId
  logoKey: LogoAssetKey
  slot: ProjectCaseInsertImageSlot | null
  uploadId: string
  fields: CaseInsertImageSlotPlacementField[]
  logoCandidateDiscovery: LogoCandidateDiscoveryState
  handleFindLogoCandidates: (logoKey: LogoAssetKey) => void | Promise<void>
  onUseLogoCandidate: (
    logoKey: LogoAssetKey,
    candidate: RemoteLogoCandidate,
  ) => void | Promise<void>
  onEnabledChange: (enabled: boolean) => void
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  onLayoutChange: (
    field: keyof ProjectCaseInsertLayout,
    value: number,
  ) => void
  onResetLayout: () => void
  onClearImage: () => void
  children?: ReactNode
}) {
  const label = getCaseInsertPrimaryLogoLabel(logoKey)
  const enabled = slot?.enabled ?? false
  const layout = slot?.layout ??
    getDefaultCaseInsertPrimaryLogoLayout(paneId, logoKey)
  const renderInfo = slot ? getCaseInsertLogoSlotRenderInfo(slot) : null
  const fallbackRenderInfo = renderInfo?.isBundledFallback
    ? renderInfo
    : null

  return (
    <OptionalFeatureSection
      className="logo-asset-card"
      enabled={enabled}
      enableLabel={`Show ${label.toLocaleLowerCase()}`}
      onEnabledChange={onEnabledChange}
    >
      <EditorLogoAssetControls
        logoKey={logoKey}
        label={label}
        candidateLabel={getLogoAssetKindLabel(logoKey)}
        fallbackImageDataUrl={fallbackRenderInfo?.imageDataUrl ?? null}
        fallbackImageSize={fallbackRenderInfo?.imageSize ?? null}
        fallbackImageSource={fallbackRenderInfo
          ? createCaseInsertLogoFallbackProvenance(
              logoKey,
              slot?.imageSource?.sourceId ?? undefined,
            )
          : null}
        imageDataUrl={slot?.imageDataUrl ?? null}
        imageSource={slot?.imageSource ?? null}
        imageSize={slot?.imageSize ?? null}
        uploadId={uploadId}
        controlIdPrefix={uploadId}
        alignmentPresets={CASE_INSERT_LOGO_ALIGNMENT_PRESETS}
        fields={fields.map((field) => ({
          id: `${uploadId}-${field.field}`,
          label: field.label,
          min: field.min,
          max: field.max,
          step: field.step,
          value: Number(layout[field.field]),
          labelValue: (
            <span>
              {Number(layout[field.field]).toFixed(field.step < 1 ? 2 : 0)}
            </span>
          ),
          onChange: (value) => onLayoutChange(field.field, value),
        }))}
        formatSize={formatLogoSize}
        logoCandidateDiscovery={logoCandidateDiscovery}
        candidateHelpText="Searches the same Steam and official-site logo candidates used by the disc editor. Manual upload remains available here."
        handleFindLogoCandidates={handleFindLogoCandidates}
        handleApplyLogoCandidate={(candidate) =>
          onUseLogoCandidate(logoKey, candidate)}
        onUpload={onUpload}
        onApplyAlignmentPreset={(preset) => {
          onLayoutChange('x', preset.x)
          onLayoutChange('y', preset.y)
        }}
        onResetLayout={onResetLayout}
        onClearImage={onClearImage}
      />
      {children}
    </OptionalFeatureSection>
  )
}
