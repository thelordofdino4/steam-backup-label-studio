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
import {
  finishApplicationCaseInsertContinuousEdit,
  type GetApplicationCaseInsertContinuousEditPort,
} from './applicationCaseInsertContinuousEditPort.ts'
import { createApplicationTerminationFailure, NativeTerminationOutcomeUncertainError, type ApplicationTerminationFailureCode } from './applicationTerminationFailure.ts'

export type NativeTerminationKind = 'close-window' | 'quit'
export type NativeTerminationHandoff = Readonly<{
  isCurrent(): boolean
  prepare(): () => void
  commit(kind: NativeTerminationKind): Promise<void>
}>

function failure(code: ApplicationTerminationFailureCode, cause?: unknown): ApplicationCommandResult<never> {
  const error = createApplicationTerminationFailure(code, cause)
  return commandFailed(error, { kind: 'error', message: error.userMessage, deduplicationKey: code })
}

/** Owns the semantic guard; native transports never decide whether work is dirty. */
export function createApplicationNativeTerminationCommandOwners(
  getHandoff: () => NativeTerminationHandoff | null,
  guard: ProjectReplacementGuard,
  getContinuousEditPort: GetApplicationCaseInsertContinuousEditPort = () => null,
): Readonly<{ closeWindow: CloseWindowCommandOwner; quitApplication: QuitApplicationCommandOwner }> {
  async function execute(
    kind: NativeTerminationKind, context: ApplicationLifecycleCommandContext,
    operation: ApplicationCommandOperationToken,
  ): Promise<ApplicationCommandResult<void>> {
    const handoff = getHandoff()
    if (!handoff || !handoff.isCurrent()) {
      return failure('application.termination-unavailable')
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
      // The guard's Promise boundary may have admitted a new painted or
      // unpainted edit. Finish it, then check the original authorization.
      const finished = finishApplicationCaseInsertContinuousEdit(getContinuousEditPort())
      if (finished.status !== 'success') return finished
      if (!isProjectReplacementAuthorizationCurrent(context.getCurrentStateSnapshot().state, guarded.value)) {
        return failure('application.termination-stale-session')
      }
      if (!handoff.isCurrent()) throw new Error('The native close connection changed.')
      await handoff.commit(kind)
      committed = true
      return commandSucceeded(undefined)
    } catch (error) {
      return failure(error instanceof NativeTerminationOutcomeUncertainError
        ? 'application.termination-outcome-uncertain' : 'application.termination-failed', error)
    } finally {
      if (!committed) restoreInteraction?.()
    }
  }
  return Object.freeze({
    closeWindow: Object.freeze({ availability: 'implemented', executeCloseWindow: (context: ApplicationLifecycleCommandContext, _input: undefined, operation: ApplicationCommandOperationToken) => execute('close-window', context, operation) }),
    quitApplication: Object.freeze({ availability: 'implemented', executeQuitApplication: (context: ApplicationLifecycleCommandContext, _input: undefined, operation: ApplicationCommandOperationToken) => execute('quit', context, operation) }),
  })
}
