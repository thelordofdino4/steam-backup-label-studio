import { useState, type CSSProperties } from 'react'
import type {
  CaseInsertBrandingSourceCatalog,
} from '../../caseInsert/brandingSlotSources'
import { getCaseInsertBackTextBlockRole } from '../../caseInsert/textReadability'
import {
  getCaseInsertTextBackgroundColor,
  getCaseInsertTextBorderCss,
  getCaseInsertTextBorderRadiusCss,
  getCaseInsertTextShadowCss,
  getCaseInsertTextStrokeCss,
} from '../../caseInsert/textRenderStyles'
import {
  getCaseInsertTextBlockStyleRole,
  getCaseInsertTextDecoration,
  getCaseInsertTextEffectiveFontWeight,
  getCaseInsertTextFontFamilyCss,
  getCaseInsertTextFontStyle,
  getCaseInsertTextListStyleRole,
} from '../../caseInsert/textStyles'
import {
  getCaseInsertTextBlockLayoutPresets,
  getCaseInsertTextListLayoutPresets,
} from '../../caseInsert/textLayout'
import {
  caseInsertExportPxToFontSizePt,
  getCaseInsertTextSizeRoleFromId,
} from '../../caseInsert/textSizing'
import { getRenderedCaseInsertTextBlock } from '../../caseInsert/textContent'
import {
  getCaseInsertPreviewTextEditValue,
  getCaseInsertPreviewTextListEditValue,
} from '../../caseInsert/previewTextEditing'
import {
  caseInsertPreviewTextTargetsMatch,
  getCaseInsertPreviewTextTargetKey,
  type CaseInsertPreviewTextTarget,
} from '../../caseInsert/previewTextSelection'
import {
  getRenderableRichTextRuns,
  getRichTextRunDomStyle,
  richTextRunsHaveVisualStyles,
} from '../../text/richTextRunStyle'
import {
  createCaseInsertTemplateTextAvoidanceRegions,
  type CaseInsertTextAvoidanceRegion,
} from '../../layout/caseInsertTextOccupiedRegions'
import {
  getJewelCaseBackTextBlockPreviewLayout,
  getJewelCaseBackTextListPreviewLayout,
} from '../../layout/jewelCaseBackLayout'
import { getJewelCaseFrontTextBlockPreviewLayout } from '../../layout/jewelCaseFrontLayout'
import type { JewelCasePixelRect } from '../../layout/jewelCaseLayout'
import type {
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
} from '../../project/projectTypes'
import {
  createInlinePreviewTextTargetAttributes,
  createPreviewEditableAttributes,
  createPreviewEditableElementId,
} from '../../editor/previewElementOverlay'
import {
  InlinePreviewTextEditor,
  INLINE_PREVIEW_TEXT_HOST_CLASS,
  INLINE_PREVIEW_TEXT_LINE_INDEX_ATTRIBUTE,
} from './InlinePreviewTextEditor'
import {
  createCaseInsertInlineTextEditorControls,
  createCaseInsertInlineTextMetadataSourceControl,
  type CaseInsertPreviewTextControlHandlers,
} from './caseInsertInlineTextEditorControls'
import type {
  CaseInsertTemplateTextLayerProps,
} from './CaseInsertTemplatePreviewLayerTypes'
import {
  getLayerFontSize,
  getRectStyle,
} from './caseInsertTemplatePreviewGeometry'

function getCaseInsertTextCssStyle(
  textStyle: ProjectCaseInsertTextBlock['style'],
  baseFontWeight: number,
): CSSProperties {
  return {
    color: textStyle.color,
    fontFamily: getCaseInsertTextFontFamilyCss(textStyle.fontFamily),
    fontStyle: getCaseInsertTextFontStyle(textStyle),
    fontWeight: getCaseInsertTextEffectiveFontWeight(baseFontWeight, textStyle),
    textDecorationLine: getCaseInsertTextDecoration(textStyle),
    textShadow: getCaseInsertTextShadowCss(textStyle),
    WebkitTextStroke: getCaseInsertTextStrokeCss(textStyle),
  }
}

function getTemplateTextBlockFontWeight(
  paneId: CaseInsertTemplateTextLayerProps['paneId'],
  textBlock: ProjectCaseInsertTextBlock,
) {
  if (paneId === 'cover') {
    return 800
  }

  return textBlock.id.includes('legal') || textBlock.id.includes('copyright')
    ? 500
    : 600
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
    pointerEvents: 'none',
    position: 'absolute',
    inset: 0,
    width: '100%',
  }
}

function getCaseInsertTextContentCssStyle(): CSSProperties {
  return {
    display: 'block',
    height: '100%',
    overflow: 'visible',
    padding: 0,
    position: 'relative',
    width: '100%',
  }
}

