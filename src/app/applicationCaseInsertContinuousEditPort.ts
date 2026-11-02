import type {
  ApplicationCommandResult,
} from '../lifecycle/applicationCommandTypes.ts'

export type ApplicationCaseInsertContinuousEditFinishResult = Extract<
  ApplicationCommandResult<void>,
  Readonly<{ status: 'success' }> | Readonly<{ status: 'failure' }>
>

/**
 * Synchronously finishes the current Case continuous edit, when one exists.
 * The presentation adapter owns interaction state; semantic commands consume
 * only this narrow boundary before they capture authoritative project state.
 */
export type ApplicationCaseInsertContinuousEditPort = Readonly<{
  finish(): ApplicationCaseInsertContinuousEditFinishResult
}>

export type GetApplicationCaseInsertContinuousEditPort =
  () => ApplicationCaseInsertContinuousEditPort | null

const NO_PENDING_EDIT: ApplicationCaseInsertContinuousEditFinishResult =
  Object.freeze({ status: 'success', value: undefined })

/**
 * Missing, inactive, and retired adapters are semantic no-ops. Adapter
 * exceptions are contained at this application boundary so command owners
 * always receive a stable typed failure.
 */
export function finishApplicationCaseInsertContinuousEdit(
  port: ApplicationCaseInsertContinuousEditPort | null | undefined,
): ApplicationCaseInsertContinuousEditFinishResult {
  if (!port) return NO_PENDING_EDIT

  try {
    return port.finish()
  } catch (cause) {
    return Object.freeze({
      status: 'failure',
      error: Object.freeze({
        code: 'case.continuous-edit-finish-failed',
        userMessage: 'The current Case edit could not be completed safely.',
        diagnosticMessage:
          cause instanceof Error ? cause.message : String(cause),
        cause,
        recoverable: true,
      }),
      feedback: Object.freeze({
        kind: 'error',
        message: 'The current Case edit could not be completed safely.',
        deduplicationKey: 'case.continuous-edit:finish-failed',
      }),
    })
  }
}
