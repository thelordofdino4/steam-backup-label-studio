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
import {
  getCaseInsertTextBackgroundColor,
  getCaseInsertTextBorderCss,
  getCaseInsertTextBorderRadiusCss,
  getCaseInsertTextShadowCss,
  getCaseInsertTextStrokeCss,
} from '../../caseInsert/textRenderStyles'
import {
  getCaseInsertTextBlockStyleRole,
  getCaseInsertTextFontFamilyCss,
  getCaseInsertTextListStyleRole,
} from '../../caseInsert/textStyles'
import {
  getRenderedCaseInsertTextBlock,
} from '../../caseInsert/textContent'
import {
  getFeatureVisibleRepeatedArtworkItems,
} from '../../editor/repeatedArtwork'
import type { CaseInsertPreviewLayout } from '../../layout/caseInsertPreviewLayout'
import {
  createCaseInsertTemplateTextAvoidanceRegions,
  type CaseInsertTextAvoidanceRegion,
} from '../../layout/caseInsertTextOccupiedRegions'
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
import {
  createRectPositionedImageRenderArtifact,
} from '../../render/imageRenderArtifact'
import { CaseInsertImageSlotFrame } from './CaseInsertImageSlotFrame'
import { ContentBoundedImage } from './ContentBoundedImage'

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

function getCaseInsertTextCssStyle(
  textStyle: ProjectCaseInsertTextBlock['style'],
): CSSProperties {
  return {
    color: textStyle.color,
    fontFamily: getCaseInsertTextFontFamilyCss(textStyle.fontFamily),
    textShadow: getCaseInsertTextShadowCss(textStyle),
    WebkitTextStroke: getCaseInsertTextStrokeCss(textStyle),
  }
}

function getCaseInsertTextBackplateCssStyle(
  textStyle: ProjectCaseInsertTextBlock['style'],
): CSSProperties {
  return {
    backgroundColor: getCaseInsertTextBackgroundColor(textStyle),
    border: getCaseInsertTextBorderCss(textStyle),
    borderRadius: getCaseInsertTextBorderRadiusCss(textStyle),
    boxSizing: 'border-box',
    display: 'block',
    height: '100%',
    overflow: 'hidden',
    padding: 0,
    position: 'relative',
    width: '100%',
  }
}

function getTemplateTextTransform(
  paneId: CaseInsertTemplatePaneId,
  textBlock: ProjectCaseInsertTextBlock,
) {
  if (paneId !== 'cover') {
    return undefined
  }

  const role = getCaseInsertTextBlockStyleRole(textBlock)

  return role === 'title' ? 'uppercase' : 'none'
}

function getCaseInsertTextLineStyle(
  line: { left: number; y: number; width: number },
  textBounds: JewelCasePixelRect,
  lineHeightPx: number,
): CSSProperties {
  return {
    display: 'block',
    height: `${lineHeightPx / textBounds.height * 100}%`,
    left: `${(line.left - textBounds.x) / textBounds.width * 100}%`,
    lineHeight: 'inherit',
    overflow: 'visible',
    position: 'absolute',
    textAlign: 'left',
    top: `${(line.y - textBounds.y) / textBounds.height * 100}%`,
    whiteSpace: 'pre',
    width: `${line.width / textBounds.width * 100}%`,
  }
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
  const imageSize = logoRenderInfo?.imageSize ?? slot.imageSize

  const artifact = createRectPositionedImageRenderArtifact({
    imageDataUrl,
    imageSize,
    label: slot.label,
    alt: '',
    rect,
  })

  if (!artifact) {
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
      slot.frame.enabled && slot.frame.shape === 'circle' && !artifact.contentShape
        ? 'case-insert-image-slot-frame-host--circle'
        : '',
      artifact.contentBounds
        ? 'case-insert-template-framed-artwork--content-bounded'
        : '',
      artifact.contentShape
        ? 'case-insert-template-framed-artwork--content-shaped'
        : '',
    ].filter(Boolean).join(' ')

    return (
      <div
        className={className}
        {...pointerProps}
        style={getRectStyle(artifact.rect, layout)}
      >
        <ContentBoundedImage
          alt=""
          className="case-insert-template-framed-artwork-image"
          draggable={false}
          imageSize={imageSize}
          src={artifact.imageDataUrl}
        />
        <CaseInsertImageSlotFrame slot={slot} />
      </div>
    )
  }

  return (
    <ContentBoundedImage
      alt=""
      className={`case-insert-template-overlay-image case-insert-template-${group}`}
      draggable={false}
      imageSize={artifact.imageSize}
      {...pointerProps}
      src={artifact.imageDataUrl}
      style={getRectStyle(artifact.rect, layout)}
    />
  )
}

