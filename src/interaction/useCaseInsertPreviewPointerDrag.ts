import {
  useCallback,
  useMemo,
  type Dispatch,
  type PointerEvent,
  type RefObject,
  type SetStateAction,
} from 'react'
import {
  updateCaseInsertImageSlotLayoutPosition,
} from '../caseInsert/imageSlotTransitions.ts'
import {
  updateJewelCaseSpineImageSlot,
  updateJewelCaseSpineImageSlotInGroup,
  updateJewelCaseSpineTextBlock,
  updateJewelCaseSpineTitle,
  type JewelCaseSpineImageSlotGroupKey,
  type JewelCaseSpineImageSlotKey,
} from '../caseInsert/jewelCaseTransitions.ts'
import {
  getCaseInsertTemplatePaneConfig,
  type CaseInsertImageSlotGroupKey,
  type CaseInsertTemplatePaneId,
} from '../caseInsert/templateSurfaces.ts'
import {
  updateCaseInsertTemplateImageSlot,
  updateCaseInsertTemplateImageSlotInGroup,
  updateCaseInsertTemplateTextBlock,
  updateCaseInsertTemplateTextList,
  type CaseInsertPrimaryImageSlotKey,
} from '../caseInsert/templateSurfaceTransitions.ts'
import {
  updateCaseInsertTextBlockLayoutPosition,
  updateCaseInsertTextListLayoutPosition,
} from '../caseInsert/textTransitions.ts'
import type {
  CaseInsertLayoutPoint,
  JewelCaseSpineSide,
} from '../caseInsert/types.ts'
import {
  createJewelCasePreviewLayout,
  type CaseInsertPreviewLayout,
} from '../layout/caseInsertPreviewLayout.ts'
import type {
  JewelCasePixelRect,
  JewelCaseSpineSideId,
} from '../layout/jewelCaseLayout.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import type { JewelCaseRegionId } from '../templates/caseInsertTemplates.ts'
import {
  OFFSET_DRAG_POINT_RANGE,
  PERCENT_DRAG_POINT_RANGE,
  clampDragPointToRange,
  createPercentDragState,
  type DragBounds,
  type DragPointRange,
  type PercentDragState,
} from './dragGeometry.ts'
import { usePercentPointerDrag } from './usePointerDragAdapters.ts'

type CaseInsertDragRange = 'offset' | 'percent'

type TemplatePrimaryImageDragTarget = {
  scope: 'templatePrimaryImage'
  paneId: CaseInsertTemplatePaneId
  slotKey: CaseInsertPrimaryImageSlotKey
}

type TemplateGroupedImageDragTarget = {
  scope: 'templateGroupedImage'
  paneId: CaseInsertTemplatePaneId
  slotKey: CaseInsertImageSlotGroupKey
  slotId: string
}

type TemplateTextBlockDragTarget = {
  scope: 'templateTextBlock'
  paneId: CaseInsertTemplatePaneId
  textBlockId: string
}

type TemplateTextListDragTarget = {
  scope: 'templateTextList'
  paneId: CaseInsertTemplatePaneId
  textListId: string
}

type SpinePrimaryImageDragTarget = {
  scope: 'spinePrimaryImage'
  side: JewelCaseSpineSide
  slotKey: JewelCaseSpineImageSlotKey
}

type SpineGroupedImageDragTarget = {
  scope: 'spineGroupedImage'
  side: JewelCaseSpineSide
  slotKey: JewelCaseSpineImageSlotGroupKey
  slotId: string
}

type SpineTitleDragTarget = {
  scope: 'spineTitle'
  side: JewelCaseSpineSide
}

type SpineTextBlockDragTarget = {
  scope: 'spineTextBlock'
  side: JewelCaseSpineSide
  textBlockId: string
}

type CaseInsertDragTarget =
  | TemplatePrimaryImageDragTarget
  | TemplateGroupedImageDragTarget
  | TemplateTextBlockDragTarget
  | TemplateTextListDragTarget
  | SpinePrimaryImageDragTarget
  | SpineGroupedImageDragTarget
  | SpineTitleDragTarget
  | SpineTextBlockDragTarget

type CaseInsertDragState = PercentDragState & {
  bounds: DragBounds
  pointRange: DragPointRange
  target: CaseInsertDragTarget
}

