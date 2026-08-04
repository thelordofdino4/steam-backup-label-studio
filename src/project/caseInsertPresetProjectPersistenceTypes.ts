export const CASE_INSERT_LAYOUT_PRESET_PROJECT_STATE_KIND =
  'sbls/case-insert-layout-preset-project-state' as const
export const CASE_INSERT_LAYOUT_PRESET_PROJECT_STATE_VERSION = 1 as const

export type SavedCaseInsertPresetConcreteRegionId =
  | 'front-cover'
  | 'tray-card'
  | 'back-panel'
  | 'left-spine'
  | 'right-spine'

export type SavedCaseInsertPresetApplicationScope =
  | Readonly<{
      kind: 'region'
      region: SavedCaseInsertPresetConcreteRegionId
    }>
  | Readonly<{
      kind: 'section'
      section: 'front' | 'back' | 'spine'
    }>
  | Readonly<{ kind: 'complete' }>

export type SavedCaseInsertPresetSourceAssignment = Readonly<{
  presetId: `builtin:case-preset:${string}` | `user:case-preset:${string}`
  presetRevision: number
  slotId: `case:preset-slot:${string}`
  assignmentId: `case:preset-assignment:${string}`
  roleId: string
  region: SavedCaseInsertPresetConcreteRegionId
  coordinateBasis: string
  ownerId: string
  object: Readonly<{
    bindingKind: 'fixed' | 'repeated'
    bindingId: string
    runtimeId: string
  }>
  declaredPolicy: 'normalized-content-region-direct-layout-v1'
}>

export type SavedCaseInsertPresetOwnedField = Readonly<{
  address: Readonly<{
    region: SavedCaseInsertPresetConcreteRegionId
    featureOwnerId: string
    bindingKind: 'fixed' | 'repeated'
    bindingId: string
    runtimeObjectId: string
    fieldId: 'layout-x' | 'layout-y' | 'layout-scale' | 'layout-width'
  }>
  lastAppliedValue: number
  sources: readonly SavedCaseInsertPresetSourceAssignment[]
}>

type SavedCaseInsertAppliedPresetConfigurationBase = Readonly<{
  firstApply: Readonly<{
    operation: 'apply'
    transitionStatus: 'applied' | 'applied-semantic-no-op'
  }>
  preset: Readonly<{
    id: `builtin:case-preset:${string}` | `user:case-preset:${string}`
    revision: number
    source: 'builtin' | 'user'
  }>
  requestedScope: SavedCaseInsertPresetApplicationScope
  resolvedRegions: readonly SavedCaseInsertPresetConcreteRegionId[]
  template: Readonly<{ id: string; revision: null }>
  reviewedPlanIdentity: string
  ownedFields: readonly SavedCaseInsertPresetOwnedField[]
  reviewedWarningIds: readonly string[]
  acceptedMaterialConsentRequirementIds: readonly string[]
}>

export type SavedCaseInsertAppliedPresetConfiguration =
  | SavedCaseInsertAppliedPresetConfigurationBase & Readonly<{
      formatVersion: 1
    }>
  | SavedCaseInsertAppliedPresetConfigurationBase & Readonly<{
      formatVersion: 2
      reapply: Readonly<{
        operation: 'reapply'
        transitionStatus:
          | 'reapplied'
          | 'reapplied-aggregate-semantic-no-op'
          | 'reapplied-semantic-no-op'
        transitionIdentity: string
        sourceConfigurationIdentity: string
        sourceCustomizationReportIdentity: string
        reviewAcceptanceIdentity: string
        previousPresetRevision: number
      }>
    }>

export type SavedCaseInsertLayoutPresetProjectState = Readonly<{
  kind: typeof CASE_INSERT_LAYOUT_PRESET_PROJECT_STATE_KIND
  formatVersion: typeof CASE_INSERT_LAYOUT_PRESET_PROJECT_STATE_VERSION
  applicationRevision: number
  attachment:
    | Readonly<{ status: 'unattached' }>
    | Readonly<{
        status: 'attached'
        configuration: SavedCaseInsertAppliedPresetConfiguration
      }>
}>
