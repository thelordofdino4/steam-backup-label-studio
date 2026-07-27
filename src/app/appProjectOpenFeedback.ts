import type {
  ApplicationCommandDispatchResult,
} from '../lifecycle/applicationCommandTypes.ts'

/** Temporary compatibility mapping until #300 supplies the global feedback owner. */
export function getProjectOpenCompatibilityFeedback(
  dispatch: ApplicationCommandDispatchResult<void>,
): string | null {
  if (dispatch.disposition === 'not-executed') {
    if (dispatch.reason === 'busy') return 'Open Project is already in progress.'
    if (dispatch.reason === 'unknown-command') {
      return 'Open Project is not registered.'
    }
    return dispatch.userMessage ?? 'Open Project is currently unavailable.'
  }

  const result = dispatch.result
  switch (result.status) {
    case 'success':
      return result.feedback?.message ?? 'Loaded project.'
    case 'cancelled':
      return result.feedback?.message ?? 'Load cancelled.'
    case 'declined':
      return result.feedback?.message ?? null
    case 'failure':
      return result.feedback?.message ?? result.error.userMessage
  }
}
