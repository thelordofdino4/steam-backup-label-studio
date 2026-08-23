import type { SavedProject } from '../project/projectTypes.ts'
import {
  auditCaseInsertPresetValidatedAdoptionSuccessBundle,
  type CaseInsertPresetValidatedAdoptionSuccessBundle,
} from '../presets/caseInsertPresetApplicationAdoptionTransition.ts'
import {
  type CaseInsertPresetApplicationAdoptionOperation,
  type CaseInsertPresetApplicationAdoptionReceipt,
  type CaseInsertPresetApplyApplicationAdoptionReceipt,
  type CaseInsertPresetDetachApplicationAdoptionReceipt,
  type CaseInsertPresetReapplyApplicationAdoptionReceipt,
} from '../presets/caseInsertPresetConfigurationAdoptionModel.ts'
import {
  createCaseInsertPresetDeterministicIdentityDigest,
} from '../presets/caseInsertPresetDeterministicIdentity.ts'
import {
  deepFreezeCaseInsertPresetValue,
  sameCaseInsertPresetValue,
} from '../presets/caseInsertPresetSafeInput.ts'
import {
  captureNormalizedProjectSnapshot,
  normalizedProjectSnapshotsAreExactlyEqual,
} from './canonicalProject.ts'
import {
  CASE_INSERT_PRESET_SESSION_APPLICATION_KIND,
  CASE_INSERT_PRESET_SESSION_APPLICATION_VERSION,
  projectCaseInsertPresetSessionApplicationSnapshot,
  representCaseInsertPresetTransitionSuccessor,
} from './caseInsertPresetSessionApplication.ts'
import {
  applicationLifecycleStatesAreSemanticallyEqual,
  captureApplicationLifecycleState,
  type ApplicationLifecycleState,
  type CaseInsertProjectSession,
} from './projectSession.ts'

export const CASE_INSERT_PRESET_SESSION_ADOPTION_COMMIT_SNAPSHOT_KIND =
  'sbls/case-insert-preset-session-adoption-commit-snapshot' as const
export const CASE_INSERT_PRESET_SESSION_ADOPTION_COMMIT_SNAPSHOT_VERSION =
  1 as const
export const CASE_INSERT_PRESET_SESSION_ADOPTION_COMMIT_IDENTITY_PREFIX =
  'case:preset-session-adoption-commit:v1:' as const

type AdoptionSuccess = CaseInsertPresetValidatedAdoptionSuccessBundle['adoption']

type CommitSnapshotFor<
  Operation extends CaseInsertPresetApplicationAdoptionOperation,
> = Readonly<{
  kind: typeof CASE_INSERT_PRESET_SESSION_ADOPTION_COMMIT_SNAPSHOT_KIND
  formatVersion:
    typeof CASE_INSERT_PRESET_SESSION_ADOPTION_COMMIT_SNAPSHOT_VERSION
  operation: Operation
  sourceSession: CaseInsertProjectSession
  successorSession: CaseInsertProjectSession
  adoptionBundle: Extract<
    CaseInsertPresetValidatedAdoptionSuccessBundle,
    { operation: Operation }
  >
  snapshotIdentity: string
}>

/**
 * Complete lifecycle authorization for one pure adoption commit. The full
 * source session is deliberately retained because the preset application
 * revision and persisted-content revision are separate compare-and-swap
 * domains.
 */
export type CaseInsertPresetSessionAdoptionCommitSnapshot =
  | CommitSnapshotFor<'apply'>
  | CommitSnapshotFor<'reapply'>
  | CommitSnapshotFor<'detach'>

export type CaseInsertPresetSessionApplicationCommitFailureStatus =
  | 'invalid-application-commit-input'
  | 'unsupported-commit-snapshot-version'
  | 'unsupported-adoption-success-bundle-version'
  | 'unsupported-application-version'
  | 'invalid-current-session'
  | 'invalid-successor-snapshot'
  | 'session-identity-mismatch'
  | 'project-revision-mismatch'
  | 'application-revision-mismatch'
  | 'template-context-mismatch'
  | 'assignment-snapshot-mismatch'
  | 'aggregate-identity-mismatch'
  | 'attachment-state-mismatch'
  | 'configuration-identity-mismatch'
  | 'application-state-identity-mismatch'
  | 'transition-evidence-mismatch'
  | 'transition-already-adopted'
  | 'unsupported-operation'
  | 'illegal-attachment-transition'
  | 'revision-transition-mismatch'
  | 'unrelated-project-content-change'
  | 'stale-application-snapshot'
  | 'replayed-adoption'
  | 'successor-identity-mismatch'