export type CaseInsertTemplatePreviewPointerHandlers = {
  handleTemplatePrimaryImageSlotPointerDown: (
    event: PointerEvent<Element>,
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertPrimaryImageSlotKey,
  ) => void
  handleTemplateGroupedImageSlotPointerDown: (
    event: PointerEvent<Element>,
    paneId: CaseInsertTemplatePaneId,
    slotKey: CaseInsertImageSlotGroupKey,
    slotId: string,
  ) => void
  handleTemplateTextBlockPointerDown: (
    event: PointerEvent<Element>,
    paneId: CaseInsertTemplatePaneId,
    textBlockId: string,
  ) => void
  handleTemplateTextListPointerDown: (
    event: PointerEvent<Element>,
    paneId: CaseInsertTemplatePaneId,
    textListId: string,
  ) => void
  handleTemplatePointerMove: (event: PointerEvent<Element>) => void
  handleTemplatePointerUp: (event: PointerEvent<Element>) => void
}

export type CaseInsertSpinePreviewPointerHandlers = {
  handleSpinePrimaryImageSlotPointerDown: (
    event: PointerEvent<Element>,
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotKey,
  ) => void
  handleSpineGroupedImageSlotPointerDown: (
    event: PointerEvent<Element>,
    side: JewelCaseSpineSide,
    slotKey: JewelCaseSpineImageSlotGroupKey,
    slotId: string,
  ) => void
  handleSpineTitlePointerDown: (
    event: PointerEvent<Element>,
    side: JewelCaseSpineSide,
  ) => void
  handleSpineTextBlockPointerDown: (
    event: PointerEvent<Element>,
    side: JewelCaseSpineSide,
    textBlockId: string,
  ) => void
  handleSpinePointerMove: (event: PointerEvent<Element>) => void
  handleSpinePointerUp: (event: PointerEvent<Element>) => void
}

export type CaseInsertPreviewPointerHandlers = {
  template: CaseInsertTemplatePreviewPointerHandlers
  spine: CaseInsertSpinePreviewPointerHandlers
}

type UseCaseInsertPreviewPointerDragOptions = {
  preview: {
    caseInsertPreviewRef: RefObject<HTMLDivElement | null>
    activeTemplatePane: CaseInsertTemplatePaneId
  }
  caseInsert: ProjectJewelCaseState
  setProjectJewelCase: Dispatch<SetStateAction<ProjectJewelCaseState>>
}

function getCaseInsertDragPointRange(
  range: CaseInsertDragRange,
): DragPointRange {
  return range === 'offset'
    ? OFFSET_DRAG_POINT_RANGE
    : PERCENT_DRAG_POINT_RANGE
}

function getRegionBounds(
  layout: CaseInsertPreviewLayout,
  regionId: JewelCaseRegionId,
) {
  return layout.regions.find((region) => region.regionId === regionId)?.bounds ??
    null
}

function getSpineRegionBounds(
  layout: CaseInsertPreviewLayout,
  side: JewelCaseSpineSideId,
  safe = false,
) {
  const regionId: JewelCaseRegionId = side === 'left'
    ? safe ? 'leftSpineSafe' : 'leftSpine'
    : safe ? 'rightSpineSafe' : 'rightSpine'

  return getRegionBounds(layout, regionId)
}

function getTemplateOverlayRegionBounds(
  paneId: CaseInsertTemplatePaneId,
  layout: CaseInsertPreviewLayout,
) {
  const paneConfig = getCaseInsertTemplatePaneConfig(paneId)
  const regionId = paneId === 'cover'
    ? paneConfig.safeRegionId
    : paneConfig.panelRegionId

  return getRegionBounds(layout, regionId)
}

function getTemplatePrimaryImageDragRegion(
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertPrimaryImageSlotKey,
  layout: CaseInsertPreviewLayout,
) {
  const paneConfig = getCaseInsertTemplatePaneConfig(paneId)

  return slotKey === 'background'
    ? getRegionBounds(layout, paneConfig.printRegionId)
    : getTemplateOverlayRegionBounds(paneId, layout)
}

function getTemplateGroupedImageDragRegion(
  paneId: CaseInsertTemplatePaneId,
  layout: CaseInsertPreviewLayout,
) {
  return getTemplateOverlayRegionBounds(paneId, layout)
}

function getTemplateTextDragRegion(
  paneId: CaseInsertTemplatePaneId,
  layout: CaseInsertPreviewLayout,
) {
  return getTemplateOverlayRegionBounds(paneId, layout)
}

