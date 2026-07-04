import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  CaseInsertPreviewTextTarget,
} from '../../caseInsert/previewTextSelection.ts'
import {
  getCaseInsertPreviewTextTargetKey,
} from '../../caseInsert/previewTextSelection.ts'
import {
  createCaseInsertInlineTextTargetKey,
  createDiscInlineTextTargetKey,
  createDiscTextPreviewEditableElementId,
} from '../../editor/previewEditableRegistry.ts'
import {
  assertInlinePreviewTextEditorAdapterContract,
  type InlinePreviewTextEditorControls,
} from './inlinePreviewTextEditorContract.ts'
import {
  createStraightDiscContractFixture,
  createSupportedAdapterFixtures,
} from './inlinePreviewTextEditorContractFixtures.ts'

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
