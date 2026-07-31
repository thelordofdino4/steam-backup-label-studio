import assert from 'node:assert/strict'
import test from 'node:test'
import {
  runCaseInsertPngExport as runCaseInsertPngExportAdapter,
  runDiscPngExport as runDiscPngExportAdapter,
  type RunCaseInsertPngExportParams,
  type RunDiscPngExportParams,
} from './appPngExport.ts'

function createStatusRecorder(statuses: string[]) {
  return (message: string) => statuses.push(message)
}

type TestCaseExportParams = RunCaseInsertPngExportParams & Readonly<{
  announceStatus?: (message: string) => void
}>

type TestDiscExportParams = RunDiscPngExportParams & Readonly<{
  announceStatus?: (message: string) => void
}>

async function runCaseInsertPngExport(params: TestCaseExportParams) {
  const { announceStatus, ...adapterParams } = params
  const result = await runCaseInsertPngExportAdapter(adapterParams)
  if (result.feedback) announceStatus?.(result.feedback.message)
  return result
}

async function runDiscPngExport(params: TestDiscExportParams) {
  const { announceStatus, ...adapterParams } = params
  const result = await runDiscPngExportAdapter(adapterParams)
  if (result.feedback) announceStatus?.(result.feedback.message)
  return result
}

function createCaseInput(
  overrides: Partial<TestCaseExportParams> = {},
): TestCaseExportParams {
  return {
    caseInsert: {} as RunCaseInsertPngExportParams['caseInsert'],
    activeTemplatePane: 'cover',
    brandingSources: {} as RunCaseInsertPngExportParams['brandingSources'],
    saveDialog: async () => 'case.png',
    confirmDialog: async () => true,
    writeBinaryFileCommand: async () => undefined,
    buildPreflightSummary: () => ({
      message: 'case preflight',
      hasWarnings: false,
      warnings: [],
    }),
    exportPngBytes: async () => ({
      bytes: [1, 2, 3],
      width: 100,
      height: 200,
      dpi: 300,
    }),
    ...overrides,
  }
}

function createDiscInput(
  overrides: Partial<TestDiscExportParams> = {},
): TestDiscExportParams {
  return {
    preflight: {
      manualGameTitle: 'Manual title for preflight',
    } as RunDiscPngExportParams['preflight'],
    exportInput: {
      manualGameTitle: 'Resolved title for renderer',
    } as RunDiscPngExportParams['exportInput'],
    getPreviewSize: () => 512,
    saveDialog: async () => 'disc.png',
    confirmDialog: async () => true,
    writeBinaryFileCommand: async () => undefined,
    buildPreflightSummary: () => ({
      message: 'disc preflight',
      hasWarnings: false,
      warnings: [],
    }),
    exportPngBytes: async () => ({
      bytes: [9],
      width: 300,
      height: 300,
    }),
    ...overrides,
  }
}

test('clean case insert export skips confirmation and opens destination after preflight', async () => {
  const calls: string[] = []
  const statuses: string[] = []

  await runCaseInsertPngExport(createCaseInput({
    activeTemplatePane: 'tray',
    buildPreflightSummary: (params) => {
      calls.push(`preflight:${params.activeTemplatePane}:${params.dpi}`)
      return { message: 'case preflight', hasWarnings: false, warnings: [] }
    },
    confirmDialog: async () => {
      calls.push('confirm')
      return true
    },
    saveDialog: async (options) => {
      calls.push(`save:${options.defaultPath}:${options.filters?.[0]?.extensions[0]}`)
      return 'tray.png'
    },
    exportPngBytes: async (params) => {
      calls.push(`export:${params.activeTemplatePane}:${params.dpi}`)
      return { bytes: [1, 2, 3], width: 100, height: 200, dpi: params.dpi ?? 0 }
    },
    writeBinaryFileCommand: async (path, bytes) => {
      calls.push(`write:${path}:${bytes.join(',')}`)
    },
    announceStatus: createStatusRecorder(statuses),
  }))

  assert.deepEqual(calls, [
    'preflight:tray:300',
    'save:steam-backup-tray-card.png:png',
    'export:tray:300',
    'write:tray.png:1,2,3',
  ])
  assert.deepEqual(statuses, [
    'Exported Tray Card 100 × 200px PNG at 300 DPI.',
  ])
})

