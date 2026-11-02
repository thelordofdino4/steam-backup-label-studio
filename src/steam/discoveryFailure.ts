import { commandFailed, commandSucceeded, type ApplicationCommandError, type ApplicationCommandResult } from '../lifecycle/applicationCommandTypes.ts'

export const DISCOVERY_FAILURES = Object.freeze({
  'discovery.fetch-failed': { stage: 'discover', userMessage: 'Candidates could not be loaded. Check the source or connection and try again; manual upload is still available.' },
  'discovery.provider-failed': { stage: 'discover', userMessage: 'One candidate source could not be checked. Retry or use another source.' },
  'discovery.input-missing': { stage: 'prepare', userMessage: 'Import a Steam game or enter the required metadata before searching for candidates.' },
  'local.folder-open-failed': { stage: 'open-folder', userMessage: 'The screenshot folder could not be opened. Check that it still exists and try again.' },
} as const)
export function discoveryFailure(cause: unknown, code: keyof typeof DISCOVERY_FAILURES = 'discovery.fetch-failed'): ApplicationCommandError {
  return Object.freeze({ code, userMessage: DISCOVERY_FAILURES[code].userMessage, recoverable: true, cause })
}

/** A partial source failure retains usable candidates, but is not recorded as full success. */
export function discoveryOutcome(
  sourceStatuses: readonly Readonly<{ status: string }>[],
  rejectedSource = false,
): ApplicationCommandResult<unknown> {
  return rejectedSource || sourceStatuses.some(source => source.status === 'error')
    ? commandFailed(discoveryFailure(undefined, 'discovery.provider-failed'))
    : commandSucceeded(undefined)
}
