import { useRef, type RefObject } from 'react'

const DEFAULT_CLOSED_GUIDE_LEGEND_SIZE = 40

export function usePreviewGuideLegendPlacement(_options: {
  closedButtonCount?: number
  isOpen: boolean
  previewRef: RefObject<HTMLElement | null>
}) {
  const previewAreaRef = useRef<HTMLElement | null>(null)
  void _options

  return {
    guideLegendClosedSize: DEFAULT_CLOSED_GUIDE_LEGEND_SIZE,
    previewAreaRef,
  }
}
