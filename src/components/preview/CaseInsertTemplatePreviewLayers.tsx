import type { CSSProperties } from 'react'
import type {
  CaseInsertTemplatePaneId,
} from '../../caseInsert/templateSurfaces'
import {
  getCaseInsertMarkLayerKind,
} from '../../caseInsert/brandingSlotSources'
import {
  getCaseInsertBackTextBlockRole,
} from '../../caseInsert/textReadability'
import type { CaseInsertPreviewLayout } from '../../layout/caseInsertPreviewLayout'
import {
  getJewelCaseBackBackgroundFit,
  getJewelCaseBackImageSlotPreviewRect,
  getJewelCaseBackScreenshotFit,
  getJewelCaseBackTextBlockPreviewLayout,
  getJewelCaseBackTextListPreviewLayout,
} from '../../layout/jewelCaseBackLayout'
import {
  getJewelCaseFrontBackgroundFit,
  getJewelCaseFrontImageSlotPreviewRect,
  getJewelCaseFrontTextBlockPreviewLayout,
} from '../../layout/jewelCaseFrontLayout'
import type { JewelCasePixelRect } from '../../layout/jewelCaseLayout'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertSurfaceState,
  ProjectCaseInsertTextBlock,
} from '../../project/projectTypes'

export type CaseInsertTemplateLayerProps = {
  paneId: CaseInsertTemplatePaneId
  templateState: ProjectCaseInsertSurfaceState
  layout: CaseInsertPreviewLayout
}

export type CaseInsertTemplateMarkLayerKind =
  | 'rating'
  | 'media'
  | 'platform'
  | 'technical'

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

function CaseInsertTemplateImageSlot({
  paneId,
  slot,
  layout,
  group,
}: {
  paneId: CaseInsertTemplatePaneId
  slot: ProjectCaseInsertImageSlot
  layout: CaseInsertPreviewLayout
  group: 'titleArtwork' | 'artwork' | 'logo' | 'mark'
}) {
  const rect = paneId === 'cover'
    ? getJewelCaseFrontImageSlotPreviewRect(
        slot,
        layout,
        group === 'titleArtwork' ? 'titleArtwork' :
          group === 'artwork' ? 'calloutArtwork' : group,
      )
    : getJewelCaseBackImageSlotPreviewRect(
        slot,
        layout,
        group === 'mark' ? 'mark' : 'logo',
      )

  if (!rect || !slot.imageDataUrl) {
    return null
  }

  return (
    <img
      alt=""
      className={`case-insert-template-overlay-image case-insert-template-${group}`}
      draggable={false}
      src={slot.imageDataUrl}
      style={getRectStyle(rect, layout)}
    />
  )
}

function CaseInsertTemplateTextBlock({
  paneId,
  textBlock,
  layout,
}: {
  paneId: CaseInsertTemplatePaneId
  textBlock: ProjectCaseInsertTextBlock
  layout: CaseInsertPreviewLayout
}) {
  const textLayout = paneId === 'cover'
    ? getJewelCaseFrontTextBlockPreviewLayout(textBlock, layout)
    : getJewelCaseBackTextBlockPreviewLayout(
        textBlock,
        layout,
        getCaseInsertBackTextBlockRole(textBlock),
      )

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
    <div
      className={`case-insert-template-text-block case-insert-template-text-block-${paneId}`}
      style={style}
    >
      {textBlock.value}
    </div>
  )
}

export function CaseInsertTemplateBackgroundLayer({
  paneId,
  templateState,
  layout,
}: CaseInsertTemplateLayerProps) {
  const backgroundFit = paneId === 'cover'
    ? getJewelCaseFrontBackgroundFit(templateState.background, layout)
    : getJewelCaseBackBackgroundFit(templateState.background, layout)

  if (!backgroundFit || !templateState.background.imageDataUrl) {
    return null
  }

  return (
    <div
      className="case-insert-template-background-clip"
      style={getRectStyle(backgroundFit.region, layout)}
    >
      <img
        alt=""
        className="case-insert-template-background-image"
        draggable={false}
        src={templateState.background.imageDataUrl}
        style={getImageStyle(backgroundFit.imageRect, backgroundFit.region)}
      />
    </div>
  )
}

export function CaseInsertTemplateArtworkLayer({
  paneId,
  templateState,
  layout,
}: CaseInsertTemplateLayerProps) {
  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      {paneId === 'cover' ? (
        <CaseInsertTemplateImageSlot
          paneId={paneId}
          slot={templateState.titleArtwork}
          layout={layout}
          group="titleArtwork"
        />
      ) : null}
      {templateState.artworkSlots.map((slot, index) => {
        if (paneId === 'tray') {
          const screenshotFit = getJewelCaseBackScreenshotFit(
            slot,
            layout,
            index,
            templateState.artworkSlots.length,
          )

          if (!screenshotFit || !slot.imageDataUrl) {
            return null
          }

          return (
            <div
              className="case-insert-template-screenshot-clip"
              key={slot.id}
              style={getRectStyle(screenshotFit.region, layout)}
            >
              <img
                alt=""
                className="case-insert-template-screenshot-image"
                draggable={false}
                src={slot.imageDataUrl}
                style={getImageStyle(
                  screenshotFit.imageRect,
                  screenshotFit.region,
                )}
              />
            </div>
          )
        }

        return (
          <CaseInsertTemplateImageSlot
            key={slot.id}
            paneId={paneId}
            slot={slot}
            layout={layout}
            group="artwork"
          />
        )
      })}
    </div>
  )
}

export function CaseInsertTemplateLogoLayer({
  paneId,
  templateState,
  layout,
}: CaseInsertTemplateLayerProps) {
  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      {templateState.logoSlots.map((slot) => (
        <CaseInsertTemplateImageSlot
          key={slot.id}
          paneId={paneId}
          slot={slot}
          layout={layout}
          group="logo"
        />
      ))}
    </div>
  )
}

export function CaseInsertTemplateMarkLayer({
  paneId,
  templateState,
  layout,
  kind,
}: CaseInsertTemplateLayerProps & {
  kind: CaseInsertTemplateMarkLayerKind
}) {
  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      {templateState.markSlots
        .filter((slot) =>
          getCaseInsertMarkLayerKind(slot.imageSource?.sourceId) === kind)
        .map((slot) => (
          <CaseInsertTemplateImageSlot
            key={slot.id}
            paneId={paneId}
            slot={slot}
            layout={layout}
            group="mark"
          />
        ))}
    </div>
  )
}

export function CaseInsertTemplateTextLayer({
  paneId,
  templateState,
  layout,
}: CaseInsertTemplateLayerProps) {
  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      {templateState.textBlocks.map((textBlock) => (
        <CaseInsertTemplateTextBlock
          key={textBlock.id}
          paneId={paneId}
          textBlock={textBlock}
          layout={layout}
        />
      ))}
      {templateState.textLists.map((textList) => {
        const textListLayout = getJewelCaseBackTextListPreviewLayout(
          textList,
          layout,
        )
        const textListStyle = textListLayout
          ? {
              ...getRectStyle(textListLayout.bounds, layout),
              fontSize: getLayerFontSize(textListLayout.fontSizePx, layout),
              lineHeight: getLayerFontSize(
                textListLayout.lineHeightPx,
                layout,
              ),
            } as CSSProperties
          : null

        return textListLayout && textListStyle ? (
          <ul
            className="case-insert-template-feature-list"
            key={textList.id}
            style={textListStyle}
          >
            {textListLayout.items.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ul>
        ) : null
      })}
    </div>
  )
}
