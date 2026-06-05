import type { CSSProperties } from 'react'
import {
  getJewelCaseSpineBackgroundFit,
  getJewelCaseSpineImageSlotPreviewLayout,
  getJewelCaseSpineTitlePreviewLayout,
  type JewelCaseSpineBoxLayout,
} from '../../layout/jewelCaseSpineLayout'
import type { CaseInsertPreviewLayout } from '../../layout/caseInsertPreviewLayout'
import type { JewelCasePixelRect } from '../../layout/jewelCaseLayout'
import type {
  ProjectCaseInsertImageSlot,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseSpineState,
} from '../../project/projectTypes'

export type CaseInsertSpinePreviewLayerProps = {
  spine: ProjectJewelCaseSpineState
  layout: CaseInsertPreviewLayout
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
}: {
  side: 'left' | 'right'
  slot: ProjectCaseInsertImageSlot
  layout: CaseInsertPreviewLayout
}) {
  const backgroundFit = getJewelCaseSpineBackgroundFit(side, slot, layout)

  if (!backgroundFit || !slot.imageDataUrl) {
    return null
  }

  return (
    <div
      className="case-insert-spine-background-clip"
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
}: {
  side: 'left' | 'right'
  state: ProjectJewelCaseSpineSideState
  layout: CaseInsertPreviewLayout
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
    <div className="case-insert-spine-title" style={style}>
      {state.title.value}
    </div>
  )
}

function CaseInsertSpineOverlaySlot({
  side,
  slot,
  role,
  layout,
}: {
  side: 'left' | 'right'
  slot: ProjectCaseInsertImageSlot
  role: 'branding' | 'logo'
  layout: CaseInsertPreviewLayout
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
  ].join(' ')
  const style = getTransformedBoxStyle(slotLayout, layout)

  if (slot.imageDataUrl) {
    return (
      <div className={className} style={style}>
        <img src={slot.imageDataUrl} alt="" draggable={false} />
      </div>
    )
  }

  if (role !== 'branding') {
    return null
  }

  return (
    <div
      className={`${className} case-insert-spine-branding-fallback`}
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
}: {
  side: 'left' | 'right'
  state: ProjectJewelCaseSpineSideState
  layout: CaseInsertPreviewLayout
}) {
  return (
    <>
      <CaseInsertSpineBackground
        side={side}
        slot={state.background}
        layout={layout}
      />
      <CaseInsertSpineTitle side={side} state={state} layout={layout} />
      <CaseInsertSpineOverlaySlot
        side={side}
        slot={state.steamBackupBranding}
        role="branding"
        layout={layout}
      />
      <CaseInsertSpineOverlaySlot
        side={side}
        slot={state.logo}
        role="logo"
        layout={layout}
      />
    </>
  )
}

export function CaseInsertSpinePreviewLayer({
  spine,
  layout,
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
      />
      <CaseInsertSpineSidePreview
        side="right"
        state={spine.right}
        layout={layout}
      />
    </div>
  )
}
