import {
  commandFailed,
  commandSucceeded,
  type ApplicationCommandCapability,
  type ApplicationCommandDefinition,
  type ApplicationCommandFeedbackPolicy,
  type ApplicationCommandResult,
  type CaseInsertPresetApplicationCommandId,
  type CommandBusyScope,
} from './applicationCommandTypes.ts'
import type {
  ApplicationLifecycleDefinitionContext,
} from './applicationLifecycleCommandDefinitions.ts'
import type {
  ApplicationLifecycleStateSnapshot,
} from './applicationLifecycleStateStore.ts'
import {
  commitCaseInsertPresetSessionApplication,
  type CaseInsertPresetSessionApplicationCommitFailure,
  type CommitCaseInsertPresetSessionApplicationResult,
} from './caseInsertPresetSessionApplicationCommit.ts'
import {
  hasBusyScopeConflict,
  type CommandBusyState,
} from './commandBusyScopes.ts'
import type {
  CaseInsertPresetApplicationAdoptionOperation,
  CaseInsertPresetApplyApplicationAdoptionReceipt,
  CaseInsertPresetDetachApplicationAdoptionReceipt,
  CaseInsertPresetReapplyApplicationAdoptionReceipt,
} from '../presets/caseInsertPresetConfigurationAdoptionModel.ts'

const RETURN_ONLY_FEEDBACK = Object.freeze({
  success: 'return-only',
  cancelled: 'return-only',
  declined: 'return-only',
  failure: 'return-only',
} as const satisfies ApplicationCommandFeedbackPolicy)

export const CASE_INSERT_PRESET_PROJECT_MUTATION_SCOPE = Object.freeze([
  'project.mutation',
] as const satisfies readonly CommandBusyScope[])

const OPERATION_BY_COMMAND = Object.freeze({
  'case.layoutPreset.apply': 'apply',
  'case.layoutPreset.reapply': 'reapply',
  'case.layoutPreset.detach': 'detach',
} as const satisfies Readonly<Record<
  CaseInsertPresetApplicationCommandId,
  CaseInsertPresetApplicationAdoptionOperation
>>)

const SUCCESS_STATUS_BY_OPERATION = Object.freeze({
  apply: 'applied',
  reapply: 'reapplied',
  detach: 'detached',
} as const)

const SUCCESS_MESSAGE_BY_OPERATION = Object.freeze({
  apply: 'Case layout preset applied.',
  reapply: 'Case layout preset reapplied.',
  detach: 'Case layout preset detached.',
} as const)

type CommandSuccessFor<
  Operation extends CaseInsertPresetApplicationAdoptionOperation,
  Status extends 'applied' | 'reapplied' | 'detached',
  Receipt,
> = Readonly<{
  operation: Operation
  status: Status
  sessionId: string
  projectRevision: number
  applicationRevision: number
  snapshotIdentity: string
  receipt: Receipt
}>

export type CaseInsertPresetSessionApplicationCommandSuccess =
  | CommandSuccessFor<
      'apply',
      'applied',
      CaseInsertPresetApplyApplicationAdoptionReceipt
    >
  | CommandSuccessFor<
      'reapply',
      'reapplied',
      CaseInsertPresetReapplyApplicationAdoptionReceipt
    >
  | CommandSuccessFor<
      'detach',
      'detached',
      CaseInsertPresetDetachApplicationAdoptionReceipt
    >

type CommitSuccess = Exclude<
  CommitCaseInsertPresetSessionApplicationResult,
  CaseInsertPresetSessionApplicationCommitFailure
>

type InstallationAttempt = {
  success?: CommitSuccess
  failure?: CaseInsertPresetSessionApplicationCommitFailure
  operationMismatch?: CaseInsertPresetApplicationAdoptionOperation
}

export type CaseInsertPresetSessionApplicationCapabilityContext = Readonly<{
  stateSnapshot: ApplicationLifecycleStateSnapshot
  busy: CommandBusyState
}>

function enabled(): ApplicationCommandCapability {
  return Object.freeze({ canExecute: true })
}

function disabled(
  reasonCode: string,
  userMessage?: string,
): ApplicationCommandCapability {
  return Object.freeze({ canExecute: false, reasonCode, userMessage })
}

export function getCaseInsertPresetSessionApplicationCommandCapability(
  context: CaseInsertPresetSessionApplicationCapabilityContext,
): ApplicationCommandCapability {
  const session = context.stateSnapshot.state.activeSession
  if (!session || session.kind !== 'caseInsert') {
    return disabled(
      'case.layoutPreset.no-active-case-session',
      'Open a Case project before applying a Case layout preset.',
    )
  }
  if (hasBusyScopeConflict(
    CASE_INSERT_PRESET_PROJECT_MUTATION_SCOPE,
    context.busy,
  )) {
    return disabled(
      'application.command-busy',
      'Another project operation is already in progress.',
    )
  }
  return enabled()
}

function failureMessage(
  failure: CaseInsertPresetSessionApplicationCommitFailure,
): string {
  switch (failure.status) {
    case 'session-identity-mismatch':
    case 'project-revision-mismatch':
    case 'application-revision-mismatch':
    case 'stale-application-snapshot':
    case 'replayed-adoption':
      return 'The Case layout preset result is stale. Review the latest project and try again.'
    default:
      return 'The Case layout preset result could not be installed.'
  }
}

