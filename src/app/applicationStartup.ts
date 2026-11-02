import type { ApplicationCommandError, ApplicationCommandResult } from '../lifecycle/applicationCommandTypes.ts'

export const APPLICATION_STARTUP_FAILURES = Object.freeze({
  'document-root': 'The application mount point is missing. Reinstall SBLS and try again.',
  'module-load': 'The application files could not be loaded. Reopen SBLS; if this continues, reinstall it.',
  'lifecycle-root': 'Project session services could not start. Reopen SBLS and try again.',
  'menu-runtime': 'The menu service could not be created. Reopen SBLS and try again.',
  'react-root': 'The editor display could not be initialized. Reopen SBLS and try again.',
  'react-render': 'The editor could not be displayed. Reopen SBLS and load your last saved project.',
} as const)
export type ApplicationStartupStage = keyof typeof APPLICATION_STARTUP_FAILURES
export type ApplicationStartupObserver = (event: 'startup' | 'runtime') => Readonly<{
  stage(stage: ApplicationStartupStage): void
  complete(result: ApplicationCommandResult<unknown>): void
}> | void

/** Only records prerequisite progress; construction and cleanup stay with their owners. */
export function createApplicationStartupAttempt(observe: ApplicationStartupObserver) {
  let currentStage: ApplicationStartupStage = 'document-root'
  let terminal = false
  let observation: ReturnType<ApplicationStartupObserver>
  try { observation = observe('startup') } catch { /* Observation only. */ }
  function reportStage(stage: ApplicationStartupStage) {
    try { observation?.stage(stage) } catch { /* Observation only. */ }
  }
  reportStage(currentStage)
  function error(stage: ApplicationStartupStage, cause: unknown): ApplicationCommandError {
    return Object.freeze({ code: `startup.${stage}-failed`, userMessage: APPLICATION_STARTUP_FAILURES[stage], recoverable: true, cause })
  }
  function reportRuntimeFailure(stage: ApplicationStartupStage, cause: unknown) {
    try {
      const runtime = observe('runtime')
      runtime?.stage(stage)
      runtime?.complete({ status: 'failure', error: error(stage, cause) })
    } catch { /* Observation only. */ }
  }
  return Object.freeze({
    getStage: () => currentStage,
    stage(stage: ApplicationStartupStage) {
      if (terminal) return
      currentStage = stage
      reportStage(stage)
    },
    rendered() {
      if (terminal) return
      terminal = true
      try { observation?.complete({ status: 'success', value: undefined }) } catch { /* Observation only. */ }
    },
    fail(stage: ApplicationStartupStage, cause: unknown) {
      if (terminal) { reportRuntimeFailure(stage, cause); return }
      currentStage = stage
      reportStage(stage)
      terminal = true
      try { observation?.complete({ status: 'failure', error: error(stage, cause) }) } catch { /* Observation only. */ }
    },
    reportRuntimeFailure,
  })
}
export type ApplicationStartupAttempt = ReturnType<typeof createApplicationStartupAttempt>