function CaseInsertTemplateTextBlock({
  paneId,
  textBlock,
  layout,
  brandingSources,
  avoidanceRegions,
  pointerHandlers,
}: {
  paneId: CaseInsertTemplatePaneId
  textBlock: ProjectCaseInsertTextBlock
  layout: CaseInsertPreviewLayout
  brandingSources: CaseInsertBrandingSourceCatalog
  avoidanceRegions: CaseInsertTextAvoidanceRegion[]
  pointerHandlers: CaseInsertTemplatePreviewPointerHandlers
}) {
  const renderedTextBlock = getRenderedCaseInsertTextBlock(
    textBlock,
    brandingSources.projectMetadata,
  )
  const textAvoidanceRegions = avoidanceRegions.filter(
    (region) => region.sourceTextBlockId !== renderedTextBlock.id,
  )
  const textLayout = paneId === 'cover'
    ? getJewelCaseFrontTextBlockPreviewLayout(
        renderedTextBlock,
        layout,
        textAvoidanceRegions,
      )
    : getJewelCaseBackTextBlockPreviewLayout(
        renderedTextBlock,
        layout,
        getCaseInsertBackTextBlockRole(renderedTextBlock),
        textAvoidanceRegions,
      )

  if (!textLayout) {
    return null
  }

  const style = {
    ...getRectStyle(textLayout.bounds, layout),
    ...getCaseInsertTextCssStyle(renderedTextBlock.style),
    backgroundColor: 'transparent',
    border: 0,
    display: 'block',
    fontSize: getLayerFontSize(textLayout.fontSizePx, layout),
    lineHeight: getLayerFontSize(textLayout.lineHeightPx, layout),
    padding: 0,
    textTransform: getTemplateTextTransform(paneId, renderedTextBlock),
  } as CSSProperties

  return (
    <div
      className={`case-insert-template-text-block case-insert-template-text-block-${paneId}`}
      onPointerDown={(event) =>
        pointerHandlers.handleTemplateTextBlockPointerDown(
          event,
          paneId,
          renderedTextBlock.id,
        )}
      onPointerMove={pointerHandlers.handleTemplatePointerMove}
      onPointerUp={pointerHandlers.handleTemplatePointerUp}
      style={style}
    >
      <span style={getCaseInsertTextBackplateCssStyle(renderedTextBlock.style)}>
        {textLayout.lines.map((line, index) => (
          <span
            key={`${index}-${line.text}`}
            style={getCaseInsertTextLineStyle(
              line,
              textLayout.bounds,
              textLayout.lineHeightPx,
            )}
          >
            {line.text}
          </span>
        ))}
      </span>
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
    ? getJewelCaseFrontBackgroundFit(
        templateState.background,
        layout,
        templateState.steamBanner,
      )
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
      <ContentBoundedImage
        alt=""
        className="case-insert-template-background-image"
        draggable={false}
        imageSize={templateState.background.imageSize}
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
  const artworkSlots = getFeatureVisibleRepeatedArtworkItems(
    templateState,
    templateState.artworkSlots,
  )

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
  brandingSources,
}: CaseInsertTemplateLayerProps) {
  const avoidanceRegions = createCaseInsertTemplateTextAvoidanceRegions({
    paneId,
    templateState,
    layout,
    brandingSources,
  })

  return (
    <div className="case-insert-content-layer" aria-hidden="true">
      {templateState.textBlocks.map((textBlock) => (
        <CaseInsertTemplateTextBlock
          key={textBlock.id}
          paneId={paneId}
          textBlock={textBlock}
          layout={layout}
          brandingSources={brandingSources}
          avoidanceRegions={avoidanceRegions}
          pointerHandlers={pointerHandlers}
        />
      ))}
      {templateState.textLists.map((textList) => {
        const textAvoidanceRegions = avoidanceRegions.filter(
          (region) => region.sourceTextListId !== textList.id,
        )
        const textListLayout = getJewelCaseBackTextListPreviewLayout(
          textList,
          layout,
          textAvoidanceRegions,
        )
        const textListStyle = textListLayout
          ? {
              ...getRectStyle(textListLayout.bounds, layout),
              ...getCaseInsertTextCssStyle(textList.style),
              backgroundColor: 'transparent',
              border: 0,
              display: 'block',
              fontSize: getLayerFontSize(textListLayout.fontSizePx, layout),
              lineHeight: getLayerFontSize(
                textListLayout.lineHeightPx,
                layout,
              ),
              padding: 0,
              textTransform:
                getCaseInsertTextListStyleRole(textList) === 'features'
                  ? 'none'
                  : undefined,
            } as CSSProperties
          : null

        return textListLayout && textListStyle ? (
          <div
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
            <span style={getCaseInsertTextBackplateCssStyle(textList.style)}>
              {textListLayout.lines.map((line, index) => (
                <span
                  key={`${index}-${line.text}`}
                  style={getCaseInsertTextLineStyle(
                    line,
                    textListLayout.bounds,
                    textListLayout.lineHeightPx,
                  )}
                >
                  {line.text}
                </span>
              ))}
            </span>
          </div>
        ) : null
      })}
    </div>
  )
}
