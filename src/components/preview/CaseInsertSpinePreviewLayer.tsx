import type { CSSProperties, PointerEvent } from 'react'
import type {
  JewelCaseSpineImageSlotGroupKey,
  JewelCaseSpineImageSlotKey,
} from '../../caseInsert/jewelCaseTransitions'
import {
  getJewelCaseSpineBackgroundFit,
  getJewelCaseSpineImageSlotPreviewLayout,
  getJewelCaseSpineTextLayoutSliderRanges,
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
  getCaseInsertTextDecoration,
  getCaseInsertTextEffectiveFontWeight,
  getCaseInsertTextFontFamilyCss,
  getCaseInsertTextFontStyle,
} from '../../caseInsert/textStyles'
import {
  getCaseInsertTextBlockLayoutPresets,
} from '../../caseInsert/textLayout'
import {
  getRenderedCaseInsertTextBlock,
} from '../../caseInsert/textContent'
import type { CaseInsertPreviewLayout } from '../../layout/caseInsertPreviewLayout'
import type { JewelCasePixelRect } from '../../layout/jewelCaseLayout'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertSteamBanner,
  ProjectCaseInsertTextBlock,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseSpineState,
} from '../../project/projectTypes'
import type {
  CaseInsertSpinePreviewPointerHandlers,
} from '../../interaction/useCaseInsertPreviewPointerDrag'
import {
  caseInsertPreviewTextTargetsMatch,
  getCaseInsertPreviewTextTargetKey,
  type CaseInsertPreviewTextTarget,
} from '../../caseInsert/previewTextSelection'
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
  createPreviewEditableAttributes,
  createPreviewEditableElementId,
} from '../../editor/previewElementOverlay'
import {
  createBoxPositionedImageRenderArtifact,
} from '../../render/imageRenderArtifact'
import {
  getCaseInsertPreviewTextEditValue,
} from '../../caseInsert/previewTextEditing'
import {
  isHtmlTextEnabled,
} from '../../text/htmlText'
import {
  InlinePreviewTextEditor,
  INLINE_PREVIEW_TEXT_HOST_CLASS,
  INLINE_PREVIEW_TEXT_LINE_INDEX_ATTRIBUTE,
  INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE,
} from './InlinePreviewTextEditor'
import {
  createCaseInsertInlineTextEditorControls,
  type CaseInsertPreviewTextControlHandlers,
} from './caseInsertInlineTextEditorControls'
import { CaseInsertImageSlotFrame } from './CaseInsertImageSlotFrame'
import { CaseInsertSteamBannerPreviewLayer } from './CaseInsertSteamBannerPreviewLayer'
import { ContentBoundedImage } from './ContentBoundedImage'

export type CaseInsertSpinePreviewLayerProps = {
  spine: ProjectJewelCaseSpineState
  layout: CaseInsertPreviewLayout
  brandingSources: CaseInsertBrandingSourceCatalog
  selectedTextTarget: CaseInsertPreviewTextTarget | null
  pointerHandlers: CaseInsertSpinePreviewPointerHandlers
  onSelectedTextTargetChange: (
    target: CaseInsertPreviewTextTarget | null,
  ) => void
  onTextTargetValueChange: (
    target: CaseInsertPreviewTextTarget,
    value: string,
  ) => void
  onTextTargetEditComplete: (target: CaseInsertPreviewTextTarget) => void
  previewTextControlHandlers: CaseInsertPreviewTextControlHandlers
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
  baseFontWeight: number,
): CSSProperties {
  return {
    color: style.color,
    fontFamily: getCaseInsertTextFontFamilyCss(style.fontFamily),
    fontStyle: getCaseInsertTextFontStyle(style),
    fontWeight: getCaseInsertTextEffectiveFontWeight(baseFontWeight, style),
    textDecorationLine: getCaseInsertTextDecoration(style),
    textShadow: getCaseInsertTextShadowCss(style),
    WebkitTextStroke: getCaseInsertTextStrokeCss(style),
  }
}