export type CaseInsertPresetSessionApplicationCommitFailure = Readonly<{
  ok: false
  status: CaseInsertPresetSessionApplicationCommitFailureStatus
  code: string
  operation?: CaseInsertPresetApplicationAdoptionOperation
  dimensions?: readonly string[]
}>

export type PrepareCaseInsertPresetSessionAdoptionCommitResult =
  | Readonly<{
      ok: true
      status: 'prepared'
      snapshot: CaseInsertPresetSessionAdoptionCommitSnapshot
    }>
  | CaseInsertPresetSessionApplicationCommitFailure

type CommitSuccessFor<
  Operation extends CaseInsertPresetApplicationAdoptionOperation,
  Receipt extends CaseInsertPresetApplicationAdoptionReceipt,
> = Readonly<{
  ok: true
  status: 'committed'
  operation: Operation
  session: CaseInsertProjectSession
  receipt: Receipt
  snapshotIdentity: string
}>

export type CommitCaseInsertPresetSessionApplicationResult =
  | CommitSuccessFor<'apply', CaseInsertPresetApplyApplicationAdoptionReceipt>
  | CommitSuccessFor<
      'reapply',
      CaseInsertPresetReapplyApplicationAdoptionReceipt
    >
  | CommitSuccessFor<'detach', CaseInsertPresetDetachApplicationAdoptionReceipt>
  | CaseInsertPresetSessionApplicationCommitFailure

type PlainRecord = Record<string, unknown>

function isRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function failure(
  status: CaseInsertPresetSessionApplicationCommitFailureStatus,
  code: string,
  options: Readonly<{
    operation?: CaseInsertPresetApplicationAdoptionOperation
    dimensions?: readonly string[]
  }> = {},
): CaseInsertPresetSessionApplicationCommitFailure {
  return deepFreezeCaseInsertPresetValue({
    ok: false as const,
    status,
    code,
    ...(options.operation ? { operation: options.operation } : {}),
    ...(options.dimensions ? { dimensions: [...options.dimensions] } : {}),
  })
}

function isFailure(
  value: unknown,
): value is CaseInsertPresetSessionApplicationCommitFailure {
  return isRecord(value) && value.ok === false &&
    typeof value.status === 'string' && typeof value.code === 'string'
}

function captureInputRecord(
  value: unknown,
  expectedKeys: readonly string[],
  code: string,
): PlainRecord | CaseInsertPresetSessionApplicationCommitFailure {
  if (!isRecord(value)) {
    return failure('invalid-application-commit-input', `${code}-shape-invalid`)
  }
  let prototype: object | null
  let descriptors: PropertyDescriptorMap
  let keys: (string | symbol)[]
  try {
    prototype = Object.getPrototypeOf(value) as object | null
    descriptors = Object.getOwnPropertyDescriptors(value)
    keys = Reflect.ownKeys(descriptors)
  } catch {
    return failure('invalid-application-commit-input', `${code}-capture-failed`)
  }
  if (prototype !== Object.prototype && prototype !== null) {
    return failure(
      'invalid-application-commit-input',
      `${code}-prototype-unsupported`,
    )
  }
  if (keys.some((key) => typeof key !== 'string') ||
      keys.length !== expectedKeys.length ||
      expectedKeys.some((key) => !keys.includes(key))) {
    return failure('invalid-application-commit-input', `${code}-shape-invalid`)
  }
  const captured: PlainRecord = {}
  for (const key of keys as string[]) {
    const descriptor = descriptors[key]
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      return failure(
        'invalid-application-commit-input',
        `${code}-accessor-unsupported`,
      )
    }
    captured[key] = descriptor.value
  }
  return captured
}

