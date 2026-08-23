import type {
  CaseInsertPresetAssignmentSnapshotIdentity,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import type {
  CaseInsertPresetApplicationScope,
  CaseInsertPresetConcreteRegionId,
  CaseInsertPresetOwnerId,
} from './caseInsertPresetDefinition.ts'
import type {
  CaseInsertPresetApplyPlan,
  CaseInsertPresetPlanFieldId,
  CaseInsertPresetPlanSourceAssignment,
} from './caseInsertPresetApplyPlanning.ts'
import type {
  CaseInsertAppliedPresetOwnedFieldId,
  CaseInsertAppliedPresetOwnedValue,
} from './caseInsertPresetOwnedField.ts'

export const CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_KIND =
  'sbls/case-insert-preset-applied-configuration-candidate' as const
export const CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_VERSION =
  1 as const
export const CASE_INSERT_PRESET_TYPED_CONFIGURATION_CANDIDATE_VERSION =
  2 as const

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T

export type ImmutableProjectJewelCaseState =
  DeepReadonly<ProjectJewelCaseState>

type CaseInsertPresetAppliedConfigurationCandidateBase = Readonly<{
  kind: typeof CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_KIND
  installationStatus: 'candidate-uninstalled'
  operation: 'apply'
  preset: Readonly<{
    id: CaseInsertPresetApplyPlan['preset']['id']
    revision: number
    source: 'builtin' | 'user'
  }>
  requestedScope: CaseInsertPresetApplicationScope
  resolvedRegions: readonly CaseInsertPresetConcreteRegionId[]
  template: Readonly<{ id: string; revision: null }>
  reviewedPlanIdentity: string
  sourceSnapshotIdentity: CaseInsertPresetAssignmentSnapshotIdentity
  reviewedWarningIds: readonly string[]
  acceptedMaterialConsentRequirementIds:
    readonly `case:preset-consent:${string}`[]
}>

export type CaseInsertPresetAppliedConfigurationCandidateV1 = Readonly<
  CaseInsertPresetAppliedConfigurationCandidateBase & {
    formatVersion:
      typeof CASE_INSERT_PRESET_APPLIED_CONFIGURATION_CANDIDATE_VERSION
    ownedFields: readonly Readonly<{
      featureOwnerId: CaseInsertPresetOwnerId
      object: CaseInsertPresetPlanSourceAssignment['object']
      fieldId: CaseInsertPresetPlanFieldId
      lastAppliedValue: number
      sources: readonly CaseInsertPresetPlanSourceAssignment[]
    }>[]
  }
>

export type CaseInsertPresetAppliedConfigurationCandidateV2 = Readonly<
  CaseInsertPresetAppliedConfigurationCandidateBase & {
    formatVersion:
      typeof CASE_INSERT_PRESET_TYPED_CONFIGURATION_CANDIDATE_VERSION
    ownedFields: readonly Readonly<{
      featureOwnerId: CaseInsertPresetOwnerId
      object: CaseInsertPresetPlanSourceAssignment['object']
      fieldId: CaseInsertAppliedPresetOwnedFieldId
      lastAppliedValue: CaseInsertAppliedPresetOwnedValue
      sources: readonly CaseInsertPresetPlanSourceAssignment[]
    }>[]
  }
>

export type CaseInsertPresetAppliedConfigurationCandidate =
  | CaseInsertPresetAppliedConfigurationCandidateV1
  | CaseInsertPresetAppliedConfigurationCandidateV2
