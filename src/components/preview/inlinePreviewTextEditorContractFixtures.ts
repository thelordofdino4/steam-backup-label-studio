import {
  getCaseInsertTextBlockLayoutPresets,
  getCaseInsertTextListLayoutPresets,
} from '../../caseInsert/textLayout.ts'
import type {
  CaseInsertPreviewTextTarget,
} from '../../caseInsert/previewTextSelection.ts'
import {
  getCaseInsertPreviewTextTargetKey,
} from '../../caseInsert/previewTextSelection.ts'
import {
  createDefaultCaseInsertTextStyle,
} from '../../caseInsert/textStyles.ts'
import {
  createDefaultDiscTextLayout,
  type DiscTextKey,
} from '../../discText/index.ts'
import {
  createDefaultDiscTextStyle,
} from '../../discText/styles.ts'
import {
  createDiscInlineTextTargetKey,
  createDiscTextPreviewEditableElementId,
  createPreviewEditableElementId,
} from '../../editor/previewEditableRegistry.ts'
import type {
  ProjectCaseInsertLayout,
} from '../../project/projectTypes.ts'
import {
  createCaseInsertInlineTextEditorControls,
  type CaseInsertPreviewTextControlHandlers,
} from './caseInsertInlineTextEditorControls.ts'
import {
  createDiscInlineTextEditorControls,
} from './discInlineTextEditorControls.ts'
import type {
  InlinePreviewTextEditorAdapterContract,
  InlinePreviewTextEditorAdapterSurface,
  InlinePreviewTextEditorControls,
  InlinePreviewTextEditorProps,
} from './inlinePreviewTextEditorContract.ts'

function noopPointer() {
  return undefined
}

function createCaseHandlers(): CaseInsertPreviewTextControlHandlers {
  return {
    onEnabledChange: () => undefined,
    onStyleChange: () => undefined,
    onApplyStylePreset: () => undefined,
    onApplyLayoutPreset: () => undefined,
    onResetStyle: () => undefined,
    onResetLayout: () => undefined,
    onLayoutChange: () => undefined,
    onAlignChange: () => undefined,
    onAvoidVisualElementsChange: () => undefined,
    onContentModeChange: () => undefined,
  }
}

function createCaseTextBlockLayout(): ProjectCaseInsertLayout {
  return {
    rotation: 0,
    scale: 1.1,
    width: 68,
    x: 36,
    y: 42,
  }
}

function createEditorProps({
  ariaLabel,
  controls,
  geometryLines,
  sourceMode = false,
  sourceValue,
  targetKey,
}: {
  ariaLabel: string
  controls: InlinePreviewTextEditorControls
  geometryLines?: InlinePreviewTextEditorProps['geometryLines']
  sourceMode?: boolean
  sourceValue?: string
  targetKey: string
}): InlinePreviewTextEditorProps {
  return {
    ariaLabel,
    caretValue: 'hello hello',
    controls,
    geometryLines,
    inputMode: 'adapter',
    lines: [{ text: 'hello hello' }],
    sourceValue,
    sourceMode,
    targetKey,
    value: 'hello hello',
    onDone: () => undefined,
    onMoveHandlePointerDown: noopPointer,
    onMoveHandlePointerMove: noopPointer,
    onMoveHandlePointerUp: noopPointer,
    onValueChange: () => undefined,
  }
}