function getSpinePrimaryImageDragRegion(
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotKey,
  layout: CaseInsertPreviewLayout,
) {
  return slotKey === 'background'
    ? getSpineRegionBounds(layout, side)
    : getSpineRegionBounds(layout, side, true)
}

function getSpineOverlayDragRegion(
  side: JewelCaseSpineSide,
  layout: CaseInsertPreviewLayout,
) {
  return getSpineRegionBounds(layout, side, true)
}

function getCssDragBounds(
  caseInsertPreviewRef: RefObject<HTMLDivElement | null>,
  layout: CaseInsertPreviewLayout,
  region: JewelCasePixelRect | null,
): DragBounds | null {
  const previewRect = caseInsertPreviewRef.current?.getBoundingClientRect()

  if (
    !previewRect ||
    !region ||
    layout.width <= 0 ||
    layout.height <= 0 ||
    region.width <= 0 ||
    region.height <= 0
  ) {
    return null
  }

  return {
    width: region.width / layout.width * previewRect.width,
    height: region.height / layout.height * previewRect.height,
  }
}

function createCaseInsertDragState({
  bounds,
  event,
  range,
  startLayout,
  target,
}: {
  bounds: DragBounds
  event: PointerEvent<Element>
  range: CaseInsertDragRange
  startLayout: ProjectCaseInsertLayout
  target: CaseInsertDragTarget
}): CaseInsertDragState {
  return {
    ...createPercentDragState(
      event.pointerId,
      event.clientX,
      event.clientY,
      startLayout.x,
      startLayout.y,
    ),
    bounds,
    pointRange: getCaseInsertDragPointRange(range),
    target,
  }
}

function updateCaseInsertDragTargetPosition(
  state: ProjectJewelCaseState,
  target: CaseInsertDragTarget,
  point: CaseInsertLayoutPoint,
): ProjectJewelCaseState {
  switch (target.scope) {
    case 'templatePrimaryImage':
      return updateCaseInsertTemplateImageSlot(
        state,
        target.paneId,
        target.slotKey,
        (slot) => updateCaseInsertImageSlotLayoutPosition(slot, point),
      )
    case 'templateGroupedImage':
      return updateCaseInsertTemplateImageSlotInGroup(
        state,
        target.paneId,
        target.slotKey,
        target.slotId,
        (slot) => updateCaseInsertImageSlotLayoutPosition(slot, point),
      )
    case 'templateTextBlock':
      return updateCaseInsertTemplateTextBlock(
        state,
        target.paneId,
        target.textBlockId,
        (textBlock) => updateCaseInsertTextBlockLayoutPosition(textBlock, point),
      )
    case 'templateTextList':
      return updateCaseInsertTemplateTextList(
        state,
        target.paneId,
        target.textListId,
        (textList) => updateCaseInsertTextListLayoutPosition(textList, point),
      )
    case 'spinePrimaryImage':
      return updateJewelCaseSpineImageSlot(
        state,
        target.side,
        target.slotKey,
        (slot) => updateCaseInsertImageSlotLayoutPosition(slot, point),
      )
    case 'spineGroupedImage':
      return updateJewelCaseSpineImageSlotInGroup(
        state,
        target.side,
        target.slotKey,
        target.slotId,
        (slot) => updateCaseInsertImageSlotLayoutPosition(slot, point),
      )
    case 'spineTitle':
      return updateJewelCaseSpineTitle(
        state,
        target.side,
        (title) => updateCaseInsertTextBlockLayoutPosition(title, point),
      )
    case 'spineTextBlock':
      return updateJewelCaseSpineTextBlock(
        state,
        target.side,
        target.textBlockId,
        (textBlock) => updateCaseInsertTextBlockLayoutPosition(textBlock, point),
      )
    default:
      return state
  }
}

function getTemplateGroupedImageRange(): CaseInsertDragRange {
  return 'percent'
}

function getPrimaryImageRange(
  slotKey: CaseInsertPrimaryImageSlotKey | JewelCaseSpineImageSlotKey,
): CaseInsertDragRange {
  return slotKey === 'background' ? 'offset' : 'percent'
}

function findTemplateTextBlock(
  caseInsert: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  textBlockId: string,
): ProjectCaseInsertTextBlock | null {
  return caseInsert.templates[paneId].textBlocks.find(
    (textBlock) => textBlock.id === textBlockId,
  ) ?? null
}

