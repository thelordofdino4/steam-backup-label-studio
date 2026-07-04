import {
  getCaseInsertTemplatePaneConfig,
} from '../caseInsert/templateSurfaces.ts'
import { EXPORT_DPI } from '../disc/geometry.ts'
import type { buildCaseInsertExportPreflightSummary } from '../export/caseInsertExportPreflight.ts'
import type { exportCaseInsertPngBytes } from '../export/exportCaseInsertPng.ts'
import type { exportDiscLabelPngBytes } from '../export/exportPng.ts'
import type { buildExportPreflightSummary } from '../export/exportPreflight.ts'

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

type AnnounceStatus = (message: string) => void

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
    announceStatus: AnnounceStatus
  }

export type RunDiscPngExportParams = DiscPngExportDependencies & {
  preflight: DiscExportPreflightParams
  exportInput: Omit<DiscExportParams, 'previewSize'>
  getPreviewSize: () => number
  announceStatus: AnnounceStatus
}

const PNG_FILTERS: DialogFilter[] = [
  {
    name: 'PNG Image',
    extensions: ['png'],
  },
]

function getPreflightConfirmOptions(hasWarnings: boolean) {
  return {
    title: 'Export PNG preflight',
    kind: hasWarnings ? 'warning' : 'info',
    okLabel: 'Export PNG',
    cancelLabel: 'Cancel',
  } as const
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
  announceStatus,
}: RunCaseInsertPngExportParams) {
  try {
    const activePaneConfig = getCaseInsertTemplatePaneConfig(activeTemplatePane)
    const activePaneFileSlug = activeTemplatePane === 'tray'
      ? 'tray-card'
      : 'cover-sheet'
    const path = await saveDialog({
      defaultPath: `steam-backup-${activePaneFileSlug}.png`,
      filters: PNG_FILTERS,
    })

    if (!path) {
      announceStatus('Export cancelled.')
      return
    }

    const preflight = buildPreflightSummary({
      caseInsert,
      activeTemplatePane,
      brandingSources,
      dpi,
    })
    const shouldExport = await confirmDialog(
      preflight.message,
      getPreflightConfirmOptions(preflight.hasWarnings),
    )

    if (!shouldExport) {
      announceStatus('Export cancelled after preflight.')
      return
    }

    const result = await exportPngBytes({
      caseInsert,
      activeTemplatePane,
      brandingSources,
      dpi,
    })

    await writeBinaryFileCommand(path, result.bytes)

    announceStatus(
      `Exported ${activePaneConfig.label} ${result.width} × ${result.height}px PNG at ${result.dpi} DPI.`,
    )
  } catch (error) {
    announceStatus(`Export failed: ${String(error)}`)
  }
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
  announceStatus,
}: RunDiscPngExportParams) {
  try {
    const path = await saveDialog({
      defaultPath: 'steam-backup-label.png',
      filters: PNG_FILTERS,
    })

    if (!path) {
      announceStatus('Export cancelled.')
      return
    }

    const preflightSummary = buildPreflightSummary(preflight)
    const shouldExport = await confirmDialog(
      preflightSummary.message,
      getPreflightConfirmOptions(preflightSummary.hasWarnings),
    )

    if (!shouldExport) {
      announceStatus('Export cancelled after preflight.')
      return
    }

    const result = await exportPngBytes({
      ...exportInput,
      previewSize: getPreviewSize(),
    })

    await writeBinaryFileCommand(path, result.bytes)

    announceStatus(
      `Exported ${result.width} × ${result.height}px PNG at ${EXPORT_DPI} DPI.`,
    )
  } catch (error) {
    announceStatus(`Export failed: ${String(error)}`)
  }
}
