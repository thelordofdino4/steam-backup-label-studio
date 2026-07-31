import type {
  ApplicationCommandCapability,
  ApplicationCommandOperationToken,
  ApplicationCommandResult,
} from '../lifecycle/applicationCommandTypes.ts'
import type {
  ApplicationPngExportCommandOwner,
  ApplicationPngExportCapabilityContext,
} from '../lifecycle/applicationPngExportCommand.ts'
import { hasBusyScopeConflict } from '../lifecycle/commandBusyScopes.ts'
import type {
  ApplicationLifecycleCommandContext,
} from '../lifecycle/applicationLifecycleCommandPorts.ts'
import {
  runCaseInsertPngExport,
  runDiscPngExport,
  type ApplicationPngExportPhysicalTarget,
  type ApplicationPngExportSuccess,
  type RunCaseInsertPngExportParams,
  type RunDiscPngExportParams,
} from './appPngExport.ts'

type DiscExportInvocation = Omit<
  RunDiscPngExportParams,
  'operation'
>
type CaseExportInvocation = Omit<
  RunCaseInsertPngExportParams,
  'operation'
>

export type ApplicationDiscPngExportAdapter = Readonly<{
      kind: 'disc'
      physicalTarget: 'disc-label'
      captureInvocation(): DiscExportInvocation
    }>

export type ApplicationCasePngExportAdapter = Readonly<{
      kind: 'caseInsert'
      physicalTarget: 'case-cover-sheet' | 'case-tray-card'
      captureInvocation(): CaseExportInvocation
    }>

export type ApplicationPngExportAdapter =
  | ApplicationDiscPngExportAdapter
  | ApplicationCasePngExportAdapter

export type ApplicationPngExportRuntimeDependencies = Readonly<{
  getDiscAdapter(): ApplicationDiscPngExportAdapter | null
  getCaseInsertAdapter(): ApplicationCasePngExportAdapter | null
}>

function enabled(): ApplicationCommandCapability {
  return Object.freeze({ canExecute: true })
}

function disabled(
  reasonCode: string,
  userMessage: string,
): ApplicationCommandCapability {
  return Object.freeze({ canExecute: false, reasonCode, userMessage })
}

function expectedTarget(
  context: ApplicationPngExportCapabilityContext,
): ApplicationPngExportPhysicalTarget | null {
  const lifecycle = context.stateSnapshot.state
  const session = lifecycle.activeSession
  if (!session || lifecycle.visibleWorkspace === 'home') return null
  if (session.kind === 'disc' && lifecycle.visibleWorkspace === 'disc') {
    return 'disc-label'
  }
  if (
    session.kind !== 'caseInsert' ||
    lifecycle.visibleWorkspace !== 'caseInsert' ||
    session.lastEditorRoute.workspace !== 'caseInsert'
  ) {
    return null
  }
  return session.lastEditorRoute.surface === 'front'
    ? 'case-cover-sheet'
    : 'case-tray-card'
}

function capabilityFor(
  dependencies: ApplicationPngExportRuntimeDependencies | null,
  context: ApplicationPngExportCapabilityContext,
): ApplicationCommandCapability {
  const lifecycle = context.stateSnapshot.state
  if (!lifecycle.activeSession) {
    return disabled('export.no-active-session', 'Export PNG requires an active project.')
  }
  if (
    lifecycle.activeSession.kind !== 'disc' &&
    lifecycle.activeSession.kind !== 'caseInsert'
  ) {
    return disabled(
      'export.unsupported-project-kind',
      'This project kind does not support PNG export.',
    )
  }
  if (lifecycle.visibleWorkspace === 'home') {
    return disabled('export.no-visible-editor', 'Export PNG requires a visible editor.')
  }
  if (hasBusyScopeConflict(['export.execution'], context.busy)) {
    return disabled('export.busy', 'Export PNG is already in progress.')
  }
  if (hasBusyScopeConflict(['workspace.navigation'], context.busy)) {
    return disabled(
      'export.lifecycle-conflict',
      'Export PNG is unavailable during project navigation.',
    )
  }
  const target = expectedTarget(context)
  if (!target) {
    return disabled(
      'export.target-unresolvable',
      'The current editor cannot be exported as PNG.',
    )
  }
  const adapter = resolveAdapter(dependencies, target)
  if (!adapter || adapter.physicalTarget !== target) {
    return disabled(
      'export.adapter-unavailable',
      'The current PNG export adapter is unavailable.',
    )
  }
  return enabled()
}

function resolveAdapter(
  dependencies: ApplicationPngExportRuntimeDependencies | null,
  target: ApplicationPngExportPhysicalTarget,
): ApplicationPngExportAdapter | null {
  if (!dependencies) return null
  return target === 'disc-label'
    ? dependencies.getDiscAdapter()
    : dependencies.getCaseInsertAdapter()
}

function snapshotFailure(error: unknown): ApplicationCommandResult<never> {
  return Object.freeze({
    status: 'failure',
    error: Object.freeze({
      code: 'export.snapshot-failed',
      userMessage: `Export failed: ${String(error)}`,
      diagnosticMessage: error instanceof Error ? error.message : String(error),
      cause: error,
      recoverable: true,
    }),
    feedback: Object.freeze({
      kind: 'error',
      message: `Export failed: ${String(error)}`,
      deduplicationKey: 'export.png:failure:snapshot',
    }),
  })
}

export function createApplicationPngExportCommandOwner(
  getDependencies: () => ApplicationPngExportRuntimeDependencies | null,
): ApplicationPngExportCommandOwner {
  return Object.freeze({
    availability: 'implemented',
    getCapability(context) {
      return capabilityFor(getDependencies(), context)
    },
    async executeExportPng(
      context: ApplicationLifecycleCommandContext,
      operation: ApplicationCommandOperationToken,
    ): Promise<ApplicationCommandResult<ApplicationPngExportSuccess>> {
      const current = context.getCurrentStateSnapshot()
      const capabilityContext = Object.freeze({
        stateSnapshot: current,
        busy: Object.freeze({ occupiedScopes: [] }),
      })
      const target = expectedTarget(capabilityContext)
      const adapter = target
        ? resolveAdapter(getDependencies(), target)
        : null
      if (!target || !adapter || adapter.physicalTarget !== target) {
        return snapshotFailure(new Error('The active export target changed before capture.'))
      }

      try {
        return adapter.kind === 'disc'
          ? runDiscPngExport({ ...adapter.captureInvocation(), operation })
          : runCaseInsertPngExport({
              ...adapter.captureInvocation(),
              operation,
            })
      } catch (error) {
        return snapshotFailure(error)
      }
    },
  })
}
