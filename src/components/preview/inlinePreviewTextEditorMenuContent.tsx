import {
  type CSSProperties,
} from 'react'
import {
  CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS,
} from './contextualTextRibbonModel'
import {
  CONTEXTUAL_TEXT_RIBBON_COMPACT_FIELD_MIN_CH,
  getContextualTextRibbonMatchedFieldWidthCh,
  getContextualTextRibbonRangeValueWidthCss,
  getInlinePreviewTextCqwPresentation,
  getInlinePreviewTextOpacityPresentation,
  isRenderableRibbonNode,
  renderContextualTextRibbonCardResetButton,
  renderContextualTextRibbonGroup,
  renderContextualTextRibbonRow,
  renderInlinePreviewHtmlSourcePanel,
  renderInlinePreviewTextArtisticFeatureGroup,
  renderInlinePreviewTextCheckboxControl,
  renderInlinePreviewTextMetadataSourceControl,
  renderInlinePreviewTextRangeControl,
  renderInlinePreviewTextSelectControl,
  renderInlinePreviewTextToggleControl,
} from './inlinePreviewTextRibbonControls'
import {
  InlinePreviewTextColorControl,
  InlinePreviewTextSizeControl,
} from './inlinePreviewTextPointColorControls'
import type {
  InlinePreviewTextEditorColorControl,
  InlinePreviewTextEditorControls,
  InlinePreviewTextEditorNumberSelectControl,
  InlinePreviewTextEditorRangeControl,
  InlinePreviewTextEditorSelectionRange,
  InlinePreviewTextEditorTab,
} from './inlinePreviewTextEditorContract'

function renderInlinePreviewTextSizeControl(
  control:
    | InlinePreviewTextEditorNumberSelectControl
    | InlinePreviewTextEditorRangeControl
    | undefined,
  selection: InlinePreviewTextEditorSelectionRange,
) {
  return (
    <InlinePreviewTextSizeControl
      control={control}
      selection={selection}
    />
  )
}

function renderInlinePreviewTextColorControl(
  control: InlinePreviewTextEditorColorControl | undefined,
  selection: InlinePreviewTextEditorSelectionRange,
  getCommandSelection: () => InlinePreviewTextEditorSelectionRange,
  options: { disabled?: boolean; label?: string } = {},
) {
  return (
    <InlinePreviewTextColorControl
      control={control}
      disabled={options.disabled}
      getCommandSelection={getCommandSelection}
      label={options.label}
      selection={selection}
    />
  )
}