test('case insert warnings receive exactly one confirmation before destination selection', async () => {
  const calls: string[] = []

  await runCaseInsertPngExport(createCaseInput({
    buildPreflightSummary: () => {
      calls.push('preflight')
      return { message: 'case warning', hasWarnings: true, warnings: ['warning'] }
    },
    confirmDialog: async (message, options) => {
      calls.push(
        `confirm:${message}:${options.kind}:${options.title}:${options.okLabel}:${options.cancelLabel}`,
      )
      return true
    },
    saveDialog: async () => {
      calls.push('save')
      return 'case.png'
    },
    exportPngBytes: async () => {
      calls.push('export')
      return { bytes: [1], width: 10, height: 20, dpi: 300 }
    },
    writeBinaryFileCommand: async () => {
      calls.push('write')
    },
  }))

  assert.deepEqual(calls, [
    'preflight',
    'confirm:case warning:warning:Export PNG preflight:Export PNG:Cancel',
    'save',
    'export',
    'write',
  ])
})

test('case insert cover export preserves filename, render inputs, bytes, dimensions, DPI, and success copy', async () => {
  const calls: string[] = []
  const statuses: string[] = []

  await runCaseInsertPngExport(createCaseInput({
    activeTemplatePane: 'cover',
    dpi: 300,
    buildPreflightSummary: (params) => {
      calls.push(`preflight:${params.activeTemplatePane}:${params.dpi}`)
      return { message: 'clean', hasWarnings: false, warnings: [] }
    },
    saveDialog: async (options) => {
      calls.push(`save:${options.defaultPath}:${options.filters?.[0]?.extensions[0]}`)
      return 'cover.png'
    },
    exportPngBytes: async (params) => {
      calls.push(`export:${params.activeTemplatePane}:${params.dpi}`)
      return { bytes: [4, 5, 6], width: 1414, height: 1414, dpi: 300 }
    },
    writeBinaryFileCommand: async (path, bytes) => {
      calls.push(`write:${path}:${bytes.join(',')}`)
    },
    announceStatus: createStatusRecorder(statuses),
  }))

  assert.deepEqual(calls, [
    'preflight:cover:300',
    'save:steam-backup-cover-sheet.png:png',
    'export:cover:300',
    'write:cover.png:4,5,6',
  ])
  assert.deepEqual(statuses, [
    'Exported Cover Sheet 1414 × 1414px PNG at 300 DPI.',
  ])
})

test('declining case insert warnings does not choose a destination, render, or write', async () => {
  const calls: string[] = []
  const statuses: string[] = []

  await runCaseInsertPngExport(createCaseInput({
    buildPreflightSummary: () => {
      calls.push('preflight')
      return { message: 'case warning', hasWarnings: true, warnings: ['warning'] }
    },
    confirmDialog: async () => {
      calls.push('confirm')
      return false
    },
    saveDialog: async () => {
      calls.push('save')
      return 'case.png'
    },
    exportPngBytes: async () => {
      calls.push('export')
      return { bytes: [], width: 0, height: 0, dpi: 300 }
    },
    writeBinaryFileCommand: async () => {
      calls.push('write')
    },
    announceStatus: createStatusRecorder(statuses),
  }))

  assert.deepEqual(calls, ['preflight', 'confirm'])
  assert.deepEqual(statuses, ['Export cancelled after preflight.'])
})

test('cancelling case insert destination after clean preflight does not render or write', async () => {
  const calls: string[] = []
  const statuses: string[] = []

  await runCaseInsertPngExport(createCaseInput({
    buildPreflightSummary: () => {
      calls.push('preflight')
      return { message: 'clean', hasWarnings: false, warnings: [] }
    },
    saveDialog: async () => {
      calls.push('save')
      return null
    },
    confirmDialog: async () => {
      calls.push('confirm')
      return true
    },
    exportPngBytes: async () => {
      calls.push('export')
      return { bytes: [], width: 0, height: 0, dpi: 300 }
    },
    writeBinaryFileCommand: async () => {
      calls.push('write')
    },
    announceStatus: createStatusRecorder(statuses),
  }))

  assert.deepEqual(calls, ['preflight', 'save'])
  assert.deepEqual(statuses, ['Export cancelled.'])
})

