import type { ChangeEvent, ReactNode } from 'react'
import type {
  LogoAlignmentPreset,
  LogoAssetKind,
} from '../../editor/logoAsset'
import {
  getLogoAssetEmptyHint,
  getLogoAssetImageFallbackLabel,
  getLogoAssetUploadActionLabel,
} from '../../editor/logoAsset'
import type { LogoCandidateDiscoveryState } from '../../hooks/useLogoAssetDiscovery'
import type {
  BackgroundImageSize,
  ProjectImageAssetProvenance,
} from '../../project/projectTypes'
import type { RemoteLogoCandidate } from '../../steam/steamLogoCandidates'
import {
  EditorImageAssetStatusCard,
} from './EditorImageAssetStatusCard'
import { EditorLogoCandidateControls } from './EditorLogoCandidateControls'
import { EditorStackedRangeField } from './EditorRangeField'

export type EditorLogoLayoutField = {
  id: string
  label: string
  labelValue?: ReactNode
  max: number
  min: number
  onChange: (value: number) => void
  step: number
  value: number
}

export function EditorLogoAssetControls({
  alignmentPresets,
  candidateHelpText,
  candidateLabel,
  children,
  clearLabel = 'Clear logo',
  controlIdPrefix,
  emptyHint,
  fields,
  formatSize = () => '',
  handleApplyLogoCandidate,
  handleFindLogoCandidates,
  imageDataUrl,
  imageSize,
  imageSource,
  label,
  logoCandidateDiscovery,
  logoKey,
  onApplyAlignmentPreset,
  onClearImage,
  onResetLayout,
  onUpload,
  resetLabel = 'Reset logo layout',
  uploadId,
}: {
  alignmentPresets: readonly LogoAlignmentPreset[]
  candidateHelpText?: string
  candidateLabel?: string
  children?: ReactNode
  clearLabel?: string
  controlIdPrefix: string
  emptyHint?: string
  fields: readonly EditorLogoLayoutField[]
  formatSize?: (size: BackgroundImageSize | null) => string
  handleApplyLogoCandidate: (
    candidate: RemoteLogoCandidate,
  ) => void | Promise<void>
  handleFindLogoCandidates: (logoKey: LogoAssetKind) => void | Promise<void>
  imageDataUrl: string | null
  imageSize: BackgroundImageSize | null
  imageSource: ProjectImageAssetProvenance | null
  label: string
  logoCandidateDiscovery: LogoCandidateDiscoveryState
  logoKey: LogoAssetKind
  onApplyAlignmentPreset: (preset: LogoAlignmentPreset) => void
  onClearImage: () => void
  onResetLayout: () => void
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  resetLabel?: string
  uploadId: string
}) {
  const hasLogoImage = Boolean(imageDataUrl)
  const resolvedCandidateLabel = candidateLabel ?? label

  return (
    <>
      <label className="secondary-button logo-upload-button" htmlFor={uploadId}>
        {getLogoAssetUploadActionLabel({ hasImage: hasLogoImage, label })}
      </label>
      <input
        id={uploadId}
        className="logo-file-input"
        type="file"
        accept="image/*"
        onChange={(event) => void onUpload(event)}
      />

      <EditorLogoCandidateControls
        logoKey={logoKey}
        label={resolvedCandidateLabel}
        discovery={logoCandidateDiscovery[logoKey]}
        helpText={candidateHelpText}
        handleFindLogoCandidates={handleFindLogoCandidates}
        handleApplyLogoCandidate={handleApplyLogoCandidate}
      />

      <EditorImageAssetStatusCard
        emptyHint={
          emptyHint ??
          getLogoAssetEmptyHint({
            label,
            mentionsCandidateSearch: Boolean(candidateHelpText),
          })
        }
        fallbackLabel={getLogoAssetImageFallbackLabel(label)}
        formatSize={formatSize}
        imageDataUrl={imageDataUrl}
        imageSize={imageSize}
        imageSource={imageSource}
      />

      <label
        className="field-label spacing-top"
        htmlFor={`${controlIdPrefix}-alignment-preset`}
      >
        Align logo
      </label>
      <select
        id={`${controlIdPrefix}-alignment-preset`}
        defaultValue=""
        onChange={(event) => {
          const preset = alignmentPresets.find(
            (candidate) => candidate.label === event.currentTarget.value,
          )

          if (!preset) return

          onApplyAlignmentPreset(preset)
          event.currentTarget.value = ''
        }}
      >
        <option value="">Choose preset...</option>
        {alignmentPresets.map((preset) => (
          <option key={preset.label} value={preset.label}>
            {preset.label}
          </option>
        ))}
      </select>

      {fields.map((field) => (
        <EditorStackedRangeField
          key={field.id}
          id={field.id}
          label={field.label}
          labelValue={field.labelValue}
          min={field.min}
          max={field.max}
          step={field.step}
          value={field.value}
          onChange={field.onChange}
        />
      ))}

      <button className="secondary-button" type="button" onClick={onResetLayout}>
        {resetLabel}
      </button>
      {hasLogoImage ? (
        <button className="secondary-button" type="button" onClick={onClearImage}>
          {clearLabel}
        </button>
      ) : null}
      {children}
    </>
  )
}