function getSpineTextBackplateStyle(
  style: ProjectJewelCaseSpineSideState['title']['style'],
): CSSProperties {
  const hasVisibleBackplate = style.backgroundEnabled

  return {
    backgroundColor: getCaseInsertTextBackgroundColor(style),
    border: getCaseInsertTextBorderCss(style),
    borderRadius: getCaseInsertTextBorderRadiusCss(style),
    boxSizing: 'border-box',
    cursor: hasVisibleBackplate ? 'grab' : undefined,
    display: 'block',
    height: '100%',
    overflow: 'hidden',
    padding: 0,
    pointerEvents: hasVisibleBackplate ? 'auto' : 'none',
    position: 'relative',
    touchAction: hasVisibleBackplate ? 'none' : undefined,
    userSelect: 'none',
    width: '100%',
  }
}

function getSpineTextLineStyle(
  line: { left: number; y: number; width: number },
  textBounds: JewelCasePixelRect,
  lineHeightPx: number,
): CSSProperties {
  return {
    cursor: 'grab',
    display: 'block',
    height: `${lineHeightPx / textBounds.height * 100}%`,
    left: `${(line.left - textBounds.x) / textBounds.width * 100}%`,
    lineHeight: 'inherit',
    overflow: 'visible',
    pointerEvents: 'auto',
    position: 'absolute',
    textAlign: 'left',
    top: `${(line.y - textBounds.y) / textBounds.height * 100}%`,
    touchAction: 'none',
    userSelect: 'none',
    whiteSpace: 'pre',
    width: `${line.width / textBounds.width * 100}%`,
  }
}

