import { useEffect, type RefObject } from 'react'
import type { EditorWorkspace } from '../editor/editorTypes'

export function useDiscPreviewSize({
  activeWorkspace,
  discPreviewRef,
  setDiscPreviewSize,
}: {
  activeWorkspace: EditorWorkspace
  discPreviewRef: RefObject<HTMLDivElement | null>
  setDiscPreviewSize: (size: number) => void
}) {
  useEffect(() => {
    if (activeWorkspace !== 'disc') {
      return
    }

    const previewElement = discPreviewRef.current

    if (!previewElement) {
      return
    }

    const updatePreviewSize = () => {
      const nextSize = previewElement.getBoundingClientRect().width

      if (Number.isFinite(nextSize) && nextSize > 0) {
        setDiscPreviewSize(nextSize)
      }
    }

    updatePreviewSize()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const resizeObserver = new ResizeObserver(updatePreviewSize)
    resizeObserver.observe(previewElement)

    return () => resizeObserver.disconnect()
  }, [activeWorkspace, discPreviewRef, setDiscPreviewSize])
}
