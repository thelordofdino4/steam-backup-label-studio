import type { CSSProperties, PointerEvent } from 'react'
import type {
  JewelCaseSpineImageSlotGroupKey,
  JewelCaseSpineImageSlotKey,
} from '../../caseInsert/jewelCaseTransitions'
import {
  getJewelCaseSpineBackgroundFit,
  getJewelCaseSpineImageSlotPreviewLayout,
  getJewelCaseSpineTitlePreviewLayout,
  type JewelCaseSpineBoxLayout,
  type JewelCaseSpineOverlayRole,
} from '../../layout/jewelCaseSpineLayout'
import type { CaseInsertPreviewLayout } from '../../layout/caseInsertPreviewLayout'
import type { JewelCasePixelRect } from '../../layout/jewelCaseLayout'
import type {
  ProjectCaseInsertImageSlot,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseSpineState,
} from '../../project/projectTypes'
import type {
  CaseInsertSpinePreviewPointerHandlers,
} from '../../interaction/useCaseInsertPreviewPointerDrag'
import { CaseInsertImageSlotFrame } from './CaseInsertImageSlotFrame'

export type CaseInsertSpinePreviewLayerProps = {
  spine: ProjectJewelCaseSpineState
  layout: CaseInsertPreviewLayout
  pointerHandlers: CaseInsertSpinePreviewPointerHandlers
}

function getRectStyle(rect: JewelCasePixelRect, layout: CaseInsertPreviewLayout) {
  return {
    left: `${rect.x / layout.width * 100}%`,
    top: `${rect.y / layout.height * 100}%`,
    width: `${rect.width / layout.width * 100}%`,
    height: `${rect.height / layout.height * 100}%`,
  }
}

function getLayerFontSize(value: number, layout: CaseInsertPreviewLayout) {
  return `${value / layout.width * 100}cqw`
}

function getImageStyle(
  imageRect: JewelCasePixelRect,
  region: JewelCasePixelRect,
) {
  return {
    left: `${(imageRect.x - region.x) / region.width * 100}%`,
    top: `${(imageRect.y - region.y) / region.height * 100}%`,
    width: `${imageRect.width / region.width * 100}%`,
    height: `${imageRect.height / region.height * 100}%`,
  }
}

function getTransformedBoxStyle(
  box: JewelCaseSpineBoxLayout,
  layout: CaseInsertPreviewLayout,
) {
  return {
    left: `${box.center.x / layout.width * 100}%`,
    top: `${box.center.y / layout.height * 100}%`,
    width: `${box.width / layout.width * 100}%`,
    height: `${box.height / layout.height * 100}%`,
    transform: `translate(-50%, -50%) rotate(${box.rotationDegrees}deg)`,
  }
}

function CaseInsertSpineBackground({
  side,
  slot,
  layout,
  pointerHandlers,
}: {
  side: 'left' | 'right'
  slot: ProjectCaseInsertImageSlot
  layout: CaseInsertPreviewLayout
  pointerHandlers: CaseInsertSpinePreviewPointerHandlers
}) {
  const backgroundFit = getJewelCaseSpineBackgroundFit(side, slot, layout)

  if (!backgroundFit || !slot.imageDataUrl) {
    return null
  }

  return (
    <div
      className="case-insert-spine-background-clip"
      onPointerDown={(event) =>
        pointerHandlers.handleSpinePrimaryImageSlotPointerDown(
          event,
          side,
          'background',
        )}
      onPointerMove={pointerHandlers.handleSpinePointerMove}
      onPointerUp={pointerHandlers.handleSpinePointerUp}
      style={getRectStyle(backgroundFit.region, layout)}
    >
      <img
        alt=""
        className="case-insert-spine-background-image"
        draggable={false}
        src={slot.imageDataUrl}
        style={getImageStyle(backgroundFit.imageRect, backgroundFit.region)}
      />
    </div>
  )
}

function CaseInsertSpineTitle({
  side,
  state,
  layout,
  pointerHandlers,
}: {
  side: 'left' | 'right'
  state: ProjectJewelCaseSpineSideState
  layout: CaseInsertPreviewLayout
  pointerHandlers: CaseInsertSpinePreviewPointerHandlers
}) {
  const titleLayout = getJewelCaseSpineTitlePreviewLayout(
    side,
    state.title,
    layout,
  )

  if (!titleLayout) {
    return null
  }

  const style = {
    ...getTransformedBoxStyle(titleLayout, layout),
    fontSize: getLayerFontSize(titleLayout.fontSizePx, layout),
    lineHeight: getLayerFontSize(titleLayout.lineHeightPx, layout),
    textAlign: state.title.align,
  } as CSSProperties

  return (
    <div
      className="case-insert-spine-title"
      onPointerDown={(event) =>
        pointerHandlers.handleSpineTitlePointerDown(event, side)}
      onPointerMove={pointerHandlers.handleSpinePointerMove}
      onPointerUp={pointerHandlers.handleSpinePointerUp}
      style={style}
    >
      {state.title.value}
    </div>
  )
}

