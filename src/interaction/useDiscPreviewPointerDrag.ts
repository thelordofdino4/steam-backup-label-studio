import { useCallback, type Dispatch, type PointerEvent, type RefObject, type SetStateAction } from 'react'
import {
  isCurvedCopyrightDiscTextLayout,
  updateDraggedDiscTextLayoutPosition,
  type DiscTextKey,
  type DiscTextLayoutSettings,
} from '../discText'
import {
  createPercentDragState,
  createPixelDragState,
  getDraggedPercentPoint,
  getDraggedPixelOffset,
  type PercentDragState,
  type PixelDragState,
} from './dragGeometry'
import {
  clampLogoAssetLayoutToSafeZone,
  clampMediaMarkLayoutToSafeZone,
  clampProjectPlatformMarksToSafeZone,
  clampRatingBadgeLayoutToSafeZone,
  clampStraightDiscTextLayoutToSafeZone,
} from '../layout/discElementSafeZone'
import {
  getLogoAssetLayout,
  getLogoAssetSize,
  setLogoAssetLayout,
  updateLogoAssetLayoutPosition,
  type LogoAssetKey,
} from '../project/projectLogoAssets'
import {
  getProjectPlatformMarkAsset,
  updateMediaMarkLayoutPosition,
  updatePlatformMarkLayoutPosition,
} from '../project/projectMediaMark'
import { updateRatingBadgeLayoutPosition } from '../project/projectRatingBadge'
import type {
  BackgroundOffset,
  PlatformMarkValue,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectPlatformMarks,
  ProjectRatingBadge,
} from '../project/projectTypes'
import type { DiscTemplate } from '../types/template'
import { usePointerDrag } from './usePointerDrag'

type TextDragState = {
  key: DiscTextKey
} & PercentDragState

type LogoDragState = {
  logoKey: LogoAssetKey
} & PercentDragState

type RatingBadgeDragState = PercentDragState

type MediaMarkDragState = PercentDragState

type PlatformMarkDragState = {
  value: PlatformMarkValue
} & PercentDragState

type UseDiscPreviewPointerDragOptions = {
  discPreviewRef: RefObject<HTMLDivElement | null>
  selectedDiscTemplate: DiscTemplate
  backgroundImageUrl: string | null
  backgroundOffset: BackgroundOffset
  setBackgroundOffset: Dispatch<SetStateAction<BackgroundOffset>>
  discTextLayout: DiscTextLayoutSettings
  setDiscTextLayout: Dispatch<SetStateAction<DiscTextLayoutSettings>>
  projectLogoAssets: ProjectLogoAssets
  setProjectLogoAssets: Dispatch<SetStateAction<ProjectLogoAssets>>
  projectRatingBadge: ProjectRatingBadge
  setProjectRatingBadge: Dispatch<SetStateAction<ProjectRatingBadge>>
  projectMediaMark: ProjectMediaMark
  setProjectMediaMark: Dispatch<SetStateAction<ProjectMediaMark>>
  projectPlatformMarks: ProjectPlatformMarks
  setProjectPlatformMarks: Dispatch<SetStateAction<ProjectPlatformMarks>>
}

