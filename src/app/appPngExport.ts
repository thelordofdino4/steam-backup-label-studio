import {
  getCaseInsertTemplatePaneConfig,
} from '../caseInsert/templateSurfaces.ts'
import { EXPORT_DPI } from '../disc/geometry.ts'
import type { buildCaseInsertExportPreflightSummary } from '../export/caseInsertExportPreflight.ts'
import type { exportCaseInsertPngBytes } from '../export/exportCaseInsertPng.ts'
import type { exportDiscLabelPngBytes } from '../export/exportPng.ts'
import type { buildExportPreflightSummary } from '../export/exportPreflight.ts'
import {
  commandFailed,
  commandSucceeded,
  type ApplicationCommandFeedbackIntent,
  type ApplicationCommandOperationToken,
  type ApplicationCommandResult,
  type CommandBusyScope,
} from '../lifecycle/applicationCommandTypes.ts'

type DialogFilter = {
  name: string
  extensions: string[]
}

export type SaveDialog = (options: {
  defaultPath?: string
  filters?: DialogFilter[]
}) => Promise<string | null>

export type ConfirmDialog = (
  message: string,
  options: {
    title: string
    kind: 'info' | 'warning'
    okLabel: string
    cancelLabel: string
  },
) => Promise<boolean>

export type WriteBinaryFileCommand = (
  path: string,
  bytes: number[],
) => Promise<unknown>

export type ApplicationPngExportPhysicalTarget =
  | 'disc-label'
  | 'case-cover-sheet'
  | 'case-tray-card'

export type ApplicationPngExportSuccess = Readonly<{
  physicalTarget: ApplicationPngExportPhysicalTarget
  path: string
  width: number
  height: number
  dpi: number
}>

type CaseInsertExportParams = Parameters<typeof exportCaseInsertPngBytes>[0]
type DiscExportParams = Parameters<typeof exportDiscLabelPngBytes>[0]
type DiscExportPreflightParams = Parameters<typeof buildExportPreflightSummary>[0]

type CaseInsertPngExportDependencies = {
  saveDialog: SaveDialog
  confirmDialog: ConfirmDialog
  writeBinaryFileCommand: WriteBinaryFileCommand
  buildPreflightSummary: typeof buildCaseInsertExportPreflightSummary
  exportPngBytes: typeof exportCaseInsertPngBytes
}

type DiscPngExportDependencies = {
  saveDialog: SaveDialog
  confirmDialog: ConfirmDialog
  writeBinaryFileCommand: WriteBinaryFileCommand
  buildPreflightSummary: typeof buildExportPreflightSummary
  exportPngBytes: typeof exportDiscLabelPngBytes
}

export type RunCaseInsertPngExportParams = CaseInsertExportParams &
  CaseInsertPngExportDependencies & {
    operation?: ApplicationCommandOperationToken
  }

export type RunDiscPngExportParams = DiscPngExportDependencies & {
  preflight: DiscExportPreflightParams
  exportInput: Omit<DiscExportParams, 'previewSize'>
  getPreviewSize: () => number
  operation?: ApplicationCommandOperationToken
}

const PNG_FILTERS: DialogFilter[] = [
  {
    name: 'PNG Image',
    extensions: ['png'],
  },
]

function getPreflightWarningConfirmOptions() {
  return {
    title: 'Export PNG preflight',
    kind: 'warning',
    okLabel: 'Export PNG',
    cancelLabel: 'Cancel',
  } as const
}

function feedback(
  kind: ApplicationCommandFeedbackIntent['kind'],
  message: string,
  key: string,
): ApplicationCommandFeedbackIntent {
  return Object.freeze({ kind, message, deduplicationKey: key })
}

function finalize(
  result: ApplicationCommandResult<ApplicationPngExportSuccess>,
): ApplicationCommandResult<ApplicationPngExportSuccess> {
  return result
}

async function withOptionalScope<Value>(
  operation: ApplicationCommandOperationToken | undefined,
  scope: CommandBusyScope,
  run: () => Promise<Value> | Value,
): Promise<Value> {
  return operation ? operation.withScopes([scope], run) : run()
}

function exportFailure(
  stage: 'preflight' | 'confirmation' | 'destination' | 'render' | 'write',
  error: unknown,
): ApplicationCommandResult<never> {
  const message = `Export failed: ${String(error)}`
  return commandFailed({
    code: `export.${stage}-failed`,
    userMessage: message,
    diagnosticMessage: error instanceof Error ? error.message : String(error),
    cause: error,
    recoverable: true,
  }, feedback('error', message, `export.png:failure:${stage}`))
}

export async function runCaseInsertPngExport({
  caseInsert,
  activeTemplatePane,
  brandingSources,
  dpi = EXPORT_DPI,
  saveDialog,
  confirmDialog,
  writeBinaryFileCommand,
  buildPreflightSummary,
  exportPngBytes,
  operation,
}: RunCaseInsertPngExportParams): Promise<
  ApplicationCommandResult<ApplicationPngExportSuccess>