test('cancelling case insert destination after accepted warnings does not render or write', async () => {
  const calls: string[] = []
  const statuses: string[] = []

  await runCaseInsertPngExport(createCaseInput({
    buildPreflightSummary: () => {
      calls.push('preflight')
      return { message: 'warning', hasWarnings: true, warnings: ['warning'] }
    },
    confirmDialog: async () => {
      calls.push('confirm')
      return true
    },
    saveDialog: async () => {
      calls.push('save')
      return null
    },
    exportPngBytes: async () => {
      calls.push('export')
      return { bytes: [], width: 0, height: 0, dpi: 300 }
    },
    writeBinaryFileCommand: async () => {
      calls.push('write')
    },
    announceStatus: createStatusRecorder(statuses),
  }))

  assert.deepEqual(calls, ['preflight', 'confirm', 'save'])
  assert.deepEqual(statuses, ['Export cancelled.'])
})

test('clean disc export keeps preflight and renderer inputs distinct without confirmation', async () => {
  const calls: string[] = []
  const statuses: string[] = []

  await runDiscPngExport(createDiscInput({
    buildPreflightSummary: (params) => {
      calls.push(`preflight:${params.manualGameTitle}`)
      return { message: 'disc preflight', hasWarnings: false, warnings: [] }
    },
    confirmDialog: async () => {
      calls.push('confirm')
      return true
    },
    saveDialog: async (options) => {
      calls.push(`save:${options.defaultPath}:${options.filters?.[0]?.extensions[0]}`)
      return 'disc.png'
    },
    getPreviewSize: () => {
      calls.push('preview-size')
      return 512
    },
    exportPngBytes: async (params) => {
      calls.push(`export:${params.previewSize}:${params.manualGameTitle}`)
      return { bytes: [9], width: 300, height: 300 }
    },
    writeBinaryFileCommand: async (path, bytes) => {
      calls.push(`write:${path}:${bytes.join(',')}`)
    },
    announceStatus: createStatusRecorder(statuses),
  }))

  assert.deepEqual(calls, [
    'preflight:Manual title for preflight',
    'save:steam-backup-label.png:png',
    'preview-size',
    'export:512:Resolved title for renderer',
    'write:disc.png:9',
  ])
  assert.deepEqual(statuses, ['Exported 300 × 300px PNG at 300 DPI.'])
})

test('disc warnings receive exactly one confirmation before destination and rendering', async () => {
  const calls: string[] = []

  await runDiscPngExport(createDiscInput({
    buildPreflightSummary: () => {
      calls.push('preflight')
      return { message: 'disc warning', hasWarnings: true, warnings: ['warning'] }
    },
    confirmDialog: async (message, options) => {
      calls.push(`confirm:${message}:${options.kind}`)
      return true
    },
    saveDialog: async () => {
      calls.push('save')
      return 'disc.png'
    },
    getPreviewSize: () => {
      calls.push('preview-size')
      return 512
    },
    exportPngBytes: async () => {
      calls.push('export')
      return { bytes: [9], width: 300, height: 300 }
    },
    writeBinaryFileCommand: async () => {
      calls.push('write')
    },
  }))

  assert.deepEqual(calls, [
    'preflight',
    'confirm:disc warning:warning',
    'save',
    'preview-size',
    'export',
    'write',
  ])
})