function applicationVersionFailure(
  value: unknown,
): CaseInsertPresetSessionApplicationCommitFailure | null {
  function captureDataRecord(input: unknown): PlainRecord | null {
    if (typeof input !== 'object' || input === null) return null
    let prototype: object | null
    let descriptors: PropertyDescriptorMap
    let array: boolean
    try {
      prototype = Object.getPrototypeOf(input) as object | null
      descriptors = Object.getOwnPropertyDescriptors(input)
      array = Array.isArray(input)
    } catch {
      return null
    }
    if (array || (prototype !== Object.prototype && prototype !== null)) {
      return null
    }
    const record: PlainRecord = {}
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== 'string') return null
      const descriptor = descriptors[key]
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
        return null
      }
      record[key] = descriptor.value
    }
    return record
  }

  const session = captureDataRecord(value)
  if (!session || session.kind !== 'caseInsert') return null
  const application = captureDataRecord(session.caseInsertPresetApplication)
  if (!application ||
      application.kind !== CASE_INSERT_PRESET_SESSION_APPLICATION_KIND) {
    return null
  }
  return application.formatVersion ===
      CASE_INSERT_PRESET_SESSION_APPLICATION_VERSION
    ? null
    : failure(
        'unsupported-application-version',
        'case-preset-session-application-version-unsupported',
      )
}

function captureCaseSession(
  value: unknown,
  role: 'source' | 'current' | 'successor',
): CaseInsertProjectSession |
  CaseInsertPresetSessionApplicationCommitFailure {
  const versionFailure = applicationVersionFailure(value)
  if (versionFailure) return versionFailure
  try {
    const state = captureApplicationLifecycleState({
      activeSession: value,
      visibleWorkspace: 'home',
    } as ApplicationLifecycleState)
    if (!state.activeSession || state.activeSession.kind !== 'caseInsert') {
      return failure(
        role === 'successor'
          ? 'invalid-successor-snapshot'
          : 'invalid-current-session',
        `${role}-session-not-case-insert`,
      )
    }
    return state.activeSession
  } catch {
    return failure(
      role === 'successor'
        ? 'invalid-successor-snapshot'
        : 'invalid-current-session',
      `${role}-case-session-invalid`,
    )
  }
}

function lifecycleStateFor(
  session: CaseInsertProjectSession,
): ApplicationLifecycleState {
  return Object.freeze({ activeSession: session, visibleWorkspace: 'home' })
}

function sessionsAreExactlyEqual(
  first: CaseInsertProjectSession,
  second: CaseInsertProjectSession,
): boolean {
  return applicationLifecycleStatesAreSemanticallyEqual(
    lifecycleStateFor(first),
    lifecycleStateFor(second),
  )
}

function mapAdoptionFailure(
  status: string,
  code: string,
  operation?: CaseInsertPresetApplicationAdoptionOperation,
): CaseInsertPresetSessionApplicationCommitFailure {
  if (status === 'transition-already-adopted') {
    return failure('transition-already-adopted', code, { operation })
  }
  if (status === 'unsupported-operation') {
    return failure('unsupported-operation', code, { operation })
  }
  if (status === 'unsupported-adoption-success-bundle-version') {
    return failure(
      'unsupported-adoption-success-bundle-version',
      code,
      { operation },
    )
  }
  if (status === 'attachment-conflict' ||
      status === 'missing-source-attachment' ||
      status === 'unexpected-source-attachment' ||
      status === 'successor-attachment-mismatch' ||
      status === 'invalid-release-evidence' ||
      status === 'release-configuration-mismatch' ||
      status === 'unsupported-state-transition') {
    return failure('illegal-attachment-transition', code, { operation })
  }
  if (status === 'configuration-identity-mismatch' ||
      status === 'configuration-domain-mismatch' ||
      status === 'invalid-source-configuration') {
    return failure('configuration-identity-mismatch', code, { operation })
  }
  if (status === 'stale-application-snapshot') {
    return failure('stale-application-snapshot', code, { operation })
  }
  return failure('transition-evidence-mismatch', code, { operation })
}

