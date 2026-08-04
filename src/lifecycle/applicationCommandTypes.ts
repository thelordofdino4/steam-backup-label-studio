export const APPLICATION_LIFECYCLE_COMMAND_IDS = Object.freeze([
  'project.new-disc',
  'project.new-case',
  'project.open',
  'project.save',
  'project.save-as',
  'workspace.return-home',
  'project.resume',
  'project.close',
  'application.close-window',
  'application.quit',
] as const)

export type ApplicationLifecycleCommandId =
  typeof APPLICATION_LIFECYCLE_COMMAND_IDS[number]

export const CASE_INSERT_PRESET_APPLICATION_COMMAND_IDS = Object.freeze([
  'case.layoutPreset.apply',
  'case.layoutPreset.reapply',
  'case.layoutPreset.detach',
] as const)

export type CaseInsertPresetApplicationCommandId =
  typeof CASE_INSERT_PRESET_APPLICATION_COMMAND_IDS[number]

export const APPLICATION_COMMAND_IDS = Object.freeze([
  ...APPLICATION_LIFECYCLE_COMMAND_IDS,
  'export.png',
  ...CASE_INSERT_PRESET_APPLICATION_COMMAND_IDS,
] as const)

export type ApplicationCommandId = typeof APPLICATION_COMMAND_IDS[number]

export type ApplicationCommandCancellationReason =
  | 'file-dialog-dismissed'
  | 'dialog-dismissed'
  | 'operation-cancelled'

export type ApplicationCommandDeclineReason =
  | 'replacement-not-authorized'
  | 'close-not-authorized'
  | 'export-warning-not-authorized'

export type ApplicationCommandFeedbackIntent = Readonly<{
  kind: 'status' | 'success' | 'warning' | 'error'
  message: string
  deduplicationKey?: string
}>

export type ApplicationCommandError = Readonly<{
  code: string
  userMessage: string
  diagnosticMessage?: string
  cause?: unknown
  recoverable: boolean
}>

export type ApplicationCommandResult<Value = void> =
  | Readonly<{
      status: 'success'
      value: Value
      feedback?: ApplicationCommandFeedbackIntent
    }>
  | Readonly<{
      status: 'cancelled'
      reason: ApplicationCommandCancellationReason
      feedback?: ApplicationCommandFeedbackIntent
    }>
  | Readonly<{
      status: 'declined'
      reason: ApplicationCommandDeclineReason
      feedback?: ApplicationCommandFeedbackIntent
    }>
  | Readonly<{
      status: 'failure'
      error: ApplicationCommandError
      feedback?: ApplicationCommandFeedbackIntent
    }>

export type ApplicationCommandDispatchResult<Value = void> =
  | Readonly<{
      disposition: 'not-executed'
      reason: 'unknown-command' | 'disabled' | 'busy'
      commandId: string
      userMessage?: string
    }>
  | Readonly<{
      disposition: 'executed'
      commandId: ApplicationCommandId
      result: ApplicationCommandResult<Value>
    }>

export type ApplicationCommandCapability =
  | Readonly<{ canExecute: true }>
  | Readonly<{
      canExecute: false
      reasonCode: string
      userMessage?: string
    }>

export const COMMAND_BUSY_SCOPES = Object.freeze([
  'lifecycle.transition',
  'workspace.navigation',
  'dialog.project-file',
  'dialog.project-replacement',
  'persistence.read',
  'persistence.write',
  'project.mutation',
  'application.termination',
  'export.execution',
  'dialog.export-warning',
  'dialog.export-destination',
  'persistence.export-write',
] as const)

export type CommandBusyScope = typeof COMMAND_BUSY_SCOPES[number]

export type ApplicationCommandRepeatPolicy =
  | 'reject-while-busy'
  | 'join-identical'

export type ApplicationCommandFeedbackPolicy = Readonly<{
  success: 'return-only' | 'publish-once'
  cancelled: 'return-only' | 'publish-once'
  declined: 'return-only' | 'publish-once'
  failure: 'return-only' | 'publish-once'
}>

export interface ApplicationCommandOperationToken {
  readonly id: string
  readonly commandId: ApplicationCommandId
  readonly rootScopes: readonly CommandBusyScope[]
  ownsScope(scope: CommandBusyScope): boolean
  withScopes<Value>(
    scopes: readonly CommandBusyScope[],
    operation: () => Promise<Value> | Value,
  ): Promise<Value>
}

export type ApplicationCommandDefinition<Context, Input, Value> = Readonly<{
  id: ApplicationCommandId
  canExecute: (
    context: Context,
    input: Input,
  ) => ApplicationCommandCapability
  acquireScopes: (
    context: Context,
    input: Input,
  ) => readonly CommandBusyScope[]
  repeatPolicy: ApplicationCommandRepeatPolicy
  getRepeatKey?: (context: Context, input: Input) => string
  execute: (
    context: Context,
    input: Input,
    operation: ApplicationCommandOperationToken,
  ) => Promise<ApplicationCommandResult<Value>> | ApplicationCommandResult<Value>
  feedbackPolicy: ApplicationCommandFeedbackPolicy
}>

export function commandSucceeded<Value>(
  value: Value,
  feedback?: ApplicationCommandFeedbackIntent,
): ApplicationCommandResult<Value> {
  return Object.freeze({ status: 'success', value, feedback })
}

export function commandFailed(
  error: ApplicationCommandError,
  feedback?: ApplicationCommandFeedbackIntent,
): ApplicationCommandResult<never> {
  return Object.freeze({ status: 'failure', error, feedback })
}