function getTemplateTextTransform(
  paneId: CaseInsertTemplateTextLayerProps['paneId'],
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

function renderCaseInsertTextLineContent(
  line: {
    text: string
    runs?: Parameters<typeof getRenderableRichTextRuns>[0]
  },
  baseFontSizePx: number,
) {
  const baseFontSizePt = caseInsertExportPxToFontSizePt(baseFontSizePx)
  const runs = getRenderableRichTextRuns(line.runs)

  if (!richTextRunsHaveVisualStyles(runs)) {
    return line.text
  }

  return runs.map((run, index) => (
    <span
      key={`${index}-${run.text}`}
      style={getRichTextRunDomStyle(run, baseFontSizePx, baseFontSizePt)}
    >
      {run.text}
    </span>
  ))
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
  paneId: CaseInsertTemplateTextLayerProps['paneId']
  textBlock: ProjectCaseInsertTextBlock
  layout: CaseInsertTemplateTextLayerProps['layout']
  brandingSources: CaseInsertBrandingSourceCatalog
  avoidanceRegions: CaseInsertTextAvoidanceRegion[]
  selectedTextTarget: CaseInsertPreviewTextTarget | null
  pointerHandlers: CaseInsertTemplateTextLayerProps['pointerHandlers']
  onSelectedTextTargetChange: (
    target: CaseInsertPreviewTextTarget | null,
  ) => void
  onTextTargetValueChange: (
    target: CaseInsertPreviewTextTarget,
    value: string,
    options?: { sourceMode?: boolean },
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
  const [htmlSourceTargetKey, setHtmlSourceTargetKey] =
    useState<string | null>(null)
  const isHtmlSourceEditing = isSelected && htmlSourceTargetKey === targetKey
  const editValue = getCaseInsertPreviewTextEditValue(
    textBlock,
    brandingSources.projectMetadata,
  )
  const sourceValue = getCaseInsertPreviewTextEditValue(
    textBlock,
    brandingSources.projectMetadata,
    { sourceMode: true },
  )
  const layoutTextBlock = isSelected && !isHtmlSourceEditing
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
    ...getCaseInsertTextCssStyle(
      layoutTextBlock.style,
      getTemplateTextBlockFontWeight(paneId, layoutTextBlock),
    ),
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
        contentMode: layoutTextBlock.contentMode,
        htmlSourceActive: isHtmlSourceEditing,
        fontSizeRole: getCaseInsertTextSizeRoleFromId(layoutTextBlock.id),
        metadataSource: createCaseInsertInlineTextMetadataSourceControl({
          textBlock,
          projectMetadata: brandingSources.projectMetadata,
          onUseMetadataValue: previewTextControlHandlers.onUseMetadataValue
            ? () => previewTextControlHandlers.onUseMetadataValue?.(textTarget)
            : undefined,
        }),
        style: layoutTextBlock.style,
        target: textTarget,
        onDeleteComplete: () => onSelectedTextTargetChange(null),
        onHtmlSourceActiveChange: (active) =>
          setHtmlSourceTargetKey(active ? targetKey : null),
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
        isHtmlSourceEditing ? 'is-html-source' : '',
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
      data-smoke-id={`case-text-block-${paneId}-${renderedTextBlock.id}`}
      {...(isSelected
        ? createInlinePreviewTextTargetAttributes(targetKey)
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
        aria-hidden="true"
        className="case-insert-text-render-backplate"
        style={getCaseInsertTextBackplateCssStyle(layoutTextBlock.style)}
      />
      <span
        className="case-insert-text-render-content"
        style={getCaseInsertTextContentCssStyle()}
      >
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
            {renderCaseInsertTextLineContent(line, textLayout.fontSizePx)}
          </span>
        ))}
      </span>
      {isSelected ? (
        <InlinePreviewTextEditor
          ariaLabel={`Edit ${renderedTextBlock.label}`}
          caretValue={
            !isHtmlSourceEditing &&
              getTemplateTextTransform(paneId, layoutTextBlock) === 'uppercase'
              ? editValue.toLocaleUpperCase()
              : editValue
          }
          controls={editorControls}
          inputMode="adapter"
          lines={textLayout.lines}
          sourceValue={sourceValue}
          sourceMode={isHtmlSourceEditing}
          targetKey={targetKey}
          value={editValue}
          textareaStyle={textareaStyle}
          onValueChange={(value, options) =>
            onTextTargetValueChange(textTarget, value, options)}
          onMoveHandlePointerDown={(event) =>
            pointerHandlers.handleTemplateTextBlockPointerDown(
              event,
              paneId,
              renderedTextBlock.id,
            )}
          onMoveHandlePointerMove={pointerHandlers.handleTemplatePointerMove}
          onMoveHandlePointerUp={pointerHandlers.handleTemplatePointerUp}
          onRichTextKeyboardCommand={(command, selection) =>
            previewTextControlHandlers.onRichTextKeyboardCommand?.(
              textTarget,
              command,
              selection,
            )}
          onDone={() => {
            setHtmlSourceTargetKey(null)
            onTextTargetEditComplete(textTarget)
          }}
        />
      ) : null}
    </div>
  )
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
  paneId: CaseInsertTemplateTextLayerProps['paneId']
  textList: ProjectCaseInsertTextList
  layout: CaseInsertTemplateTextLayerProps['layout']
  avoidanceRegions: CaseInsertTextAvoidanceRegion[]
  selectedTextTarget: CaseInsertPreviewTextTarget | null
  pointerHandlers: CaseInsertTemplateTextLayerProps['pointerHandlers']
  onSelectedTextTargetChange: (
    target: CaseInsertPreviewTextTarget | null,
  ) => void
  onTextTargetValueChange: (
    target: CaseInsertPreviewTextTarget,
    value: string,
    options?: { sourceMode?: boolean },
  ) => void
  onTextTargetEditComplete: (target: CaseInsertPreviewTextTarget) => void
  previewTextControlHandlers: CaseInsertPreviewTextControlHandlers
}) {
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
  const [htmlSourceTargetKey, setHtmlSourceTargetKey] =
    useState<string | null>(null)
  const isHtmlSourceEditing = isSelected && htmlSourceTargetKey === targetKey
  const textListLayout = getJewelCaseBackTextListPreviewLayout(
    textList,
    layout,
    avoidanceRegions,
  )

  if (!textListLayout) {
    return null
  }

  const editValue = getCaseInsertPreviewTextListEditValue(textList)
  const sourceValue = getCaseInsertPreviewTextListEditValue(textList, {
    sourceMode: true,
  })
  const textListStyle = {
    ...getRectStyle(textListLayout.bounds, layout),
    ...getCaseInsertTextCssStyle(textList.style, 600),
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
        contentMode: textList.contentMode,
        htmlSourceActive: isHtmlSourceEditing,
        fontSizeRole: getCaseInsertTextSizeRoleFromId(
          textList.id,
          'trayFeatures',
        ),
        style: textList.style,
        target: textTarget,
        onDeleteComplete: () => onSelectedTextTargetChange(null),
        onHtmlSourceActiveChange: (active) =>
          setHtmlSourceTargetKey(active ? targetKey : null),
        onResetLayout: () =>
          previewTextControlHandlers.onResetLayout(textTarget),
      })
    : undefined

  return (
    <div
      className={[
        'case-insert-template-feature-list',
        isSelected ? `${INLINE_PREVIEW_TEXT_HOST_CLASS} is-editing` : '',
        isHtmlSourceEditing ? 'is-html-source' : '',
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
      data-smoke-id={`case-text-list-${paneId}-${textList.id}`}
      {...(isSelected
        ? createInlinePreviewTextTargetAttributes(targetKey)
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
      <span
        aria-hidden="true"
        className="case-insert-text-render-backplate"
        style={getCaseInsertTextBackplateCssStyle(textList.style)}
      />
      <span
        className="case-insert-text-render-content"
        style={getCaseInsertTextContentCssStyle()}
      >
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
            {renderCaseInsertTextLineContent(line, textListLayout.fontSizePx)}
          </span>
        ))}
      </span>
      {isSelected ? (
        <InlinePreviewTextEditor
          ariaLabel={`Edit ${textList.label}`}
          caretValue={editValue}
          controls={editorControls}
          inputMode="adapter"
          lines={textListLayout.lines}
          sourceValue={sourceValue}
          sourceMode={isHtmlSourceEditing}
          targetKey={targetKey}
          value={editValue}
          textareaStyle={{ textAlign: 'left' }}
          onValueChange={(value, options) =>
            onTextTargetValueChange(textTarget, value, options)}
          onMoveHandlePointerDown={(event) =>
            pointerHandlers.handleTemplateTextListPointerDown(
              event,
              paneId,
              textList.id,
            )}
          onMoveHandlePointerMove={pointerHandlers.handleTemplatePointerMove}
          onMoveHandlePointerUp={pointerHandlers.handleTemplatePointerUp}
          onRichTextKeyboardCommand={(command, selection) =>
            previewTextControlHandlers.onRichTextKeyboardCommand?.(
              textTarget,
              command,
              selection,
            )}
          onDone={() => {
            setHtmlSourceTargetKey(null)
            onTextTargetEditComplete(textTarget)
          }}
        />
      ) : null}
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