function validateAdoptionBundle(
  source: CaseInsertProjectSession,
  bundleInput: unknown,
): CaseInsertPresetValidatedAdoptionSuccessBundle |
  CaseInsertPresetSessionApplicationCommitFailure {
  let audited: ReturnType<
    typeof auditCaseInsertPresetValidatedAdoptionSuccessBundle
  >
  try {
    audited = auditCaseInsertPresetValidatedAdoptionSuccessBundle(bundleInput)
  } catch {
    return failure(
      'transition-evidence-mismatch',
      'adoption-success-bundle-validation-failed',
    )
  }
  if (!audited.ok) {
    return mapAdoptionFailure(
      audited.status,
      audited.code,
      audited.operation,
    )
  }

  const projected = projectCaseInsertPresetSessionApplicationSnapshot({
    sessionId: source.id,
    project: source.project,
    application: source.caseInsertPresetApplication,
  })
  if (!projected.ok) {
    return failure(
      'invalid-current-session',
      projected.detail,
      { operation: audited.bundle.adoption.operation },
    )
  }
  if (!sameCaseInsertPresetValue(
    projected.snapshot,
    audited.bundle.current,
  )) {
    return failure(
      'stale-application-snapshot',
      'adoption-bundle-current-not-source-session-application',
      { operation: audited.bundle.adoption.operation },
    )
  }
  return audited.bundle
}

function advanceContentRevision(
  revision: number,
  operation: CaseInsertPresetApplicationAdoptionOperation,
): number | CaseInsertPresetSessionApplicationCommitFailure {
  if (!Number.isSafeInteger(revision) || revision < 0 ||
      revision >= Number.MAX_SAFE_INTEGER) {
    return failure(
      'revision-transition-mismatch',
      'successor-project-content-revision-overflow',
      { operation, dimensions: ['project-revision'] },
    )
  }
  return revision + 1
}

function buildSuccessorSession(
  source: CaseInsertProjectSession,
  adoption: AdoptionSuccess,
  successorRecoveryStatusInput: unknown,
): CaseInsertProjectSession |
  CaseInsertPresetSessionApplicationCommitFailure {
  const aggregateChanged = !sameCaseInsertPresetValue(
    source.project.caseInsert,
    adoption.state.snapshot.caseInsert,
  )
  const contentRevision = aggregateChanged
    ? advanceContentRevision(source.revision, adoption.operation)
    : source.revision
  if (isFailure(contentRevision)) return contentRevision

  let project: CaseInsertProjectSession['project']
  try {
    project = captureNormalizedProjectSnapshot({
      ...source.project,
      caseInsert: adoption.state.snapshot.caseInsert,
    } as unknown as SavedProject) as CaseInsertProjectSession['project']
  } catch {
    return failure(
      'invalid-successor-snapshot',
      'successor-case-project-invalid',
      { operation: adoption.operation },
    )
  }

  const represented = representCaseInsertPresetTransitionSuccessor({
    sessionId: source.id,
    project,
    snapshot: adoption.state,
    operation: adoption.operation,
    successorRecoveryStatus: successorRecoveryStatusInput,
  })
  if (!represented.ok) {
    return failure(
      represented.code === 'snapshot-context-mismatch'
        ? 'assignment-snapshot-mismatch'
        : represented.code === 'application-state-identity-mismatch'
          ? 'application-state-identity-mismatch'
          : 'invalid-successor-snapshot',
      represented.detail,
      { operation: adoption.operation },
    )
  }
  if (represented.application.applicationRevision !==
      source.caseInsertPresetApplication.applicationRevision + 1) {
    return failure(
      'application-revision-mismatch',
      'successor-application-revision-not-exactly-one-advance',
      { operation: adoption.operation, dimensions: ['application-revision'] },
    )
  }

  return captureCaseSession({
    ...source,
    project,
    revision: contentRevision,
    caseInsertPresetApplication: represented.application,
  }, 'successor')
}

