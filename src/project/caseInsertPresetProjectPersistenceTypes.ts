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
  declaredPolicy:
    | 'normalized-content-region-direct-layout-v1'
    | 'create-empty-repeated-artwork-slot-v1'
    | 'reserved-artwork-viewport-v1'
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

/**
 * The format-3 persistence value mirrors the authoritative applied-
 * configuration value model. The tag is intentionally persisted so recovery
 * never has to infer whether a primitive belongs to object presence, layout,
 * fitting, or viewport ownership.
 */
export type SavedCaseInsertAppliedPresetOwnedValue =
  | Readonly<{
      kind: 'object-presence'
      value: 'present'
    }>
  | Readonly<{
      kind: 'layout-number'
      value: number
    }>
  | Readonly<{
      kind: 'image-fit'
      value: 'cover' | 'contain' | 'scale' | 'crop'
    }>
  | Readonly<{
      kind: 'reserved-artwork-viewport'
      value: Readonly<{
        kind: 'sbls/case-insert-artwork-viewport'
        formatVersion: 1
        templateId: 'jewelCase'
        templateRevision: null
        coordinateBasis:
          | 'front'
          | 'frontSafe'
          | 'backPanel'
          | 'backPanelSafe'
          | 'leftSpine'
          | 'leftSpineSafe'
          | 'rightSpine'
          | 'rightSpineSafe'
        widthPercent: number
        heightPercent: number
        focalPosition: Readonly<{
          xPercent: number
          yPercent: number
        }>
        zoom: number
      }> | null
    }>

export type SavedCaseInsertAppliedPresetOwnedFieldV3 = Readonly<{
  address: Readonly<{
    region: SavedCaseInsertPresetConcreteRegionId
    featureOwnerId: string
    bindingKind: 'fixed' | 'repeated'
    bindingId: string
    runtimeObjectId: string
    fieldId:
      | 'object-presence'
      | 'layout-x'
      | 'layout-y'
      | 'layout-scale'
      | 'layout-width'
      | 'image-fit'
      | 'reserved-artwork-viewport'
  }>
  lastAppliedValue: SavedCaseInsertAppliedPresetOwnedValue
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

export type SavedCaseInsertPresetReapplyLineage = Readonly<{
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

export type SavedCaseInsertAppliedPresetConfiguration =
  | SavedCaseInsertAppliedPresetConfigurationBase & Readonly<{
      formatVersion: 1
    }>
  | SavedCaseInsertAppliedPresetConfigurationBase & Readonly<{
      formatVersion: 2
      reapply: SavedCaseInsertPresetReapplyLineage
    }>
  | Omit<SavedCaseInsertAppliedPresetConfigurationBase, 'ownedFields'> &
    Readonly<{
      formatVersion: 3
      reapply: SavedCaseInsertPresetReapplyLineage | null
      ownedFields: readonly SavedCaseInsertAppliedPresetOwnedFieldV3[]
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
