import { useEffect, useState, type RefObject } from 'react'
import type { EditorWorkspace } from '../editor/editorTypes'

const DEFAULT_DISC_PREVIEW_SIZE = 640

export function useDiscPreviewSize({
  activeWorkspace,
  discPreviewRef,
}: {
  activeWorkspace: EditorWorkspace
  discPreviewRef: RefObject<HTMLDivElement | null>
}) {
  const [discPreviewSize, setDiscPreviewSize] = useState(DEFAULT_DISC_PREVIEW_SIZE)

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

  return discPreviewSize
}