function snapshotIdentityInput(
  input: Readonly<{
    operation: CaseInsertPresetApplicationAdoptionOperation
    sourceSession: CaseInsertProjectSession
    successorSession: CaseInsertProjectSession
    adoptionBundle: CaseInsertPresetValidatedAdoptionSuccessBundle
  }>,
) {
  return {
    kind: CASE_INSERT_PRESET_SESSION_ADOPTION_COMMIT_SNAPSHOT_KIND,
    formatVersion:
      CASE_INSERT_PRESET_SESSION_ADOPTION_COMMIT_SNAPSHOT_VERSION,
    ...input,
  }
}

function createSnapshotIdentity(
  input: ReturnType<typeof snapshotIdentityInput>,
): string | CaseInsertPresetSessionApplicationCommitFailure {
  try {
    return `${CASE_INSERT_PRESET_SESSION_ADOPTION_COMMIT_IDENTITY_PREFIX}${
      createCaseInsertPresetDeterministicIdentityDigest(input)
    }`
  } catch {
    return failure(
      'successor-identity-mismatch',
      'commit-snapshot-identity-projection-failed',
      { operation: input.operation },
    )
  }
}

function prepareValidated(
  sourceInput: unknown,
  adoptionBundleInput: unknown,
  successorRecoveryStatusInput: unknown,
): PrepareCaseInsertPresetSessionAdoptionCommitResult {
  const source = captureCaseSession(sourceInput, 'source')
  if (isFailure(source)) return source
  const bundle = validateAdoptionBundle(source, adoptionBundleInput)
  if (isFailure(bundle)) return bundle
  const successor = buildSuccessorSession(
    source,
    bundle.adoption,
    successorRecoveryStatusInput,
  )
  if (isFailure(successor)) return successor

  const identityInput = snapshotIdentityInput({
    operation: bundle.adoption.operation,
    sourceSession: source,
    successorSession: successor,
    adoptionBundle: bundle,
  })
  const snapshotIdentity = createSnapshotIdentity(identityInput)
  if (isFailure(snapshotIdentity)) return snapshotIdentity

  return deepFreezeCaseInsertPresetValue({
    ok: true as const,
    status: 'prepared' as const,
    snapshot: {
      ...identityInput,
      snapshotIdentity,
    } as CaseInsertPresetSessionAdoptionCommitSnapshot,
  })
}

/**
 * Captures the complete source authorization and adoption result that the
 * later pure commit must compare against. This does not mutate lifecycle or
 * application state and it never executes an Apply/Reapply/Detach operation.
 */
export function prepareCaseInsertPresetSessionAdoptionCommit(
  value: unknown,
): PrepareCaseInsertPresetSessionAdoptionCommitResult {
  try {
    const input = captureInputRecord(
      value,
      ['sourceSession', 'adoptionBundle', 'successorRecoveryStatus'],
      'prepare-application-commit-input',
    )
    if (isFailure(input)) return input
    return prepareValidated(
      input.sourceSession,
      input.adoptionBundle,
      input.successorRecoveryStatus,
    )
  } catch {
    return failure(
      'invalid-application-commit-input',
      'prepare-application-commit-validation-failed',
    )
  }
}

