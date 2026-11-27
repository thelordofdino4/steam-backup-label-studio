// Observations of the existing menu owner, never a second command/result owner.
export const APPLICATION_MENU_DIAGNOSTIC_CODES = [
  'application-menu.invocation-invalid',
  'application-menu.invocation-duplicate',
  'application-menu.dispose-failed',
  'application-menu.start-failed',
  'application-menu.projection-failed',
  'application-menu.invocation-rejected',
  'application-menu.invocation-unexpected',
  'application-menu.feedback-failed',
] as const

export const APPLICATION_MENU_STARTUP_STAGES = [
  'native-availability', 'native-port', 'native-window-identity',
  'native-platform', 'native-event-subscription', 'native-install',
  'windows-accelerators', 'lifecycle-subscription', 'window-subscription',
  'initial-projection',
] as const
export const APPLICATION_MENU_DIAGNOSTIC_STAGES = [
  ...APPLICATION_MENU_STARTUP_STAGES,
  'projection-window-state', 'projection-capabilities', 'projection-native-apply',
] as const

export type ApplicationMenuStartupStage = typeof APPLICATION_MENU_STARTUP_STAGES[number]
export type ApplicationMenuDiagnosticStage = typeof APPLICATION_MENU_DIAGNOSTIC_STAGES[number]
export type ApplicationMenuRuntimeStartResult = 'started' | 'unavailable' | 'failed' | 'disposed'
export type ApplicationMenuStartupObservation = Readonly<{
  stage(stage: ApplicationMenuStartupStage): void
  complete(result: ApplicationMenuRuntimeStartResult): void
}>
export type ApplicationMenuStartupObserver = () => ApplicationMenuStartupObservation | void

const knownCodes = new Set<string>(APPLICATION_MENU_DIAGNOSTIC_CODES)
const knownStages = new Set<string>(APPLICATION_MENU_DIAGNOSTIC_STAGES)
export function projectApplicationMenuDiagnostic(diagnostic: Readonly<{ code: string, stage?: string }>) {
  return Object.freeze({
    diagnosticCode: knownCodes.has(diagnostic.code) ? diagnostic.code : 'application-menu.unclassified',
    ...(diagnostic.stage && knownStages.has(diagnostic.stage) ? { stage: diagnostic.stage } : {}),
  })
}

// Diagnostic callbacks must not change startup, dispatch, cleanup or native outcomes.
// Default console output contains only exact known codes/stages, never exception text.
export function createApplicationMenuDiagnosticReporter<Diagnostic extends Readonly<{ code: string, stage?: string }>>(
  sink?: (diagnostic: Diagnostic) => void,
): (diagnostic: Diagnostic) => void {
  return diagnostic => {
    try {
      if (sink) sink(diagnostic)
      else {
        const safe = projectApplicationMenuDiagnostic(diagnostic)
        console.error(safe.diagnosticCode, safe.stage ?? '')
      }
    } catch { /* Diagnostics cannot replace the owner's result. */ }
  }
}
