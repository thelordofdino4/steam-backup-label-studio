export type ExportGuideMode = 'none' | 'centerHole' | 'outerEdge' | 'printableArea' | 'safeZone' | 'all'
export type ExportGuideKey = 'centerHole' | 'outerEdge' | 'printableArea' | 'safeZone'
export type ExportGuideSelection = Record<ExportGuideKey, boolean>

export const DEFAULT_EXPORT_GUIDES: ExportGuideSelection = {
  centerHole: false,
  outerEdge: false,
  printableArea: false,
  safeZone: false,
}

export function exportGuideModeToSelection(mode: ExportGuideMode = 'none'): ExportGuideSelection {
  switch (mode) {
    case 'centerHole':
      return { ...DEFAULT_EXPORT_GUIDES, centerHole: true }
    case 'outerEdge':
      return { ...DEFAULT_EXPORT_GUIDES, outerEdge: true }
    case 'printableArea':
      return { ...DEFAULT_EXPORT_GUIDES, printableArea: true }
    case 'safeZone':
      return { ...DEFAULT_EXPORT_GUIDES, safeZone: true }
    case 'all':
      return { centerHole: true, outerEdge: true, printableArea: true, safeZone: true }
    default:
      return DEFAULT_EXPORT_GUIDES
  }
}
