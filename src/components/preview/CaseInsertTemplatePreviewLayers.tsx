import type { CSSProperties, PointerEvent } from 'react'
import type {
  CaseInsertImageSlotGroupKey,
  CaseInsertTemplatePaneId,
} from '../../caseInsert/templateSurfaces'
import type {
  CaseInsertPrimaryImageSlotKey,
} from '../../caseInsert/templateSurfaceTransitions'
import {
  type CaseInsertBrandingSourceCatalog,
} from '../../caseInsert/brandingSlotSources'
import {
  isCaseInsertMarkSlotVisible,
} from '../../caseInsert/brandingVisibility'
import {
  getCaseInsertLogoSlotRenderInfo,
} from '../../caseInsert/brandingLogoSlots'
import {
  getCaseInsertBackTextBlockRole,
} from '../../caseInsert/textReadability'
import type { CaseInsertPreviewLayout } from '../../layout/caseInsertPreviewLayout'
import {
  getJewelCaseBackBackgroundFit,
  getJewelCaseBackImageSlotPreviewRect,
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
import type {
  CaseInsertTemplatePreviewPointerHandlers,
} from '../../interaction/useCaseInsertPreviewPointerDrag'
import { CaseInsertImageSlotFrame } from './CaseInsertImageSlotFrame'

export type CaseInsertTemplateLayerProps = {
  paneId: CaseInsertTemplatePaneId
  templateState: ProjectCaseInsertSurfaceState
  layout: CaseInsertPreviewLayout
  pointerHandlers: CaseInsertTemplatePreviewPointerHandlers
  brandingSources: CaseInsertBrandingSourceCatalog
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
  dragTarget,
  pointerHandlers,
}: {
  paneId: CaseInsertTemplatePaneId
  slot: ProjectCaseInsertImageSlot
  layout: CaseInsertPreviewLayout
  group: 'titleArtwork' | 'artwork' | 'logo' | 'mark'
  dragTarget:
    | {
        kind: 'primary'
        slotKey: CaseInsertPrimaryImageSlotKey
      }
    | {
        kind: 'group'
        slotKey: CaseInsertImageSlotGroupKey
        slotId: string
      }
  pointerHandlers: CaseInsertTemplatePreviewPointerHandlers
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
        group === 'artwork' ? 'artwork' : group === 'mark' ? 'mark' : 'logo',
      )

  const logoRenderInfo = group === 'logo'
    ? getCaseInsertLogoSlotRenderInfo(slot)
    : null
  const imageDataUrl = logoRenderInfo?.imageDataUrl ?? slot.imageDataUrl

  if (!rect || !imageDataUrl) {
    return null
  }

  const pointerProps = {
    onPointerDown: (event: PointerEvent<Element>) =>
      dragTarget.kind === 'primary'
        ? pointerHandlers.handleTemplatePrimaryImageSlotPointerDown(
            event,
            paneId,
            dragTarget.slotKey,
          )
        : pointerHandlers.handleTemplateGroupedImageSlotPointerDown(
            event,
            paneId,
            dragTarget.slotKey,
            dragTarget.slotId,
          ),
    onPointerMove: pointerHandlers.handleTemplatePointerMove,
    onPointerUp: pointerHandlers.handleTemplatePointerUp,
  }

  if (group === 'artwork') {
    const className = [
      'case-insert-template-framed-artwork',
      slot.frame.enabled && slot.frame.shape === 'circle'
        ? 'case-insert-image-slot-frame-host--circle'
        : '',
    ].filter(Boolean).join(' ')

    return (
      <div
        className={className}
        {...pointerProps}
        style={getRectStyle(rect, layout)}
      >
        <img
          alt=""
          className="case-insert-template-framed-artwork-image"
          draggable={false}
          src={imageDataUrl}
        />
        <CaseInsertImageSlotFrame slot={slot} />
      </div>
    )
  }

  return (
    <img
      alt=""
      className={`case-insert-template-overlay-image case-insert-template-${group}`}
      draggable={false}
      {...pointerProps}
      src={imageDataUrl}
      style={getRectStyle(rect, layout)}
    />
  )
}

function CaseInsertTemplateTextBlock({
  paneId,
  textBlock,
  layout,
  pointerHandlers,
}: {
  paneId: CaseInsertTemplatePaneId
  textBlock: ProjectCaseInsertTextBlock
  layout: CaseInsertPreviewLayout
  pointerHandlers: CaseInsertTemplatePreviewPointerHandlers
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
      onPointerDown={(event) =>
        pointerHandlers.handleTemplateTextBlockPointerDown(
          event,
          paneId,
          textBlock.id,
        )}
      onPointerMove={pointerHandlers.handleTemplatePointerMove}
      onPointerUp={pointerHandlers.handleTemplatePointerUp}
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
  pointerHandlers,
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
      onPointerDown={(event) =>
        pointerHandlers.handleTemplatePrimaryImageSlotPointerDown(
          event,
          paneId,
          'background',
        )}
      onPointerMove={pointerHandlers.handleTemplatePointerMove}
      onPointerUp={pointerHandlers.handleTemplatePointerUp}
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
  pointerHandlers,
}: CaseInsertTemplateLayerProps) {
  const artworkSlots = templateState.additionalArtworkEnabled
    ? templateState.artworkSlots
    : []

  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      <CaseInsertTemplateImageSlot
        paneId={paneId}
        slot={templateState.titleArtwork}
        layout={layout}
        group="titleArtwork"
        dragTarget={{ kind: 'primary', slotKey: 'titleArtwork' }}
        pointerHandlers={pointerHandlers}
      />
      {artworkSlots.map((slot) => (
        <CaseInsertTemplateImageSlot
          key={slot.id}
          paneId={paneId}
          slot={slot}
          layout={layout}
          group="artwork"
          dragTarget={{
            kind: 'group',
            slotKey: 'artworkSlots',
            slotId: slot.id,
          }}
          pointerHandlers={pointerHandlers}
        />
      ))}
    </div>
  )
}

export function CaseInsertTemplateLogoLayer({
  paneId,
  templateState,
  layout,
  pointerHandlers,
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
          dragTarget={{ kind: 'group', slotKey: 'logoSlots', slotId: slot.id }}
          pointerHandlers={pointerHandlers}
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
  pointerHandlers,
  brandingSources,
}: CaseInsertTemplateLayerProps & {
  kind: CaseInsertTemplateMarkLayerKind
}) {
  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      {templateState.markSlots
        .filter((slot) =>
          isCaseInsertMarkSlotVisible(slot, kind, brandingSources))
        .map((slot) => (
          <CaseInsertTemplateImageSlot
            key={slot.id}
            paneId={paneId}
            slot={slot}
            layout={layout}
            group="mark"
            dragTarget={{
              kind: 'group',
              slotKey: 'markSlots',
              slotId: slot.id,
            }}
            pointerHandlers={pointerHandlers}
          />
        ))}
    </div>
  )
}

export function CaseInsertTemplateTextLayer({
  paneId,
  templateState,
  layout,
  pointerHandlers,
}: CaseInsertTemplateLayerProps) {
  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      {templateState.textBlocks.map((textBlock) => (
        <CaseInsertTemplateTextBlock
          key={textBlock.id}
          paneId={paneId}
          textBlock={textBlock}
          layout={layout}
          pointerHandlers={pointerHandlers}
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
            onPointerDown={(event) =>
              pointerHandlers.handleTemplateTextListPointerDown(
                event,
                paneId,
                textList.id,
              )}
            onPointerMove={pointerHandlers.handleTemplatePointerMove}
            onPointerUp={pointerHandlers.handleTemplatePointerUp}
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