function rejectedResult(
  failure: CaseInsertPresetSessionApplicationCommitFailure,
): ApplicationCommandResult<never> {
  const userMessage = failureMessage(failure)
  return commandFailed({
    code: failure.code,
    userMessage,
    diagnosticMessage: `${failure.status}${
      failure.dimensions?.length
        ? ` (${failure.dimensions.join(', ')})`
        : ''
    }`,
    recoverable: true,
  }, {
    kind: 'error',
    message: userMessage,
    deduplicationKey: `case.layoutPreset:${failure.status}:${failure.code}`,
  })
}

function successValue(
  commit: CommitSuccess,
): CaseInsertPresetSessionApplicationCommandSuccess {
  const session = commit.session
  const common = {
    sessionId: session.id,
    projectRevision: session.revision,
    applicationRevision:
      session.caseInsertPresetApplication.applicationRevision,
    snapshotIdentity: commit.snapshotIdentity,
  }
  switch (commit.operation) {
    case 'apply':
      return Object.freeze({
        ...common,
        operation: commit.operation,
        status: SUCCESS_STATUS_BY_OPERATION[commit.operation],
        receipt: commit.receipt,
      })
    case 'reapply':
      return Object.freeze({
        ...common,
        operation: commit.operation,
        status: SUCCESS_STATUS_BY_OPERATION[commit.operation],
        receipt: commit.receipt,
      })
    case 'detach':
      return Object.freeze({
        ...common,
        operation: commit.operation,
        status: SUCCESS_STATUS_BY_OPERATION[commit.operation],
        receipt: commit.receipt,
      })
  }
}

function executeInstallation(
  commandId: CaseInsertPresetApplicationCommandId,
  context: ApplicationLifecycleDefinitionContext,
  successorSnapshot: unknown,
): ApplicationCommandResult<CaseInsertPresetSessionApplicationCommandSuccess> {
  const expectedOperation = OPERATION_BY_COMMAND[commandId]
  const current = context.getCurrentStateSnapshot()
  const attempt: InstallationAttempt = {}

  let storeResult
  try {
    storeResult = context.commitState(current.generation, (state) => {
      const commit = commitCaseInsertPresetSessionApplication({
        currentSession: state.activeSession,
        successorSnapshot,
      })
      if (!commit.ok) {
        attempt.failure = commit
        return state
      }
      if (commit.operation !== expectedOperation) {
        attempt.operationMismatch = commit.operation
        return state
      }

      attempt.success = commit
      return Object.freeze({
        ...state,
        activeSession: commit.session,
      })
    })
  } catch (error) {
    const userMessage = 'The Case layout preset result could not be installed.'
    return commandFailed({
      code: 'case.layoutPreset.lifecycle-store-installation-failed',
      userMessage,
      diagnosticMessage: error instanceof Error ? error.message : String(error),
      cause: error,
      recoverable: true,
    }, {
      kind: 'error',
      message: userMessage,
      deduplicationKey:
        'case.layoutPreset:lifecycle-store-installation-failed',
    })
  }

  if (attempt.failure) return rejectedResult(attempt.failure)
  if (attempt.operationMismatch) {
    const userMessage = 'The Case layout preset result does not match the requested operation.'
    return commandFailed({
      code: 'case.layoutPreset.operation-mismatch',
      userMessage,
      diagnosticMessage:
        `Expected ${expectedOperation}, received ${attempt.operationMismatch}.`,
      recoverable: true,
    }, {
      kind: 'error',
      message: userMessage,
      deduplicationKey: 'case.layoutPreset:operation-mismatch',
    })
  }
  if (storeResult.status === 'stale') {
    const userMessage = 'The Case project changed before the preset result could be installed.'
    return commandFailed({
      code: 'case.layoutPreset.lifecycle-store-generation-stale',
      userMessage,
      diagnosticMessage:
        `Expected lifecycle generation ${current.generation}; current generation is ${storeResult.snapshot.generation}.`,
      recoverable: true,
    }, {
      kind: 'error',
      message: userMessage,
      deduplicationKey: 'case.layoutPreset:lifecycle-store-generation-stale',
    })
  }
  if (storeResult.status !== 'committed' || !attempt.success) {
    const userMessage = 'The Case layout preset result was not installed.'
    return commandFailed({
      code: 'case.layoutPreset.lifecycle-store-installation-no-op',
      userMessage,
      diagnosticMessage:
        'A validated Case preset adoption must produce one observable session transition.',
      recoverable: true,
    }, {
      kind: 'error',
      message: userMessage,
      deduplicationKey: 'case.layoutPreset:lifecycle-store-installation-no-op',
    })
  }

  const value = successValue(attempt.success)
  return commandSucceeded(value, {
    kind: 'success',
    message: SUCCESS_MESSAGE_BY_OPERATION[attempt.success.operation],
    deduplicationKey:
      `${commandId}:success:${attempt.success.receipt.adoptionIdentity}`,
  })
}

export function createCaseInsertPresetSessionApplicationCommandDefinitions():
readonly ApplicationCommandDefinition<
  ApplicationLifecycleDefinitionContext,
  unknown,
  CaseInsertPresetSessionApplicationCommandSuccess
>[] {
  return Object.freeze((Object.keys(OPERATION_BY_COMMAND) as
    CaseInsertPresetApplicationCommandId[]).map((id) => Object.freeze({
      id,
      canExecute: (context: ApplicationLifecycleDefinitionContext) =>
        context.capabilities[id],
      acquireScopes: () => CASE_INSERT_PRESET_PROJECT_MUTATION_SCOPE,
      repeatPolicy: 'reject-while-busy' as const,
      execute: (
        context: ApplicationLifecycleDefinitionContext,
        input: unknown,
      ) => executeInstallation(id, context, input),
      feedbackPolicy: RETURN_ONLY_FEEDBACK,
    })))
}
