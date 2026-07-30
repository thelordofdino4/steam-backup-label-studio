import type {
  ApplicationCommandDispatchResult,
  ApplicationCommandFeedbackIntent,
} from '../lifecycle/applicationCommandTypes.ts'
import type {
  StatusAnnouncementOptions,
  StatusToastKind,
} from '../hooks/useStatusToasts.ts'

type AnnounceStatus = (
  message: string,
  options?: StatusAnnouncementOptions,
) => boolean

export type ApplicationCommandFeedbackPublicationDependencies = Readonly<{
  announceStatus: AnnounceStatus
  setHomeStatusMessage(message: string): void
}>

function commandLabel(commandId: string): string {
  switch (commandId) {
    case 'project.new-disc':
    case 'project.new-case':
      return 'New Project'
    case 'project.open':
      return 'Open Project'
    case 'project.save':
      return 'Save'
    case 'project.save-as':
      return 'Save As'
    case 'workspace.return-home':
      return 'Return Home'
    case 'project.resume':
      return 'Resume Project'
    default:
      return 'The command'
  }
}

function cancellationMessage(commandId: string): string {
  if (commandId === 'project.open') return 'Load cancelled.'
  return `${commandLabel(commandId)} cancelled.`
}

function declineMessage(commandId: string): string {
  if (
    commandId === 'project.open' ||
    commandId === 'project.new-disc' ||
    commandId === 'project.new-case'
  ) {
    return `${commandLabel(commandId)} cancelled. The current project was kept.`
  }
  return `${commandLabel(commandId)} was not authorized.`
}

/** Maps every terminal dispatcher result to at most one presentation intent. */
export function selectApplicationCommandFeedback(
  dispatch: ApplicationCommandDispatchResult<void>,
): ApplicationCommandFeedbackIntent | null {
  if (dispatch.disposition === 'not-executed') {
    const message = dispatch.userMessage ??
      (dispatch.reason === 'busy'
        ? `${commandLabel(dispatch.commandId)} is already in progress.`
        : `${commandLabel(dispatch.commandId)} is currently unavailable.`)
    return Object.freeze({
      kind: 'warning',
      message,
      deduplicationKey:
        `${dispatch.commandId}:not-executed:${dispatch.reason}`,
    })
  }

  if (dispatch.result.feedback) return dispatch.result.feedback

  switch (dispatch.result.status) {
    case 'success':
      return null
    case 'cancelled':
      return Object.freeze({
        kind: 'warning',
        message: cancellationMessage(dispatch.commandId),
        deduplicationKey:
          `${dispatch.commandId}:cancelled:${dispatch.result.reason}`,
      })
    case 'declined':
      return Object.freeze({
        kind: 'warning',
        message: declineMessage(dispatch.commandId),
        deduplicationKey:
          `${dispatch.commandId}:declined:${dispatch.result.reason}`,
      })
    case 'failure':
      return Object.freeze({
        kind: 'error',
        message: dispatch.result.error.userMessage,
        deduplicationKey:
          `${dispatch.commandId}:failure:${dispatch.result.error.code}`,
      })
  }
}

function statusToastKind(
  kind: ApplicationCommandFeedbackIntent['kind'],
): StatusToastKind {
  return kind === 'status' ? 'info' : kind
}

/**
 * Publishes one command result to the shared toast/status owner and mirrors the
 * accepted message to Home. Active deduplication keys are owned by that shared
 * status owner, so duplicate adapters cannot double-publish.
 */
export function publishApplicationCommandFeedback(
  dispatch: ApplicationCommandDispatchResult<void>,
  dependencies: ApplicationCommandFeedbackPublicationDependencies,
): ApplicationCommandFeedbackIntent | null {
  const feedback = selectApplicationCommandFeedback(dispatch)
  if (!feedback) return null

  const published = dependencies.announceStatus(feedback.message, {
    kind: statusToastKind(feedback.kind),
    deduplicationKey: feedback.deduplicationKey,
  })
  if (published) dependencies.setHomeStatusMessage(feedback.message)
  return published ? feedback : null
}