export function useDiscPreviewPointerDrag({
  discPreviewRef,
  selectedDiscTemplate,
  backgroundImageUrl,
  backgroundOffset,
  setBackgroundOffset,
  discTextLayout,
  setDiscTextLayout,
  projectLogoAssets,
  setProjectLogoAssets,
  projectRatingBadge,
  setProjectRatingBadge,
  projectMediaMark,
  setProjectMediaMark,
  projectPlatformMarks,
  setProjectPlatformMarks,
}: UseDiscPreviewPointerDragOptions) {
  const backgroundPointerDrag = usePointerDrag<PixelDragState, HTMLDivElement>({
    onDragMove: (dragState, event) => {
      setBackgroundOffset(getDraggedPixelOffset(dragState, event.clientX, event.clientY))
    },
  })

  const discTextPointerDrag = usePointerDrag<TextDragState>({
    stopPropagation: true,
    onDragMove: (dragState, event) => {
      const previewRect = discPreviewRef.current?.getBoundingClientRect()

      if (!previewRect) {
        return
      }

      const draggedPoint = getDraggedPercentPoint(
        dragState,
        event.clientX,
        event.clientY,
        previewRect,
      )

      setDiscTextLayout((currentLayout) => {
        const nextLayout = updateDraggedDiscTextLayoutPosition(
          currentLayout,
          dragState.key,
          draggedPoint,
        )
        const nextTextLayout = nextLayout[dragState.key]

        return {
          ...nextLayout,
          [dragState.key]: isCurvedCopyrightDiscTextLayout(
            dragState.key,
            currentLayout[dragState.key],
          )
            ? nextTextLayout
            : clampStraightDiscTextLayoutToSafeZone(
                dragState.key,
                nextTextLayout,
                selectedDiscTemplate,
              ),
        }
      })
    },
  })

  const logoAssetPointerDrag = usePointerDrag<LogoDragState>({
    stopPropagation: true,
    onDragMove: (dragState, event) => {
      const previewRect = discPreviewRef.current?.getBoundingClientRect()

      if (!previewRect) {
        return
      }

      const draggedPoint = getDraggedPercentPoint(
        dragState,
        event.clientX,
        event.clientY,
        previewRect,
      )

      setProjectLogoAssets((currentLogoAssets) => {
        const nextLogoAssets = updateLogoAssetLayoutPosition(
          currentLogoAssets,
          dragState.logoKey,
          draggedPoint,
        )
        const nextLayout = clampLogoAssetLayoutToSafeZone(
          getLogoAssetLayout(nextLogoAssets, dragState.logoKey),
          selectedDiscTemplate,
          getLogoAssetSize(nextLogoAssets, dragState.logoKey),
        )

        return setLogoAssetLayout(nextLogoAssets, dragState.logoKey, nextLayout)
      })
    },
  })

  const ratingBadgePointerDrag = usePointerDrag<RatingBadgeDragState>({
    stopPropagation: true,
    onDragMove: (dragState, event) => {
      const previewRect = discPreviewRef.current?.getBoundingClientRect()

      if (!previewRect) {
        return
      }

      const draggedPoint = getDraggedPercentPoint(
        dragState,
        event.clientX,
        event.clientY,
        previewRect,
      )

      setProjectRatingBadge((currentBadge) => {
        const nextBadge = updateRatingBadgeLayoutPosition(currentBadge, draggedPoint)

        return {
          ...nextBadge,
          layout: clampRatingBadgeLayoutToSafeZone(nextBadge, selectedDiscTemplate),
        }
      })
    },
  })

  const mediaMarkPointerDrag = usePointerDrag<MediaMarkDragState>({
    stopPropagation: true,
    onDragMove: (dragState, event) => {
      const previewRect = discPreviewRef.current?.getBoundingClientRect()

      if (!previewRect) {
        return
      }

      const draggedPoint = getDraggedPercentPoint(
        dragState,
        event.clientX,
        event.clientY,
        previewRect,
      )

      setProjectMediaMark((currentMark) => {
        const nextMark = updateMediaMarkLayoutPosition(currentMark, draggedPoint)

        return {
          ...nextMark,
          layout: clampMediaMarkLayoutToSafeZone(nextMark, selectedDiscTemplate),
        }
      })
    },
  })

  const platformMarkPointerDrag = usePointerDrag<PlatformMarkDragState>({
    stopPropagation: true,
    onDragMove: (dragState, event) => {
      const previewRect = discPreviewRef.current?.getBoundingClientRect()

      if (!previewRect) {
        return
      }

      const draggedPoint = getDraggedPercentPoint(
        dragState,
        event.clientX,
        event.clientY,
        previewRect,
      )

      setProjectPlatformMarks((currentMarks) => {
        const nextMarks = updatePlatformMarkLayoutPosition(
          currentMarks,
          dragState.value,
          draggedPoint,
        )

        return clampProjectPlatformMarksToSafeZone(nextMarks, selectedDiscTemplate)
      })
    },
  })

  const handleBackgroundPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!backgroundImageUrl) {
        return
      }

      backgroundPointerDrag.beginPointerDrag(
        event,
        createPixelDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          backgroundOffset,
        ),
      )
    },
    [backgroundImageUrl, backgroundOffset, backgroundPointerDrag],
  )

  const handleDiscTextPointerDown = useCallback(
    (event: PointerEvent<Element>, key: DiscTextKey) => {
      discTextPointerDrag.beginPointerDrag(event, {
        key,
        ...createPercentDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          discTextLayout[key].x,
          discTextLayout[key].y,
        ),
      })
    },
    [discTextLayout, discTextPointerDrag],
  )

  const handleLogoAssetPointerDown = useCallback(
    (event: PointerEvent<Element>, logoKey: LogoAssetKey) => {
      const layout = getLogoAssetLayout(projectLogoAssets, logoKey)

      logoAssetPointerDrag.beginPointerDrag(event, {
        logoKey,
        ...createPercentDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          layout.x,
          layout.y,
        ),
      })
    },
    [logoAssetPointerDrag, projectLogoAssets],
  )

  const handleRatingBadgePointerDown = useCallback(
    (event: PointerEvent<Element>) => {
      ratingBadgePointerDrag.beginPointerDrag(
        event,
        createPercentDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          projectRatingBadge.layout.x,
          projectRatingBadge.layout.y,
        ),
      )
    },
    [projectRatingBadge.layout.x, projectRatingBadge.layout.y, ratingBadgePointerDrag],
  )

  const handleMediaMarkPointerDown = useCallback(
    (event: PointerEvent<Element>) => {
      mediaMarkPointerDrag.beginPointerDrag(
        event,
        createPercentDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          projectMediaMark.layout.x,
          projectMediaMark.layout.y,
        ),
      )
    },
    [mediaMarkPointerDrag, projectMediaMark.layout.x, projectMediaMark.layout.y],
  )

  const handlePlatformMarkPointerDown = useCallback(
    (event: PointerEvent<Element>, value: PlatformMarkValue) => {
      const asset = getProjectPlatformMarkAsset(projectPlatformMarks, value)

      platformMarkPointerDrag.beginPointerDrag(event, {
        value,
        ...createPercentDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          asset.layout.x,
          asset.layout.y,
        ),
      })
    },
    [platformMarkPointerDrag, projectPlatformMarks],
  )

  const cancelPreviewPointerDrag = useCallback(() => {
    backgroundPointerDrag.cancelPointerDrag()
    discTextPointerDrag.cancelPointerDrag()
    logoAssetPointerDrag.cancelPointerDrag()
    ratingBadgePointerDrag.cancelPointerDrag()
    mediaMarkPointerDrag.cancelPointerDrag()
    platformMarkPointerDrag.cancelPointerDrag()
  }, [
    backgroundPointerDrag,
    discTextPointerDrag,
    logoAssetPointerDrag,
    mediaMarkPointerDrag,
    platformMarkPointerDrag,
    ratingBadgePointerDrag,
  ])

  return {
    cancelPreviewPointerDrag,
    handleBackgroundPointerDown,
    handleBackgroundPointerMove: backgroundPointerDrag.handlePointerMove,
    handleBackgroundPointerUp: backgroundPointerDrag.endPointerDrag,
    handleDiscTextPointerDown,
    handleDiscTextPointerMove: discTextPointerDrag.handlePointerMove,
    handleDiscTextPointerUp: discTextPointerDrag.endPointerDrag,
    handleLogoAssetPointerDown,
    handleLogoAssetPointerMove: logoAssetPointerDrag.handlePointerMove,
    handleLogoAssetPointerUp: logoAssetPointerDrag.endPointerDrag,
    handleRatingBadgePointerDown,
    handleRatingBadgePointerMove: ratingBadgePointerDrag.handlePointerMove,
    handleRatingBadgePointerUp: ratingBadgePointerDrag.endPointerDrag,
    handleMediaMarkPointerDown,
    handleMediaMarkPointerMove: mediaMarkPointerDrag.handlePointerMove,
    handleMediaMarkPointerUp: mediaMarkPointerDrag.endPointerDrag,
    handlePlatformMarkPointerDown,
    handlePlatformMarkPointerMove: platformMarkPointerDrag.handlePointerMove,
    handlePlatformMarkPointerUp: platformMarkPointerDrag.endPointerDrag,
  }
}
