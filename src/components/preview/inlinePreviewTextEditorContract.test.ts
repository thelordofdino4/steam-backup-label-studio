import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
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
  CONTEXTUAL_TEXT_TARGET_CAPABILITIES,
} from '../../text/contextualTextControlViewModel.ts'
import type {
  ProjectCaseInsertLayout,
} from '../../project/projectTypes.ts'
import {
  CURVED_DISC_TEXT_EXCEPTION,
  createCaseInsertInlineTextTargetKey,
  createDiscInlineTextTargetKey,
  createDiscTextPreviewEditableElementId,
  createPreviewEditableElementId,
} from '../../editor/previewEditableRegistry.ts'
import {
  assertCurvedDiscTextContextualEditorException,
  assertInlinePreviewTextEditorAdapterContract,
  CURVED_DISC_TEXT_CONTEXTUAL_EDITOR_EXCEPTION,
  type InlinePreviewTextEditorAdapterContract,
  type InlinePreviewTextEditorAdapterSurface,
  type InlinePreviewTextEditorControls,
  type InlinePreviewTextEditorProps,
} from './inlinePreviewTextEditorContract.ts'
import {
  createCaseInsertInlineTextEditorControls,
  type CaseInsertPreviewTextControlHandlers,
} from './caseInsertInlineTextEditorControls.ts'
import {
  createDiscInlineTextEditorControls,
} from './discInlineTextEditorControls.ts'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(dirname(currentDir)))

function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8')
}

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

