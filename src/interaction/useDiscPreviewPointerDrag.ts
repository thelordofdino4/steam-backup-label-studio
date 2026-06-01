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
  clampAdditionalArtworkElementLayoutToSafeZone,
  clampLogoAssetLayoutToSafeZone,
  clampMediaMarkLayoutToSafeZone,
  clampProjectPlatformMarksToSafeZone,
  clampProjectTechnicalMarksToSafeZone,
  clampTitleArtworkLayoutToSafeZone,
  clampRatingBadgeLayoutToSafeZone,
  clampStraightDiscTextLayoutToSafeZone,
} from '../layout/discElementSafeZone'
import {
  getAdditionalArtworkElementImageSize,
  getAdditionalArtworkElementLayout,
  setAdditionalArtworkElementLayout,
  updateAdditionalArtworkElementLayoutPosition,
} from '../project/projectAdditionalArtwork'
import {
  getLogoAssetLayout,
  getLogoAssetSize,
  setLogoAssetLayout,
  updateLogoAssetLayoutPosition,
  type LogoAssetKey,
} from '../project/projectLogoAssets'
import {
  getProjectPlatformMarkAsset,
  markProjectPlatformMarksManual,
  updateMediaMarkLayoutPosition,
  updatePlatformMarkLayoutPosition,
} from '../project/projectMediaMark'
import {
  getProjectTechnicalMarkAsset,
  updateTechnicalMarkLayoutPosition,
} from '../project/projectTechnicalMarks'
import {
  setTitleArtworkLayout,
  updateTitleArtworkLayoutPosition,
} from '../project/projectTitleArtwork'
import {
  getRatingBadgeElementLayout,
  setRatingBadgeElementLayout,
  updateRatingBadgeElementLayoutPosition,
  type RatingBadgeElementKey,
} from '../project/projectRatingBadge'
import type {
  BackgroundImageSize,
  BackgroundOffset,
  PlatformMarkValue,
  ProjectAdditionalArtwork,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTechnicalMarks,
  ProjectTitleArtwork,
  TechnicalMarkValue,
} from '../project/projectTypes'
import type { DiscTemplate } from '../types/template'
import { usePointerDrag } from './usePointerDrag'
import { clampBackgroundOffsetToImageBounds } from '../backgroundImage'

type TextDragState = {
  key: DiscTextKey
} & PercentDragState

type LogoDragState = {
  logoKey: LogoAssetKey
  additionalLogoId?: string
} & PercentDragState

type TitleArtworkDragState = PercentDragState

type AdditionalArtworkDragState = {
  elementId: string
} & PercentDragState

type RatingBadgeDragState = {
  badgeKey: RatingBadgeElementKey
} & PercentDragState

type MediaMarkDragState = PercentDragState

type PlatformMarkDragState = {
  value: PlatformMarkValue
} & PercentDragState

type TechnicalMarkDragState = {
  value: TechnicalMarkValue
} & PercentDragState

type UseDiscPreviewPointerDragOptions = {
  discPreviewRef: RefObject<HTMLDivElement | null>
  selectedDiscTemplate: DiscTemplate
  backgroundImageUrl: string | null
  backgroundImageSize: BackgroundImageSize | null
  backgroundScale: number
  backgroundOffset: BackgroundOffset
  setBackgroundOffset: Dispatch<SetStateAction<BackgroundOffset>>
  discTextLayout: DiscTextLayoutSettings
  setDiscTextLayout: Dispatch<SetStateAction<DiscTextLayoutSettings>>
  projectLogoAssets: ProjectLogoAssets
  setProjectLogoAssets: Dispatch<SetStateAction<ProjectLogoAssets>>
  projectTitleArtwork: ProjectTitleArtwork
  setProjectTitleArtwork: Dispatch<SetStateAction<ProjectTitleArtwork>>
  projectAdditionalArtwork: ProjectAdditionalArtwork
  setProjectAdditionalArtwork: Dispatch<SetStateAction<ProjectAdditionalArtwork>>
  projectRatingBadge: ProjectRatingBadge
  setProjectRatingBadge: Dispatch<SetStateAction<ProjectRatingBadge>>
  projectMediaMark: ProjectMediaMark
  setProjectMediaMark: Dispatch<SetStateAction<ProjectMediaMark>>
  projectPlatformMarks: ProjectPlatformMarks
  setProjectPlatformMarks: Dispatch<SetStateAction<ProjectPlatformMarks>>
  projectTechnicalMarks: ProjectTechnicalMarks
  setProjectTechnicalMarks: Dispatch<SetStateAction<ProjectTechnicalMarks>>
}

