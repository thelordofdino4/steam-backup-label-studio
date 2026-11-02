import { APPLICATION_STARTUP_FAILURES, type ApplicationStartupObserver } from '../app/applicationStartup.ts'
import type { ProjectAsyncObserver } from '../lifecycle/projectAsyncWork.ts'
import { IMAGE_IMPORT_FAILURES } from '../image/imageImportFailure.ts'
import { DISCOVERY_FAILURES } from '../steam/discoveryFailure.ts'
import {
  STEAM_WORKFLOW_IDS, STEAM_WORKFLOW_STAGES, STEAM_WORKFLOW_FAILURES,
  type SteamWorkflowId, type SteamWorkflowObserver,
} from '../steam/steamWorkflowDiagnostics.ts'
import {
  APPLICATION_MENU_STARTUP_STAGES,
  projectApplicationMenuDiagnostic,
  type ApplicationMenuStartupObserver,
} from '../applicationMenu/applicationMenuDiagnostics.ts'
import type { ApplicationMenuRuntimeDiagnostic } from '../applicationMenu/applicationMenuRuntime.ts'
import {
  APPLICATION_COMMAND_IDS,
  type ApplicationCommandExecutionObserver,
  type ApplicationCommandAdmissionObserver,
  type ApplicationCommandId,
  type ApplicationCommandResult,
} from '../lifecycle/applicationCommandTypes.ts'
import { PROJECT_FILE_FAILURE_MESSAGES } from '../tauri/projectFileFailure.ts'
import { PROJECT_PACKAGE_FAILURE_REGISTRY, PROJECT_PACKAGE_FAILURE_STAGES, isProjectPackageCommandFailure } from '../tauri/packageProjectFile.ts'

// Exact known codes only. A string that merely resembles a code can still
// contain private data. Unknown owner codes remain unclassified in reports.
const KNOWN_FAILURE_CODES = new Set<string>([
  ...Object.keys(STEAM_WORKFLOW_FAILURES),
  ...Object.keys(APPLICATION_STARTUP_FAILURES).map(stage => `startup.${stage}-failed`),
  ...Object.keys(IMAGE_IMPORT_FAILURES),
  ...Object.keys(DISCOVERY_FAILURES),
  'project.async-apply-failed',
  ...Object.keys(PROJECT_FILE_FAILURE_MESSAGES),
  ...Object.keys(PROJECT_PACKAGE_FAILURE_REGISTRY),
  'application.command-owner-not-executable',
  'application.command-threw',
  'dialog.project-file-failed',
  'dialog.project-file-invalid-selection',
  'export.confirmation-failed',
  'export.destination-failed',
  'export.preflight-failed',
  'export.render-failed',
  'export.snapshot-failed',
  'export.write-failed',
  'project.background-image-resolution-failed',
  'project.case-restore-failed',
  'project.disc-restore-failed',
  'project.legacy-conversion.destination-conflicts-source',
  'project.migration-failed',
  'project.new-commit-failed',
  'project.new-kind-mismatch',
  'project.new-preparation-failed',
  'project.new-runtime-unavailable',
  'project.new-stale-authorization',
  'project.no-active-session',
  'project.open-commit-failed',
  'project.open-commit-not-applied',
  'project.open-editor-apply-precondition-failed',
  'project.open-editor-apply-preparation-failed',
  'project.open-runtime-unavailable',
  'project.open-stale-state',
  'project.package.asset-capture-failed',
  'project.package.destination-extension-invalid',
  'project.parse-failed',
  'project.read-failed',
  'project.replacement-dialog-failed',
  'project.replacement-dialog-unavailable',
  'project.replacement-stale-session',
  'project.resume-stale-state',
  'project.resume-unavailable',
  'project.route-failed',
  'project.save-runtime-unavailable',
  'project.save-stale-session',
  'project.staging-capture-failed',
  'project.validation-failed',
  'project.write-failed',
  'workspace.navigation-apply-preparation-failed',
  'workspace.navigation-runtime-unavailable',
  'workspace.return-home-stale-state',
  'workspace.return-home-unavailable',
])
const KNOWN_COMMAND_IDS = new Set<string>(APPLICATION_COMMAND_IDS)
const KNOWN_STAGES = new Set<string>([
  ...PROJECT_PACKAGE_FAILURE_STAGES,
  'content-recognition', 'destination-validation', 'destination-identity',
])
const MAX_RECORDS = 200
const MAX_ELAPSED_MS = 86_400_000

