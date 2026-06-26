import { useState } from 'react'
import {
  DEFAULT_EXPORT_GUIDES,
  setExportGuideSelection,
  type ExportGuideKey,
  type ExportGuideSelection,
} from '../export/exportGuides'

export function useDiscExportGuides() {
  const [exportGuides, setExportGuides] = useState<ExportGuideSelection>(
    DEFAULT_EXPORT_GUIDES,
  )

  function resetExportGuides() {
    setExportGuides(DEFAULT_EXPORT_GUIDES)
  }

  function restoreExportGuides(restoredExportGuides: ExportGuideSelection) {
    setExportGuides(restoredExportGuides)
  }

  function handleExportGuideToggle(guide: ExportGuideKey, checked: boolean) {
    setExportGuides((currentGuides) =>
      setExportGuideSelection(currentGuides, guide, checked),
    )
  }

  return {
    exportGuides,
    resetExportGuides,
    restoreExportGuides,
    handleExportGuideToggle,
  }
}
