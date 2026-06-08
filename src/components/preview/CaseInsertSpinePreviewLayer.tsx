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
import {
  createCaseInsertSpineTextAvoidanceRegions,
  type CaseInsertTextAvoidanceRegion,
} from '../../layout/caseInsertTextOccupiedRegions'
import {
  getCaseInsertTextBackgroundColor,
  getCaseInsertTextBorderCss,
  getCaseInsertTextBorderRadiusCss,
  getCaseInsertTextShadowCss,
  getCaseInsertTextStrokeCss,
} from '../../caseInsert/textRenderStyles'
import {
  getCaseInsertTextFontFamilyCss,
} from '../../caseInsert/textStyles'
import {
  getRenderedCaseInsertTextBlock,
} from '../../caseInsert/textContent'
import type { CaseInsertPreviewLayout } from '../../layout/caseInsertPreviewLayout'
import type { JewelCasePixelRect } from '../../layout/jewelCaseLayout'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertTextBlock,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseSpineState,
} from '../../project/projectTypes'
import type {
  CaseInsertSpinePreviewPointerHandlers,
} from '../../interaction/useCaseInsertPreviewPointerDrag'
import type {
  CaseInsertBrandingSourceCatalog,
  CaseInsertMarkLayerKind,
} from '../../caseInsert/brandingSlotSources'
import {
  isCaseInsertMarkSlotVisible,
} from '../../caseInsert/brandingVisibility'
import {
  getCaseInsertLogoSlotRenderInfo,
} from '../../caseInsert/brandingLogoSlots'
import {
  createBoxPositionedImageRenderArtifact,
} from '../../render/imageRenderArtifact'
import { CaseInsertImageSlotFrame } from './CaseInsertImageSlotFrame'
import { CaseInsertSteamBannerPreviewLayer } from './CaseInsertSteamBannerPreviewLayer'