type Outcome = Readonly<{
  status: ApplicationCommandResult<unknown>['status'] | 'running' | 'started' | 'unavailable' | 'failed' | 'disposed' | 'reported' | 'not-executed'
  reason?: string
  diagnosticCode?: string
  failureCode?: string
  causeCode?: string
  stage?: string
}>
type Identity = Readonly<{
  commandId?: ApplicationCommandId | 'unknown'
  operationId?: string
  workflowId?: SteamWorkflowId | 'image.import' | 'discovery.metadata' | 'discovery.artwork' | 'discovery.logo' | 'discovery.screenshots' | 'unknown'
  requestId?: number
  component?: 'application-menu' | 'application'
  event?: 'startup' | 'diagnostic' | 'runtime' | 'admission'
}>
type Entry = Readonly<{
  sequence: number
  identity: Identity
  started: number
  finished?: number
  outcome: Outcome
}>

function projectOutcome(result: ApplicationCommandResult<unknown>): Outcome {
  if (result.status === 'success' || result.status === 'cancelled' || result.status === 'declined') return Object.freeze({ status: result.status })
  if (result.status !== 'failure') return Object.freeze({ status: 'failure', failureCode: 'unclassified' })
  const failureCode = KNOWN_FAILURE_CODES.has(result.error.code) ? result.error.code : 'unclassified'
  const cause = isProjectPackageCommandFailure(result.error.cause) ? result.error.cause.cause : result.error.cause
  const nativeStage = typeof cause === 'object' && cause !== null && 'stage' in cause ? cause.stage : undefined
  const exportStage = /^export\.(preflight|confirmation|destination|render|write|snapshot)-failed$/.exec(failureCode)?.[1]
  const knownStage = ({ 'project.read-failed': 'read', 'project.write-failed': 'write', 'project.parse-failed': 'parse', 'project.validation-failed': 'validate', 'project.migration-failed': 'migrate', 'project.package.asset-capture-failed': 'asset-capture', 'project.format.unsupported': 'content-recognition', 'project.package.destination-extension-invalid': 'destination-validation', 'project.legacy-conversion.destination-conflicts-source': 'destination-identity' } as Record<string, string>)[failureCode]
    ?? (IMAGE_IMPORT_FAILURES as Readonly<Record<string, { stage: string }>>)[failureCode]?.stage
    ?? (DISCOVERY_FAILURES as Readonly<Record<string, { stage: string }>>)[failureCode]?.stage
    ?? (failureCode.startsWith('startup.') && failureCode.endsWith('-failed') ? failureCode.slice(8, -7) : undefined)
    ?? (failureCode === 'project.async-apply-failed' ? 'apply' : undefined)
    ?? (STEAM_WORKFLOW_FAILURES as Readonly<Record<string, { stage: string }>>)[failureCode]?.stage
    ?? (failureCode.startsWith('project.atomic-write.') ? failureCode.slice('project.atomic-write.'.length) : exportStage)
  const stage = typeof nativeStage === 'string' && KNOWN_STAGES.has(nativeStage) ? nativeStage : knownStage
  // Never retain userMessage, diagnosticMessage, cause, feedback or success value.
  const causeCode = typeof cause === 'object' && cause !== null && 'code' in cause &&
    typeof cause.code === 'string' && cause.code !== failureCode && KNOWN_FAILURE_CODES.has(cause.code) ? cause.code : undefined
  return Object.freeze({ status: 'failure', failureCode, ...(stage ? { stage } : {}), ...(causeCode ? { causeCode } : {}) })
}