function CaseInsertSpineOverlaySlot({
  side,
  slot,
  role,
  layout,
  dragTarget,
  pointerHandlers,
}: {
  side: 'left' | 'right'
  slot: ProjectCaseInsertImageSlot
  role: JewelCaseSpineOverlayRole
  layout: CaseInsertPreviewLayout
  dragTarget:
    | {
        kind: 'primary'
        slotKey: JewelCaseSpineImageSlotKey
      }
    | {
        kind: 'group'
        slotKey: JewelCaseSpineImageSlotGroupKey
        slotId: string
      }
  pointerHandlers: CaseInsertSpinePreviewPointerHandlers
}) {
  const slotLayout = getJewelCaseSpineImageSlotPreviewLayout(
    side,
    slot,
    layout,
    role,
  )

  if (!slotLayout) {
    return null
  }

  const className = [
    'case-insert-spine-overlay-box',
    `case-insert-spine-overlay-${role}`,
    role === 'artwork' && slot.frame.enabled && slot.frame.shape === 'circle'
      ? 'case-insert-image-slot-frame-host--circle'
      : '',
  ].join(' ')
  const style = getTransformedBoxStyle(slotLayout, layout)
  const pointerProps = {
    onPointerDown: (event: PointerEvent<Element>) =>
      dragTarget.kind === 'primary'
        ? pointerHandlers.handleSpinePrimaryImageSlotPointerDown(
            event,
            side,
            dragTarget.slotKey,
          )
        : pointerHandlers.handleSpineGroupedImageSlotPointerDown(
            event,
            side,
            dragTarget.slotKey,
            dragTarget.slotId,
          ),
    onPointerMove: pointerHandlers.handleSpinePointerMove,
    onPointerUp: pointerHandlers.handleSpinePointerUp,
  }

  if (slot.imageDataUrl) {
    return (
      <div className={className} {...pointerProps} style={style}>
        <img src={slot.imageDataUrl} alt="" draggable={false} />
        {role === 'artwork' ? <CaseInsertImageSlotFrame slot={slot} /> : null}
      </div>
    )
  }

  if (role !== 'branding') {
    return null
  }

  return (
    <div
      className={`${className} case-insert-spine-branding-fallback`}
      {...pointerProps}
      style={style}
    >
      Steam Backup
    </div>
  )
}

function CaseInsertSpineSidePreview({
  side,
  state,
  layout,
  pointerHandlers,
}: {
  side: 'left' | 'right'
  state: ProjectJewelCaseSpineSideState
  layout: CaseInsertPreviewLayout
  pointerHandlers: CaseInsertSpinePreviewPointerHandlers
}) {
  const artworkSlots = state.additionalArtworkEnabled
    ? state.artworkSlots
    : []

  return (
    <>
      <CaseInsertSpineBackground
        side={side}
        slot={state.background}
        layout={layout}
        pointerHandlers={pointerHandlers}
      />
      <CaseInsertSpineOverlaySlot
        side={side}
        slot={state.titleArtwork}
        role="titleArtwork"
        layout={layout}
        dragTarget={{ kind: 'primary', slotKey: 'titleArtwork' }}
        pointerHandlers={pointerHandlers}
      />
      {artworkSlots.map((slot) => (
        <CaseInsertSpineOverlaySlot
          key={slot.id}
          side={side}
          slot={slot}
          role="artwork"
          layout={layout}
          dragTarget={{ kind: 'group', slotKey: 'artworkSlots', slotId: slot.id }}
          pointerHandlers={pointerHandlers}
        />
      ))}
      <CaseInsertSpineTitle
        side={side}
        state={state}
        layout={layout}
        pointerHandlers={pointerHandlers}
      />
      <CaseInsertSpineOverlaySlot
        side={side}
        slot={state.steamBackupBranding}
        role="branding"
        layout={layout}
        dragTarget={{ kind: 'primary', slotKey: 'steamBackupBranding' }}
        pointerHandlers={pointerHandlers}
      />
      <CaseInsertSpineOverlaySlot
        side={side}
        slot={state.logo}
        role="logo"
        layout={layout}
        dragTarget={{ kind: 'primary', slotKey: 'logo' }}
        pointerHandlers={pointerHandlers}
      />
    </>
  )
}

export function CaseInsertSpinePreviewLayer({
  spine,
  layout,
  pointerHandlers,
}: CaseInsertSpinePreviewLayerProps) {
  if (!layout.surfaces.some(({ surfaceId }) => surfaceId === 'back')) {
    return null
  }

  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      <CaseInsertSpineSidePreview
        side="left"
        state={spine.left}
        layout={layout}
        pointerHandlers={pointerHandlers}
      />
      <CaseInsertSpineSidePreview
        side="right"
        state={spine.right}
        layout={layout}
        pointerHandlers={pointerHandlers}
      />
    </div>
  )
}
