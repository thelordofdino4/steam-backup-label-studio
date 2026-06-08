import type { ChangeEvent, ReactNode } from 'react'
import {
  type CaseInsertLogoSurfaceId,
  getCaseInsertPrimaryLogoLabel,
  getDefaultCaseInsertPrimaryLogoLayout,
} from '../../caseInsert/brandingLogoSlots'
import type { LogoCandidateDiscoveryState } from '../../hooks/useLogoAssetDiscovery'
import { getProjectImageAssetStatus } from '../../project/projectAssetStatus'
import type { LogoAssetKey } from '../../project/projectLogoAssets'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
} from '../../project/projectTypes'
import type { RemoteLogoCandidate } from '../../steam/steamLogoCandidates'
import { formatLogoSize } from '../sidebar/branding/helpers'
import { LogoCandidateControls } from '../sidebar/branding/LogoCandidateControls'
import type {
  CaseInsertImageSlotPlacementField,
} from './CaseInsertImageSlotPlacementControls'

const CASE_INSERT_LOGO_ALIGNMENT_PRESETS = [
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

function RangeField({
  id,
  field,
  layout,
  onLayoutChange,
}: {
  id: string
  field: CaseInsertImageSlotPlacementField
  layout: ProjectCaseInsertLayout
  onLayoutChange: (field: keyof ProjectCaseInsertLayout, value: number) => void
}) {
  return (
    <>
      <label className="field-label spacing-top" htmlFor={id}>
        {field.label}
        <span>{Number(layout[field.field]).toFixed(field.step < 1 ? 2 : 0)}</span>
      </label>
      <input
        id={id}
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={layout[field.field]}
        onChange={(event) =>
          onLayoutChange(field.field, Number(event.currentTarget.value))}
      />
    </>
  )
}

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
  const hasLogoImage = Boolean(slot?.imageDataUrl)
  const logoStatus = getProjectImageAssetStatus({
    imageDataUrl: slot?.imageDataUrl,
    provenance: slot?.imageSource,
    fallbackLabel: `${label} image`,
  })

  return (
    <div className="logo-asset-card">
      <label className="field-label">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.currentTarget.checked)}
        />
        Show {label.toLocaleLowerCase()}
      </label>

      {!enabled ? null : (
        <>
          <label className="secondary-button logo-upload-button" htmlFor={uploadId}>
            {hasLogoImage
              ? `Replace ${label.toLocaleLowerCase()}`
              : `Choose ${label.toLocaleLowerCase()}`}
          </label>
          <input
            id={uploadId}
            className="logo-file-input"
            type="file"
            accept="image/*"
            onChange={(event) => void onUpload(event)}
          />

          <LogoCandidateControls
            logoKey={logoKey}
            label={label.replace(/ logo$/i, '')}
            discovery={logoCandidateDiscovery[logoKey]}
            helpText="Searches the same Steam and official-site logo candidates used by the disc editor. Manual upload remains available here."
            handleFindLogoCandidates={handleFindLogoCandidates}
            handleApplyLogoCandidate={(candidate) =>
              onUseLogoCandidate(logoKey, candidate)}
          />

          {hasLogoImage ? (
            <div className="selected-lockup-card logo-asset-status-card">
              <img
                className="logo-asset-preview"
                src={slot?.imageDataUrl ?? undefined}
                alt=""
                draggable={false}
              />
              <span>{logoStatus.summary}{formatLogoSize(slot?.imageSize ?? null)}</span>
            </div>
          ) : (
            <p className="hint">
              No {label.toLocaleLowerCase()} image is selected yet. A bundled
              generic logo is shown for placement; search logo candidates or
              upload a custom logo here.
            </p>
          )}

          <label className="field-label spacing-top" htmlFor={`${uploadId}-alignment-preset`}>
            Align logo
          </label>
          <select
            id={`${uploadId}-alignment-preset`}
            defaultValue=""
            onChange={(event) => {
              const preset = CASE_INSERT_LOGO_ALIGNMENT_PRESETS.find(
                (candidate) => candidate.label === event.currentTarget.value,
              )

              if (!preset) return

              onLayoutChange('x', preset.x)
              onLayoutChange('y', preset.y)
              event.currentTarget.value = ''
            }}
          >
            <option value="">Choose preset...</option>
            {CASE_INSERT_LOGO_ALIGNMENT_PRESETS.map((preset) => (
              <option key={preset.label} value={preset.label}>
                {preset.label}
              </option>
            ))}
          </select>

          {fields.map((field) => (
            <RangeField
              key={field.field}
              id={`${uploadId}-${field.field}`}
              field={field}
              layout={layout}
              onLayoutChange={onLayoutChange}
            />
          ))}

          <button className="secondary-button" type="button" onClick={onResetLayout}>
            Reset logo layout
          </button>
          {hasLogoImage ? (
            <button className="secondary-button" type="button" onClick={onClearImage}>
              Clear logo
            </button>
          ) : null}
          {children}
        </>
      )}
    </div>
  )
}