test('declining disc warnings does not choose a destination, measure, render, or write', async () => {
  const calls: string[] = []
  const statuses: string[] = []

  await runDiscPngExport(createDiscInput({
    buildPreflightSummary: () => {
      calls.push('preflight')
      return { message: 'disc warning', hasWarnings: true, warnings: ['warning'] }
    },
    confirmDialog: async () => {
      calls.push('confirm')
      return false
    },
    saveDialog: async () => {
      calls.push('save')
      return 'disc.png'
    },
    getPreviewSize: () => {
      calls.push('preview-size')
      return 512
    },
    exportPngBytes: async () => {
      calls.push('export')
      return { bytes: [], width: 0, height: 0 }
    },
    writeBinaryFileCommand: async () => {
      calls.push('write')
    },
    announceStatus: createStatusRecorder(statuses),
  }))

  assert.deepEqual(calls, ['preflight', 'confirm'])
  assert.deepEqual(statuses, ['Export cancelled after preflight.'])
})

test('cancelling disc destination after accepted warnings defers preview measurement and rendering', async () => {
  const calls: string[] = []
  const statuses: string[] = []

  await runDiscPngExport(createDiscInput({
    buildPreflightSummary: () => {
      calls.push('preflight')
      return { message: 'disc warning', hasWarnings: true, warnings: ['warning'] }
    },
    confirmDialog: async () => {
      calls.push('confirm')
      return true
    },
    saveDialog: async () => {
      calls.push('save')
      return null
    },
    getPreviewSize: () => {
      calls.push('preview-size')
      return 512
    },
    exportPngBytes: async () => {
      calls.push('export')
      return { bytes: [], width: 0, height: 0 }
    },
    writeBinaryFileCommand: async () => {
      calls.push('write')
    },
    announceStatus: createStatusRecorder(statuses),
  }))

  assert.deepEqual(calls, ['preflight', 'confirm', 'save'])
  assert.deepEqual(statuses, ['Export cancelled.'])
})

test('cancelling disc destination after clean preflight skips confirmation and preview measurement', async () => {
  const calls: string[] = []
  const statuses: string[] = []

  await runDiscPngExport(createDiscInput({
    buildPreflightSummary: () => {
      calls.push('preflight')
      return { message: 'clean', hasWarnings: false, warnings: [] }
    },
    confirmDialog: async () => {
      calls.push('confirm')
      return true
    },
    saveDialog: async () => {
      calls.push('save')
      return null
    },
    getPreviewSize: () => {
      calls.push('preview-size')
      return 512
    },
    exportPngBytes: async () => {
      calls.push('export')
      return { bytes: [], width: 0, height: 0 }
    },
    writeBinaryFileCommand: async () => {
      calls.push('write')
    },
    announceStatus: createStatusRecorder(statuses),
  }))

  assert.deepEqual(calls, ['preflight', 'save'])
  assert.deepEqual(statuses, ['Export cancelled.'])
})

test('preflight failure is terminal and prevents every dialog and side effect', async () => {
  const calls: string[] = []
  const statuses: string[] = []

  await runDiscPngExport(createDiscInput({
    buildPreflightSummary: () => {
      calls.push('preflight')
      throw new Error('preflight unavailable')
    },
    confirmDialog: async () => {
      calls.push('confirm')
      return true
    },
    saveDialog: async () => {
      calls.push('save')
      return 'disc.png'
    },
    getPreviewSize: () => {
      calls.push('preview-size')
      return 512
    },
    exportPngBytes: async () => {
      calls.push('export')
      return { bytes: [], width: 0, height: 0 }
    },
    writeBinaryFileCommand: async () => {
      calls.push('write')
    },
    announceStatus: createStatusRecorder(statuses),
  }))

  assert.deepEqual(calls, ['preflight'])
  assert.deepEqual(statuses, ['Export failed: Error: preflight unavailable'])
})

test('warning confirmation failure is terminal and prevents destination selection', async () => {
  const calls: string[] = []
  const statuses: string[] = []

  await runCaseInsertPngExport(createCaseInput({
    buildPreflightSummary: () => {
      calls.push('preflight')
      return { message: 'warning', hasWarnings: true, warnings: ['warning'] }
    },
    confirmDialog: async () => {
      calls.push('confirm')
      throw new Error('confirmation unavailable')
    },
    saveDialog: async () => {
      calls.push('save')
      return 'case.png'
    },
    exportPngBytes: async () => {
      calls.push('export')
      return { bytes: [], width: 0, height: 0, dpi: 300 }
    },
    writeBinaryFileCommand: async () => {
      calls.push('write')
    },
    announceStatus: createStatusRecorder(statuses),
  }))

  assert.deepEqual(calls, ['preflight', 'confirm'])
  assert.deepEqual(statuses, ['Export failed: Error: confirmation unavailable'])
})

