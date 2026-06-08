import type { ChangeEvent } from 'react'
import type {
  CaseInsertSteamBannerLayoutField,
  CaseInsertSteamBannerTargetKind,
} from '../../caseInsert/steamBanner'
import type {
  ProjectCaseInsertSteamBanner,
} from '../../project/projectTypes'
import {
  EditorSteamBannerControls,
  type EditorSteamBannerLayoutControl,
} from '../editor/EditorSteamBannerControls'

export type CaseInsertSteamBannerControlsProps = {
  banner: ProjectCaseInsertSteamBanner
  idPrefix: string
  targetKind: CaseInsertSteamBannerTargetKind
  onEnabledChange: (enabled: boolean) => void
  onLockupUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>
  onClearLockup: () => void
  onLayoutChange: (
    field: CaseInsertSteamBannerLayoutField,
    value: number,
  ) => void
  onResetLayout: () => void
  onUseTextFallbackChange: (useTextFallback: boolean) => void
  onFallbackTextChange: (fallbackText: string) => void
  onColorChange: (
    field: keyof ProjectCaseInsertSteamBanner['colors'],
    value: string,
  ) => void
  onResetColors: () => void
}

type CaseInsertSteamBannerLayoutControl = {
  field: CaseInsertSteamBannerLayoutField
  label: string
  min: number
  max: number
  step: number
}

const COVER_LOCKUP_LAYOUT_CONTROLS:
CaseInsertSteamBannerLayoutControl[] = [
  { field: 'scale', label: 'Lockup scale', min: 0.5, max: 1.5, step: 0.01 },
  { field: 'x', label: 'Lockup X position', min: -20, max: 20, step: 0.1 },
  { field: 'y', label: 'Lockup Y position', min: -20, max: 20, step: 0.1 },
]

const SPINE_LOCKUP_LAYOUT_CONTROLS:
CaseInsertSteamBannerLayoutControl[] = [
  { field: 'scale', label: 'Lockup scale', min: 0.5, max: 1.5, step: 0.01 },
  { field: 'x', label: 'Lockup cross position', min: -100, max: 100, step: 0.1 },
  { field: 'y', label: 'Lockup length position', min: -100, max: 100, step: 0.1 },
  { field: 'rotation', label: 'Lockup rotation', min: -180, max: 180, step: 1 },
]

function getLayoutControls(targetKind: CaseInsertSteamBannerTargetKind) {
  return targetKind === 'spine'
    ? SPINE_LOCKUP_LAYOUT_CONTROLS
    : COVER_LOCKUP_LAYOUT_CONTROLS
}

export function CaseInsertSteamBannerControls({
  banner,
  idPrefix,
  targetKind,
  onEnabledChange,
  onLockupUpload,
  onClearLockup,
  onLayoutChange,
  onResetLayout,
  onUseTextFallbackChange,
  onFallbackTextChange,
  onColorChange,
  onResetColors,
}: CaseInsertSteamBannerControlsProps) {
  const layoutControls: EditorSteamBannerLayoutControl[] =
    getLayoutControls(targetKind).map((field) => ({
      id: `${idPrefix}-${field.field}`,
      label: field.label,
      min: field.min,
      max: field.max,
      step: field.step,
      value: banner.lockupLayout[field.field] ?? 0,
      onInput: (value) => onLayoutChange(field.field, value),
      onChange: (value) => onLayoutChange(field.field, value),
    }))

  return (
    <EditorSteamBannerControls
      idPrefix={idPrefix}
      enabled={banner.enabled}
      colors={banner.colors}
      lockupKind={targetKind === 'spine' ? 'spine-icon' : 'banner-lockup'}
      lockupImageUrl={banner.lockupImageDataUrl}
      lockupImageSource={banner.lockupImageSource}
      useTextFallback={banner.useTextFallback}
      fallbackText={banner.fallbackText}
      layoutControls={layoutControls}
      onEnabledChange={onEnabledChange}
      onLockupUpload={onLockupUpload}
      onClearLockup={onClearLockup}
      onUseTextFallbackChange={onUseTextFallbackChange}
      onFallbackTextChange={onFallbackTextChange}
      onColorChange={onColorChange}
      onResetColors={onResetColors}
      onResetLayout={onResetLayout}
    />
  )
}
