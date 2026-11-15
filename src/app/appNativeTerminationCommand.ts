import {
  commandFailed, commandSucceeded,
  type ApplicationCommandOperationToken, type ApplicationCommandResult,
} from '../lifecycle/applicationCommandTypes.ts'
import type {
  ApplicationLifecycleCommandContext, CloseWindowCommandOwner, QuitApplicationCommandOwner,
} from '../lifecycle/applicationLifecycleCommandPorts.ts'
import {
  isProjectReplacementAuthorizationCurrent, type ProjectReplacementGuard,
} from './appProjectReplacementGuard.ts'

export type NativeTerminationKind = 'close-window' | 'quit'
export type NativeTerminationHandoff = Readonly<{
  isCurrent(): boolean
  prepare(): () => void
  commit(kind: NativeTerminationKind): Promise<void>
}>

function failure(code: string, message: string, cause?: unknown): ApplicationCommandResult<never> {
  return commandFailed({ code, userMessage: message, recoverable: true, cause,
    diagnosticMessage: code,
  }, { kind: 'error', message, deduplicationKey: code })
}

/** Owns the semantic guard; native transports never decide whether work is dirty. */
export function createApplicationNativeTerminationCommandOwners(
  getHandoff: () => NativeTerminationHandoff | null,
  guard: ProjectReplacementGuard,
): Readonly<{ closeWindow: CloseWindowCommandOwner; quitApplication: QuitApplicationCommandOwner }> {
  async function execute(
    kind: NativeTerminationKind, context: ApplicationLifecycleCommandContext,
    operation: ApplicationCommandOperationToken,
  ): Promise<ApplicationCommandResult<void>> {
    const handoff = getHandoff()
    if (!handoff || !handoff.isCurrent()) {
      return failure('application.termination-unavailable', 'Close protection is not available yet. Please try again.')
    }
    const guarded = await guard(context, operation)
    if (guarded.status === 'declined') return Object.freeze({ status: 'declined', reason: 'close-not-authorized' })
    if (guarded.status !== 'success') return guarded
    let restoreInteraction: (() => void) | null = null
    let committed = false
    try {
      if (!handoff.isCurrent()) throw new Error('The native close connection changed.')
      // Flush pending committed UI work and prevent fresh input before taking
      // the final revision check. A failed/stale handoff restores interaction.
      restoreInteraction = handoff.prepare()
      if (!isProjectReplacementAuthorizationCurrent(context.getCurrentStateSnapshot().state, guarded.value)) {
        return failure('application.termination-stale-session', 'The project changed before closing. Please try again.')
      }
      if (!handoff.isCurrent()) throw new Error('The native close connection changed.')
      await handoff.commit(kind)
      committed = true
      return commandSucceeded(undefined)
    } catch (error) {
      return failure('application.termination-failed', 'The application could not close. Your project is still available; please try again.', error)
    } finally {
      if (!committed) restoreInteraction?.()
    }
  }
  return Object.freeze({
    closeWindow: Object.freeze({ availability: 'implemented', executeCloseWindow: (context: ApplicationLifecycleCommandContext, _input: undefined, operation: ApplicationCommandOperationToken) => execute('close-window', context, operation) }),
    quitApplication: Object.freeze({ availability: 'implemented', executeQuitApplication: (context: ApplicationLifecycleCommandContext, _input: undefined, operation: ApplicationCommandOperationToken) => execute('quit', context, operation) }),
  })
}