test('destination failure is terminal and prevents rendering and writing', async () => {
  const calls: string[] = []
  const statuses: string[] = []

  await runCaseInsertPngExport(createCaseInput({
    buildPreflightSummary: () => {
      calls.push('preflight')
      return { message: 'clean', hasWarnings: false, warnings: [] }
    },
    saveDialog: async () => {
      calls.push('save')
      throw new Error('destination unavailable')
    },
    exportPngBytes: async () => {
      calls.push('export')
      return { bytes: [], width: 0, height: 0, dpi: 300 }
    },
    writeBinaryFileCommand: async () => {
      calls.push('write')
    },
    announceStatus: createStatusRecorder(statuses),
  }))

  assert.deepEqual(calls, ['preflight', 'save'])
  assert.deepEqual(statuses, ['Export failed: Error: destination unavailable'])
})

test('render failure is terminal and prevents writing', async () => {
  const calls: string[] = []
  const statuses: string[] = []

  await runDiscPngExport(createDiscInput({
    buildPreflightSummary: () => {
      calls.push('preflight')
      return { message: 'clean', hasWarnings: false, warnings: [] }
    },
    saveDialog: async () => {
      calls.push('save')
      return 'disc.png'
    },
    getPreviewSize: () => {
      calls.push('preview-size')
      return 512
    },
    exportPngBytes: async () => {
      calls.push('export')
      throw new Error('render unavailable')
    },
    writeBinaryFileCommand: async () => {
      calls.push('write')
    },
    announceStatus: createStatusRecorder(statuses),
  }))

  assert.deepEqual(calls, ['preflight', 'save', 'preview-size', 'export'])
  assert.deepEqual(statuses, ['Export failed: Error: render unavailable'])
})

test('write failure emits one failure status and no success status', async () => {
  const calls: string[] = []
  const statuses: string[] = []

  await runDiscPngExport(createDiscInput({
    buildPreflightSummary: () => {
      calls.push('preflight')
      return { message: 'clean', hasWarnings: false, warnings: [] }
    },
    saveDialog: async () => {
      calls.push('save')
      return 'disc.png'
    },
    getPreviewSize: () => {
      calls.push('preview-size')
      return 512
    },
    exportPngBytes: async () => {
      calls.push('export')
      return { bytes: [9], width: 300, height: 300 }
    },
    writeBinaryFileCommand: async () => {
      calls.push('write')
      throw new Error('write unavailable')
    },
    announceStatus: createStatusRecorder(statuses),
  }))

  assert.deepEqual(calls, [
    'preflight',
    'save',
    'preview-size',
    'export',
    'write',
  ])
  assert.deepEqual(statuses, ['Export failed: Error: write unavailable'])
})

test('workflow adapters return typed cancellation and stage-specific failure results', async () => {
  const cancelled = await runDiscPngExportAdapter(createDiscInput({
    saveDialog: async () => null,
  }))
  assert.deepEqual(cancelled, {
    status: 'cancelled',
    reason: 'file-dialog-dismissed',
    feedback: {
      kind: 'warning',
      message: 'Export cancelled.',
      deduplicationKey: 'export.png:cancelled:destination',
    },
  })

  const failure = await runDiscPngExportAdapter(createDiscInput({
    buildPreflightSummary: () => {
      throw new Error('preflight unavailable')
    },
  }))
  assert.equal(failure.status, 'failure')
  if (failure.status === 'failure') {
    assert.equal(failure.error.code, 'export.preflight-failed')
    assert.equal(
      failure.feedback?.message,
      'Export failed: Error: preflight unavailable',
    )
  }
})
