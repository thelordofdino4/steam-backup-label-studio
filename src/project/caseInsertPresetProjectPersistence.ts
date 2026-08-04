import {
  createCaseInsertPresetAssignmentSnapshot,
  type CaseInsertPresetAssignmentSnapshotIdentity,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import type {
  NormalizedCaseInsertProject,
} from '../lifecycle/canonicalProject.ts'
import {
  createCaseInsertAppliedPresetConfigurationIdentity,
  detectCaseInsertPresetCustomization,
  validateCaseInsertAppliedPresetConfiguration,
  type CaseInsertAppliedPresetConfiguration,
} from '../presets/caseInsertPresetAppliedConfiguration.ts'
import type {
  CaseInsertPresetCatalog,
} from '../presets/caseInsertPresetCatalog.ts'
import {
  CASE_INSERT_APPLIED_PRESET_CONFIGURATION_KIND,
} from '../presets/caseInsertPresetAppliedConfiguration.ts'
import {
  createCaseInsertPresetAttachedState,
  createCaseInsertPresetUnattachedState,
  type CaseInsertPresetAttachmentState,
} from '../presets/caseInsertPresetConfigurationAdoptionModel.ts'
import {
  cloneCaseInsertPresetPlainInput,
  deepFreezeCaseInsertPresetValue,
  hasExactCaseInsertPresetKeys,
  sameCaseInsertPresetValue,
} from '../presets/caseInsertPresetSafeInput.ts'
import type {
  ProjectJewelCaseState,
  SavedCaseInsertProject,
} from './projectTypes.ts'
import {
  CASE_INSERT_LAYOUT_PRESET_PROJECT_STATE_KIND,
  CASE_INSERT_LAYOUT_PRESET_PROJECT_STATE_VERSION,
  type SavedCaseInsertAppliedPresetConfiguration,
  type SavedCaseInsertLayoutPresetProjectState,
} from './caseInsertPresetProjectPersistenceTypes.ts'

export type CaseInsertPresetRecoveryStatus =
  | Readonly<{ status: 'not-applicable' }>
  | Readonly<{
      status: 'current'
      customization: 'clean' | 'customized'
    }>
  | Readonly<{
      status: 'stale'
      savedRevision: number
      latestAvailableRevision: number
      customization: 'clean' | 'customized'
    }>
  | Readonly<{
      status: 'incompatible'
      code: string
    }>
  | Readonly<{
      status: 'unavailable'
      code: 'exact-definition-unavailable' | 'catalog-unavailable'
    }>

export type PreparedCaseInsertPresetProjectRecovery = Readonly<{
  persistedState: SavedCaseInsertLayoutPresetProjectState
  recoveryStatus: CaseInsertPresetRecoveryStatus
}>

export type RecoveredCaseInsertPresetProjectApplication = Readonly<{
  applicationRevision: number
  attachment: CaseInsertPresetAttachmentState
  recoveryStatus: CaseInsertPresetRecoveryStatus
}>

export type CaseInsertPresetProjectPersistenceFailure = Readonly<{
  ok: false
  code: string
}>

export type PrepareCaseInsertPresetProjectRecoveryResult =
  | Readonly<{
      ok: true
      recovery: PreparedCaseInsertPresetProjectRecovery
    }>
  | CaseInsertPresetProjectPersistenceFailure

export type RecoverCaseInsertPresetProjectApplicationResult =
  | Readonly<{
      ok: true
      application: RecoveredCaseInsertPresetProjectApplication
    }>
  | CaseInsertPresetProjectPersistenceFailure

function failure(code: string): CaseInsertPresetProjectPersistenceFailure {
  return deepFreezeCaseInsertPresetValue({ ok: false as const, code })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFailure(
  value: unknown,
): value is CaseInsertPresetProjectPersistenceFailure {
  return isRecord(value) && value.ok === false && typeof value.code === 'string'
}

function isApplicationRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

export function createUnattachedCaseInsertLayoutPresetProjectState(
  applicationRevision = 0,
): SavedCaseInsertLayoutPresetProjectState {
  if (!isApplicationRevision(applicationRevision)) {
    throw new TypeError('Case preset application revision is invalid.')
  }
  return deepFreezeCaseInsertPresetValue({
    kind: CASE_INSERT_LAYOUT_PRESET_PROJECT_STATE_KIND,
    formatVersion: CASE_INSERT_LAYOUT_PRESET_PROJECT_STATE_VERSION,
    applicationRevision,
    attachment: { status: 'unattached' as const },
  })
}

function projectConfiguration(
  configuration: CaseInsertAppliedPresetConfiguration,
): SavedCaseInsertAppliedPresetConfiguration {
  const common = {
    firstApply: configuration.firstApply,
    preset: configuration.preset,
    requestedScope: configuration.requestedScope,
    resolvedRegions: configuration.resolvedRegions,
    template: configuration.template,
    reviewedPlanIdentity: configuration.reviewedPlanIdentity,
    ownedFields: configuration.ownedFields,
    reviewedWarningIds: configuration.reviewedWarningIds,
    acceptedMaterialConsentRequirementIds:
      configuration.acceptedMaterialConsentRequirementIds,
  }
  return deepFreezeCaseInsertPresetValue(configuration.formatVersion === 2
    ? { ...common, formatVersion: 2 as const, reapply: configuration.reapply }
    : { ...common, formatVersion: 1 as const })
}

export function projectCaseInsertLayoutPresetProjectState(
  application: Readonly<{
    applicationRevision: number
    attachment: CaseInsertPresetAttachmentState
  }>,
): SavedCaseInsertLayoutPresetProjectState {
  if (!isApplicationRevision(application.applicationRevision)) {
    throw new TypeError('Case preset application revision is invalid.')
  }
  if (application.attachment.status === 'unattached') {
    return createUnattachedCaseInsertLayoutPresetProjectState(
      application.applicationRevision,
    )
  }
  return deepFreezeCaseInsertPresetValue({
    kind: CASE_INSERT_LAYOUT_PRESET_PROJECT_STATE_KIND,
    formatVersion: CASE_INSERT_LAYOUT_PRESET_PROJECT_STATE_VERSION,
    applicationRevision: application.applicationRevision,
    attachment: {
      status: 'attached' as const,
      configuration: projectConfiguration(
        application.attachment.configuration,
      ),
    },
  })
}

export function createCaseInsertProjectSaveSnapshot(
  project: NormalizedCaseInsertProject,
  application: Readonly<{
    applicationRevision: number
    snapshotIdentity: CaseInsertPresetAssignmentSnapshotIdentity
    attachment: CaseInsertPresetAttachmentState
  }>,
): SavedCaseInsertProject {
  const snapshot = createCaseInsertPresetAssignmentSnapshot({
    sessionId: application.snapshotIdentity.sessionId,
    projectRevision: application.applicationRevision,
    project,
  })
  if (!snapshot.ok || !sameCaseInsertPresetValue(
    snapshot.value.identity,
    application.snapshotIdentity,
  )) {
    throw new TypeError(
      'Case project and preset application must be one coherent snapshot.',
    )
  }
  return structuredClone({
    ...project,
    caseInsertLayoutPreset:
      projectCaseInsertLayoutPresetProjectState(application),
  }) as SavedCaseInsertProject
}

function parsePersistedState(
  value: unknown,
): SavedCaseInsertLayoutPresetProjectState |
  CaseInsertPresetProjectPersistenceFailure {
  const cloned = cloneCaseInsertPresetPlainInput(value)
  if (!cloned.ok || !isRecord(cloned.value) ||
      !hasExactCaseInsertPresetKeys(cloned.value, [
        'kind', 'formatVersion', 'applicationRevision', 'attachment',
      ]) || cloned.value.kind !== CASE_INSERT_LAYOUT_PRESET_PROJECT_STATE_KIND ||
      cloned.value.formatVersion !==
        CASE_INSERT_LAYOUT_PRESET_PROJECT_STATE_VERSION ||
      !isApplicationRevision(cloned.value.applicationRevision) ||
      !isRecord(cloned.value.attachment)) {
    return failure('project-state-invalid')
  }
  const attachment = cloned.value.attachment
  if (attachment.status === 'unattached') {
    if (!hasExactCaseInsertPresetKeys(attachment, ['status'])) {
      return failure('unattached-state-invalid')
    }
    return createUnattachedCaseInsertLayoutPresetProjectState(
      cloned.value.applicationRevision,
    )
  }
  if (attachment.status !== 'attached' ||
      !hasExactCaseInsertPresetKeys(attachment, ['status', 'configuration']) ||
      !isRecord(attachment.configuration) ||
      cloned.value.applicationRevision === 0) {
    return failure('attached-state-invalid')
  }
  const configuration = attachment.configuration
  const reapplied = configuration.formatVersion === 2
  const expectedConfigurationKeys = [
    'formatVersion', 'firstApply', 'preset', 'requestedScope',
    'resolvedRegions', 'template', 'reviewedPlanIdentity', 'ownedFields',
    'reviewedWarningIds', 'acceptedMaterialConsentRequirementIds',
    ...(reapplied ? ['reapply'] : []),
  ]
  if ((configuration.formatVersion !== 1 &&
      configuration.formatVersion !== 2) ||
      !hasExactCaseInsertPresetKeys(
        configuration,
        expectedConfigurationKeys,
      )) {
    return failure('configuration-shape-invalid')
  }
  return deepFreezeCaseInsertPresetValue({
    kind: CASE_INSERT_LAYOUT_PRESET_PROJECT_STATE_KIND,
    formatVersion: CASE_INSERT_LAYOUT_PRESET_PROJECT_STATE_VERSION,
    applicationRevision: cloned.value.applicationRevision,
    attachment: {
      status: 'attached' as const,
      configuration: configuration as unknown as
        SavedCaseInsertAppliedPresetConfiguration,
    },
  })
}

function reconstructConfiguration(input: Readonly<{
  configuration: SavedCaseInsertAppliedPresetConfiguration
  applicationRevision: number
  sessionId: string
  project: NormalizedCaseInsertProject
}>): CaseInsertAppliedPresetConfiguration |
  CaseInsertPresetProjectPersistenceFailure {
  const sourceSnapshot = createCaseInsertPresetAssignmentSnapshot({
    sessionId: input.sessionId,
    projectRevision: input.applicationRevision - 1,
    project: input.project,
  })
  if (!sourceSnapshot.ok) {
    return failure(`source-snapshot-${sourceSnapshot.error.code}`)
  }
  const common = {
    kind: CASE_INSERT_APPLIED_PRESET_CONFIGURATION_KIND,
    domainStatus: 'validated-authoritative' as const,
    attachmentStatus: 'detached-uninstalled' as const,
    firstApply: input.configuration.firstApply,
    preset: input.configuration.preset,
    requestedScope: input.configuration.requestedScope,
    resolvedRegions: input.configuration.resolvedRegions,
    template: input.configuration.template,
    reviewedPlanIdentity: input.configuration.reviewedPlanIdentity,
    source: {
      projectKind: 'caseInsert' as const,
      snapshotIdentity: sourceSnapshot.value.identity,
    },
    ownedFields: input.configuration.ownedFields,
    reviewedWarningIds: input.configuration.reviewedWarningIds,
    acceptedMaterialConsentRequirementIds:
      input.configuration.acceptedMaterialConsentRequirementIds,
  }
  const identityInput = input.configuration.formatVersion === 2
    ? {
        ...common,
        formatVersion: 2 as const,
        reapply: input.configuration.reapply,
      }
    : { ...common, formatVersion: 1 as const }
  let configurationIdentity: string
  try {
    configurationIdentity = createCaseInsertAppliedPresetConfigurationIdentity(
      identityInput as Parameters<
        typeof createCaseInsertAppliedPresetConfigurationIdentity
      >[0],
    )
  } catch {
    return failure('configuration-identity-unavailable')
  }
  const candidate = deepFreezeCaseInsertPresetValue({
    ...identityInput,
    configurationIdentity,
  })
  const validated = validateCaseInsertAppliedPresetConfiguration(candidate)
  return validated.ok
    ? validated.configuration
    : failure(validated.code)
}

function reconstructAttachment(input: Readonly<{
  persistedState: SavedCaseInsertLayoutPresetProjectState
  sessionId: string
  project: NormalizedCaseInsertProject
}>): CaseInsertPresetAttachmentState |
  CaseInsertPresetProjectPersistenceFailure {
  if (input.persistedState.attachment.status === 'unattached') {
    return createCaseInsertPresetUnattachedState()
  }
  const configuration = reconstructConfiguration({
    configuration: input.persistedState.attachment.configuration,
    applicationRevision: input.persistedState.applicationRevision,
    sessionId: input.sessionId,
    project: input.project,
  })
  if (isFailure(configuration)) return configuration
  const attached = createCaseInsertPresetAttachedState(configuration)
  return attached.ok ? attached.state : failure(attached.code)
}

function assessRecoveryStatus(input: Readonly<{
  attachment: CaseInsertPresetAttachmentState
  applicationRevision: number
  sessionId: string
  project: NormalizedCaseInsertProject
  catalog?: CaseInsertPresetCatalog | null
}>): CaseInsertPresetRecoveryStatus {
  if (input.attachment.status === 'unattached') {
    return deepFreezeCaseInsertPresetValue({ status: 'not-applicable' as const })
  }
  const configuration = input.attachment.configuration
  if (!input.catalog) {
    return deepFreezeCaseInsertPresetValue({
      status: 'unavailable' as const,
      code: 'catalog-unavailable' as const,
    })
  }
  let exact
  let latest
  let resolved
  try {
    exact = input.catalog.getExact(
      configuration.preset.id,
      configuration.preset.revision,
    )
    latest = input.catalog.getLatest(configuration.preset.id)
    resolved = input.catalog.resolve({
      id: configuration.preset.id,
      revision: configuration.preset.revision,
    })
  } catch {
    return deepFreezeCaseInsertPresetValue({
      status: 'unavailable' as const,
      code: 'catalog-unavailable' as const,
    })
  }
  if (!exact || !resolved.ok) {
    return deepFreezeCaseInsertPresetValue({
      status: 'unavailable' as const,
      code: 'exact-definition-unavailable' as const,
    })
  }
  if (resolved.value.source !== configuration.preset.source) {
    return deepFreezeCaseInsertPresetValue({
      status: 'incompatible' as const,
      code: 'preset-source-mismatch',
    })
  }
  const customization = detectCaseInsertPresetCustomization({
    configuration,
    current: {
      projectKind: 'caseInsert',
      aggregate: input.project.caseInsert as unknown as ProjectJewelCaseState,
      sessionId: input.sessionId,
      projectRevision: input.applicationRevision,
      template: configuration.template,
    },
  })
  if (!customization.ok) {
    return deepFreezeCaseInsertPresetValue({
      status: 'incompatible' as const,
      code: customization.code,
    })
  }
  if (latest && latest.revision > configuration.preset.revision) {
    return deepFreezeCaseInsertPresetValue({
      status: 'stale' as const,
      savedRevision: configuration.preset.revision,
      latestAvailableRevision: latest.revision,
      customization: customization.status,
    })
  }
  return deepFreezeCaseInsertPresetValue({
    status: 'current' as const,
    customization: customization.status,
  })
}

export function prepareCaseInsertPresetProjectRecovery(input: Readonly<{
  persistedState: unknown
  project: NormalizedCaseInsertProject
  catalog?: CaseInsertPresetCatalog | null
}>): PrepareCaseInsertPresetProjectRecoveryResult {
  const persistedState = parsePersistedState(input.persistedState)
  if (isFailure(persistedState)) return persistedState
  const sessionId = 'project-open-preset-recovery-validation'
  const attachment = reconstructAttachment({
    persistedState,
    sessionId,
    project: input.project,
  })
  if (isFailure(attachment)) return attachment
  return deepFreezeCaseInsertPresetValue({
    ok: true as const,
    recovery: {
      persistedState,
      recoveryStatus: assessRecoveryStatus({
        attachment,
        applicationRevision: persistedState.applicationRevision,
        sessionId,
        project: input.project,
        catalog: input.catalog,
      }),
    },
  })
}

export function recoverCaseInsertPresetProjectApplication(input: Readonly<{
  recovery: PreparedCaseInsertPresetProjectRecovery
  sessionId: string
  project: NormalizedCaseInsertProject
}>): RecoverCaseInsertPresetProjectApplicationResult {
  const persistedState = parsePersistedState(input.recovery.persistedState)
  if (isFailure(persistedState)) return persistedState
  const attachment = reconstructAttachment({
    persistedState,
    sessionId: input.sessionId,
    project: input.project,
  })
  if (isFailure(attachment)) return attachment
  return deepFreezeCaseInsertPresetValue({
    ok: true as const,
    application: {
      applicationRevision: persistedState.applicationRevision,
      attachment,
      recoveryStatus: input.recovery.recoveryStatus,
    },
  })
}