function renderSpineTextLineContent(
  line: {
    text: string
    runs?: Array<{
      text: string
      bold?: boolean
      italic?: boolean
      underline?: boolean
      color?: string
      backgroundColor?: string
      fontFamily?: string
      fontSizePx?: number
      fontWeight?: number
      fontStyle?: 'normal' | 'italic'
      textDecoration?: 'none' | 'underline'
    }>
  },
  baseFontSizePx: number,
) {
  const runs = line.runs?.filter((run) => run.text)
  const hasStyledRuns = runs?.some((run) =>
    run.bold ||
    run.italic ||
    run.underline ||
    run.color ||
    run.backgroundColor ||
    run.fontFamily ||
    run.fontSizePx ||
    run.fontWeight ||
    run.fontStyle ||
    run.textDecoration)

  if (!runs || !hasStyledRuns) {
    return line.text
  }

  return runs.map((run, index) => (
    <span
      key={`${index}-${run.text}`}
      style={{
        backgroundColor: run.backgroundColor,
        color: run.color,
        fontFamily: run.fontFamily,
        fontSize: run.fontSizePx ? `${run.fontSizePx / baseFontSizePx}em` : undefined,
        fontStyle: run.fontStyle ?? (run.italic ? 'italic' : undefined),
        fontWeight: run.fontWeight ?? (run.bold ? 800 : undefined),
        textDecorationLine:
          run.textDecoration === 'underline' || run.underline
            ? 'underline'
            : run.textDecoration,
      }}
    >
      {run.text}
    </span>
  ))
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
  steamBanner,
  layout,
  pointerHandlers,
}: {
  side: 'left' | 'right'
  slot: ProjectCaseInsertImageSlot
  steamBanner: ProjectCaseInsertSteamBanner
  layout: CaseInsertPreviewLayout
  pointerHandlers: CaseInsertSpinePreviewPointerHandlers
}) {
  const backgroundFit = getJewelCaseSpineBackgroundFit(
    side,
    slot,
    layout,
    steamBanner,
  )

  if (!backgroundFit || !slot.imageDataUrl) {
    return null
  }

  return (
    <div
      className="case-insert-spine-background-clip"
      {...createPreviewEditableAttributes({
        id: createPreviewEditableElementId('case', 'spine', side, 'background'),
        label: `${side === 'left' ? 'Left' : 'Right'} spine background artwork`,
        kind: 'background',
      })}
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
      <ContentBoundedImage
        alt=""
        className="case-insert-spine-background-image"
        draggable={false}
        imageSize={slot.imageSize}
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
  selectedTextTarget,
  pointerHandlers,
  onSelectedTextTargetChange,
  onTextTargetValueChange,
  onTextTargetEditComplete,
  previewTextControlHandlers,
}: {
  side: 'left' | 'right'
  textBlock: ProjectCaseInsertTextBlock
  layout: CaseInsertPreviewLayout
  brandingSources: CaseInsertBrandingSourceCatalog
  avoidanceRegions: CaseInsertTextAvoidanceRegion[]
  dragKind:
    | { kind: 'title' }
    | { kind: 'textBlock'; textBlockId: string }
  selectedTextTarget: CaseInsertPreviewTextTarget | null
  pointerHandlers: CaseInsertSpinePreviewPointerHandlers
  onSelectedTextTargetChange: (
    target: CaseInsertPreviewTextTarget | null,
  ) => void
  onTextTargetValueChange: (
    target: CaseInsertPreviewTextTarget,
    value: string,
  ) => void
  onTextTargetEditComplete: (target: CaseInsertPreviewTextTarget) => void
  previewTextControlHandlers: CaseInsertPreviewTextControlHandlers
}) {
  const renderedTextBlock = getRenderedCaseInsertTextBlock(
    textBlock,
    brandingSources.projectMetadata,
  )
  const textTarget: CaseInsertPreviewTextTarget = dragKind.kind === 'title'
    ? { scope: 'spineTitle', side }
    : {
        scope: 'spineTextBlock',
        side,
        textBlockId: dragKind.textBlockId,
      }
  const isSelected = caseInsertPreviewTextTargetsMatch(
    selectedTextTarget,
    textTarget,
  )
  const targetKey = getCaseInsertPreviewTextTargetKey(textTarget)
  const editValue = getCaseInsertPreviewTextEditValue(
    textBlock,
    brandingSources.projectMetadata,
  )
  const isHtmlSourceEditing = isSelected && isHtmlTextEnabled(textBlock)
  const layoutTextBlock = isSelected && !isHtmlSourceEditing
    ? { ...renderedTextBlock, value: editValue }
    : renderedTextBlock
  const titleLayout = getJewelCaseSpineTitlePreviewLayout(
    side,
    layoutTextBlock,
    layout,
    avoidanceRegions,
  )

  if (!titleLayout) {
    return null
  }

  const isEmptyText = layoutTextBlock.value.trim().length === 0
  const layoutRanges = getJewelCaseSpineTextLayoutSliderRanges(
    side,
    layoutTextBlock,
    layout,
  )
  const editorControls = isSelected
    ? createCaseInsertInlineTextEditorControls({
        align: layoutTextBlock.align,
        avoidVisualElements: layoutTextBlock.avoidVisualElements,
        handlers: previewTextControlHandlers,
        label: renderedTextBlock.label,
        layout: layoutTextBlock.layout,
        layoutPresets: getCaseInsertTextBlockLayoutPresets(
          'spine',
          layoutTextBlock,
        ),
        contentMode: layoutTextBlock.contentMode,
        scaleMax: dragKind.kind === 'title' ? 1.6 : 1.8,
        scaleMin: dragKind.kind === 'title' ? 0.7 : 0.5,
        style: layoutTextBlock.style,
        target: textTarget,
        widthFallback: dragKind.kind === 'title' ? 90 : undefined,
        xLabel: 'Cross',
        xMax: layoutRanges.x.max,
        xMin: layoutRanges.x.min,
        xStep: 0.1,
        yLabel: 'Length',
        yMax: layoutRanges.y.max,
        yMin: layoutRanges.y.min,
        yStep: 0.1,
        onDeleteComplete: () => onSelectedTextTargetChange(null),
        onResetLayout: () => previewTextControlHandlers.onResetLayout(textTarget),
      })
    : undefined
  const style = {
    ...getTransformedBoxStyle(titleLayout, layout),
    ...getSpineTitleTextStyle(
      layoutTextBlock.style,
      dragKind.kind === 'title' ? 800 : 600,
    ),
    backgroundColor: 'transparent',
    border: 0,
    display: 'block',
    fontSize: getLayerFontSize(titleLayout.fontSizePx, layout),
    lineHeight: getLayerFontSize(titleLayout.lineHeightPx, layout),
    padding: 0,
    pointerEvents: 'auto',
    textTransform: dragKind.kind === 'title' ? 'uppercase' : 'none',
    userSelect: 'none',
  } as CSSProperties

  return (
    <div
      className={[
        dragKind.kind === 'title'
          ? 'case-insert-spine-title'
          : 'case-insert-spine-text-block',
        isSelected ? `${INLINE_PREVIEW_TEXT_HOST_CLASS} is-editing` : '',
        isHtmlSourceEditing ? 'is-html-source' : '',
        isSelected && isEmptyText ? 'is-empty' : '',
      ].filter(Boolean).join(' ')}
      {...createPreviewEditableAttributes({
        id: dragKind.kind === 'title'
          ? createPreviewEditableElementId('case', 'spine', side, 'title')
          : createPreviewEditableElementId(
              'case',
              'spine',
              side,
              'text-block',
              dragKind.textBlockId,
            ),
        label: renderedTextBlock.label,
        kind: 'text',
      })}
      {...(isSelected
        ? { [INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE]: targetKey }
        : {})}
      onPointerDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onSelectedTextTargetChange(textTarget)
      }}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onSelectedTextTargetChange(textTarget)
      }}
      style={style}
    >
      <span
        className="case-insert-text-render-content"
        style={getSpineTextBackplateStyle(layoutTextBlock.style)}
      >
        {titleLayout.lines.map((line, index) => (
          <span
            key={`${index}-${line.text}`}
            {...{ [INLINE_PREVIEW_TEXT_LINE_INDEX_ATTRIBUTE]: index }}
            style={getSpineTextLineStyle(
              line,
              titleLayout.textBounds,
              titleLayout.lineHeightPx,
            )}
          >
            {renderSpineTextLineContent(line, titleLayout.fontSizePx)}
          </span>
        ))}
      </span>
      {isSelected ? (
        <InlinePreviewTextEditor
          ariaLabel={`Edit ${renderedTextBlock.label}`}
          caretValue={
            !isHtmlSourceEditing && dragKind.kind === 'title'
              ? editValue.toLocaleUpperCase()
              : editValue
          }
          controls={editorControls}
          inputMode="adapter"
          lines={titleLayout.lines}
          sourceMode={isHtmlSourceEditing}
          targetKey={targetKey}
          value={editValue}
          textareaStyle={{ textAlign: layoutTextBlock.align }}
          menuPlacement="below"
          onValueChange={(value) =>
            onTextTargetValueChange(textTarget, value)}
          onMoveHandlePointerDown={(event) =>
            dragKind.kind === 'title'
              ? pointerHandlers.handleSpineTitlePointerDown(event, side)
              : pointerHandlers.handleSpineTextBlockPointerDown(
                  event,
                  side,
                  dragKind.textBlockId,
                )}
          onMoveHandlePointerMove={pointerHandlers.handleSpinePointerMove}
          onMoveHandlePointerUp={pointerHandlers.handleSpinePointerUp}
          onDone={() => onTextTargetEditComplete(textTarget)}
        />
      ) : null}
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
  const imageSize = logoRenderInfo?.imageSize ?? slot.imageSize
  const artifact = createBoxPositionedImageRenderArtifact({
    imageDataUrl,
    imageSize,
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
    role === 'artwork' &&
      slot.frame.enabled &&
      slot.frame.shape === 'circle' &&
      !artifact.contentShape
      ? 'case-insert-image-slot-frame-host--circle'
      : '',
    artifact.contentBounds ? 'case-insert-spine-overlay-box--content-bounded' : '',
    artifact.contentShape ? 'case-insert-spine-overlay-box--content-shaped' : '',
  ].filter(Boolean).join(' ')
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
  const editableAttributes = createPreviewEditableAttributes({
    id: dragTarget.kind === 'primary'
      ? createPreviewEditableElementId('case', 'spine', side, dragTarget.slotKey)
      : createPreviewEditableElementId(
          'case',
          'spine',
          side,
          dragTarget.slotKey,
          dragTarget.slotId,
        ),
    label: slot.label,
    kind: role === 'logo' ? 'logo' : role === 'mark' ? 'mark' : 'artwork',
  })

  return (
    <div
      className={className}
      {...editableAttributes}
      {...pointerProps}
      style={style}
    >
      <ContentBoundedImage
        src={artifact.imageDataUrl}
        alt={artifact.alt}
        imageSize={artifact.imageSize}
        draggable={false}
      />
      {role === 'artwork' ? <CaseInsertImageSlotFrame slot={slot} /> : null}
    </div>
  )
}