export type CaseInsertSpinePreviewLayerProps = {
  spine: ProjectJewelCaseSpineState
  layout: CaseInsertPreviewLayout
  brandingSources: CaseInsertBrandingSourceCatalog
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

function getSpineTitleTextStyle(
  style: ProjectJewelCaseSpineSideState['title']['style'],
): CSSProperties {
  return {
    color: style.color,
    fontFamily: getCaseInsertTextFontFamilyCss(style.fontFamily),
    textShadow: getCaseInsertTextShadowCss(style),
    WebkitTextStroke: getCaseInsertTextStrokeCss(style),
  }
}

function getSpineTextBackplateStyle(
  style: ProjectJewelCaseSpineSideState['title']['style'],
): CSSProperties {
  return {
    backgroundColor: getCaseInsertTextBackgroundColor(style),
    border: getCaseInsertTextBorderCss(style),
    borderRadius: getCaseInsertTextBorderRadiusCss(style),
    boxSizing: 'border-box',
    display: 'block',
    height: '100%',
    overflow: 'hidden',
    padding: 0,
    position: 'relative',
    width: '100%',
  }
}

function getSpineTextLineStyle(
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

function CaseInsertSpineTextBlock({
  side,
  textBlock,
  layout,
  brandingSources,
  avoidanceRegions,
  dragKind,
  pointerHandlers,
}: {
  side: 'left' | 'right'
  textBlock: ProjectCaseInsertTextBlock
  layout: CaseInsertPreviewLayout
  brandingSources: CaseInsertBrandingSourceCatalog
  avoidanceRegions: CaseInsertTextAvoidanceRegion[]
  dragKind:
    | { kind: 'title' }
    | { kind: 'textBlock'; textBlockId: string }
  pointerHandlers: CaseInsertSpinePreviewPointerHandlers
}) {
  const renderedTextBlock = getRenderedCaseInsertTextBlock(
    textBlock,
    brandingSources.projectMetadata,
  )
  const titleLayout = getJewelCaseSpineTitlePreviewLayout(
    side,
    renderedTextBlock,
    layout,
    avoidanceRegions,
  )

  if (!titleLayout) {
    return null
  }

  const style = {
    ...getTransformedBoxStyle(titleLayout, layout),
    ...getSpineTitleTextStyle(renderedTextBlock.style),
    backgroundColor: 'transparent',
    border: 0,
    display: 'block',
    fontSize: getLayerFontSize(titleLayout.fontSizePx, layout),
    lineHeight: getLayerFontSize(titleLayout.lineHeightPx, layout),
    padding: 0,
    textTransform: dragKind.kind === 'title' ? 'uppercase' : 'none',
  } as CSSProperties

  return (
    <div
      className={dragKind.kind === 'title'
        ? 'case-insert-spine-title'
        : 'case-insert-spine-text-block'}
      onPointerDown={(event) =>
        dragKind.kind === 'title'
          ? pointerHandlers.handleSpineTitlePointerDown(event, side)
          : pointerHandlers.handleSpineTextBlockPointerDown(
              event,
              side,
              dragKind.textBlockId,
            )}
      onPointerMove={pointerHandlers.handleSpinePointerMove}
      onPointerUp={pointerHandlers.handleSpinePointerUp}
      style={style}
    >
      <span style={getSpineTextBackplateStyle(renderedTextBlock.style)}>
        {titleLayout.lines.map((line, index) => (
          <span
            key={`${index}-${line.text}`}
            style={getSpineTextLineStyle(
              line,
              titleLayout.textBounds,
              titleLayout.lineHeightPx,
            )}
          >
            {line.text}
          </span>
        ))}
      </span>
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

  const logoRenderInfo = role === 'logo'
    ? getCaseInsertLogoSlotRenderInfo(slot)
    : null
  const imageDataUrl = logoRenderInfo?.imageDataUrl ?? slot.imageDataUrl
  const artifact = createBoxPositionedImageRenderArtifact({
    imageDataUrl,
    label: slot.label,
    alt: '',
    box: slotLayout,
  })

  if (!artifact) {
    return null
  }

  const className = [
    'case-insert-spine-overlay-box',
    `case-insert-spine-overlay-${role}`,
    role === 'artwork' && slot.frame.enabled && slot.frame.shape === 'circle'
      ? 'case-insert-image-slot-frame-host--circle'
      : '',
  ].join(' ')
  const style = getTransformedBoxStyle(artifact.box, layout)
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

  return (
    <div className={className} {...pointerProps} style={style}>
      <img src={artifact.imageDataUrl} alt={artifact.alt} draggable={false} />
      {role === 'artwork' ? <CaseInsertImageSlotFrame slot={slot} /> : null}
    </div>
  )
}

function CaseInsertSpineSidePreview({
  side,
  state,
  layout,
  brandingSources,
  pointerHandlers,
}: {
  side: 'left' | 'right'
  state: ProjectJewelCaseSpineSideState
  layout: CaseInsertPreviewLayout
  brandingSources: CaseInsertBrandingSourceCatalog
  pointerHandlers: CaseInsertSpinePreviewPointerHandlers
}) {
  const artworkSlots = state.additionalArtworkEnabled
    ? state.artworkSlots
    : []
  const markSlotsByKind = (
    kind: CaseInsertMarkLayerKind,
  ) => state.markSlots.filter((slot) =>
    isCaseInsertMarkSlotVisible(slot, kind, brandingSources))
  const avoidanceRegions = createCaseInsertSpineTextAvoidanceRegions({
    side,
    spineSide: state,
    layout,
    brandingSources,
  })

  return (
    <>
      <CaseInsertSpineBackground
        side={side}
        slot={state.background}
        layout={layout}
        pointerHandlers={pointerHandlers}
      />
      <CaseInsertSteamBannerPreviewLayer
        banner={state.steamBanner}
        layout={layout}
        target={{ kind: 'spine', side }}
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
      <CaseInsertSpineTextBlock
        side={side}
        textBlock={state.title}
        layout={layout}
        brandingSources={brandingSources}
        avoidanceRegions={avoidanceRegions}
        dragKind={{ kind: 'title' }}
        pointerHandlers={pointerHandlers}
      />
      {state.textBlocks.map((textBlock) => (
        <CaseInsertSpineTextBlock
          key={textBlock.id}
          side={side}
          textBlock={textBlock}
          layout={layout}
          brandingSources={brandingSources}
          avoidanceRegions={avoidanceRegions}
          dragKind={{ kind: 'textBlock', textBlockId: textBlock.id }}
          pointerHandlers={pointerHandlers}
        />
      ))}
      {state.logoSlots.map((slot) => (
        <CaseInsertSpineOverlaySlot
          key={slot.id}
          side={side}
          slot={slot}
          role="logo"
          layout={layout}
          dragTarget={{ kind: 'group', slotKey: 'logoSlots', slotId: slot.id }}
          pointerHandlers={pointerHandlers}
        />
      ))}
      {(['rating', 'media', 'platform', 'technical'] as const).flatMap(
        (kind) => markSlotsByKind(kind).map((slot) => (
          <CaseInsertSpineOverlaySlot
            key={`${kind}-${slot.id}`}
            side={side}
            slot={slot}
            role="mark"
            layout={layout}
            dragTarget={{
              kind: 'group',
              slotKey: 'markSlots',
              slotId: slot.id,
            }}
            pointerHandlers={pointerHandlers}
          />
        )),
      )}
    </>
  )
}

export function CaseInsertSpinePreviewLayer({
  spine,
  layout,
  brandingSources,
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
        brandingSources={brandingSources}
        pointerHandlers={pointerHandlers}
      />
      <CaseInsertSpineSidePreview
        side="right"
        state={spine.right}
        layout={layout}
        brandingSources={brandingSources}
        pointerHandlers={pointerHandlers}
      />
    </div>
  )
}