function createCaseContractFixture({
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

function createStraightDiscContractFixture(
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

function createSupportedAdapterFixtures() {
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

test('supported contextual text adapters satisfy the shared contract', () => {
  for (const fixture of createSupportedAdapterFixtures()) {
    const session = assertInlinePreviewTextEditorAdapterContract(fixture)

    assert.equal(session.inputMode, 'adapter')
    assert.equal(session.sourceMode, false)
    assert.equal(session.targetKey, fixture.targetKey)
    assert.equal(session.value, fixture.props.value)
    assert.equal(session.lines, fixture.props.lines)
  }
})

test('HTML source mode keeps raw source separate from rendered preview text', () => {
  const fixture = createStraightDiscContractFixture()
  const session = assertInlinePreviewTextEditorAdapterContract({
    ...fixture,
    props: {
      ...fixture.props,
      sourceMode: true,
      sourceValue: '<p>hello hello</p>',
      value: 'hello hello',
    },
  })

  assert.equal(session.sourceMode, true)
  assert.equal(session.value, 'hello hello')
  assert.equal(session.sourceValue, '<p>hello hello</p>')
})

test('adapter target keys and editable registry identities remain stable', () => {
  const coverTarget: CaseInsertPreviewTextTarget = {
    scope: 'templateTextBlock',
    paneId: 'cover',
    textBlockId: 'cover-title-text',
  }
  const trayListTarget: CaseInsertPreviewTextTarget = {
    scope: 'templateTextList',
    paneId: 'tray',
    textListId: 'tray-feature-bullets',
  }
  const leftSpineTarget: CaseInsertPreviewTextTarget = {
    scope: 'spineTitle',
    side: 'left',
  }
  const rightSpineTarget: CaseInsertPreviewTextTarget = {
    scope: 'spineTextBlock',
    side: 'right',
    textBlockId: 'right-spine-custom-note',
  }

  assert.equal(
    createCaseInsertInlineTextTargetKey(coverTarget),
    'templateTextBlock:cover:cover-title-text',
  )
  assert.equal(
    getCaseInsertPreviewTextTargetKey(trayListTarget),
    'templateTextList:tray:tray-feature-bullets',
  )
  assert.equal(
    createCaseInsertInlineTextTargetKey(leftSpineTarget),
    'spineTitle:left',
  )
  assert.equal(
    createCaseInsertInlineTextTargetKey(rightSpineTarget),
    'spineTextBlock:right:right-spine-custom-note',
  )
  assert.equal(createDiscInlineTextTargetKey('title'), 'disc:title')
  assert.equal(
    createDiscTextPreviewEditableElementId('title'),
    'disc-text:title',
  )
})

test('unsupported capabilities and controls are omitted instead of faked', () => {
  const fixture = createSupportedAdapterFixtures()[0]
  const controlsWithCurvedMode: InlinePreviewTextEditorControls = {
    ...fixture.props.controls,
    utilities: {
      ...fixture.props.controls?.utilities,
      mode: {
        label: 'Mode',
        options: [{ label: 'Curved', value: 'curved' }],
        value: 'curved',
        onChange: () => undefined,
      },
    },
  }

  assert.throws(
    () =>
      assertInlinePreviewTextEditorAdapterContract({
        ...fixture,
        props: {
          ...fixture.props,
          controls: controlsWithCurvedMode,
        },
      }),
    /mode must stay omitted/,
  )

  assert.throws(
    () =>
      assertInlinePreviewTextEditorAdapterContract({
        ...fixture,
        capabilities: {
          ...fixture.capabilities,
          cancel: true,
        },
      }),
    /Cancel is not part/,
  )
})

test('delete and HTML source controls match adapter capabilities', () => {
  const fixture = createSupportedAdapterFixtures()[0]
  const controlsWithoutDelete: InlinePreviewTextEditorControls = {
    ...fixture.props.controls,
    deleteAction: undefined,
  }
  const controlsWithoutHtmlSource: InlinePreviewTextEditorControls = {
    ...fixture.props.controls,
    html: {
      ...fixture.props.controls?.html,
      source: undefined,
    },
  }

  assert.throws(
    () =>
      assertInlinePreviewTextEditorAdapterContract({
        ...fixture,
        props: {
          ...fixture.props,
          controls: controlsWithoutDelete,
        },
      }),
    /Delete-capable adapters must expose deleteAction/,
  )
  assert.throws(
    () =>
      assertInlinePreviewTextEditorAdapterContract({
        ...fixture,
        capabilities: {
          caret: true,
          commit: true,
          htmlSource: true,
          move: true,
          selection: true,
        },
      }),
    /Adapters without delete capability must omit deleteAction/,
  )
  assert.throws(
    () =>
      assertInlinePreviewTextEditorAdapterContract({
        ...fixture,
        props: {
          ...fixture.props,
          controls: controlsWithoutHtmlSource,
        },
      }),
    /HTML-source-capable adapters must expose htmlSource/,
  )
  assert.throws(
    () =>
      assertInlinePreviewTextEditorAdapterContract({
        ...fixture,
        capabilities: {
          caret: true,
          commit: true,
          delete: true,
          move: true,
          selection: true,
        },
        props: {
          ...fixture.props,
          controls: controlsWithoutHtmlSource,
          sourceMode: true,
        },
      }),
    /sourceMode requires an HTML source control/,
  )
})

test('commit and selection invariants reject missing callbacks or line data', () => {
  const fixture = createStraightDiscContractFixture()

  assert.throws(
    () =>
      assertInlinePreviewTextEditorAdapterContract({
        ...fixture,
        props: {
          ...fixture.props,
          lines: [],
        },
      }),
    /at least one rendered line/,
  )
  assert.throws(
    () =>
      assertInlinePreviewTextEditorAdapterContract({
        ...fixture,
        capabilities: {
          ...fixture.capabilities,
          selection: false as never,
        },
      }),
    /Adapter must support selection/,
  )
  assert.throws(
    () =>
      assertInlinePreviewTextEditorAdapterContract({
        ...fixture,
        props: {
          ...fixture.props,
          onDone: undefined as never,
        },
      }),
    /onDone must be a function/,
  )
  assert.throws(
    () =>
      assertInlinePreviewTextEditorAdapterContract({
        ...fixture,
        props: {
          ...fixture.props,
          geometryLines: [
            {
              caretXRatios: [],
              heightRatio: 1,
              text: 'hello',
              topRatio: 0,
            },
          ],
        },
      }),
    /must expose caret ratios/,
  )
})

test('curved disc text remains outside the rectangular adapter contract', () => {
  assertCurvedDiscTextContextualEditorException()
  assert.deepEqual(CURVED_DISC_TEXT_CONTEXTUAL_EDITOR_EXCEPTION, {
    finalRenderer: 'disc-svg-textPath',
    reason:
      'Curved disc text remains SVG/textPath based and uses a contextual menu adapter without rectangular on-canvas text input.',
    surface: 'curved-disc-text',
    supportsContextualEditor: true,
  })
  assert.equal(
    CONTEXTUAL_TEXT_TARGET_CAPABILITIES.curvedDiscCopyrightText
      .supportsContextualEditor,
    true,
  )
  assert.deepEqual(
    CONTEXTUAL_TEXT_TARGET_CAPABILITIES.curvedDiscCopyrightText
      .contextualControlIds,
    [
      'stylePreset',
      'layoutPreset',
      'fontFamily',
      'size',
      'alignment',
      'bold',
      'italic',
      'underline',
      'color',
      'contrast',
      'x',
      'y',
      'lineSpacing',
      'arcSide',
      'arcDegrees',
      'htmlSource',
      'resetStyle',
      'resetLayout',
      'delete',
    ],
  )
  assert.equal(CURVED_DISC_TEXT_EXCEPTION.renderer, 'svgTextPath')
})

test('adapter ownership does not introduce a fake visible renderer', () => {
  const discAdapter = readRepoFile(
    'src/components/preview/DiscInlineTextEditorLayer.tsx',
  )
  const discLayer = readRepoFile('src/components/preview/DiscTextLayer.tsx')
  const templateLayer = readRepoFile(
    'src/components/preview/CaseInsertTemplatePreviewLayers.tsx',
  )
  const spineLayer = readRepoFile(
    'src/components/preview/CaseInsertSpinePreviewLayer.tsx',
  )

  assert.match(discAdapter, /inputMode="adapter"/)
  assert.match(discAdapter, /isCurvedCopyrightDiscTextLayout/)
  assert.match(discAdapter, /geometryAdapter=\{geometryAdapter\}/)
  assert.doesNotMatch(discAdapter, /ribbonSlotId/)
  assert.doesNotMatch(discAdapter, /suppressCanvasInput/)
  assert.match(discAdapter, /createCurvedDiscTextEditorControls/)
  assert.doesNotMatch(discAdapter, /className="disc-inline-text-line"/)
  assert.match(discLayer, /buildDiscTextSvgLayer/)
  assert.doesNotMatch(discLayer, /hiddenTextKeys/)
  assert.doesNotMatch(discLayer, /hiddenVisibleTextKeys/)
  assert.equal((templateLayer.match(/inputMode="adapter"/g) ?? []).length, 2)
  assert.equal((spineLayer.match(/inputMode="adapter"/g) ?? []).length, 1)
})
