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
  getCaseInsertTextBlockLayoutPresets,
  getCaseInsertTextListLayoutPresets,
} from '../../caseInsert/textLayout'
import {
  getRenderedCaseInsertTextBlock,
} from '../../caseInsert/textContent'
import {
  getCaseInsertPreviewTextEditValue,
} from '../../caseInsert/previewTextEditing'
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
  ProjectCaseInsertTextList,
} from '../../project/projectTypes'
import {
  createPreviewEditableAttributes,
  createPreviewEditableElementId,
} from '../../editor/previewElementOverlay'
import type {
  CaseInsertTemplatePreviewPointerHandlers,
} from '../../interaction/useCaseInsertPreviewPointerDrag'
import {
  caseInsertPreviewTextTargetsMatch,
  getCaseInsertPreviewTextTargetKey,
  type CaseInsertPreviewTextTarget,
} from '../../caseInsert/previewTextSelection'
import {
  createRectPositionedImageRenderArtifact,
} from '../../render/imageRenderArtifact'
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
import { ContentBoundedImage } from './ContentBoundedImage'

export type CaseInsertTemplateLayerProps = {
  paneId: CaseInsertTemplatePaneId
  templateState: ProjectCaseInsertSurfaceState
  layout: CaseInsertPreviewLayout
  pointerHandlers: CaseInsertTemplatePreviewPointerHandlers
  brandingSources: CaseInsertBrandingSourceCatalog
}

