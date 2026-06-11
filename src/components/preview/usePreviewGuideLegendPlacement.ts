import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'

const DEFAULT_CLOSED_GUIDE_LEGEND_SIZE = 40
const MIN_CLOSED_GUIDE_LEGEND_SIZE = 28

function rectsIntersect(
  first: DOMRectReadOnly,
  second: {
    bottom: number
    left: number
    right: number
    top: number
  },
) {
  return !(
    second.left >= first.right ||
    second.right <= first.left ||
    second.top >= first.bottom ||
    second.bottom <= first.top
  )
}

export function usePreviewGuideLegendPlacement({
  isOpen,
  previewRef,
}: {
  isOpen: boolean
  previewRef: RefObject<HTMLElement | null>
}) {
  const previewAreaRef = useRef<HTMLElement | null>(null)
  const [closedSize, setClosedSize] = useState(
    DEFAULT_CLOSED_GUIDE_LEGEND_SIZE,
  )

  const updatePlacement = useCallback(() => {
    if (isOpen) {
      setClosedSize(DEFAULT_CLOSED_GUIDE_LEGEND_SIZE)
      return
    }

    const previewArea = previewAreaRef.current
    const preview = previewRef.current

    if (!previewArea || !preview) {
      return
    }

    const areaRect = previewArea.getBoundingClientRect()
    const previewRect = preview.getBoundingClientRect()
    const bottomRightCandidate = {
      left: areaRect.right - DEFAULT_CLOSED_GUIDE_LEGEND_SIZE,
      right: areaRect.right,
      top: areaRect.bottom - DEFAULT_CLOSED_GUIDE_LEGEND_SIZE,
      bottom: areaRect.bottom,
    }

    if (!rectsIntersect(previewRect, bottomRightCandidate)) {
      setClosedSize(DEFAULT_CLOSED_GUIDE_LEGEND_SIZE)
      return
    }

    const availableRight = Math.max(0, areaRect.right - previewRect.right)
    const availableBottom = Math.max(0, areaRect.bottom - previewRect.bottom)
    const availableSize = Math.max(availableRight, availableBottom)

    setClosedSize(Math.max(
      MIN_CLOSED_GUIDE_LEGEND_SIZE,
      Math.min(DEFAULT_CLOSED_GUIDE_LEGEND_SIZE, Math.floor(availableSize)),
    ))
  }, [isOpen, previewRef])

  useLayoutEffect(() => {
    const frameId = window.requestAnimationFrame(updatePlacement)

    const previewArea = previewAreaRef.current
    const preview = previewRef.current

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updatePlacement)
      return () => {
        window.cancelAnimationFrame(frameId)
        window.removeEventListener('resize', updatePlacement)
      }
    }

    const observer = new ResizeObserver(updatePlacement)

    if (previewArea) {
      observer.observe(previewArea)
    }

    if (preview) {
      observer.observe(preview)
    }

    window.addEventListener('resize', updatePlacement)

    return () => {
      window.cancelAnimationFrame(frameId)
      observer.disconnect()
      window.removeEventListener('resize', updatePlacement)
    }
  }, [previewRef, updatePlacement])

  return {
    guideLegendClosedSize: closedSize,
    previewAreaRef,
  }
}
