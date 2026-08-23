import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertReservedArtworkViewport,
} from '../project/projectTypes.ts'
import type {
  CaseInsertPresetConcreteRegionId,
  CaseInsertPresetCoordinateBasis,
  CaseInsertPresetId,
  CaseInsertPresetObjectBinding,
  CaseInsertPresetOwnerId,
  CaseInsertPresetRoleId,
} from './caseInsertPresetDefinition.ts'

export type CaseInsertAppliedPresetLayoutFieldId =
  | 'layout-x'
  | 'layout-y'
  | 'layout-scale'
  | 'layout-width'

export type CaseInsertAppliedPresetSourceAssignment = Readonly<{
  presetId: CaseInsertPresetId
  presetRevision: number
  slotId: `case:preset-slot:${string}`
  assignmentId: `case:preset-assignment:${string}`
  roleId: CaseInsertPresetRoleId
  region: CaseInsertPresetConcreteRegionId
  coordinateBasis: CaseInsertPresetCoordinateBasis
  ownerId: CaseInsertPresetOwnerId
  object: Readonly<{
    bindingKind: CaseInsertPresetObjectBinding['kind']
    bindingId: string
    runtimeId: string
  }>
  declaredPolicy:
    | 'normalized-content-region-direct-layout-v1'
    | 'create-empty-repeated-artwork-slot-v1'
    | 'reserved-artwork-viewport-v1'
}>

export type CaseInsertAppliedPresetOwnedFieldId =
  | 'object-presence'
  | CaseInsertAppliedPresetLayoutFieldId
  | 'image-fit'
  | 'reserved-artwork-viewport'

export type CaseInsertAppliedPresetOwnedValue =
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
      value: ProjectCaseInsertImageFit
    }>
  | Readonly<{
      kind: 'reserved-artwork-viewport'
      value: ProjectCaseInsertReservedArtworkViewport | null
    }>

export type CaseInsertAppliedPresetOwnedFieldAddressV3 = Readonly<{
  region: CaseInsertPresetConcreteRegionId
  featureOwnerId: CaseInsertPresetOwnerId
  bindingKind: 'fixed' | 'repeated'
  bindingId: string
  runtimeObjectId: string
  fieldId: CaseInsertAppliedPresetOwnedFieldId
}>

export type CaseInsertAppliedPresetOwnedFieldV3 = Readonly<{
  address: CaseInsertAppliedPresetOwnedFieldAddressV3
  lastAppliedValue: CaseInsertAppliedPresetOwnedValue
  sources: readonly CaseInsertAppliedPresetSourceAssignment[]
}>

export type CaseInsertPresetOwnedFieldObservation =
  | Readonly<{
      status: 'present'
      value: CaseInsertAppliedPresetOwnedValue
    }>
  | Readonly<{ status: 'absent-owned-object' }>
  | Readonly<{ status: 'value-absent' }>
  | Readonly<{ status: 'unavailable-object-absent' }>
