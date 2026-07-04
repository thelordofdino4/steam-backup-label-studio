import assert from 'node:assert/strict'
import test from 'node:test'
import {
  runCaseInsertPngExport,
  runDiscPngExport,
  type ConfirmDialog,
  type RunCaseInsertPngExportParams,
  type RunDiscPngExportParams,
  type SaveDialog,
  type WriteBinaryFileCommand,
} from './appPngExport.ts'

function createStatusRecorder(statuses: string[]) {
  return (message: string) => statuses.push(message)
}

test('case insert PNG export reports cancellation before preflight work', async () => {
  const calls: string[] = []
  const statuses: string[] = []
  const saveDialog: SaveDialog = async (options) => {
    calls.push(`save:${options.defaultPath}`)
    return null
  }
  const confirmDialog: ConfirmDialog = async () => {
    calls.push('confirm')
    return true
  }
  const writeBinaryFileCommand: WriteBinaryFileCommand = async () => {
    calls.push('write')
  }

  await runCaseInsertPngExport({
    caseInsert: {} as RunCaseInsertPngExportParams['caseInsert'],
    activeTemplatePane: 'cover',
    brandingSources: {} as RunCaseInsertPngExportParams['brandingSources'],
    saveDialog,
    confirmDialog,
    writeBinaryFileCommand,
    buildPreflightSummary: () => {
      calls.push('preflight')
      return { message: 'preflight', hasWarnings: false, warnings: [] }
    },
    exportPngBytes: async () => {
      calls.push('export')
      return { bytes: [1], width: 10, height: 20, dpi: 300 }
    },
    announceStatus: createStatusRecorder(statuses),
  })

  assert.deepEqual(calls, ['save:steam-backup-cover-sheet.png'])
  assert.deepEqual(statuses, ['Export cancelled.'])
})

test('case insert PNG export preserves preflight, write, and status ordering', async () => {
  const calls: string[] = []
  const statuses: string[] = []

  await runCaseInsertPngExport({
    caseInsert: {} as RunCaseInsertPngExportParams['caseInsert'],
    activeTemplatePane: 'tray',
    brandingSources: {} as RunCaseInsertPngExportParams['brandingSources'],
    saveDialog: async (options) => {
      calls.push(`save:${options.defaultPath}`)
      return 'tray.png'
    },
    confirmDialog: async (message, options) => {
      calls.push(`confirm:${message}:${options.kind}`)
      return true
    },
    writeBinaryFileCommand: async (path, bytes) => {
      calls.push(`write:${path}:${bytes.join(',')}`)
    },
    buildPreflightSummary: (params) => {
      calls.push(`preflight:${params.activeTemplatePane}:${params.dpi}`)
      return { message: 'case preflight', hasWarnings: false, warnings: [] }
    },
    exportPngBytes: async (params) => {
      calls.push(`export:${params.activeTemplatePane}:${params.dpi}`)
      return { bytes: [1, 2, 3], width: 100, height: 200, dpi: params.dpi ?? 0 }
    },
    announceStatus: createStatusRecorder(statuses),
  })

  assert.deepEqual(calls, [
    'save:steam-backup-tray-card.png',
    'preflight:tray:300',
    'confirm:case preflight:info',
    'export:tray:300',
    'write:tray.png:1,2,3',
  ])
  assert.deepEqual(statuses, [
    'Exported Tray Card 100 × 200px PNG at 300 DPI.',
  ])
})

test('disc PNG export keeps preflight and renderer inputs distinct', async () => {
  const calls: string[] = []
  const statuses: string[] = []
  const preflight = {
    manualGameTitle: 'Manual title for preflight',
  } as RunDiscPngExportParams['preflight']
  const exportInput = {
    manualGameTitle: 'Resolved title for renderer',
  } as RunDiscPngExportParams['exportInput']

  await runDiscPngExport({
    preflight,
    exportInput,
    getPreviewSize: () => 512,
    saveDialog: async (options) => {
      calls.push(`save:${options.defaultPath}`)
      return 'disc.png'
    },
    confirmDialog: async (message, options) => {
      calls.push(`confirm:${message}:${options.kind}`)
      return true
    },
    writeBinaryFileCommand: async (path, bytes) => {
      calls.push(`write:${path}:${bytes.join(',')}`)
    },
    buildPreflightSummary: (params) => {
      calls.push(`preflight:${params.manualGameTitle}`)
      return { message: 'disc preflight', hasWarnings: true, warnings: ['warning'] }
    },
    exportPngBytes: async (params) => {
      calls.push(`export:${params.previewSize}:${params.manualGameTitle}`)
      return { bytes: [9], width: 300, height: 300 }
    },
    announceStatus: createStatusRecorder(statuses),
  })

  assert.deepEqual(calls, [
    'save:steam-backup-label.png',
    'preflight:Manual title for preflight',
    'confirm:disc preflight:warning',
    'export:512:Resolved title for renderer',
    'write:disc.png:9',
  ])
  assert.deepEqual(statuses, ['Exported 300 × 300px PNG at 300 DPI.'])
})