function CaseInsertSpineSidePreview({
  side,
  state,
  layout,
  brandingSources,
  selectedTextTarget,
  pointerHandlers,
  onSelectedTextTargetChange,
  onTextTargetValueChange,
  onTextTargetEditComplete,
  previewTextControlHandlers,
}: {
  side: 'left' | 'right'
  state: ProjectJewelCaseSpineSideState
  layout: CaseInsertPreviewLayout
  brandingSources: CaseInsertBrandingSourceCatalog
  selectedTextTarget: CaseInsertPreviewTextTarget | null
  pointerHandlers: CaseInsertSpinePreviewPointerHandlers
  onSelectedTextTargetChange: (
    target: CaseInsertPreviewTextTarget | null,
  ) => void
  onTextTargetValueChange: (
    target: CaseInsertPreviewTextTarget,
    value: string,
  ) => void
  onTextTargetEditComplete: (target: CaseInsertPreviewTextTarget) => void
  previewTextControlHandlers: CaseInsertPreviewTextControlHandlers
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
        steamBanner={state.steamBanner}
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
        selectedTextTarget={selectedTextTarget}
        pointerHandlers={pointerHandlers}
        onSelectedTextTargetChange={onSelectedTextTargetChange}
        onTextTargetValueChange={onTextTargetValueChange}
        onTextTargetEditComplete={onTextTargetEditComplete}
        previewTextControlHandlers={previewTextControlHandlers}
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
          selectedTextTarget={selectedTextTarget}
          pointerHandlers={pointerHandlers}
          onSelectedTextTargetChange={onSelectedTextTargetChange}
          onTextTargetValueChange={onTextTargetValueChange}
          onTextTargetEditComplete={onTextTargetEditComplete}
          previewTextControlHandlers={previewTextControlHandlers}
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
  selectedTextTarget,
  pointerHandlers,
  onSelectedTextTargetChange,
  onTextTargetValueChange,
  onTextTargetEditComplete,
  previewTextControlHandlers,
}: CaseInsertSpinePreviewLayerProps) {
  if (!layout.surfaces.some(({ surfaceId }) => surfaceId === 'back')) {
    return null
  }

  return (
    <div className="case-insert-content-layer">
      <CaseInsertSpineSidePreview
        side="left"
        state={spine.left}
        layout={layout}
        brandingSources={brandingSources}
        selectedTextTarget={selectedTextTarget}
        pointerHandlers={pointerHandlers}
        onSelectedTextTargetChange={onSelectedTextTargetChange}
        onTextTargetValueChange={onTextTargetValueChange}
        onTextTargetEditComplete={onTextTargetEditComplete}
        previewTextControlHandlers={previewTextControlHandlers}
      />
      <CaseInsertSpineSidePreview
        side="right"
        state={spine.right}
        layout={layout}
        brandingSources={brandingSources}
        selectedTextTarget={selectedTextTarget}
        pointerHandlers={pointerHandlers}
        onSelectedTextTargetChange={onSelectedTextTargetChange}
        onTextTargetValueChange={onTextTargetValueChange}
        onTextTargetEditComplete={onTextTargetEditComplete}
        previewTextControlHandlers={previewTextControlHandlers}
      />
    </div>
  )
}
