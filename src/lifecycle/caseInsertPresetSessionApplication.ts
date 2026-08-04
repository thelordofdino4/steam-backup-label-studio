import {
  createCaseInsertPresetAssignmentSnapshot,
  type CaseInsertPresetAssignmentSnapshotIdentity,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import {
  createCaseInsertPresetApplicationSnapshot,
  createCaseInsertPresetUnattachedState,
  projectCaseInsertPresetApplicationStateIdentity,
  validateCaseInsertPresetApplicationSnapshot,
  type CaseInsertPresetApplicationSnapshot,
  type CaseInsertPresetAttachmentState,
} from '../presets/caseInsertPresetConfigurationAdoptionModel.ts'
import {
  cloneCaseInsertPresetPlainInput,
  deepFreezeCaseInsertPresetValue,
  hasExactCaseInsertPresetKeys,
  sameCaseInsertPresetValue,
} from '../presets/caseInsertPresetSafeInput.ts'
import type { SavedProject } from '../project/projectTypes.ts'
import type {
  CaseInsertPresetRecoveryStatus,
} from '../project/caseInsertPresetProjectPersistence.ts'
import {
  captureNormalizedProjectSnapshot,
  getNormalizedProjectKind,
  type NormalizedPersistableProject,
} from './canonicalProject.ts'

export const CASE_INSERT_PRESET_SESSION_APPLICATION_KIND =
  'sbls/case-insert-preset-session-application' as const
export const CASE_INSERT_PRESET_SESSION_APPLICATION_VERSION = 1 as const
export const INITIAL_CASE_INSERT_PRESET_APPLICATION_REVISION = 0 as const

/**
 * Session-only binding metadata for the Case preset application snapshot.
 * The aggregate itself deliberately remains solely in ProjectSession.project.
 */
export type CaseInsertPresetSessionApplication = Readonly<{
  kind: typeof CASE_INSERT_PRESET_SESSION_APPLICATION_KIND
  formatVersion: typeof CASE_INSERT_PRESET_SESSION_APPLICATION_VERSION
  applicationRevision: number
  snapshotIdentity: CaseInsertPresetAssignmentSnapshotIdentity
  attachment: CaseInsertPresetAttachmentState
  recoveryStatus: CaseInsertPresetRecoveryStatus
  applicationStateIdentity: string
}>

export type CaseInsertPresetSessionApplicationFailureCode =
  | 'invalid-input'
  | 'unsupported-version'
  | 'invalid-session-id'
  | 'invalid-application-revision'
  | 'invalid-project-context'
  | 'invalid-attachment'
  | 'invalid-application-snapshot'
  | 'snapshot-context-mismatch'
  | 'application-state-identity-mismatch'

export type CaseInsertPresetSessionApplicationFailure = Readonly<{
  ok: false
  code: CaseInsertPresetSessionApplicationFailureCode
  detail: string
}>

export type CaseInsertPresetSessionApplicationResult =
  | Readonly<{
      ok: true
      application: CaseInsertPresetSessionApplication
    }>
  | CaseInsertPresetSessionApplicationFailure

export type CaseInsertPresetSessionApplicationSnapshotResult =
  | Readonly<{
      ok: true
      snapshot: CaseInsertPresetApplicationSnapshot
    }>
  | CaseInsertPresetSessionApplicationFailure

export type SynchronizeCaseInsertPresetSessionApplicationResult =
  | Readonly<{
      ok: true
      status: 'no-op' | 'advanced'
      application: CaseInsertPresetSessionApplication
    }>
  | CaseInsertPresetSessionApplicationFailure

type BuiltApplication = Readonly<{
  application: CaseInsertPresetSessionApplication
  snapshot: CaseInsertPresetApplicationSnapshot
}>

type NormalizedCaseInsertProject = Extract<
  NormalizedPersistableProject,
  Readonly<{ projectType: 'caseInsert' }>
>

const builtApplications = new WeakMap<
  object,
  Readonly<{
    sessionId: string
    projects: WeakSet<object>
    built: BuiltApplication
  }>
>()

function failure(
  code: CaseInsertPresetSessionApplicationFailureCode,
  detail: string,
): CaseInsertPresetSessionApplicationFailure {
  return deepFreezeCaseInsertPresetValue({ ok: false as const, code, detail })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  try {
    return !Array.isArray(value)
  } catch {
    return false
  }
}

function isFailure(
  value: unknown,
): value is CaseInsertPresetSessionApplicationFailure {
  return isRecord(value) && value.ok === false &&
    typeof value.code === 'string' && typeof value.detail === 'string'
}

function isApplicationRevision(value: unknown): value is number {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
}

function captureRecoveryStatus(
  value: unknown,
): CaseInsertPresetRecoveryStatus |
  CaseInsertPresetSessionApplicationFailure {
  if (!isRecord(value)) {
    return failure('invalid-input', 'recovery-status-invalid')
  }
  const keys = Object.keys(value)
  if (value.status === 'not-applicable' && keys.length === 1) {
    return deepFreezeCaseInsertPresetValue({ status: 'not-applicable' as const })
  }
  if (value.status === 'current' && keys.length === 2 &&
      (value.customization === 'clean' || value.customization === 'customized')) {
    return deepFreezeCaseInsertPresetValue({
      status: 'current' as const,
      customization: value.customization,
    })
  }
  if (value.status === 'stale' && keys.length === 4 &&
      isApplicationRevision(value.savedRevision) &&
      isApplicationRevision(value.latestAvailableRevision) &&
      value.latestAvailableRevision > value.savedRevision &&
      (value.customization === 'clean' || value.customization === 'customized')) {
    return deepFreezeCaseInsertPresetValue({
      status: 'stale' as const,
      savedRevision: value.savedRevision,
      latestAvailableRevision: value.latestAvailableRevision,
      customization: value.customization,
    })
  }
  if (value.status === 'incompatible' && keys.length === 2 &&
      typeof value.code === 'string' && value.code.length > 0) {
    return deepFreezeCaseInsertPresetValue({
      status: 'incompatible' as const,
      code: value.code,
    })
  }
  if (value.status === 'unavailable' && keys.length === 2 &&
      (value.code === 'exact-definition-unavailable' ||
        value.code === 'catalog-unavailable')) {
    return deepFreezeCaseInsertPresetValue({
      status: 'unavailable' as const,
      code: value.code,
    })
  }
  return failure('invalid-input', 'recovery-status-invalid')
}

function captureInputRecord(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> | CaseInsertPresetSessionApplicationFailure {
  if (!isRecord(value)) return failure('invalid-input', 'input-shape-invalid')
  let prototype: object | null
  let descriptors: PropertyDescriptorMap
  try {
    prototype = Object.getPrototypeOf(value) as object | null
    descriptors = Object.getOwnPropertyDescriptors(value)
  } catch {
    return failure('invalid-input', 'input-introspection-failed')
  }
  if (prototype !== Object.prototype && prototype !== null) {
    return failure('invalid-input', 'record-prototype-unsupported')
  }
  const actualKeys = Reflect.ownKeys(descriptors)
  if (actualKeys.some((key) => typeof key !== 'string') ||
      actualKeys.length !== keys.length ||
      keys.some((key) => !actualKeys.includes(key))) {
    return failure('invalid-input', 'input-shape-invalid')
  }
  const captured: Record<string, unknown> = {}
  for (const key of actualKeys as string[]) {
    const descriptor = descriptors[key]
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      return failure('invalid-input', 'record-accessor-unsupported')
    }
    captured[key] = descriptor.value
  }
  return captured
}

function buildApplication(input: Readonly<{
  sessionId: unknown
  project: unknown
  applicationRevision: unknown
  attachment: unknown
  recoveryStatus: unknown
}>): BuiltApplication | CaseInsertPresetSessionApplicationFailure {
  if (typeof input.sessionId !== 'string' || !input.sessionId.trim()) {
    return failure('invalid-session-id', 'session-id-invalid')
  }
  if (!isApplicationRevision(input.applicationRevision)) {
    return failure(
      'invalid-application-revision',
      'application-revision-invalid',
    )
  }
  const recoveryStatus = captureRecoveryStatus(input.recoveryStatus)
  if (isFailure(recoveryStatus)) return recoveryStatus

  let project: NormalizedPersistableProject
  try {
    project = captureNormalizedProjectSnapshot(input.project as SavedProject)
  } catch {
    return failure('invalid-project-context', 'project-snapshot-invalid')
  }
  if (getNormalizedProjectKind(project) !== 'caseInsert') {
    return failure('invalid-project-context', 'project-kind-not-case-insert')
  }

  let assignment: ReturnType<typeof createCaseInsertPresetAssignmentSnapshot>
  try {
    assignment = createCaseInsertPresetAssignmentSnapshot({
      sessionId: input.sessionId,
      projectRevision: input.applicationRevision,
      project,
    })
  } catch {
    return failure('invalid-project-context', 'assignment-snapshot-failed')
  }
  if (!assignment.ok) {
    return failure('invalid-project-context', assignment.error.code)
  }

  let applicationSnapshot: ReturnType<
    typeof createCaseInsertPresetApplicationSnapshot
  >
  try {
    applicationSnapshot = createCaseInsertPresetApplicationSnapshot({
      snapshot: assignment.value,
      attachment: input.attachment,
    })
  } catch {
    return failure('invalid-attachment', 'attachment-validation-failed')
  }
  if (!applicationSnapshot.ok) {
    return failure(
      applicationSnapshot.status === 'invalid-attachment-state' ||
          applicationSnapshot.status === 'invalid-source-configuration' ||
          applicationSnapshot.status === 'configuration-identity-mismatch' ||
          applicationSnapshot.status === 'configuration-domain-mismatch'
        ? 'invalid-attachment'
        : 'invalid-application-snapshot',
      applicationSnapshot.code,
    )
  }

  let identity: ReturnType<
    typeof projectCaseInsertPresetApplicationStateIdentity
  >
  try {
    identity = projectCaseInsertPresetApplicationStateIdentity(
      applicationSnapshot.value,
    )
  } catch {
    return failure(
      'invalid-application-snapshot',
      'application-identity-projection-failed',
    )
  }
  if (!identity.ok) {
    return failure('invalid-application-snapshot', identity.code)
  }

  const application = deepFreezeCaseInsertPresetValue({
    kind: CASE_INSERT_PRESET_SESSION_APPLICATION_KIND,
    formatVersion: CASE_INSERT_PRESET_SESSION_APPLICATION_VERSION,
    applicationRevision: input.applicationRevision,
    snapshotIdentity: applicationSnapshot.value.snapshot.identity,
    attachment: applicationSnapshot.value.attachment,
    recoveryStatus,
    applicationStateIdentity: identity.applicationStateIdentity,
  })

  const built = deepFreezeCaseInsertPresetValue({
    application,
    snapshot: applicationSnapshot.value,
  })
  builtApplications.set(application as object, Object.freeze({
    sessionId: input.sessionId,
    projects: new WeakSet([project as object]),
    built,
  }))
  return built
}

/**
 * Constructs one coherent metadata companion for authoritative Case content.
 * This pure function cannot install the result into lifecycle state.
 */
function createCaseInsertPresetSessionApplication(
  input: unknown,
): CaseInsertPresetSessionApplicationResult {
  const captured = captureInputRecord(input, [
    'sessionId', 'project', 'applicationRevision', 'attachment',
    'recoveryStatus',
  ])
  if (isFailure(captured)) return captured

  const built = buildApplication({
    sessionId: captured.sessionId,
    project: captured.project,
    applicationRevision: captured.applicationRevision,
    attachment: captured.attachment,
    recoveryStatus: captured.recoveryStatus,
  })
  if (isFailure(built)) return built
  return deepFreezeCaseInsertPresetValue({
    ok: true as const,
    application: built.application,
  })
}

export function createInitialCaseInsertPresetSessionApplication(
  input: unknown,
): CaseInsertPresetSessionApplicationResult {
  const captured = captureInputRecord(input, ['sessionId', 'project'])
  if (isFailure(captured)) return captured

  return createCaseInsertPresetSessionApplication({
    sessionId: captured.sessionId,
    project: captured.project,
    applicationRevision: INITIAL_CASE_INSERT_PRESET_APPLICATION_REVISION,
    attachment: createCaseInsertPresetUnattachedState(),
    recoveryStatus: { status: 'not-applicable' },
  })
}

export function createRecoveredCaseInsertPresetSessionApplication(
  input: unknown,
): CaseInsertPresetSessionApplicationResult {
  return createCaseInsertPresetSessionApplication(input)
}

/**
 * Rebinds editor-synchronized Case content without exposing a split-field
 * setter. Only a changed application-snapshot identity advances the distinct
 * application revision; the current attachment is preserved exactly.
 */
export function synchronizeCaseInsertPresetSessionApplication(
  input: unknown,
): SynchronizeCaseInsertPresetSessionApplicationResult {
  const captured = captureInputRecord(input, [
    'sessionId', 'currentProject', 'nextProject', 'currentApplication',
  ])
  if (isFailure(captured)) return captured

  const current = captureCaseInsertPresetSessionApplication({
    sessionId: captured.sessionId,
    project: captured.currentProject,
    application: captured.currentApplication,
  })
  if (!current.ok) return current

  let currentProject: NormalizedPersistableProject
  let nextProject: NormalizedPersistableProject
  try {
    currentProject = captureNormalizedProjectSnapshot(
      captured.currentProject as SavedProject,
    )
    nextProject = captureNormalizedProjectSnapshot(
      captured.nextProject as SavedProject,
    )
  } catch {
    return failure('invalid-project-context', 'project-snapshot-invalid')
  }
  if (getNormalizedProjectKind(currentProject) !== 'caseInsert' ||
      getNormalizedProjectKind(nextProject) !== 'caseInsert') {
    return failure('invalid-project-context', 'project-kind-not-case-insert')
  }
  const currentCaseProject = currentProject as NormalizedCaseInsertProject
  const nextCaseProject = nextProject as NormalizedCaseInsertProject
  if (sameCaseInsertPresetValue(
    currentCaseProject.caseInsert,
    nextCaseProject.caseInsert,
  ) && sameCaseInsertPresetValue(
    currentCaseProject.template,
    nextCaseProject.template,
  )) {
    const provenance = builtApplications.get(current.application as object)
    if (provenance?.projects.has(currentProject as object)) {
      provenance.projects.add(nextProject as object)
    }
    return deepFreezeCaseInsertPresetValue({
      ok: true as const,
      status: 'no-op' as const,
      application: current.application,
    })
  }
  if (current.application.applicationRevision >= Number.MAX_SAFE_INTEGER) {
    return failure(
      'invalid-application-revision',
      'application-revision-overflow',
    )
  }

  const advanced = buildApplication({
    sessionId: captured.sessionId,
    project: nextProject,
    applicationRevision: current.application.applicationRevision + 1,
    attachment: current.application.attachment,
    recoveryStatus: current.application.recoveryStatus,
  })
  if (isFailure(advanced)) return advanced
  return deepFreezeCaseInsertPresetValue({
    ok: true as const,
    status: 'advanced' as const,
    application: advanced.application,
  })
}

/**
 * Strictly captures and rebinds a stored unit to its authoritative session and
 * project. Supplied identities are checked rather than trusted.
 */
export function captureCaseInsertPresetSessionApplication(
  input: unknown,
): CaseInsertPresetSessionApplicationResult {
  const captured = captureInputRecord(input, [
    'sessionId', 'project', 'application',
  ])
  if (isFailure(captured)) return captured
  if (typeof captured.application === 'object' &&
      captured.application !== null) {
    const trusted = builtApplications.get(captured.application)
    if (trusted && trusted.sessionId === captured.sessionId &&
        typeof captured.project === 'object' && captured.project !== null &&
        trusted.projects.has(captured.project)) {
      return deepFreezeCaseInsertPresetValue({
        ok: true as const,
        application: trusted.built.application,
      })
    }
  }
  let clonedApplication: ReturnType<typeof cloneCaseInsertPresetPlainInput>
  try {
    clonedApplication = cloneCaseInsertPresetPlainInput(captured.application)
  } catch {
    return failure('invalid-input', 'application-introspection-failed')
  }
  if (!clonedApplication.ok || !isRecord(clonedApplication.value)) {
    return failure('invalid-input', 'application-shape-invalid')
  }
  const application = clonedApplication.value
  if (application.kind === CASE_INSERT_PRESET_SESSION_APPLICATION_KIND &&
      application.formatVersion !==
        CASE_INSERT_PRESET_SESSION_APPLICATION_VERSION) {
    return failure('unsupported-version', 'application-version-unsupported')
  }
  if (!hasExactCaseInsertPresetKeys(application, [
    'kind',
    'formatVersion',
    'applicationRevision',
    'snapshotIdentity',
    'attachment',
    'recoveryStatus',
    'applicationStateIdentity',
  ]) || application.kind !== CASE_INSERT_PRESET_SESSION_APPLICATION_KIND ||
      application.formatVersion !==
        CASE_INSERT_PRESET_SESSION_APPLICATION_VERSION) {
    return failure('invalid-input', 'application-shape-invalid')
  }

  const built = buildApplication({
    sessionId: captured.sessionId,
    project: captured.project,
    applicationRevision: application.applicationRevision,
    attachment: application.attachment,
    recoveryStatus: application.recoveryStatus,
  })
  if (isFailure(built)) return built
  if (!sameCaseInsertPresetValue(
    application.snapshotIdentity,
    built.application.snapshotIdentity,
  )) {
    return failure('snapshot-context-mismatch', 'snapshot-identity-mismatch')
  }
  if (application.applicationStateIdentity !==
      built.application.applicationStateIdentity) {
    return failure(
      'application-state-identity-mismatch',
      'application-state-identity-mismatch',
    )
  }

  return deepFreezeCaseInsertPresetValue({
    ok: true as const,
    application: built.application,
  })
}

/** Projects the exact pure adoption-model snapshot from authoritative content. */
export function projectCaseInsertPresetSessionApplicationSnapshot(
  input: unknown,
): CaseInsertPresetSessionApplicationSnapshotResult {
  const record = captureInputRecord(input, [
    'sessionId', 'project', 'application',
  ])
  if (isFailure(record)) return record
  const captured = captureCaseInsertPresetSessionApplication({
    sessionId: record.sessionId,
    project: record.project,
    application: record.application,
  })
  if (!captured.ok) return captured
  const built = buildApplication({
    sessionId: record.sessionId,
    project: record.project,
    applicationRevision: captured.application.applicationRevision,
    attachment: captured.application.attachment,
    recoveryStatus: captured.application.recoveryStatus,
  })
  if (isFailure(built)) return built
  return deepFreezeCaseInsertPresetValue({
    ok: true as const,
    snapshot: built.snapshot,
  })
}

/**
 * Represents an already-produced pure successor exactly, without installing it
 * or advancing its revision. Its aggregate must match the supplied project.
 */
export function representCaseInsertPresetApplicationSnapshot(
  input: unknown,
): CaseInsertPresetSessionApplicationResult {
  const captured = captureInputRecord(input, [
    'sessionId', 'project', 'snapshot',
  ])
  if (isFailure(captured)) return captured
  let validated: ReturnType<typeof validateCaseInsertPresetApplicationSnapshot>
  try {
    validated = validateCaseInsertPresetApplicationSnapshot(captured.snapshot)
  } catch {
    return failure('invalid-input', 'snapshot-introspection-failed')
  }
  if (!validated.ok) {
    return failure('invalid-application-snapshot', validated.code)
  }
  if (validated.value.snapshot.identity.sessionId !== captured.sessionId) {
    return failure('snapshot-context-mismatch', 'snapshot-session-id-mismatch')
  }

  const built = buildApplication({
    sessionId: captured.sessionId,
    project: captured.project,
    applicationRevision:
      validated.value.snapshot.identity.projectRevision,
    attachment: validated.value.attachment,
    recoveryStatus: validated.value.attachment.status === 'attached'
      ? { status: 'current', customization: 'clean' }
      : { status: 'not-applicable' },
  })
  if (isFailure(built)) return built
  if (!sameCaseInsertPresetValue(
    validated.value.snapshot.identity,
    built.snapshot.snapshot.identity,
  )) {
    return failure('snapshot-context-mismatch', 'snapshot-project-mismatch')
  }
  let suppliedIdentity: ReturnType<
    typeof projectCaseInsertPresetApplicationStateIdentity
  >
  try {
    suppliedIdentity = projectCaseInsertPresetApplicationStateIdentity(
      validated.value,
    )
  } catch {
    return failure(
      'invalid-application-snapshot',
      'application-identity-projection-failed',
    )
  }
  if (!suppliedIdentity.ok || suppliedIdentity.applicationStateIdentity !==
      built.application.applicationStateIdentity) {
    return failure(
      'application-state-identity-mismatch',
      suppliedIdentity.ok
        ? 'application-state-identity-mismatch'
        : suppliedIdentity.code,
    )
  }

  return deepFreezeCaseInsertPresetValue({
    ok: true as const,
    application: built.application,
  })
}

export function caseInsertPresetSessionApplicationsAreEqual(
  first: CaseInsertPresetSessionApplication,
  second: CaseInsertPresetSessionApplication,
): boolean {
  return first === second || (
    first.applicationRevision === second.applicationRevision &&
    first.applicationStateIdentity === second.applicationStateIdentity &&
    sameCaseInsertPresetValue(first.snapshotIdentity, second.snapshotIdentity) &&
    sameCaseInsertPresetValue(first.attachment, second.attachment) &&
    sameCaseInsertPresetValue(first.recoveryStatus, second.recoveryStatus)
  )
}
