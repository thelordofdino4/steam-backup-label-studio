import assert from 'node:assert/strict'
import test from 'node:test'

import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { createBlankJewelCaseSavedProject } from '../project/projectCaseInsert.ts'
import {
  createApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import { commandSucceeded } from '../lifecycle/applicationCommandTypes.ts'
import {
  createNewProjectSession,
  returnProjectSessionHome,
  type DiscProjectSession,
} from '../lifecycle/projectSession.ts'
import {
  createApplicationPngExportCommandOwner,
  type ApplicationPngExportAdapter,
} from './appPngExportCommand.ts'
import type {
  RunDiscPngExportParams,
} from './appPngExport.ts'

function discAdapter(
  calls: string[],
  overrides: Partial<RunDiscPngExportParams> = {},
  observeCapture: (session: DiscProjectSession) => void = () => {},
): ApplicationPngExportAdapter {
  return Object.freeze({
    kind: 'disc',
    physicalTarget: 'disc-label',
    captureInvocation: session => {
      observeCapture(session)
      calls.push('capture')
      return {
        preflight: {} as RunDiscPngExportParams['preflight'],
        exportInput: {} as RunDiscPngExportParams['exportInput'],
        getPreviewSize: () => 500,
        buildPreflightSummary: () => ({
          message: 'clean',
          hasWarnings: false,
          warnings: [],
        }),
        confirmDialog: async () => true,
        saveDialog: async () => {
          calls.push('destination')
          return 'disc.png'
        },
        exportPngBytes: async () => {
          calls.push('render')
          return { bytes: new Uint8Array([1, 2]), width: 300, height: 300 }
        },
        writePngFileCommand: async () => {
          calls.push('write')
        },
        ...overrides,
      }
    },
  })
}

function dependenciesFor(adapter: ApplicationPngExportAdapter | null) {
  return {
    getDiscAdapter: () => adapter?.kind === 'disc' ? adapter : null,
    getCaseInsertAdapter: () => adapter?.kind === 'caseInsert' ? adapter : null,
  }
}

function createDiscRoot(adapter: ApplicationPngExportAdapter | null) {
  const dependencies = dependenciesFor(adapter)
  return createApplicationLifecycleCompositionRoot({
    initialState: createNewProjectSession({
      sessionId: 'disc-session',
      project: createBlankDiscSavedProject(),
    }),
    exportPng: createApplicationPngExportCommandOwner(() => dependencies),
  })
}

test('export.png capability is derived from active workspace, target, adapter, and Home state', () => {
  const calls: string[] = []
  const root = createDiscRoot(discAdapter(calls))
  assert.equal(
    root.getApplicationCommandCapabilities()['export.png'].canExecute,
    true,
  )

  const noAdapter = createDiscRoot(null)
  const noAdapterCapability =
    noAdapter.getApplicationCommandCapabilities()['export.png']
  assert.equal(noAdapterCapability.canExecute, false)
  if (!noAdapterCapability.canExecute) {
    assert.equal(noAdapterCapability.reasonCode, 'export.adapter-unavailable')
  }

  const home = createApplicationLifecycleCompositionRoot({
    initialState: returnProjectSessionHome(createNewProjectSession({
      sessionId: 'home-session',
      project: createBlankDiscSavedProject(),
    })),
    exportPng: createApplicationPngExportCommandOwner(() => ({
      ...dependenciesFor(discAdapter(calls)),
    })),
  })
  const homeCapability = home.getApplicationCommandCapabilities()['export.png']
  assert.equal(homeCapability.canExecute, false)
  if (!homeCapability.canExecute) {
    assert.equal(homeCapability.reasonCode, 'export.no-visible-editor')
  }

  const caseRoot = createApplicationLifecycleCompositionRoot({
    initialState: createNewProjectSession({
      sessionId: 'case-session',
      project: createBlankJewelCaseSavedProject(),
      lastEditorRoute: { workspace: 'caseInsert', surface: 'front' },
    }),
    exportPng: createApplicationPngExportCommandOwner(() => ({
      ...dependenciesFor(Object.freeze({
        kind: 'caseInsert',
        physicalTarget: 'case-tray-card',
        captureInvocation: () => {
          throw new Error('must not capture an incompatible target')
        },
      })),
    })),
  })
  const caseCapability =
    caseRoot.getApplicationCommandCapabilities()['export.png']
  assert.equal(caseCapability.canExecute, false)
  if (!caseCapability.canExecute) {
    assert.equal(caseCapability.reasonCode, 'export.adapter-unavailable')
  }

  const noSession = createApplicationLifecycleCompositionRoot({
    exportPng: createApplicationPngExportCommandOwner(() => ({
      ...dependenciesFor(discAdapter(calls)),
    })),
  })
  const noSessionCapability =
    noSession.getApplicationCommandCapabilities()['export.png']
  assert.equal(noSessionCapability.canExecute, false)
  if (!noSessionCapability.canExecute) {
    assert.equal(noSessionCapability.reasonCode, 'export.no-active-session')
  }
})

test('Case Front resolves Cover while Back and combined Spine resolve complete Tray Card', () => {
  for (const [surface, physicalTarget] of [
    ['front', 'case-cover-sheet'],
    ['back', 'case-tray-card'],
    ['spine', 'case-tray-card'],
  ] as const) {
    const root = createApplicationLifecycleCompositionRoot({
      initialState: createNewProjectSession({
        sessionId: `case-${surface}`,
        project: createBlankJewelCaseSavedProject(),
        lastEditorRoute: { workspace: 'caseInsert', surface },
      }),
      exportPng: createApplicationPngExportCommandOwner(() => ({
        ...dependenciesFor(Object.freeze({
          kind: 'caseInsert',
          physicalTarget,
          captureInvocation: () => {
            throw new Error('capability projection must not capture inputs')
          },
        })),
      })),
    })
    assert.equal(
      root.getApplicationCommandCapabilities()['export.png'].canExecute,
      true,
      surface,
    )
  }
})

test('export.png captures one invocation, owns shared scopes, and returns typed success feedback', async () => {
  const calls: string[] = []
  const root = createDiscRoot(discAdapter(calls))
  const lifecycleBefore = root.getLifecycleState()
  const occupied: string[][] = []
  root.subscribe((snapshot) => {
    occupied.push([...snapshot.busy.occupiedScopes])
  })

  const result = await root.dispatch('export.png')

  assert.deepEqual(calls, ['capture', 'destination', 'render', 'write'])
  assert.equal(result.disposition, 'executed')
  if (result.disposition === 'executed') {
    assert.equal(result.result.status, 'success')
    assert.equal(
      result.result.feedback?.message,
      'Exported 300 × 300px PNG at 300 DPI.',
    )
  }
  assert.ok(occupied.some((scopes) =>
    scopes.includes('export.execution') &&
    scopes.includes('dialog.export-destination')))
  assert.ok(occupied.some((scopes) =>
    scopes.includes('export.execution') &&
    scopes.includes('persistence.export-write')))
  assert.deepEqual(root.getBusyState().occupiedScopes, [])
  assert.equal(root.getLifecycleState(), lifecycleBefore)
})

test('repeated export activation while a warning dialog is pending performs one operation', async () => {
  const calls: string[] = []
  let releaseConfirmation!: (accepted: boolean) => void
  const confirmation = new Promise<boolean>((resolve) => {
    releaseConfirmation = resolve
  })
  const adapter = discAdapter(calls, {
    buildPreflightSummary: () => ({
      message: 'warning',
      hasWarnings: true,
      warnings: ['warning'],
    }),
    confirmDialog: async () => {
      calls.push('confirm')
      return confirmation
    },
  })
  const root = createDiscRoot(adapter)

  const first = root.dispatch('export.png')
  await new Promise<void>((resolve) => setImmediate(resolve))
  const repeated = await root.dispatch('export.png')
  assert.equal(repeated.disposition, 'not-executed')
  assert.deepEqual(calls, ['capture', 'confirm'])

  releaseConfirmation(false)
  const completed = await first
  assert.equal(completed.disposition, 'executed')
  if (completed.disposition === 'executed') {
    assert.equal(completed.result.status, 'declined')
  }
  assert.deepEqual(calls, ['capture', 'confirm'])
  assert.deepEqual(root.getBusyState().occupiedScopes, [])
})

test('export conflicts with lifecycle transitions and blocks workspace navigation while in flight', async () => {
  const calls: string[] = []
  let releaseLifecycle!: () => void
  const lifecycleGate = new Promise<void>((resolve) => {
    releaseLifecycle = resolve
  })
  let releaseConfirmation!: (accepted: boolean) => void
  const confirmation = new Promise<boolean>((resolve) => {
    releaseConfirmation = resolve
  })
  let navigationCalls = 0
  const adapter = discAdapter(calls, {
    buildPreflightSummary: () => ({
      message: 'warning',
      hasWarnings: true,
      warnings: ['warning'],
    }),
    confirmDialog: async () => confirmation,
  })
  const dependencies = dependenciesFor(adapter)
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createNewProjectSession({
      sessionId: 'arbitration-session',
      project: createBlankDiscSavedProject(),
    }),
    ports: {
      newDisc: {
        availability: 'implemented',
        executeNewDisc: async () => {
          await lifecycleGate
          return commandSucceeded(undefined)
        },
      },
      returnHome: {
        availability: 'implemented',
        executeReturnHome: () => {
          navigationCalls += 1
          return commandSucceeded(undefined)
        },
      },
    },
    exportPng: createApplicationPngExportCommandOwner(() => dependencies),
  })

  const lifecycle = root.dispatch('project.new-disc')
  const blockedExport = await root.dispatch('export.png')
  assert.equal(blockedExport.disposition, 'not-executed')
  assert.deepEqual(calls, [])
  releaseLifecycle()
  await lifecycle

  const activeExport = root.dispatch('export.png')
  await new Promise<void>((resolve) => setImmediate(resolve))
  const blockedNavigation = await root.dispatch('workspace.return-home')
  assert.equal(blockedNavigation.disposition, 'not-executed')
  assert.equal(navigationCalls, 0)
  releaseConfirmation(false)
  await activeExport
  assert.deepEqual(root.getBusyState().occupiedScopes, [])
})