function validateCommitSnapshot(
  value: unknown,
): CaseInsertPresetSessionAdoptionCommitSnapshot |
  CaseInsertPresetSessionApplicationCommitFailure {
  const captured = captureInputRecord(value, [
    'kind',
    'formatVersion',
    'operation',
    'sourceSession',
    'successorSession',
    'adoptionBundle',
    'snapshotIdentity',
  ], 'commit-snapshot')
  if (isFailure(captured)) {
    return failure('invalid-successor-snapshot', captured.code)
  }
  const candidate = captured
  if (candidate.kind ===
      CASE_INSERT_PRESET_SESSION_ADOPTION_COMMIT_SNAPSHOT_KIND &&
      candidate.formatVersion !==
        CASE_INSERT_PRESET_SESSION_ADOPTION_COMMIT_SNAPSHOT_VERSION) {
    return failure(
      'unsupported-commit-snapshot-version',
      'commit-snapshot-version-unsupported',
    )
  }
  if (candidate.kind !==
      CASE_INSERT_PRESET_SESSION_ADOPTION_COMMIT_SNAPSHOT_KIND ||
      candidate.formatVersion !==
        CASE_INSERT_PRESET_SESSION_ADOPTION_COMMIT_SNAPSHOT_VERSION) {
    return failure(
      'invalid-successor-snapshot',
      'commit-snapshot-shape-invalid',
    )
  }
  if (candidate.operation !== 'apply' && candidate.operation !== 'reapply' &&
      candidate.operation !== 'detach') {
    return failure(
      'unsupported-operation',
      'commit-snapshot-operation-unsupported',
    )
  }

  const suppliedSuccessor = captureCaseSession(
    candidate.successorSession,
    'successor',
  )
  if (isFailure(suppliedSuccessor)) return suppliedSuccessor
  const expected = prepareValidated(
    candidate.sourceSession,
    candidate.adoptionBundle,
    suppliedSuccessor.caseInsertPresetApplication.recoveryStatus,
  )
  if (!expected.ok) return expected
  if (candidate.operation !== expected.snapshot.operation) {
    return failure(
      'transition-evidence-mismatch',
      'commit-snapshot-operation-mismatch',
      { operation: candidate.operation },
    )
  }
  if (candidate.snapshotIdentity !== expected.snapshot.snapshotIdentity) {
    return failure(
      'successor-identity-mismatch',
      'commit-snapshot-identity-mismatch',
      { operation: candidate.operation },
    )
  }
  if (!sessionsAreExactlyEqual(
    suppliedSuccessor,
    expected.snapshot.successorSession,
  )) {
    return failure(
      'invalid-successor-snapshot',
      'commit-snapshot-successor-session-mismatch',
      { operation: candidate.operation },
    )
  }
  return expected.snapshot
}

function replayMatches(
  current: CaseInsertProjectSession,
  snapshot: CaseInsertPresetSessionAdoptionCommitSnapshot,
): boolean {
  return sessionsAreExactlyEqual(current, snapshot.successorSession)
}

function attachmentMismatchDimensions(
  current: CaseInsertProjectSession,
  source: CaseInsertProjectSession,
): readonly string[] {
  const dimensions: string[] = []
  const currentAttachment = current.caseInsertPresetApplication.attachment
  const sourceAttachment = source.caseInsertPresetApplication.attachment
  if (currentAttachment.status !== sourceAttachment.status) {
    dimensions.push('attachment-status')
  }
  if (currentAttachment.attachmentIdentity !==
      sourceAttachment.attachmentIdentity) {
    dimensions.push('attachment-identity')
  }
  if (currentAttachment.status === 'attached' &&
      sourceAttachment.status === 'attached' &&
      currentAttachment.configuration.configurationIdentity !==
        sourceAttachment.configuration.configurationIdentity) {
    dimensions.push('configuration-identity')
  }
  return dimensions
}

