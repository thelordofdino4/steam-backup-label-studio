import type { ApplicationCommandError } from '../lifecycle/applicationCommandTypes.ts'

/** Only a proven native rejection permits interaction to resume. */
export class NativeTerminationRejectedError extends Error {
  constructor(message = 'Native termination was rejected before commitment.') {
    super(message)
    this.name = 'NativeTerminationRejectedError'
  }
}

export class NativeTerminationOutcomeUncertainError extends Error {
  constructor(cause?: unknown) {
    super('The native close outcome could not be confirmed.', { cause })
    this.name = 'NativeTerminationOutcomeUncertainError'
  }
}

/** Fixed public codes/stages; native error values remain internal causes only. */
export const APPLICATION_TERMINATION_FAILURES = Object.freeze({
  'application.termination-unavailable': { stage: 'termination-availability', message: 'Close protection is not available yet. Please try again.' },
  'application.termination-stale-session': { stage: 'termination-authorization', message: 'The project changed before closing. Please try again.' },
  'application.termination-failed': { stage: 'termination-handoff', message: 'The application could not close. Your project is still available; please try again.' },
  'application.termination-outcome-uncertain': { stage: 'termination-handoff', message: 'The close outcome could not be confirmed. Editing remains paused to protect your project.' },
  'application.termination-availability-failed': { stage: 'termination-availability', message: 'Close protection availability could not be checked.' },
  'application.termination-install-failed': { stage: 'termination-install', message: 'Close protection could not be connected.' },
  'application.termination-dispatch-failed': { stage: 'termination-dispatch', message: 'The native close request could not be handled.' },
  'application.termination-dispose-failed': { stage: 'termination-dispose', message: 'The native close connection could not be released.' },
})
export type ApplicationTerminationFailureCode = keyof typeof APPLICATION_TERMINATION_FAILURES

export function createApplicationTerminationFailure(code: ApplicationTerminationFailureCode, cause?: unknown): ApplicationCommandError {
  return Object.freeze({ code, userMessage: APPLICATION_TERMINATION_FAILURES[code].message,
    diagnosticMessage: code, recoverable: code !== 'application.termination-outcome-uncertain', cause })
}