export function createCaseContractFixture({
  label,
  previewEditableId,
  surface,
  target,
}: {
  label: string
  previewEditableId: string
  surface: InlinePreviewTextEditorAdapterSurface
  target: CaseInsertPreviewTextTarget
}): InlinePreviewTextEditorAdapterContract {
  const layout = createCaseTextBlockLayout()
  const style = createDefaultCaseInsertTextStyle(
    target.scope === 'templateTextList' ? 'features' : 'title',
  )
  const layoutPresets =
    target.scope === 'templateTextList'
      ? getCaseInsertTextListLayoutPresets(target.paneId)
      : getCaseInsertTextBlockLayoutPresets(
          target.scope === 'templateTextBlock' ? target.paneId : 'spine',
          {
            align: 'center',
            avoidVisualElements: false,
            enabled: true,
            id:
              target.scope === 'templateTextBlock'
                ? target.textBlockId
                : target.scope === 'spineTextBlock'
                  ? target.textBlockId
                  : 'spine-title',
            label,
            layout,
            source: 'manual',
            style,
            value: 'hello hello',
          },
        )
  const targetKey = getCaseInsertPreviewTextTargetKey(target)
  const controls = createCaseInsertInlineTextEditorControls({
    align: target.scope === 'templateTextList' ? undefined : 'center',
    avoidVisualElements: false,
    handlers: createCaseHandlers(),
    label,
    layout,
    layoutPresets,
    style,
    target,
  })

  return {
    capabilities: {
      caret: true,
      commit: true,
      delete: true,
      htmlSource: true,
      move: true,
      selection: true,
    },
    finalRenderer: 'case-insert-dom-text',
    previewEditableId,
    props: createEditorProps({
      ariaLabel: `Edit ${label}`,
      controls,
      targetKey,
    }),
    surface,
    targetKey,
  }
}

export function createStraightDiscContractFixture(
  key: DiscTextKey = 'title',
): InlinePreviewTextEditorAdapterContract {
  const layout = {
    ...createDefaultDiscTextLayout('top')[key],
    mode: 'straight' as const,
  }
  const targetKey = createDiscInlineTextTargetKey(key)
  const controls = createDiscInlineTextEditorControls({
    isHtmlSourceEnabled: false,
    key,
    layout,
    onApplyDiscTextStylePreset: () => undefined,
    onDiscTextAlignmentChange: () => undefined,
    onDiscTextContentModeChange: () => undefined,
    onDiscTextEnabledChange: () => undefined,
    onDiscTextLayoutChange: () => undefined,
    onDiscTextStyleChange: () => undefined,
    onDiscTextVisualAvoidanceChange: () => undefined,
    onResetDiscTextLayout: () => undefined,
    onResetDiscTextStyle: () => undefined,
    onSelectedDiscTextKeyChange: () => undefined,
    style: createDefaultDiscTextStyle(key),
  })

  return {
    capabilities: {
      caret: true,
      commit: true,
      delete: true,
      htmlSource: true,
      move: true,
      selection: true,
    },
    finalRenderer: 'disc-svg-text',
    previewEditableId: createDiscTextPreviewEditableElementId(key),
    props: createEditorProps({
      ariaLabel: 'Edit Game title',
      controls,
      geometryLines: [
        {
          caretXRatios: [0, 0.45, 1],
          heightRatio: 1,
          text: 'hello hello',
          topRatio: 0,
        },
      ],
      targetKey,
    }),
    surface: 'straight-disc-text',
    targetKey,
  }
}

export function createSupportedAdapterFixtures() {
  return [
    createCaseContractFixture({
      label: 'Cover title',
      previewEditableId: createPreviewEditableElementId(
        'case',
        'cover',
        'text-block',
        'cover-title-text',
      ),
      surface: 'case-cover-text',
      target: {
        scope: 'templateTextBlock',
        paneId: 'cover',
        textBlockId: 'cover-title-text',
      },
    }),
    createCaseContractFixture({
      label: 'Tray feature bullets',
      previewEditableId: createPreviewEditableElementId(
        'case',
        'tray',
        'text-list',
        'tray-feature-bullets',
      ),
      surface: 'case-tray-text',
      target: {
        scope: 'templateTextList',
        paneId: 'tray',
        textListId: 'tray-feature-bullets',
      },
    }),
    createCaseContractFixture({
      label: 'Left spine title',
      previewEditableId: createPreviewEditableElementId(
        'case',
        'spine',
        'left',
        'title',
      ),
      surface: 'case-left-spine-text',
      target: {
        scope: 'spineTitle',
        side: 'left',
      },
    }),
    createCaseContractFixture({
      label: 'Right spine note',
      previewEditableId: createPreviewEditableElementId(
        'case',
        'spine',
        'right',
        'text-block',
        'right-spine-custom-note',
      ),
      surface: 'case-right-spine-text',
      target: {
        scope: 'spineTextBlock',
        side: 'right',
        textBlockId: 'right-spine-custom-note',
      },
    }),
    createStraightDiscContractFixture(),
  ] satisfies InlinePreviewTextEditorAdapterContract[]
}