export function useDiscPreviewPointerDrag({
  discPreviewRef,
  selectedDiscTemplate,
  backgroundImageUrl,
  backgroundImageSize,
  backgroundScale,
  backgroundOffset,
  setBackgroundOffset,
  discTextLayout,
  setDiscTextLayout,
  projectLogoAssets,
  setProjectLogoAssets,
  projectTitleArtwork,
  setProjectTitleArtwork,
  projectAdditionalArtwork,
  setProjectAdditionalArtwork,
  projectRatingBadge,
  setProjectRatingBadge,
  projectMediaMark,
  setProjectMediaMark,
  projectPlatformMarks,
  setProjectPlatformMarks,
  projectTechnicalMarks,
  setProjectTechnicalMarks,
}: UseDiscPreviewPointerDragOptions) {
  const backgroundPointerDrag = usePointerDrag<PixelDragState, HTMLDivElement>({
    onDragMove: (dragState, event) => {
      const previewRect = discPreviewRef.current?.getBoundingClientRect()
      const nextOffset = getDraggedPixelOffset(dragState, event.clientX, event.clientY)

      setBackgroundOffset(
        previewRect
          ? clampBackgroundOffsetToImageBounds(
              nextOffset,
              backgroundImageSize,
              backgroundScale,
              previewRect.width,
            )
          : nextOffset,
      )
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
          dragState.additionalLogoId,
        )
        const nextLayout = clampLogoAssetLayoutToSafeZone(
          getLogoAssetLayout(
            nextLogoAssets,
            dragState.logoKey,
            dragState.additionalLogoId,
          ),
          selectedDiscTemplate,
          getLogoAssetSize(
            nextLogoAssets,
            dragState.logoKey,
            dragState.additionalLogoId,
          ),
        )

        return setLogoAssetLayout(
          nextLogoAssets,
          dragState.logoKey,
          nextLayout,
          dragState.additionalLogoId,
        )
      })
    },
  })

  const titleArtworkPointerDrag = usePointerDrag<TitleArtworkDragState>({
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

      setProjectTitleArtwork((currentTitleArtwork) => {
        const nextTitleArtwork = updateTitleArtworkLayoutPosition(
          currentTitleArtwork,
          draggedPoint,
        )
        const nextLayout = clampTitleArtworkLayoutToSafeZone(
          nextTitleArtwork.layout,
          selectedDiscTemplate,
          nextTitleArtwork.imageSize,
        )

        return setTitleArtworkLayout(nextTitleArtwork, nextLayout)
      })
    },
  })

  const additionalArtworkPointerDrag = usePointerDrag<AdditionalArtworkDragState>({
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

      setProjectAdditionalArtwork((currentAdditionalArtwork) => {
        const nextAdditionalArtwork = updateAdditionalArtworkElementLayoutPosition(
          currentAdditionalArtwork,
          dragState.elementId,
          draggedPoint,
        )
        const nextLayout = clampAdditionalArtworkElementLayoutToSafeZone(
          getAdditionalArtworkElementLayout(nextAdditionalArtwork, dragState.elementId),
          selectedDiscTemplate,
          getAdditionalArtworkElementImageSize(
            nextAdditionalArtwork,
            dragState.elementId,
          ),
        )

        return setAdditionalArtworkElementLayout(
          nextAdditionalArtwork,
          dragState.elementId,
          nextLayout,
        )
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
        const nextBadge = updateRatingBadgeElementLayoutPosition(
          currentBadge,
          dragState.badgeKey,
          draggedPoint,
        )
        const nextLayout = dragState.badgeKey === 'primary'
          ? clampRatingBadgeLayoutToSafeZone(nextBadge, selectedDiscTemplate)
          : clampRatingBadgeLayoutToSafeZone(
              {
                source: 'placeholder',
                customImageSize: null,
                layout: nextBadge.uskBadge.layout,
              },
              selectedDiscTemplate,
            )

        return setRatingBadgeElementLayout(
          nextBadge,
          dragState.badgeKey,
          nextLayout,
        )
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

        return markProjectPlatformMarksManual(
          clampProjectPlatformMarksToSafeZone(nextMarks, selectedDiscTemplate),
        )
      })
    },
  })

  const technicalMarkPointerDrag = usePointerDrag<TechnicalMarkDragState>({
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

      setProjectTechnicalMarks((currentMarks) => {
        const nextMarks = updateTechnicalMarkLayoutPosition(
          currentMarks,
          dragState.value,
          draggedPoint,
        )

        return clampProjectTechnicalMarksToSafeZone(nextMarks, selectedDiscTemplate)
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
    (
      event: PointerEvent<Element>,
      logoKey: LogoAssetKey,
      additionalLogoId?: string,
    ) => {
      const layout = getLogoAssetLayout(projectLogoAssets, logoKey, additionalLogoId)

      logoAssetPointerDrag.beginPointerDrag(event, {
        logoKey,
        additionalLogoId,
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

  const handleTitleArtworkPointerDown = useCallback(
    (event: PointerEvent<Element>) => {
      titleArtworkPointerDrag.beginPointerDrag(
        event,
        createPercentDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          projectTitleArtwork.layout.x,
          projectTitleArtwork.layout.y,
        ),
      )
    },
    [
      projectTitleArtwork.layout.x,
      projectTitleArtwork.layout.y,
      titleArtworkPointerDrag,
    ],
  )

  const handleAdditionalArtworkPointerDown = useCallback(
    (event: PointerEvent<Element>, elementId: string) => {
      const layout = getAdditionalArtworkElementLayout(
        projectAdditionalArtwork,
        elementId,
      )

      additionalArtworkPointerDrag.beginPointerDrag(event, {
        elementId,
        ...createPercentDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          layout.x,
          layout.y,
        ),
      })
    },
    [additionalArtworkPointerDrag, projectAdditionalArtwork],
  )

  const handleRatingBadgePointerDown = useCallback(
    (event: PointerEvent<Element>, badgeKey: RatingBadgeElementKey = 'primary') => {
      const layout = getRatingBadgeElementLayout(projectRatingBadge, badgeKey)

      ratingBadgePointerDrag.beginPointerDrag(
        event,
        {
          badgeKey,
          ...createPercentDragState(
            event.pointerId,
            event.clientX,
            event.clientY,
            layout.x,
            layout.y,
          ),
        },
      )
    },
    [projectRatingBadge, ratingBadgePointerDrag],
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

  const handleTechnicalMarkPointerDown = useCallback(
    (event: PointerEvent<Element>, value: TechnicalMarkValue) => {
      const asset = getProjectTechnicalMarkAsset(projectTechnicalMarks, value)

      technicalMarkPointerDrag.beginPointerDrag(event, {
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
    [projectTechnicalMarks, technicalMarkPointerDrag],
  )

  const cancelPreviewPointerDrag = useCallback(() => {
    backgroundPointerDrag.cancelPointerDrag()
    discTextPointerDrag.cancelPointerDrag()
    logoAssetPointerDrag.cancelPointerDrag()
    titleArtworkPointerDrag.cancelPointerDrag()
    additionalArtworkPointerDrag.cancelPointerDrag()
    ratingBadgePointerDrag.cancelPointerDrag()
    mediaMarkPointerDrag.cancelPointerDrag()
    platformMarkPointerDrag.cancelPointerDrag()
    technicalMarkPointerDrag.cancelPointerDrag()
  }, [
    backgroundPointerDrag,
    additionalArtworkPointerDrag,
    discTextPointerDrag,
    logoAssetPointerDrag,
    mediaMarkPointerDrag,
    platformMarkPointerDrag,
    ratingBadgePointerDrag,
    technicalMarkPointerDrag,
    titleArtworkPointerDrag,
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
    handleTitleArtworkPointerDown,
    handleTitleArtworkPointerMove: titleArtworkPointerDrag.handlePointerMove,
    handleTitleArtworkPointerUp: titleArtworkPointerDrag.endPointerDrag,
    handleAdditionalArtworkPointerDown,
    handleAdditionalArtworkPointerMove: additionalArtworkPointerDrag.handlePointerMove,
    handleAdditionalArtworkPointerUp: additionalArtworkPointerDrag.endPointerDrag,
    handleRatingBadgePointerDown,
    handleRatingBadgePointerMove: ratingBadgePointerDrag.handlePointerMove,
    handleRatingBadgePointerUp: ratingBadgePointerDrag.endPointerDrag,
    handleMediaMarkPointerDown,
    handleMediaMarkPointerMove: mediaMarkPointerDrag.handlePointerMove,
    handleMediaMarkPointerUp: mediaMarkPointerDrag.endPointerDrag,
    handlePlatformMarkPointerDown,
    handlePlatformMarkPointerMove: platformMarkPointerDrag.handlePointerMove,
    handlePlatformMarkPointerUp: platformMarkPointerDrag.endPointerDrag,
    handleTechnicalMarkPointerDown,
    handleTechnicalMarkPointerMove: technicalMarkPointerDrag.handlePointerMove,
    handleTechnicalMarkPointerUp: technicalMarkPointerDrag.endPointerDrag,
  }
}