function classifyStaleCurrent(
  current: CaseInsertProjectSession,
  snapshot: CaseInsertPresetSessionAdoptionCommitSnapshot,
): CaseInsertPresetSessionApplicationCommitFailure {
  const source = snapshot.sourceSession
  const operation = snapshot.operation
  if (replayMatches(current, snapshot)) {
    return failure('replayed-adoption', 'adoption-successor-already-current', {
      operation,
    })
  }
  if (current.id !== source.id) {
    return failure('session-identity-mismatch', 'source-session-id-stale', {
      operation,
      dimensions: ['session-id'],
    })
  }
  if (current.revision !== source.revision) {
    return failure('project-revision-mismatch', 'source-content-revision-stale', {
      operation,
      dimensions: ['project-revision'],
    })
  }
  if (current.caseInsertPresetApplication.applicationRevision !==
      source.caseInsertPresetApplication.applicationRevision) {
    return failure(
      'application-revision-mismatch',
      'source-application-revision-stale',
      { operation, dimensions: ['application-revision'] },
    )
  }
  if (!sameCaseInsertPresetValue(
    current.project.template,
    source.project.template,
  ) || !sameCaseInsertPresetValue(
    current.caseInsertPresetApplication.snapshotIdentity.template,
    source.caseInsertPresetApplication.snapshotIdentity.template,
  )) {
    return failure('template-context-mismatch', 'source-template-context-stale', {
      operation,
      dimensions: ['template'],
    })
  }
  if (!sameCaseInsertPresetValue(
    current.caseInsertPresetApplication.snapshotIdentity,
    source.caseInsertPresetApplication.snapshotIdentity,
  )) {
    return failure(
      'assignment-snapshot-mismatch',
      'source-assignment-snapshot-stale',
      { operation, dimensions: ['assignment-snapshot-identity'] },
    )
  }
  if (!sameCaseInsertPresetValue(
    current.project.caseInsert,
    source.project.caseInsert,
  )) {
    return failure(
      'aggregate-identity-mismatch',
      'source-case-aggregate-stale',
      { operation, dimensions: ['aggregate'] },
    )
  }
  const attachmentDimensions = attachmentMismatchDimensions(current, source)
  if (attachmentDimensions.length > 0) {
    return failure(
      attachmentDimensions.includes('configuration-identity')
        ? 'configuration-identity-mismatch'
        : 'attachment-state-mismatch',
      'source-attachment-state-stale',
      { operation, dimensions: attachmentDimensions },
    )
  }
  if (current.caseInsertPresetApplication.applicationStateIdentity !==
      source.caseInsertPresetApplication.applicationStateIdentity) {
    return failure(
      'application-state-identity-mismatch',
      'source-application-state-identity-stale',
      { operation, dimensions: ['application-state-identity'] },
    )
  }
  if (!normalizedProjectSnapshotsAreExactlyEqual(
    current.project,
    source.project,
  )) {
    return failure(
      'unrelated-project-content-change',
      'source-project-content-stale-outside-case-aggregate',
      { operation, dimensions: ['project-content'] },
    )
  }

  const metadataDimensions: string[] = []
  if (current.currentPath !== source.currentPath) {
    metadataDimensions.push('current-path')
  }
  if (current.persistenceFormat !== source.persistenceFormat) {
    metadataDimensions.push('persistence-format')
  }
  if (current.displayName !== source.displayName) {
    metadataDimensions.push('display-name')
  }
  if (!sameCaseInsertPresetValue(
    current.cleanBaseline,
    source.cleanBaseline,
  )) {
    metadataDimensions.push('clean-baseline')
  }
  if (!sameCaseInsertPresetValue(
    current.lastEditorRoute,
    source.lastEditorRoute,
  )) {
    metadataDimensions.push('last-editor-route')
  }
  return failure(
    metadataDimensions.length > 0
      ? 'unrelated-project-content-change'
      : 'stale-application-snapshot',
    metadataDimensions.length > 0
      ? 'source-session-metadata-stale'
      : 'source-session-not-exact',
    {
      operation,
      ...(metadataDimensions.length > 0
        ? { dimensions: metadataDimensions }
        : {}),
    },
  )
}

/**
 * Pure compare-and-swap commit. Success returns one complete successor Case
 * session and its already-authorized receipt; failure returns neither. No
 * store, reducer, persistence, UI, catalog, renderer, or runtime owner is
 * invoked by this boundary.
 */
export function commitCaseInsertPresetSessionApplication(
  value: unknown,
): CommitCaseInsertPresetSessionApplicationResult {
  try {
    const input = captureInputRecord(
      value,
      ['currentSession', 'successorSnapshot'],
      'application-commit-input',
    )
    if (isFailure(input)) return input
    const current = captureCaseSession(input.currentSession, 'current')
    if (isFailure(current)) return current
    const snapshot = validateCommitSnapshot(input.successorSnapshot)
    if (isFailure(snapshot)) return snapshot
    if (!sessionsAreExactlyEqual(current, snapshot.sourceSession)) {
      return classifyStaleCurrent(current, snapshot)
    }

    const common = {
      ok: true as const,
      status: 'committed' as const,
      operation: snapshot.operation,
      session: snapshot.successorSession,
      receipt: snapshot.adoptionBundle.adoption.receipt,
      snapshotIdentity: snapshot.snapshotIdentity,
    }
    return deepFreezeCaseInsertPresetValue(common) as
      CommitCaseInsertPresetSessionApplicationResult
  } catch {
    return failure(
      'invalid-application-commit-input',
      'application-commit-validation-failed',
    )
  }
}