type CaseInsertTemplateTextLayerProps = CaseInsertTemplateLayerProps & {
  selectedTextTarget: CaseInsertPreviewTextTarget | null
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
  const editableAttributes = createPreviewEditableAttributes({
    id: dragTarget.kind === 'primary'
      ? createPreviewEditableElementId('case', paneId, dragTarget.slotKey)
      : createPreviewEditableElementId(
          'case',
          paneId,
          dragTarget.slotKey,
          dragTarget.slotId,
        ),
    label: slot.label,
    kind: group === 'logo' ? 'logo' : group === 'mark' ? 'mark' : 'artwork',
  })

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
        {...editableAttributes}
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
      editableAttributes={editableAttributes}
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
  selectedTextTarget,
  pointerHandlers,
  onSelectedTextTargetChange,
  onTextTargetValueChange,
  onTextTargetEditComplete,
  previewTextControlHandlers,
}: {
  paneId: CaseInsertTemplatePaneId
  textBlock: ProjectCaseInsertTextBlock
  layout: CaseInsertPreviewLayout
  brandingSources: CaseInsertBrandingSourceCatalog
  avoidanceRegions: CaseInsertTextAvoidanceRegion[]
  selectedTextTarget: CaseInsertPreviewTextTarget | null
  pointerHandlers: CaseInsertTemplatePreviewPointerHandlers
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
  const textTarget: CaseInsertPreviewTextTarget = {
    scope: 'templateTextBlock',
    paneId,
    textBlockId: renderedTextBlock.id,
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
  const layoutTextBlock = isSelected
    ? { ...renderedTextBlock, value: editValue }
    : renderedTextBlock
  const textAvoidanceRegions = avoidanceRegions.filter(
    (region) => region.sourceTextBlockId !== renderedTextBlock.id,
  )
  const textLayout = paneId === 'cover'
    ? getJewelCaseFrontTextBlockPreviewLayout(
        layoutTextBlock,
        layout,
        textAvoidanceRegions,
      )
    : getJewelCaseBackTextBlockPreviewLayout(
        layoutTextBlock,
        layout,
        getCaseInsertBackTextBlockRole(layoutTextBlock),
        textAvoidanceRegions,
      )

  if (!textLayout) {
    return null
  }

  const isEmptyText = layoutTextBlock.value.trim().length === 0
  const style = {
    ...getRectStyle(textLayout.bounds, layout),
    ...getCaseInsertTextCssStyle(layoutTextBlock.style),
    backgroundColor: 'transparent',
    border: 0,
    display: 'block',
    fontSize: getLayerFontSize(textLayout.fontSizePx, layout),
    lineHeight: getLayerFontSize(textLayout.lineHeightPx, layout),
    padding: 0,
    textTransform: getTemplateTextTransform(paneId, layoutTextBlock),
  } as CSSProperties
  const textareaStyle = {
    textAlign: layoutTextBlock.align,
  } as CSSProperties
  const editorControls = isSelected
    ? createCaseInsertInlineTextEditorControls({
        align: layoutTextBlock.align,
        avoidVisualElements: layoutTextBlock.avoidVisualElements,
        handlers: previewTextControlHandlers,
        label: renderedTextBlock.label,
        layout: layoutTextBlock.layout,
        layoutPresets: getCaseInsertTextBlockLayoutPresets(
          paneId,
          layoutTextBlock,
        ),
        style: layoutTextBlock.style,
        target: textTarget,
        onDeleteComplete: () => onSelectedTextTargetChange(null),
        onResetLayout: () =>
          previewTextControlHandlers.onResetLayout(textTarget),
      })
    : undefined

  return (
    <div
      className={[
        'case-insert-template-text-block',
        `case-insert-template-text-block-${paneId}`,
        isSelected ? `${INLINE_PREVIEW_TEXT_HOST_CLASS} is-editing` : '',
        isSelected && isEmptyText ? 'is-empty' : '',
      ].filter(Boolean).join(' ')}
      {...createPreviewEditableAttributes({
        id: createPreviewEditableElementId(
          'case',
          paneId,
          'text-block',
          renderedTextBlock.id,
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
      <span style={getCaseInsertTextBackplateCssStyle(layoutTextBlock.style)}>
        {textLayout.lines.map((line, index) => (
          <span
            key={`${index}-${line.text}`}
            {...{ [INLINE_PREVIEW_TEXT_LINE_INDEX_ATTRIBUTE]: index }}
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
      {isSelected ? (
        <InlinePreviewTextEditor
          ariaLabel={`Edit ${renderedTextBlock.label}`}
          caretValue={
            getTemplateTextTransform(paneId, layoutTextBlock) === 'uppercase'
              ? editValue.toLocaleUpperCase()
              : editValue
          }
          controls={editorControls}
          inputMode="adapter"
          lines={textLayout.lines}
          targetKey={targetKey}
          value={editValue}
          textareaStyle={textareaStyle}
          menuPlacement="below"
          onValueChange={(value) =>
            onTextTargetValueChange(textTarget, value)}
          onMoveHandlePointerDown={(event) =>
            pointerHandlers.handleTemplateTextBlockPointerDown(
              event,
              paneId,
              renderedTextBlock.id,
            )}
          onMoveHandlePointerMove={pointerHandlers.handleTemplatePointerMove}
          onMoveHandlePointerUp={pointerHandlers.handleTemplatePointerUp}
          onDone={() => onTextTargetEditComplete(textTarget)}
        />
      ) : null}
    </div>
  )
}

function getPreviewTextListValue(textList: ProjectCaseInsertTextList) {
  return textList.items.map((item) => `• ${item}`).join('\n')
}

function CaseInsertTemplateTextList({
  paneId,
  textList,
  layout,
  avoidanceRegions,
  selectedTextTarget,
  pointerHandlers,
  onSelectedTextTargetChange,
  onTextTargetValueChange,
  onTextTargetEditComplete,
  previewTextControlHandlers,
}: {
  paneId: CaseInsertTemplatePaneId
  textList: ProjectCaseInsertTextList
  layout: CaseInsertPreviewLayout
  avoidanceRegions: CaseInsertTextAvoidanceRegion[]
  selectedTextTarget: CaseInsertPreviewTextTarget | null
  pointerHandlers: CaseInsertTemplatePreviewPointerHandlers
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
  const textListLayout = getJewelCaseBackTextListPreviewLayout(
    textList,
    layout,
    avoidanceRegions,
  )

  if (!textListLayout) {
    return null
  }

  const textTarget: CaseInsertPreviewTextTarget = {
    scope: 'templateTextList',
    paneId,
    textListId: textList.id,
  }
  const isSelected = caseInsertPreviewTextTargetsMatch(
    selectedTextTarget,
    textTarget,
  )
  const targetKey = getCaseInsertPreviewTextTargetKey(textTarget)
  const textListStyle = {
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
  const editorControls = isSelected
    ? createCaseInsertInlineTextEditorControls({
        avoidVisualElements: textList.avoidVisualElements,
        handlers: previewTextControlHandlers,
        label: textList.label,
        layout: textList.layout,
        layoutPresets: getCaseInsertTextListLayoutPresets(paneId),
        style: textList.style,
        target: textTarget,
        onDeleteComplete: () => onSelectedTextTargetChange(null),
        onResetLayout: () =>
          previewTextControlHandlers.onResetLayout(textTarget),
      })
    : undefined

  return (
    <div
      className={[
        'case-insert-template-feature-list',
        isSelected ? `${INLINE_PREVIEW_TEXT_HOST_CLASS} is-editing` : '',
      ].filter(Boolean).join(' ')}
      {...createPreviewEditableAttributes({
        id: createPreviewEditableElementId(
          'case',
          paneId,
          'text-list',
          textList.id,
        ),
        label: textList.label,
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
      style={textListStyle}
    >
      <span style={getCaseInsertTextBackplateCssStyle(textList.style)}>
        {textListLayout.lines.map((line, index) => (
          <span
            key={`${index}-${line.text}`}
            {...{ [INLINE_PREVIEW_TEXT_LINE_INDEX_ATTRIBUTE]: index }}
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
      {isSelected ? (
        <InlinePreviewTextEditor
          ariaLabel={`Edit ${textList.label}`}
          caretValue={getPreviewTextListValue(textList)}
          controls={editorControls}
          inputMode="adapter"
          lines={textListLayout.lines}
          targetKey={targetKey}
          value={getPreviewTextListValue(textList)}
          textareaStyle={{ textAlign: 'left' }}
          menuPlacement="below"
          onValueChange={(value) =>
            onTextTargetValueChange(textTarget, value)}
          onMoveHandlePointerDown={(event) =>
            pointerHandlers.handleTemplateTextListPointerDown(
              event,
              paneId,
              textList.id,
            )}
          onMoveHandlePointerMove={pointerHandlers.handleTemplatePointerMove}
          onMoveHandlePointerUp={pointerHandlers.handleTemplatePointerUp}
          onDone={() => onTextTargetEditComplete(textTarget)}
        />
      ) : null}
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
      {...createPreviewEditableAttributes({
        id: createPreviewEditableElementId('case', paneId, 'background'),
        label: `${paneId === 'cover' ? 'Cover' : 'Tray'} background artwork`,
        kind: 'background',
      })}
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
  selectedTextTarget,
  onSelectedTextTargetChange,
  onTextTargetValueChange,
  onTextTargetEditComplete,
  previewTextControlHandlers,
}: CaseInsertTemplateTextLayerProps) {
  const avoidanceRegions = createCaseInsertTemplateTextAvoidanceRegions({
    paneId,
    templateState,
    layout,
    brandingSources,
  })
  return (
    <div className="case-insert-content-layer">
      {templateState.textBlocks.map((textBlock) => (
        <CaseInsertTemplateTextBlock
          key={textBlock.id}
          paneId={paneId}
          textBlock={textBlock}
          layout={layout}
          brandingSources={brandingSources}
          avoidanceRegions={avoidanceRegions}
          selectedTextTarget={selectedTextTarget}
          pointerHandlers={pointerHandlers}
          onSelectedTextTargetChange={onSelectedTextTargetChange}
          onTextTargetValueChange={onTextTargetValueChange}
          onTextTargetEditComplete={onTextTargetEditComplete}
          previewTextControlHandlers={previewTextControlHandlers}
        />
      ))}
      {templateState.textLists.map((textList) => {
        const textAvoidanceRegions = avoidanceRegions.filter(
          (region) => region.sourceTextListId !== textList.id,
        )

        return (
          <CaseInsertTemplateTextList
            key={textList.id}
            paneId={paneId}
            textList={textList}
            layout={layout}
            avoidanceRegions={textAvoidanceRegions}
            selectedTextTarget={selectedTextTarget}
            pointerHandlers={pointerHandlers}
            onSelectedTextTargetChange={onSelectedTextTargetChange}
            onTextTargetValueChange={onTextTargetValueChange}
            onTextTargetEditComplete={onTextTargetEditComplete}
            previewTextControlHandlers={previewTextControlHandlers}
          />
        )
      })}
    </div>
  )
}
