import type { ApplicationCommandError, ApplicationCommandResult } from '../lifecycle/applicationCommandTypes.ts'

export const STEAM_WORKFLOW_IDS = ['steam.search', 'steam.import'] as const
export type SteamWorkflowId = typeof STEAM_WORKFLOW_IDS[number]
export const STEAM_WORKFLOW_STAGES = ['fetch-and-normalize', 'prepare', 'apply'] as const
export type SteamWorkflowStage = typeof STEAM_WORKFLOW_STAGES[number]
export const STEAM_WORKFLOW_FAILURES = Object.freeze({
  'steam.search-failed': { stage: 'fetch-and-normalize', userMessage: 'Steam search could not be completed. Check your connection and try again.' },
  'steam.import-fetch-failed': { stage: 'fetch-and-normalize', userMessage: 'Steam game details could not be loaded. Check your connection and try again.' },
  'steam.import-prepare-failed': { stage: 'prepare', userMessage: 'The Steam import could not be prepared. Check the artwork and try again.' },
  'steam.import-apply-failed': { stage: 'apply', userMessage: 'The Steam import could not be applied. Check the project and try again.' },
} as const)

export function steamWorkflowError(workflowId: SteamWorkflowId, stage: SteamWorkflowStage, cause: unknown): ApplicationCommandError {
  const code = workflowId === 'steam.search' ? 'steam.search-failed'
    : stage === 'prepare' ? 'steam.import-prepare-failed'
      : stage === 'apply' ? 'steam.import-apply-failed' : 'steam.import-fetch-failed'
  return Object.freeze({ code, userMessage: STEAM_WORKFLOW_FAILURES[code].userMessage, recoverable: true, cause })
}

export type SteamWorkflowObservation = Readonly<{
  stage(stage: SteamWorkflowStage): void
  complete(result: ApplicationCommandResult<unknown>): void
}>
export type SteamWorkflowObserver = (operation: Readonly<{
  workflowId: SteamWorkflowId
  requestId: number
}>) => SteamWorkflowObservation | void

/** Observation never acquires, extends or revokes request/commit authority. */
export function observeSteamWorkflowSafely(observer: SteamWorkflowObserver, operation: Parameters<SteamWorkflowObserver>[0]): SteamWorkflowObservation {
  let observation: SteamWorkflowObservation | void
  try { observation = observer(operation) } catch { /* Observation only. */ }
  return Object.freeze({
    stage(value) { try { observation?.stage(value) } catch { /* Observation only. */ } },
    complete(result) { try { observation?.complete(result) } catch { /* Observation only. */ } },
  })
}