test('Disc PNG pins the accepted snapshot after finish and never recaptures during the dialog', async () => {
  const calls: string[] = []
  const captured: DiscProjectSession[] = []
  let releaseDestination!: (path: string) => void
  const destination = new Promise<string>((resolve) => { releaseDestination = resolve })
  const adapter = discAdapter(calls, {
    saveDialog: () => { calls.push('destination'); return destination },
    exportPngBytes: async () => {
      assert.deepEqual(captured.map(session => session.project.background.scale), [1.25])
      calls.push('render')
      return { bytes: new Uint8Array([1, 2]), width: 300, height: 300 }
    },
  }, session => captured.push(session))
  const state = createNewProjectSession({ sessionId: 'capture-r', project: createBlankDiscSavedProject() })
  const initial = state.activeSession
  assert.equal(initial?.kind, 'disc')
  const root = createApplicationLifecycleCompositionRoot({
    initialState: state,
    exportPng: createApplicationPngExportCommandOwner(() => dependenciesFor(adapter), () => ({
      finish() {
        assert.ok(initial)
        assert.equal(root.commitDiscBackground({
          sessionId: initial.id, expectedRevision: initial.revision,
          operation: { kind: 'transform', scale: 1.25, offset: { x: 4, y: -3 } },
        }), 'committed')
        return commandSucceeded(undefined)
      },
    })),
  })
  const exportRequest = root.dispatch('export.png')
  try {
    const accepted = root.getLifecycleState().activeSession
    assert.ok(accepted?.kind === 'disc' && initial)
    assert.equal(accepted.revision, initial.revision + 1)
    assert.deepEqual(captured, [accepted])
    assert.equal(root.commitDiscBackground({
      sessionId: accepted.id, expectedRevision: accepted.revision,
      operation: { kind: 'transform', scale: 2, offset: { x: 12, y: 7 } },
    }), 'committed')
  } finally {
    releaseDestination('disc.png')
  }
  const result = await exportRequest
  assert.equal(result.disposition === 'executed' && result.result.status, 'success')
  assert.deepEqual(calls, ['capture', 'destination', 'render', 'write'])
  assert.equal(captured.length, 1)
  assert.equal(root.getLifecycleState().activeSession?.revision, initial!.revision + 2)
})

test('Case export captures its original zero-argument adapter once', async () => {
  let captures = 0
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createNewProjectSession({ sessionId: 'case-export', project: createBlankJewelCaseSavedProject(),
      lastEditorRoute: { workspace: 'caseInsert', surface: 'front' } }),
    exportPng: createApplicationPngExportCommandOwner(() => dependenciesFor({
      kind: 'caseInsert',
      physicalTarget: 'case-cover-sheet',
      captureInvocation(...args: unknown[]) {
        assert.deepEqual(args, [])
        captures++
        return {
          activeTemplatePane: 'cover',
          caseInsert: createBlankJewelCaseSavedProject().caseInsert,
          brandingSources: {} as never,
          buildPreflightSummary: () => ({ message: 'clean', hasWarnings: false, warnings: [] }),
          confirmDialog: async () => true,
          saveDialog: async () => null,
          writePngFileCommand: async () => { throw new Error('unexpected write') },
          exportPngBytes: async () => { throw new Error('unexpected render') },
        }
      },
    })),
  })
  const result = await root.dispatch('export.png')
  assert.equal(result.disposition === 'executed' && result.result.status, 'cancelled')
  assert.equal(captures, 1)
})
