import { useCallback, type Dispatch, type PointerEvent, type RefObject, type SetStateAction } from 'react'
import {
  isCurvedCopyrightDiscTextLayout,
  updateDraggedDiscTextLayoutPosition,
  type DiscTextKey,
  type DiscTextLayoutSettings,
} from '../discText/index'
import {
  createElementPercentDragState,
  createPercentDragState,
  createPixelDragState,
  type DragPoint,
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
  updateMediaMarkLayoutPosition,
} from '../project/projectMediaMark'
import {
  getProjectPlatformMarkAsset,
  markProjectPlatformMarksManual,
  updatePlatformMarkLayoutPosition,
} from '../project/projectPlatformMarks'
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
  ProjectMetadata,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTechnicalMarks,
  ProjectTitleArtwork,
  TechnicalMarkValue,
} from '../project/projectTypes'
import type { DiscTemplate } from '../types/template'
import {
  usePercentPointerDrag,
  usePixelPointerDrag,
} from './usePointerDragAdapters'
import { clampBackgroundOffsetToImageBounds } from '../image/backgroundImage'

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
  assetId?: string | null
} & PercentDragState

type StateBinding<TValue> = {
  value: TValue
  setValue: Dispatch<SetStateAction<TValue>>
}

type UseDiscPreviewPointerDragOptions = {
  preview: {
    discPreviewRef: RefObject<HTMLDivElement | null>
    selectedDiscTemplate: DiscTemplate
  }
  background: {
    imageUrl: string | null
    imageSize: BackgroundImageSize | null
    scale: number
    offset: BackgroundOffset
    setOffset: Dispatch<SetStateAction<BackgroundOffset>>
  }
  discText: {
    layout: DiscTextLayoutSettings
    setLayout: Dispatch<SetStateAction<DiscTextLayoutSettings>>
  }
  logoAssets: StateBinding<ProjectLogoAssets>
  titleArtwork: StateBinding<ProjectTitleArtwork>
  additionalArtwork: StateBinding<ProjectAdditionalArtwork>
  ratingBadge: StateBinding<ProjectRatingBadge> & {
    projectMetadata: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'>
  }
  mediaMark: StateBinding<ProjectMediaMark>
  platformMarks: StateBinding<ProjectPlatformMarks>
  technicalMarks: StateBinding<ProjectTechnicalMarks>
}

function useDiscPreviewPercentDrag<TDragState extends PercentDragState>(
  discPreviewRef: RefObject<HTMLDivElement | null>,
  onDraggedPoint: (dragState: TDragState, draggedPoint: DragPoint) => void,
) {
  return usePercentPointerDrag<TDragState>({
    stopPropagation: true,
    getBounds: () => discPreviewRef.current?.getBoundingClientRect(),
    onDraggedPoint,
  })
}

