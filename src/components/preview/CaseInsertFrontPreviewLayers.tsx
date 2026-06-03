import type { CSSProperties } from 'react'
import type {
  CaseInsertPreviewLayout,
} from '../../layout/caseInsertPreviewLayout'
import {
  getJewelCaseFrontBackgroundFit,
  getJewelCaseFrontImageSlotPreviewRect,
  getJewelCaseFrontTextBlockPreviewLayout,
} from '../../layout/jewelCaseFrontLayout'
import type { JewelCasePixelRect } from '../../layout/jewelCaseLayout'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertTextBlock,
  ProjectJewelCaseFrontState,
} from '../../project/projectTypes'

export type CaseInsertFrontLayerProps = {
  front: ProjectJewelCaseFrontState
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

function CaseInsertFrontImageSlot({
  slot,
  layout,
  role,
  className,
}: {
  slot: ProjectCaseInsertImageSlot
  layout: CaseInsertPreviewLayout
  role: Parameters<typeof getJewelCaseFrontImageSlotPreviewRect>[2]
  className: string
}) {
  const rect = getJewelCaseFrontImageSlotPreviewRect(slot, layout, role)

  if (!rect || !slot.imageDataUrl) {
    return null
  }

  return (
    <img
      alt=""
      className={`case-insert-front-overlay-image ${className}`}
      draggable={false}
      src={slot.imageDataUrl}
      style={getRectStyle(rect, layout)}
    />
  )
}

function CaseInsertFrontTextBlock({
  textBlock,
  layout,
}: {
  textBlock: ProjectCaseInsertTextBlock
  layout: CaseInsertPreviewLayout
}) {
  const textLayout = getJewelCaseFrontTextBlockPreviewLayout(textBlock, layout)

  if (!textLayout) {
    return null
  }

  const style = {
    ...getRectStyle(textLayout.bounds, layout),
    fontSize: getLayerFontSize(textLayout.fontSizePx, layout),
    lineHeight: getLayerFontSize(textLayout.lineHeightPx, layout),
    textAlign: textBlock.align,
  } as CSSProperties

  return (
    <div className="case-insert-front-text-block" style={style}>
      {textBlock.value}
    </div>
  )
}

export function CaseInsertFrontBackgroundLayer({
  front,
  layout,
}: CaseInsertFrontLayerProps) {
  const backgroundFit = getJewelCaseFrontBackgroundFit(front.background, layout)

  if (!backgroundFit || !front.background.imageDataUrl) {
    return null
  }

  const imageStyle = {
    left: `${(backgroundFit.imageRect.x - backgroundFit.region.x) / backgroundFit.region.width * 100}%`,
    top: `${(backgroundFit.imageRect.y - backgroundFit.region.y) / backgroundFit.region.height * 100}%`,
    width: `${backgroundFit.imageRect.width / backgroundFit.region.width * 100}%`,
    height: `${backgroundFit.imageRect.height / backgroundFit.region.height * 100}%`,
  }

  return (
    <div
      className="case-insert-front-background-clip"
      style={getRectStyle(backgroundFit.region, layout)}
    >
      <img
        alt=""
        className="case-insert-front-background-image"
        draggable={false}
        src={front.background.imageDataUrl}
        style={imageStyle}
      />
    </div>
  )
}

export function CaseInsertFrontCalloutArtworkLayer({
  front,
  layout,
}: CaseInsertFrontLayerProps) {
  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      <CaseInsertFrontImageSlot
        slot={front.calloutArtwork}
        layout={layout}
        role="calloutArtwork"
        className="case-insert-front-callout-artwork"
      />
    </div>
  )
}

export function CaseInsertFrontTitleArtworkLayer({
  front,
  layout,
}: CaseInsertFrontLayerProps) {
  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      <CaseInsertFrontImageSlot
        slot={front.titleArtwork}
        layout={layout}
        role="titleArtwork"
        className="case-insert-front-title-artwork"
      />
    </div>
  )
}

export function CaseInsertFrontLogoLayer({
  front,
  layout,
}: CaseInsertFrontLayerProps) {
  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      {front.logoSlots.map((slot) => (
        <CaseInsertFrontImageSlot
          key={slot.id}
          slot={slot}
          layout={layout}
          role="logo"
          className="case-insert-front-logo"
        />
      ))}
    </div>
  )
}

export function CaseInsertFrontMarkLayer({
  front,
  layout,
}: CaseInsertFrontLayerProps) {
  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      {front.markSlots.map((slot) => (
        <CaseInsertFrontImageSlot
          key={slot.id}
          slot={slot}
          layout={layout}
          role="mark"
          className="case-insert-front-mark"
        />
      ))}
    </div>
  )
}

export function CaseInsertFrontTextLayer({
  front,
  layout,
}: CaseInsertFrontLayerProps) {
  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      <CaseInsertFrontTextBlock textBlock={front.calloutText} layout={layout} />
      {front.textBlocks.map((textBlock) => (
        <CaseInsertFrontTextBlock
          key={textBlock.id}
          textBlock={textBlock}
          layout={layout}
        />
      ))}
    </div>
  )
}