export function InlinePreviewTextEditorMenuContent({
  activeTab,
  controls,
  getCommandSelection,
  isCurvedText,
  sourceDraft,
  onSourceDraftChange,
  onSelectionChange,
  selection,
}: {
  activeTab: InlinePreviewTextEditorTab
  controls?: InlinePreviewTextEditorControls
  getCommandSelection: () => InlinePreviewTextEditorSelectionRange
  selection: InlinePreviewTextEditorSelectionRange
  isCurvedText: boolean
  sourceDraft: string
  onSourceDraftChange: (value: string) => void
  onSelectionChange: (selection: InlinePreviewTextEditorSelectionRange) => void
}) {
  if (!controls) {
    return (
      <div className="contextual-text-ribbon-control-row">
        <span className="contextual-text-ribbon-empty-control">
          No controls available
        </span>
      </div>
    )
  }

  if (activeTab === 'presets') {
    return renderContextualTextRibbonRow({
      className: 'contextual-text-ribbon-control-row--presets',
      emptyLabel: 'Style presets unavailable',
      children: (
        <>
          {renderContextualTextRibbonGroup({
            id: 'style',
            label: 'Style',
            className: 'contextual-text-ribbon-group--preset-style',
            children: (
              <>
                {renderInlinePreviewTextSelectControl(
                  controls.presets?.style,
                  selection,
                )}
                {renderContextualTextRibbonCardResetButton({
                  ariaLabel: 'Reset style',
                  onClick: controls.presets?.onReset,
                })}
              </>
            ),
          })}
          {renderContextualTextRibbonGroup({
            id: 'layout-preset',
            label: 'Layout',
            className: 'contextual-text-ribbon-group--preset-layout',
            children: renderInlinePreviewTextSelectControl(
              controls.presets?.layout,
              selection,
            ),
          })}
        </>
      ),
    })
  }

  if (activeTab === 'text') {
    const fontFamilyControl = renderInlinePreviewTextSelectControl(
      controls.text?.fontFamily,
      selection,
      'STYLES',
    )
    const fontSizeControl = renderInlinePreviewTextSizeControl(
      controls.text?.size,
      selection,
    )
    const boldControl = renderInlinePreviewTextToggleControl(
      controls.text?.bold,
      selection,
      getCommandSelection,
      onSelectionChange,
    )
    const italicControl = renderInlinePreviewTextToggleControl(
      controls.text?.italic,
      selection,
      getCommandSelection,
      onSelectionChange,
    )
    const underlineControl = renderInlinePreviewTextToggleControl(
      controls.text?.underline,
      selection,
      getCommandSelection,
      onSelectionChange,
    )
    const alignmentControl = renderInlinePreviewTextSelectControl(
      controls.text?.alignment,
      selection,
      'ALIGN',
    )
    const bulletedListControl = renderInlinePreviewTextToggleControl(
      controls.text?.bulletedList,
      selection,
      getCommandSelection,
      onSelectionChange,
    )
    const fontMatchedFieldWidthCh =
      getContextualTextRibbonMatchedFieldWidthCh([controls.text?.fontFamily])
    const fontFieldStyle = {
      '--contextual-text-ribbon-stacked-field-width':
        `${fontMatchedFieldWidthCh}ch`,
    } as CSSProperties
    const paragraphMatchedFieldWidthCh =
      getContextualTextRibbonMatchedFieldWidthCh(
        [controls.text?.alignment],
        CONTEXTUAL_TEXT_RIBBON_COMPACT_FIELD_MIN_CH,
      )
    const paragraphFieldStyle = {
      '--contextual-text-ribbon-stacked-field-width':
        `${paragraphMatchedFieldWidthCh}ch`,
    } as CSSProperties
    const fontFieldControls =
      isRenderableRibbonNode(fontFamilyControl) ||
      isRenderableRibbonNode(fontSizeControl)
        ? (
          <span
            className="contextual-text-ribbon-control-stack contextual-text-ribbon-control-stack--font-fields"
            style={fontFieldStyle}
          >
            {fontFamilyControl}
            {fontSizeControl}
          </span>
        )
        : null
    const emphasisControls =
      isRenderableRibbonNode(boldControl) ||
      isRenderableRibbonNode(italicControl) ||
      isRenderableRibbonNode(underlineControl)
        ? (
          <span
            aria-label="Text emphasis"
            className="contextual-text-ribbon-button-cluster contextual-text-ribbon-button-cluster--emphasis"
          >
            <span
              aria-hidden="true"
              className="contextual-text-ribbon-button-cluster-heading"
            >
              FORMAT
            </span>
            {boldControl}
            {italicControl}
            {underlineControl}
          </span>
        )
        : null
    const paragraphFieldControls = isRenderableRibbonNode(alignmentControl)
      ? (
        <span
          className="contextual-text-ribbon-control-stack contextual-text-ribbon-control-stack--paragraph-fields"
          style={paragraphFieldStyle}
        >
          {alignmentControl}
        </span>
      )
      : null
    const paragraphCommandControls = isRenderableRibbonNode(bulletedListControl)
      ? (
        <span
          aria-label="Paragraph commands"
          className="contextual-text-ribbon-button-cluster contextual-text-ribbon-button-cluster--paragraph"
        >
          <span
            aria-hidden="true"
            className="contextual-text-ribbon-button-cluster-caption"
          >
            LIST
          </span>
          {bulletedListControl}
        </span>
      )
      : null

    return renderContextualTextRibbonRow({
      className: 'contextual-text-ribbon-control-row--text',
      emptyLabel: 'Text controls unavailable',
      children: (
        <>
          {renderContextualTextRibbonGroup({
            id: 'font',
            label: 'Font',
            children: (
              <>
                {fontFieldControls}
                {emphasisControls}
              </>
            ),
          })}
          {renderContextualTextRibbonGroup({
            id: 'paragraph',
            label: 'Paragraph',
            children: (
              <>
                {paragraphFieldControls}
                {paragraphCommandControls}
              </>
            ),
          })}
        </>
      ),
    })
  }

  if (activeTab === 'art') {
    const isBackgroundEnabled = controls.art?.backgroundEnabled?.checked ?? true
    const isBorderEnabled = controls.art?.borderEnabled?.checked ?? true
    const isBorderAvailable = !controls.art?.borderEnabled?.disabled
    const areBorderFieldsEnabled = isBorderAvailable && isBorderEnabled

    return renderContextualTextRibbonRow({
      className: 'contextual-text-ribbon-control-row--artistic',
      emptyLabel: 'Artistic controls unavailable',
      children: (
        <>
          {renderContextualTextRibbonGroup({
            id: 'text-color',
            label: 'Text Color',
            className: 'contextual-text-ribbon-group--paint',
            children: renderInlinePreviewTextColorControl(
              controls.art?.color,
              selection,
              getCommandSelection,
            ),
          })}
          {renderContextualTextRibbonGroup({
            id: 'contrast',
            label: 'Contrast',
            className: 'contextual-text-ribbon-group--paint',
            children: renderInlinePreviewTextSelectControl(
              controls.art?.contrast,
              selection,
            ),
          })}
          {renderInlinePreviewTextArtisticFeatureGroup({
            id: 'background',
            label: 'Background',
            toggle: controls.art?.backgroundEnabled,
            children: (
              <>
                {renderInlinePreviewTextColorControl(
                  controls.art?.backgroundColor,
                  selection,
                  getCommandSelection,
                  {
                    disabled: !isBackgroundEnabled,
                    label: 'Fill color',
                  },
                )}
                {renderInlinePreviewTextRangeControl(
                  controls.art?.backgroundOpacity,
                  {
                    disabled: !isBackgroundEnabled,
                    presentation: getInlinePreviewTextOpacityPresentation(),
                  },
                )}
                {renderInlinePreviewTextRangeControl(
                  controls.art?.backgroundPadding,
                  {
                    disabled: !isBackgroundEnabled,
                    presentation:
                      getInlinePreviewTextCqwPresentation('Padding'),
                  },
                )}
              </>
            ),
          })}
          {renderInlinePreviewTextArtisticFeatureGroup({
            id: 'border',
            label: 'Border',
            toggle: controls.art?.borderEnabled,
            children: (
              <>
                {renderInlinePreviewTextColorControl(
                  controls.art?.borderColor,
                  selection,
                  getCommandSelection,
                  {
                    disabled: !areBorderFieldsEnabled,
                    label: 'Line color',
                  },
                )}
                {renderInlinePreviewTextRangeControl(
                  controls.art?.borderRadius,
                  {
                    disabled: !areBorderFieldsEnabled,
                    presentation:
                      getInlinePreviewTextCqwPresentation('Radius'),
                  },
                )}
              </>
            ),
          })}
        </>
      ),
    })
  }

  if (activeTab === 'html') {
    return renderContextualTextRibbonRow({
      className: 'contextual-text-ribbon-control-row--html',
      emptyLabel: 'HTML source unavailable',
      children: renderInlinePreviewHtmlSourcePanel({
        control: controls.html?.source,
        isCurvedText,
        sourceDraft,
        onSourceDraftChange,
      }),
    })
  }

  const positionControls =
    controls.utilities?.x ||
    controls.utilities?.y
      ? (
        <span className="contextual-text-ribbon-control-stack contextual-text-ribbon-control-stack--utility-position">
          {renderInlinePreviewTextRangeControl(controls.utilities?.x)}
          {renderInlinePreviewTextRangeControl(controls.utilities?.y)}
        </span>
      )
      : null
  const isCurvedLayoutRangeStack = Boolean(
    isCurvedText &&
    (controls.utilities?.lineSpacing || controls.utilities?.arcDegrees),
  )
  const layoutRangeStyle = isCurvedLayoutRangeStack
    ? {
      '--contextual-text-ribbon-curved-layout-value-width':
        getContextualTextRibbonRangeValueWidthCss([
          controls.utilities?.lineSpacing,
          controls.utilities?.arcDegrees,
        ]),
    } as CSSProperties
    : undefined
  const layoutRangeControls =
    controls.utilities?.width ||
    controls.utilities?.lineSpacing ||
    controls.utilities?.arcDegrees ||
    controls.utilities?.respectVisualElements
      ? (
        <span
          aria-label="Layout measurements and visual avoidance"
          className={[
            'contextual-text-ribbon-control-stack contextual-text-ribbon-control-stack--utility-layout-ranges',
            isCurvedLayoutRangeStack
              ? 'contextual-text-ribbon-control-stack--utility-curved-layout-ranges'
              : '',
          ].filter(Boolean).join(' ')}
          style={layoutRangeStyle}
        >
          {renderInlinePreviewTextRangeControl(controls.utilities?.width)}
          {renderInlinePreviewTextRangeControl(
            controls.utilities?.lineSpacing,
          )}
          {renderInlinePreviewTextRangeControl(
            controls.utilities?.arcDegrees,
          )}
          {renderInlinePreviewTextCheckboxControl(
            controls.utilities?.respectVisualElements,
          )}
        </span>
      )
      : null
  const layoutOptionControls =
    controls.utilities?.mode ||
    controls.utilities?.arcSide
      ? (
        <span
          aria-label="Layout options"
          className={[
            'contextual-text-ribbon-control-stack contextual-text-ribbon-control-stack--utility-layout-options',
            isCurvedLayoutRangeStack
              ? 'contextual-text-ribbon-control-stack--utility-curved-layout-options'
              : '',
          ].filter(Boolean).join(' ')}
        >
          {renderInlinePreviewTextSelectControl(
            controls.utilities?.mode,
            selection,
          )}
          {renderInlinePreviewTextSelectControl(
            controls.utilities?.arcSide,
            selection,
          )}
        </span>
      )
      : null
  const layoutGroupSize = layoutOptionControls
    ? isCurvedLayoutRangeStack
      ? CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['layout-curved']
      : CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.layout
    : isCurvedLayoutRangeStack
      ? CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['layout-curved-compact']
      : CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['layout-compact']

  return renderContextualTextRibbonRow({
    className: 'contextual-text-ribbon-control-row--utilities',
    emptyLabel: 'Utility controls unavailable',
    children: (
      <>
        {renderContextualTextRibbonGroup({
          id: 'position',
          label: 'Position',
          className: 'contextual-text-ribbon-group--position',
          children: positionControls,
        })}
        {renderContextualTextRibbonGroup({
          id: 'layout',
          label: 'Layout',
          size: layoutGroupSize,
          children: (
            <>
              {layoutRangeControls}
              {layoutOptionControls}
              {renderContextualTextRibbonCardResetButton({
                ariaLabel: 'Reset layout',
                onClick: controls.utilities?.resetLayout,
              })}
            </>
          ),
        })}
        {renderContextualTextRibbonGroup({
          id: 'metadata-source',
          label: 'Source',
          className: 'contextual-text-ribbon-group--metadata-source contextual-text-ribbon-group--span-rows',
          children: renderInlinePreviewTextMetadataSourceControl(
            controls.utilities?.metadataSource,
          ),
        })}
      </>
    ),
  })
}