> {
  const activePaneConfig = getCaseInsertTemplatePaneConfig(activeTemplatePane)
  const activePaneFileSlug = activeTemplatePane === 'tray'
    ? 'tray-card'
    : 'cover-sheet'
  let preflight
  try {
    preflight = buildPreflightSummary({
      caseInsert,
      activeTemplatePane,
      brandingSources,
      dpi,
    })
  } catch (error) {
    return finalize(exportFailure('preflight', error))
  }

  if (preflight.hasWarnings) {
    let shouldExport
    try {
      shouldExport = await withOptionalScope(
        operation,
        'dialog.export-warning',
        () => confirmDialog(
          preflight.message,
          getPreflightWarningConfirmOptions(),
        ),
      )
    } catch (error) {
      return finalize(exportFailure('confirmation', error))
    }

    if (!shouldExport) {
      return finalize(Object.freeze({
        status: 'declined',
        reason: 'export-warning-not-authorized',
        feedback: feedback(
          'warning',
          'Export cancelled after preflight.',
          'export.png:declined:preflight',
        ),
      }))
    }
  }

  let path
  try {
    path = await withOptionalScope(
      operation,
      'dialog.export-destination',
      () => saveDialog({
        defaultPath: `steam-backup-${activePaneFileSlug}.png`,
        filters: PNG_FILTERS,
      }),
    )
  } catch (error) {
    return finalize(exportFailure('destination', error))
  }

  if (!path) {
    return finalize(Object.freeze({
      status: 'cancelled',
      reason: 'file-dialog-dismissed',
      feedback: feedback(
        'warning',
        'Export cancelled.',
        'export.png:cancelled:destination',
      ),
    }))
  }

  let result
  try {
    result = await exportPngBytes({
      caseInsert,
      activeTemplatePane,
      brandingSources,
      dpi,
    })
  } catch (error) {
    return finalize(exportFailure('render', error))
  }

  try {
    await withOptionalScope(
      operation,
      'persistence.export-write',
      () => writeBinaryFileCommand(path, result.bytes),
    )
  } catch (error) {
    return finalize(exportFailure('write', error))
  }

  const message =
    `Exported ${activePaneConfig.label} ${result.width} × ${result.height}px PNG at ${result.dpi} DPI.`
  return finalize(commandSucceeded({
    physicalTarget: activeTemplatePane === 'tray'
      ? 'case-tray-card'
      : 'case-cover-sheet',
    path,
    width: result.width,
    height: result.height,
    dpi: result.dpi,
  }, feedback('success', message, 'export.png:success')))
}

export async function runDiscPngExport({
  preflight,
  exportInput,
  getPreviewSize,
  saveDialog,
  confirmDialog,
  writeBinaryFileCommand,
  buildPreflightSummary,
  exportPngBytes,
  operation,
}: RunDiscPngExportParams): Promise<
  ApplicationCommandResult<ApplicationPngExportSuccess>
> {
  let preflightSummary
  try {
    preflightSummary = buildPreflightSummary(preflight)
  } catch (error) {
    return finalize(exportFailure('preflight', error))
  }

  if (preflightSummary.hasWarnings) {
    let shouldExport
    try {
      shouldExport = await withOptionalScope(
        operation,
        'dialog.export-warning',
        () => confirmDialog(
          preflightSummary.message,
          getPreflightWarningConfirmOptions(),
        ),
      )
    } catch (error) {
      return finalize(exportFailure('confirmation', error))
    }

    if (!shouldExport) {
      return finalize(Object.freeze({
        status: 'declined',
        reason: 'export-warning-not-authorized',
        feedback: feedback(
          'warning',
          'Export cancelled after preflight.',
          'export.png:declined:preflight',
        ),
      }))
    }
  }

  let path
  try {
    path = await withOptionalScope(
      operation,
      'dialog.export-destination',
      () => saveDialog({
        defaultPath: 'steam-backup-label.png',
        filters: PNG_FILTERS,
      }),
    )
  } catch (error) {
    return finalize(exportFailure('destination', error))
  }

  if (!path) {
    return finalize(Object.freeze({
      status: 'cancelled',
      reason: 'file-dialog-dismissed',
      feedback: feedback(
        'warning',
        'Export cancelled.',
        'export.png:cancelled:destination',
      ),
    }))
  }

  let result
  try {
    result = await exportPngBytes({
      ...exportInput,
      previewSize: getPreviewSize(),
    })
  } catch (error) {
    return finalize(exportFailure('render', error))
  }

  try {
    await withOptionalScope(
      operation,
      'persistence.export-write',
      () => writeBinaryFileCommand(path, result.bytes),
    )
  } catch (error) {
    return finalize(exportFailure('write', error))
  }

  const message =
    `Exported ${result.width} × ${result.height}px PNG at ${EXPORT_DPI} DPI.`
  return finalize(commandSucceeded({
    physicalTarget: 'disc-label',
    path,
    width: result.width,
    height: result.height,
    dpi: EXPORT_DPI,
  }, feedback('success', message, 'export.png:success')))
}