export function useDiscPreviewPointerDrag({
  preview,
  background,
  discText,
  logoAssets,
  titleArtwork,
  additionalArtwork,
  ratingBadge,
  mediaMark,
  platformMarks,
  technicalMarks,
}: UseDiscPreviewPointerDragOptions) {
  const { discPreviewRef, selectedDiscTemplate } = preview
  const backgroundPointerDrag = usePixelPointerDrag<
    PixelDragState,
    HTMLDivElement
  >({
    onDraggedOffset: (_dragState, nextOffset) => {
      const previewRect = discPreviewRef.current?.getBoundingClientRect()

      background.setOffset(
        previewRect
          ? clampBackgroundOffsetToImageBounds(
              nextOffset,
              background.imageSize,
              background.scale,
              previewRect.width,
            )
          : nextOffset,
      )
    },
  })

  const discTextPointerDrag = useDiscPreviewPercentDrag<TextDragState>(
    discPreviewRef,
    (dragState, draggedPoint) => {
      discText.setLayout((currentLayout) => {
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
  )

  const logoAssetPointerDrag = useDiscPreviewPercentDrag<LogoDragState>(
    discPreviewRef,
    (dragState, draggedPoint) => {
      logoAssets.setValue((currentLogoAssets) => {
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
  )

  const titleArtworkPointerDrag = useDiscPreviewPercentDrag<TitleArtworkDragState>(
    discPreviewRef,
    (_dragState, draggedPoint) => {
      titleArtwork.setValue((currentTitleArtwork) => {
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
  )

  const additionalArtworkPointerDrag =
    useDiscPreviewPercentDrag<AdditionalArtworkDragState>(
      discPreviewRef,
      (dragState, draggedPoint) => {
        additionalArtwork.setValue((currentAdditionalArtwork) => {
          const nextAdditionalArtwork = updateAdditionalArtworkElementLayoutPosition(
            currentAdditionalArtwork,
            dragState.elementId,
            draggedPoint,
          )
          const nextLayout = clampAdditionalArtworkElementLayoutToSafeZone(
            getAdditionalArtworkElementLayout(
              nextAdditionalArtwork,
              dragState.elementId,
            ),
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
    )

  const ratingBadgePointerDrag = useDiscPreviewPercentDrag<RatingBadgeDragState>(
    discPreviewRef,
    (dragState, draggedPoint) => {
      ratingBadge.setValue((currentBadge) => {
        const nextBadge = updateRatingBadgeElementLayoutPosition(
          currentBadge,
          dragState.badgeKey,
          draggedPoint,
        )
        const nextLayout = dragState.badgeKey === 'primary'
          ? clampRatingBadgeLayoutToSafeZone(
              {
                ...nextBadge,
                metadata: ratingBadge.projectMetadata,
              },
              selectedDiscTemplate,
            )
          : clampRatingBadgeLayoutToSafeZone(
              {
                source: 'placeholder',
                customImageSize: null,
                layout: nextBadge.uskBadge.layout,
                metadata: {
                  ratingSystem: 'USK',
                  ratingValue: nextBadge.uskBadge.ratingValue,
                },
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
  )

  const mediaMarkPointerDrag = useDiscPreviewPercentDrag<MediaMarkDragState>(
    discPreviewRef,
    (_dragState, draggedPoint) => {
      mediaMark.setValue((currentMark) => {
        const nextMark = updateMediaMarkLayoutPosition(currentMark, draggedPoint)

        return {
          ...nextMark,
          layout: clampMediaMarkLayoutToSafeZone(nextMark, selectedDiscTemplate),
        }
      })
    },
  )

  const platformMarkPointerDrag = useDiscPreviewPercentDrag<PlatformMarkDragState>(
    discPreviewRef,
    (dragState, draggedPoint) => {
      platformMarks.setValue((currentMarks) => {
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
  )

  const technicalMarkPointerDrag =
    useDiscPreviewPercentDrag<TechnicalMarkDragState>(
      discPreviewRef,
      (dragState, draggedPoint) => {
        technicalMarks.setValue((currentMarks) => {
          const nextMarks = updateTechnicalMarkLayoutPosition(
            currentMarks,
            dragState.value,
            draggedPoint,
            dragState.assetId,
          )

          return clampProjectTechnicalMarksToSafeZone(nextMarks, selectedDiscTemplate)
        })
      },
    )

  const handleBackgroundPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!background.imageUrl) {
        return
      }

      backgroundPointerDrag.beginPointerDrag(
        event,
        createPixelDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          background.offset,
        ),
      )
    },
    [background.imageUrl, background.offset, backgroundPointerDrag],
  )

  const handleDiscTextPointerDown = useCallback(
    (event: PointerEvent<Element>, key: DiscTextKey) => {
      discTextPointerDrag.beginPointerDrag(
        event,
        createElementPercentDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          discText.layout[key].x,
          discText.layout[key].y,
          { key },
        ),
      )
    },
    [discText.layout, discTextPointerDrag],
  )

  const handleLogoAssetPointerDown = useCallback(
    (
      event: PointerEvent<Element>,
      logoKey: LogoAssetKey,
      additionalLogoId?: string,
    ) => {
      const layout = getLogoAssetLayout(logoAssets.value, logoKey, additionalLogoId)

      logoAssetPointerDrag.beginPointerDrag(
        event,
        createElementPercentDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          layout.x,
          layout.y,
          { logoKey, additionalLogoId },
        ),
      )
    },
    [logoAssetPointerDrag, logoAssets.value],
  )

  const handleTitleArtworkPointerDown = useCallback(
    (event: PointerEvent<Element>) => {
      titleArtworkPointerDrag.beginPointerDrag(
        event,
        createPercentDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          titleArtwork.value.layout.x,
          titleArtwork.value.layout.y,
        ),
      )
    },
    [
      titleArtwork.value.layout.x,
      titleArtwork.value.layout.y,
      titleArtworkPointerDrag,
    ],
  )

  const handleAdditionalArtworkPointerDown = useCallback(
    (event: PointerEvent<Element>, elementId: string) => {
      const layout = getAdditionalArtworkElementLayout(
        additionalArtwork.value,
        elementId,
      )

      additionalArtworkPointerDrag.beginPointerDrag(
        event,
        createElementPercentDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          layout.x,
          layout.y,
          { elementId },
        ),
      )
    },
    [additionalArtworkPointerDrag, additionalArtwork.value],
  )

  const handleRatingBadgePointerDown = useCallback(
    (event: PointerEvent<Element>, badgeKey: RatingBadgeElementKey = 'primary') => {
      const layout = getRatingBadgeElementLayout(ratingBadge.value, badgeKey)

      ratingBadgePointerDrag.beginPointerDrag(
        event,
        createElementPercentDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          layout.x,
          layout.y,
          { badgeKey },
        ),
      )
    },
    [ratingBadge.value, ratingBadgePointerDrag],
  )

  const handleMediaMarkPointerDown = useCallback(
    (event: PointerEvent<Element>) => {
      mediaMarkPointerDrag.beginPointerDrag(
        event,
        createPercentDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          mediaMark.value.layout.x,
          mediaMark.value.layout.y,
        ),
      )
    },
    [mediaMarkPointerDrag, mediaMark.value.layout.x, mediaMark.value.layout.y],
  )

  const handlePlatformMarkPointerDown = useCallback(
    (event: PointerEvent<Element>, value: PlatformMarkValue) => {
      const asset = getProjectPlatformMarkAsset(platformMarks.value, value)

      platformMarkPointerDrag.beginPointerDrag(
        event,
        createElementPercentDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          asset.layout.x,
          asset.layout.y,
          { value },
        ),
      )
    },
    [platformMarkPointerDrag, platformMarks.value],
  )

  const handleTechnicalMarkPointerDown = useCallback(
    (
      event: PointerEvent<Element>,
      value: TechnicalMarkValue,
      assetId?: string | null,
    ) => {
      const asset = getProjectTechnicalMarkAsset(
        technicalMarks.value,
        value,
        undefined,
        assetId,
      )

      technicalMarkPointerDrag.beginPointerDrag(
        event,
        createElementPercentDragState(
          event.pointerId,
          event.clientX,
          event.clientY,
          asset.layout.x,
          asset.layout.y,
          { value, assetId },
        ),
      )
    },
    [technicalMarks.value, technicalMarkPointerDrag],
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
    previewPointerHandlers: {
      background: {
        handleBackgroundPointerDown,
        handleBackgroundPointerMove: backgroundPointerDrag.handlePointerMove,
        handleBackgroundPointerUp: backgroundPointerDrag.endPointerDrag,
      },
      discText: {
        handleDiscTextPointerDown,
        handleDiscTextPointerMove: discTextPointerDrag.handlePointerMove,
        handleDiscTextPointerUp: discTextPointerDrag.endPointerDrag,
      },
      logoAssets: {
        handleLogoAssetPointerDown,
        handleLogoAssetPointerMove: logoAssetPointerDrag.handlePointerMove,
        handleLogoAssetPointerUp: logoAssetPointerDrag.endPointerDrag,
      },
      titleArtwork: {
        handleTitleArtworkPointerDown,
        handleTitleArtworkPointerMove: titleArtworkPointerDrag.handlePointerMove,
        handleTitleArtworkPointerUp: titleArtworkPointerDrag.endPointerDrag,
      },
      additionalArtwork: {
        handleAdditionalArtworkPointerDown,
        handleAdditionalArtworkPointerMove: additionalArtworkPointerDrag.handlePointerMove,
        handleAdditionalArtworkPointerUp: additionalArtworkPointerDrag.endPointerDrag,
      },
      ratingBadge: {
        handleRatingBadgePointerDown,
        handleRatingBadgePointerMove: ratingBadgePointerDrag.handlePointerMove,
        handleRatingBadgePointerUp: ratingBadgePointerDrag.endPointerDrag,
      },
      mediaMark: {
        handleMediaMarkPointerDown,
        handleMediaMarkPointerMove: mediaMarkPointerDrag.handlePointerMove,
        handleMediaMarkPointerUp: mediaMarkPointerDrag.endPointerDrag,
      },
      platformMarks: {
        handlePlatformMarkPointerDown,
        handlePlatformMarkPointerMove: platformMarkPointerDrag.handlePointerMove,
        handlePlatformMarkPointerUp: platformMarkPointerDrag.endPointerDrag,
      },
      technicalMarks: {
        handleTechnicalMarkPointerDown,
        handleTechnicalMarkPointerMove: technicalMarkPointerDrag.handlePointerMove,
        handleTechnicalMarkPointerUp: technicalMarkPointerDrag.endPointerDrag,
      },
    },
  }
}