function findTemplateTextList(
  caseInsert: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  textListId: string,
): ProjectCaseInsertTextList | null {
  return caseInsert.templates[paneId].textLists.find(
    (textList) => textList.id === textListId,
  ) ?? null
}

function findTemplateGroupedImageSlot(
  caseInsert: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  slotKey: CaseInsertImageSlotGroupKey,
  slotId: string,
): ProjectCaseInsertImageSlot | null {
  return caseInsert.templates[paneId][slotKey].find(
    (slot) => slot.id === slotId,
  ) ?? null
}

function findSpineGroupedImageSlot(
  caseInsert: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  slotKey: JewelCaseSpineImageSlotGroupKey,
  slotId: string,
): ProjectCaseInsertImageSlot | null {
  return caseInsert.spine[side][slotKey].find((slot) => slot.id === slotId) ??
    null
}

function findSpineTextBlock(
  caseInsert: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  textBlockId: string,
): ProjectCaseInsertTextBlock | null {
  return caseInsert.spine[side].textBlocks.find(
    (textBlock) => textBlock.id === textBlockId,
  ) ?? null
}

export function useCaseInsertPreviewPointerDrag({
  preview,
  caseInsert,
  setProjectJewelCase,
}: UseCaseInsertPreviewPointerDragOptions) {
  const { activeTemplatePane, caseInsertPreviewRef } = preview
  const layout = useMemo(
    () => createJewelCasePreviewLayout(
      caseInsert.templateType,
      getCaseInsertTemplatePaneConfig(activeTemplatePane).surfaceId,
    ),
    [activeTemplatePane, caseInsert.templateType],
  )
  const caseInsertPointerDrag = usePercentPointerDrag<
    CaseInsertDragState,
    Element
  >({
    stopPropagation: true,
    getBounds: (dragState) => dragState.bounds,
    onDraggedPoint: (dragState, point) => {
      const draggedPoint = clampDragPointToRange(
        point,
        dragState.pointRange,
      )

      setProjectJewelCase((currentCaseInsert) =>
        updateCaseInsertDragTargetPosition(
          currentCaseInsert,
          dragState.target,
          draggedPoint,
        ),
      )
    },
  })

  const beginDrag = useCallback(
    (
      event: PointerEvent<Element>,
      region: JewelCasePixelRect | null,
      startLayout: ProjectCaseInsertLayout,
      range: CaseInsertDragRange,
      target: CaseInsertDragTarget,
    ) => {
      const bounds = getCssDragBounds(caseInsertPreviewRef, layout, region)

      if (!bounds) {
        return
      }

      caseInsertPointerDrag.beginPointerDrag(
        event,
        createCaseInsertDragState({
          bounds,
          event,
          range,
          startLayout,
          target,
        }),
      )
    },
    [caseInsertPointerDrag, caseInsertPreviewRef, layout],
  )

  const handleTemplatePrimaryImageSlotPointerDown = useCallback(
    (
      event: PointerEvent<Element>,
      paneId: CaseInsertTemplatePaneId,
      slotKey: CaseInsertPrimaryImageSlotKey,
    ) => {
      const slot = caseInsert.templates[paneId][slotKey]

      beginDrag(
        event,
        getTemplatePrimaryImageDragRegion(paneId, slotKey, layout),
        slot.layout,
        getPrimaryImageRange(slotKey),
        {
          scope: 'templatePrimaryImage',
          paneId,
          slotKey,
        },
      )
    },
    [beginDrag, caseInsert.templates, layout],
  )

  const handleTemplateGroupedImageSlotPointerDown = useCallback(
    (
      event: PointerEvent<Element>,
      paneId: CaseInsertTemplatePaneId,
      slotKey: CaseInsertImageSlotGroupKey,
      slotId: string,
    ) => {
      const slot = findTemplateGroupedImageSlot(
        caseInsert,
        paneId,
        slotKey,
        slotId,
      )

      if (!slot) {
        return
      }

      beginDrag(
        event,
        getTemplateGroupedImageDragRegion(paneId, layout),
        slot.layout,
        getTemplateGroupedImageRange(),
        {
          scope: 'templateGroupedImage',
          paneId,
          slotId,
          slotKey,
        },
      )
    },
    [beginDrag, caseInsert, layout],
  )

  const handleTemplateTextBlockPointerDown = useCallback(
    (
      event: PointerEvent<Element>,
      paneId: CaseInsertTemplatePaneId,
      textBlockId: string,
    ) => {
      const textBlock = findTemplateTextBlock(caseInsert, paneId, textBlockId)

      if (!textBlock) {
        return
      }

      beginDrag(
        event,
        getTemplateTextDragRegion(paneId, layout),
        textBlock.layout,
        'percent',
        {
          scope: 'templateTextBlock',
          paneId,
          textBlockId,
        },
      )
    },
    [beginDrag, caseInsert, layout],
  )

  const handleTemplateTextListPointerDown = useCallback(
    (
      event: PointerEvent<Element>,
      paneId: CaseInsertTemplatePaneId,
      textListId: string,
    ) => {
      const textList = findTemplateTextList(caseInsert, paneId, textListId)

      if (!textList) {
        return
      }

      beginDrag(
        event,
        getTemplateTextDragRegion(paneId, layout),
        textList.layout,
        'percent',
        {
          scope: 'templateTextList',
          paneId,
          textListId,
        },
      )
    },
    [beginDrag, caseInsert, layout],
  )

  const handleSpinePrimaryImageSlotPointerDown = useCallback(
    (
      event: PointerEvent<Element>,
      side: JewelCaseSpineSide,
      slotKey: JewelCaseSpineImageSlotKey,
    ) => {
      const slot = caseInsert.spine[side][slotKey]

      beginDrag(
        event,
        getSpinePrimaryImageDragRegion(side, slotKey, layout),
        slot.layout,
        getPrimaryImageRange(slotKey),
        {
          scope: 'spinePrimaryImage',
          side,
          slotKey,
        },
      )
    },
    [beginDrag, caseInsert.spine, layout],
  )

  const handleSpineGroupedImageSlotPointerDown = useCallback(
    (
      event: PointerEvent<Element>,
      side: JewelCaseSpineSide,
      slotKey: JewelCaseSpineImageSlotGroupKey,
      slotId: string,
    ) => {
      const slot = findSpineGroupedImageSlot(caseInsert, side, slotKey, slotId)

      if (!slot) {
        return
      }

      beginDrag(
        event,
        getSpineOverlayDragRegion(side, layout),
        slot.layout,
        'percent',
        {
          scope: 'spineGroupedImage',
          side,
          slotId,
          slotKey,
        },
      )
    },
    [beginDrag, caseInsert, layout],
  )

  const handleSpineTitlePointerDown = useCallback(
    (event: PointerEvent<Element>, side: JewelCaseSpineSide) => {
      const title = caseInsert.spine[side].title

      beginDrag(
        event,
        getSpineOverlayDragRegion(side, layout),
        title.layout,
        'percent',
        {
          scope: 'spineTitle',
          side,
        },
      )
    },
    [beginDrag, caseInsert.spine, layout],
  )

  const handleSpineTextBlockPointerDown = useCallback(
    (
      event: PointerEvent<Element>,
      side: JewelCaseSpineSide,
      textBlockId: string,
    ) => {
      const textBlock = findSpineTextBlock(caseInsert, side, textBlockId)

      if (!textBlock) {
        return
      }

      beginDrag(
        event,
        getSpineOverlayDragRegion(side, layout),
        textBlock.layout,
        'percent',
        {
          scope: 'spineTextBlock',
          side,
          textBlockId,
        },
      )
    },
    [beginDrag, caseInsert, layout],
  )

  const cancelCaseInsertPreviewPointerDrag = useCallback(() => {
    caseInsertPointerDrag.cancelPointerDrag()
  }, [caseInsertPointerDrag])

  return {
    cancelCaseInsertPreviewPointerDrag,
    caseInsertPreviewPointerHandlers: {
      template: {
        handleTemplatePrimaryImageSlotPointerDown,
        handleTemplateGroupedImageSlotPointerDown,
        handleTemplateTextBlockPointerDown,
        handleTemplateTextListPointerDown,
        handleTemplatePointerMove: caseInsertPointerDrag.handlePointerMove,
        handleTemplatePointerUp: caseInsertPointerDrag.endPointerDrag,
      },
      spine: {
        handleSpinePrimaryImageSlotPointerDown,
        handleSpineGroupedImageSlotPointerDown,
        handleSpineTitlePointerDown,
        handleSpineTextBlockPointerDown,
        handleSpinePointerMove: caseInsertPointerDrag.handlePointerMove,
        handleSpinePointerUp: caseInsertPointerDrag.endPointerDrag,
      },
    },
  }
}