export function createApplicationCommandDiagnostics(options: Readonly<{
  capacity?: number
  now?: () => number
}> = {}) {
  const requested = options.capacity ?? 100
  if (!Number.isInteger(requested) || requested < 1 || requested > MAX_RECORDS) {
    throw new RangeError(`Diagnostic capacity must be between 1 and ${MAX_RECORDS}.`)
  }
  const capacity = requested
  const clock = options.now ?? (() => performance.now())
  let lastTime = 0
  let sequence = 0
  let evicted = 0
  let disposed = false
  let entries: Entry[] = []
  function now() {
    try {
      const value = clock()
      if (Number.isFinite(value)) lastTime = Math.max(lastTime, value)
    } catch { /* A diagnostic clock cannot interrupt an operation. */ }
    return lastTime
  }
  function begin(identity: Identity) {
    if (disposed || sequence >= Number.MAX_SAFE_INTEGER) return
    sequence += 1
    const id = sequence
    const entry: Entry = Object.freeze({ sequence: id, identity,
      started: now(), outcome: Object.freeze({ status: 'running' }),
    })
    if (entries.length === capacity) {
      entries.shift()
      evicted = Math.min(Number.MAX_SAFE_INTEGER, evicted + 1)
    }
    entries.push(entry)
    let completed = false
    return (outcome: Outcome, terminal = true) => {
      if (completed || disposed) return
      completed = terminal
      const index = entries.findIndex(candidate => candidate.sequence === id)
      if (index < 0) return // An evicted/cleared operation cannot reappear.
      entries[index] = Object.freeze({ ...entry, outcome: Object.freeze(outcome),
        ...(terminal ? { finished: now() } : {}),
      })
    }
  }
  const observeExecution: ApplicationCommandExecutionObserver = operation => {
    const operationId = /^application-command-[1-9][0-9]{0,14}$/.test(operation.operationId) ? operation.operationId : undefined
    const update = begin(Object.freeze({
      commandId: KNOWN_COMMAND_IDS.has(operation.commandId) ? operation.commandId : 'unknown',
      ...(operationId ? { operationId } : {}),
    }))
    if (!update) return
    return result => {
      let outcome: Outcome
      try { outcome = projectOutcome(result) }
      catch { outcome = Object.freeze({ status: 'failure', failureCode: 'unclassified' }) }
      update(outcome)
    }
  }
  const observeAdmission: ApplicationCommandAdmissionObserver = event => {
    const result = event.result
    const stage = new Set(['command-resolution', 'capability', 'repeat-key', 'busy-acquire']).has(event.stage) ? event.stage : 'unclassified'
    const outcome: Outcome = result.disposition === 'not-executed'
      ? { status: 'not-executed', reason: new Set(['unknown-command', 'disabled', 'busy']).has(result.reason) ? result.reason : 'unclassified' }
      : projectOutcome(result.result)
    begin(Object.freeze({ commandId: KNOWN_COMMAND_IDS.has(result.commandId) ? result.commandId as ApplicationCommandId : 'unknown', event: 'admission' }))?.({ stage, ...outcome })
  }
  const steamWorkflows = new Set<string>(STEAM_WORKFLOW_IDS)
  const steamStages = new Set<string>(STEAM_WORKFLOW_STAGES)
  const observeSteamWorkflow: SteamWorkflowObserver = operation => {
    const update = begin(Object.freeze({
      workflowId: steamWorkflows.has(operation.workflowId) ? operation.workflowId : 'unknown',
      ...(Number.isSafeInteger(operation.requestId) && operation.requestId > 0 ? { requestId: operation.requestId } : {}),
    }))
    if (!update) return
    let stage: string = 'fetch-and-normalize'
    update({ status: 'running', stage }, false)
    return Object.freeze({
      stage(value) {
        stage = steamStages.has(value) ? value : 'unclassified'
        update({ status: 'running', stage }, false)
      },
      complete(result) {
        let outcome: Outcome
        try { outcome = projectOutcome(result) }
        catch { outcome = { status: 'failure', failureCode: 'unclassified' } }
        update({ stage, ...outcome })
      },
    })
  }
  const observeProjectAsync: ProjectAsyncObserver = request => {
    // Lane suffixes contain user-created slot IDs. Never retain them or session IDs.
    const lane = request.lane
    if (lane === 'steam-game' || lane === 'image:case-branding-reconciliation') return
    const workflowId = lane === 'steam-metadata' ? 'discovery.metadata'
      : lane === 'artwork-discovery' ? 'discovery.artwork'
      : lane === 'screenshot-discovery' ? 'discovery.screenshots'
      : lane.startsWith('logo-discovery:') ? 'discovery.logo'
      : lane === 'background-artwork' || lane === 'title-artwork' || lane.startsWith('image:') ? 'image.import' : 'unknown'
    const update = begin(Object.freeze({ workflowId,
      ...(Number.isSafeInteger(request.requestId) && request.requestId > 0 ? { requestId: request.requestId } : {}),
    }))
    if (!update) return
    let stage = workflowId.startsWith('discovery.') ? 'discover' : 'prepare'
    update({ status: 'running', stage }, false)
    return Object.freeze({
      stage(value) {
        if (value !== 'prepare') stage = value === 'apply' || value === 'publish' ? value : 'unclassified'
        update({ status: 'running', stage }, false)
      },
      complete(result) {
        let outcome: Outcome
        try { outcome = projectOutcome(result) }
        catch { outcome = { status: 'failure', failureCode: 'unclassified' } }
        update({ stage, ...outcome })
      },
    })
  }
  const applicationStartupStages = new Set(Object.keys(APPLICATION_STARTUP_FAILURES))
  const observeApplicationStartup: ApplicationStartupObserver = event => {
    const update = begin(Object.freeze({ component: 'application', event: event === 'runtime' ? 'runtime' : 'startup' }))
    if (!update) return
    let stage = 'document-root'
    return Object.freeze({
      stage(value) {
        stage = applicationStartupStages.has(value) ? value : 'unclassified'
        update({ status: 'running', stage }, false)
      },
      complete(result) {
        let outcome: Outcome
        try { outcome = projectOutcome(result) }
        catch { outcome = { status: 'failure', failureCode: 'unclassified' } }
        update({ stage, ...outcome })
      },
    })
  }
  const startupStages = new Set<string>(APPLICATION_MENU_STARTUP_STAGES)
  const startupResults = new Set(['started', 'unavailable', 'failed', 'disposed'])
  const observeMenuStartup: ApplicationMenuStartupObserver = () => {
    const update = begin(Object.freeze({ component: 'application-menu', event: 'startup' }))
    if (!update) return
    let stage: string = 'native-availability'
    update({ status: 'running', stage }, false)
    return Object.freeze({
      stage(value) {
        stage = startupStages.has(value) ? value : 'unclassified'
        update({ status: 'running', stage }, false)
      },
      complete(result) {
        update({ status: startupResults.has(result) ? result : 'failed', stage })
      },
    })
  }
  function recordMenuDiagnostic(diagnostic: ApplicationMenuRuntimeDiagnostic) {
    const safe = projectApplicationMenuDiagnostic(diagnostic)
    begin(Object.freeze({ component: 'application-menu', event: 'diagnostic' }))?.({ status: 'reported', ...safe })
  }
  function snapshot() {
    const currentTime = now()
    return Object.freeze({ format: 'sbls-command-diagnostics', version: 4, capacity, evicted,
      records: Object.freeze(entries.map(entry => {
        const elapsed = Math.max(0, (entry.finished ?? currentTime) - entry.started)
        return Object.freeze({ sequence: entry.sequence, ...entry.identity,
          ...entry.outcome, elapsedMs: Math.min(MAX_ELAPSED_MS, Math.round(elapsed)),
          elapsedCapped: elapsed > MAX_ELAPSED_MS,
        })
      })),
    })
  }
  return Object.freeze({ observeExecution, observeAdmission, observeMenuStartup, recordMenuDiagnostic, observeSteamWorkflow, observeProjectAsync, observeApplicationStartup, snapshot,
    toJson: () => JSON.stringify(snapshot(), null, 2),
    clear() { entries = []; evicted = 0 },
    dispose() { disposed = true; entries = []; evicted = 0 },
  })
}

export type ApplicationCommandDiagnostics = ReturnType<typeof createApplicationCommandDiagnostics>
