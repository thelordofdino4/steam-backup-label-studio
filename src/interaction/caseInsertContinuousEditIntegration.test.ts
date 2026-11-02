import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

function countOccurrences(source: string, token: string) {
  return source.split(token).length - 1
}

function sourceBetween(
  source: string,
  startToken: string,
  endToken: string,
) {
  const start = source.indexOf(startToken)
  assert.notEqual(start, -1, `missing source token: ${startToken}`)
  const end = source.indexOf(endToken, start + startToken.length)
  assert.notEqual(end, -1, `missing source token: ${endToken}`)
  return source.slice(start, end)
}

function assertOccursBefore(
  source: string,
  firstToken: string,
  secondToken: string,
) {
  const first = source.indexOf(firstToken)
  const second = source.indexOf(secondToken)
  assert.notEqual(first, -1, `missing source token: ${firstToken}`)
  assert.notEqual(second, -1, `missing source token: ${secondToken}`)
  assert.ok(first < second, `${firstToken} must precede ${secondToken}`)
}

test('App owns one Case continuous-edit boundary and one final synchronization seam', () => {
  const app = readSource('../app/App.tsx')

  assert.equal(
    countOccurrences(app, 'createCaseInsertContinuousEditCoordinator({'),
    1,
  )
  assert.equal(countOccurrences(app, '<CaseInsertContinuousEditBoundary'), 1)
  assert.equal(countOccurrences(app, '</CaseInsertContinuousEditBoundary>'), 1)

  const completionOwner = sourceBetween(
    app,
    'const completeCaseInsertContinuousEdit = useCallback',
    'const [caseInsertContinuousEditPresentationPort]',
  )
  assert.match(completionOwner, /if \(flush\) \{\s*flushSync\(complete\)/)
  assert.match(
    completionOwner,
    /finishCaseInsertContinuousEdit[\s\S]*?completeCaseInsertContinuousEdit\(targetId, true\)/,
  )
  assert.match(
    completionOwner,
    /releaseCaseInsertContinuousEdit[\s\S]*?completeCaseInsertContinuousEdit\(targetId, false\)/,
  )
  assertOccursBefore(
    completionOwner,
    'caseInsertContinuousEditCoordinator.finish',
    'setCaseInsertContinuousEditSynchronizationEpoch',
  )

  const projectSynchronization = sourceBetween(
    app,
    "if (activeWorkspace === 'home') return\n    const session = applicationLifecycleRoot.getLifecycleState().activeSession",
    'applicationLifecycleRoot.synchronizeCurrentEditorRoute({',
  )
  assertOccursBefore(
    projectSynchronization,
    'caseInsertContinuousEditCoordinator.isActive()',
    'applicationLifecycleRoot.synchronizeCurrentProject({',
  )
  assert.match(
    projectSynchronization,
    /caseInsertContinuousEditSynchronizationEpoch/,
  )

  const routeSynchronization = sourceBetween(
    app,
    'applicationLifecycleRoot.synchronizeCurrentEditorRoute({',
    'const destination = workspaceFocusRequestRef.current',
  )
  assert.doesNotMatch(routeSynchronization, /captureCurrentSavedProject/)
  assert.doesNotMatch(
    routeSynchronization,
    /caseInsertContinuousEditCoordinator\.isActive/,
  )

  const caseBranch = sourceBetween(
    app,
    "if (activeWorkspace === 'caseInsert') {",
    '<EditorRoleFocusProvider>',
  )
  assert.match(caseBranch, /<CaseInsertContinuousEditBoundary/)
  assert.match(
    caseBranch,
    /key=\{activeCaseInsertSessionId \?\? 'case-session-unavailable'\}/,
  )
  assert.match(caseBranch, /<CaseInsertEditorShell/)
})

test('session, surface, pane, and unmount boundaries finish or retire pending Case work', () => {
  const app = readSource('../app/App.tsx')
  const discReset = sourceBetween(
    app,
    'function resetDiscProjectState',
    'function resetCaseInsertProjectState',
  )
  const caseReset = sourceBetween(
    app,
    'function resetCaseInsertProjectState',
    'function handleCaseInsertNavigationSurfaceChange',
  )
  const surfaceChange = sourceBetween(
    app,
    'function handleCaseInsertNavigationSurfaceChange',
    'function handleActiveCaseInsertTemplatePaneChange',
  )
  const paneChange = sourceBetween(
    app,
    'function handleActiveCaseInsertTemplatePaneChange',
    'async function dispatchApplicationCommand',
  )
  const sessionAndUnmountEffects = sourceBetween(
    app,
    'const activeCaseInsertSessionId =',
    'const [caseInsertPresetWorkflowOwner]',
  )

  assert.match(discReset, /caseInsertContinuousEditCoordinator\.retire\(\)/)
  assert.match(caseReset, /caseInsertContinuousEditCoordinator\.retire\(\)/)
  assert.match(surfaceChange, /finishCaseInsertContinuousEdit\(\)/)
  assert.match(paneChange, /finishCaseInsertContinuousEdit\(\)/)
  assert.match(
    sessionAndUnmountEffects,
    /status\.active && status\.sessionId !== activeCaseInsertSessionId/,
  )
  assert.match(
    sessionAndUnmountEffects,
    /caseInsertContinuousEditCoordinator\.retire\(\)/,
  )
  assert.match(
    sessionAndUnmountEffects,
    /activeCaseInsertSessionIdRef\.current = null[\s\S]*?caseInsertContinuousEditCoordinator\.retire\(\)/,
  )
  assert.doesNotMatch(
    sessionAndUnmountEffects,
    /caseInsertContinuousEditCoordinator\.dispose\(\)/,
    'StrictMode effect replay must not permanently dispose the state-owned coordinator',
  )
})

test('range and direct-drag adapters share the Case owner and complete every native interaction boundary', () => {
  const range = readSource(
    '../components/editor/EditorRangeField.tsx',
  )
  const logoControls = readSource(
    '../components/editor/EditorLogoAssetControls.tsx',
  )
  const caseLogoControls = readSource(
    '../components/caseInsert/CaseInsertLogoSlotControls.tsx',
  )
  const drag = readSource('./useCaseInsertPreviewPointerDrag.ts')
  const pointer = readSource('./usePointerDrag.ts')
  const pointerAdapter = readSource('./usePointerDragAdapters.ts')
  const templateLayers = readSource(
    '../components/preview/CaseInsertTemplatePreviewLayers.tsx',
  )
  const spineLayers = readSource(
    '../components/preview/CaseInsertSpinePreviewLayer.tsx',
  )
  const viewport = readSource(
    '../components/preview/CaseInsertArtworkViewportPreview.tsx',
  )
  const boundedImage = readSource(
    '../components/preview/ContentBoundedImage.tsx',
  )

  assert.match(range, /useCaseInsertContinuousEditPresentationPort\(\)/)
  assert.match(range, /continuousEdit\.update\(\{/)
  assert.match(range, /continuousEdit\.finish\(id\)/)
  assert.match(range, /continuousEdit\?\.release\(id\)/)
  assert.match(range, /onChange=\{onInput\s*\?\s*undefined/)
  assert.match(logoControls, /onInput=\{field\.onInput\}/)
  assert.match(
    caseLogoControls,
    /onInput: \(value\) => onLayoutChange\(field\.field, value\)/,
  )
  assert.match(
    caseLogoControls,
    /onChange: \(value\) => onLayoutChange\(field\.field, value\)/,
  )
  for (const eventOwner of [
    'onPointerUp',
    'onPointerCancel',
    'onLostPointerCapture',
    'onBlur',
    'onKeyUp',
  ]) {
    assert.match(range, new RegExp(`${eventOwner}=\\{`), eventOwner)
  }

  assert.match(drag, /continuousEdit\.update\(\{/)
  assert.match(drag, /continuousEdit\.finish\(getCaseInsertDragTargetId/)
  assert.match(drag, /continuousEdit\.release\(getCaseInsertDragTargetId/)
  assert.match(drag, /onDragCancel: finishCaseInsertPointerDrag/)
  assert.match(drag, /onDragEnd: finishCaseInsertPointerDrag/)
  assert.match(drag, /onDragRelease: releaseCaseInsertPointerDrag/)
  assert.match(pointer, /onDragCancel\?\./)
  assert.match(pointer, /onDragEnd\?\./)
  assert.match(pointer, /onDragRelease\?\./)
  assertOccursBefore(
    pointer,
    'const replacedDrag = activeDragRef.current',
    'event.currentTarget.setPointerCapture',
  )
  assert.match(pointerAdapter, /onDragCancel/)
  assert.match(pointerAdapter, /onDragEnd/)

  assert.match(templateLayers, /handleTemplateLostPointerCapture/)
  assert.match(templateLayers, /handleTemplatePointerCancel/)
  assert.match(spineLayers, /handleSpineLostPointerCapture/)
  assert.match(spineLayers, /handleSpinePointerCancel/)
  assert.match(viewport, /onLostPointerCapture=\{onLostPointerCapture\}/)
  assert.match(boundedImage, /onLostPointerCapture=\{onLostPointerCapture\}/)
})

test('document text moves and image layers retain lost-capture completion wiring', () => {
  const inlineTextEditor = readSource(
    '../components/preview/InlinePreviewTextEditor.tsx',
  )
  const moveOwner = sourceBetween(
    inlineTextEditor,
    'const handleDocumentMovePointerMove =',
    '    const textarea = textareaRef.current',
  )

  assert.match(
    moveOwner,
    /'lostpointercapture',\s*handleDocumentMovePointerCancel/,
  )
  assert.equal(
    countOccurrences(moveOwner, "'lostpointercapture'"),
    2,
    'the move owner must add and remove the lost-capture listener',
  )
  assertOccursBefore(
    moveOwner,
    'activeMoveHandlePointerIdRef.current = null',
    'complete(event as never)',
  )
  assert.match(
    moveOwner,
    /handleDocumentMovePointerEnd[\s\S]*?onMoveHandlePointerUp/,
  )
  assert.match(
    moveOwner,
    /handleDocumentMovePointerCancel[\s\S]*?onMoveHandlePointerCancel \?\? onMoveHandlePointerUp/,
  )
})

test('semantic snapshot owners finish Case continuous edits before reading or capturing', () => {
  const save = readSource('../app/appProjectSaveCommand.ts')
  const guard = readSource('../app/appProjectReplacementGuard.ts')
  const workspace = readSource('../app/appWorkspaceNavigationCommand.ts')
  const pngExport = readSource('../app/appPngExportCommand.ts')
  const runtime = readSource('../app/applicationLifecycleRuntime.ts')
  const lifecycleHook = readSource('../app/useApplicationLifecycleRoot.ts')

  assertOccursBefore(
    save,
    'finishApplicationCaseInsertContinuousEdit(',
    'const session = context.getCurrentStateSnapshot().state.activeSession',
  )
  assertOccursBefore(
    save,
    'const session = context.getCurrentStateSnapshot().state.activeSession',
    'captureNormalizedProjectSnapshot(',
  )
  assert.match(save, /runSave\([\s\S]*?false,[\s\S]*?getContinuousEditPort/)
  assert.match(save, /runSave\([\s\S]*?true,[\s\S]*?getContinuousEditPort/)

  assertOccursBefore(
    guard,
    'finishApplicationCaseInsertContinuousEdit(getContinuousEditPort())',
    'const inspected = context.getCurrentStateSnapshot()',
  )
  assertOccursBefore(
    workspace,
    'finishApplicationCaseInsertContinuousEdit(',
    'const latest = context.getCurrentStateSnapshot()',
  )
  assertOccursBefore(
    pngExport,
    'finishApplicationCaseInsertContinuousEdit(',
    'const current = context.getCurrentStateSnapshot()',
  )
  assertOccursBefore(
    pngExport,
    'const current = context.getCurrentStateSnapshot()',
    'adapter.captureInvocation()',
  )

  assert.equal(
    countOccurrences(runtime, '() => caseInsertContinuousEditPort'),
    4,
    'Save, replacement guard, Home navigation, and PNG export share one port',
  )
  assert.match(
    lifecycleHook,
    /runtime\.updateCaseInsertContinuousEditPort\(/,
  )
})

test('preset synchronization follows lifecycle generations rather than transient renders', () => {
  const app = readSource('../app/App.tsx')
  const panel = readSource(
    '../components/caseInsert/CaseInsertLayoutPresetsPanel.tsx',
  )
  const presetSynchronization = sourceBetween(
    app,
    'caseInsertPresetPresentation.synchronize()',
    'const exportPngDisabled',
  )

  assert.equal(
    countOccurrences(app, 'caseInsertPresetPresentation.synchronize()'),
    1,
  )
  assert.match(
    presetSynchronization,
    /applicationCommandSnapshot\.stateGeneration/,
  )
  assert.doesNotMatch(panel, /controller\.synchronize\(\)/)
})

test('continuous-edit scheduling remains transient and absent from project persistence', () => {
  const persistedSources = [
    '../project/projectTypes.ts',
    '../project/projectSchema.ts',
    '../project/caseInsertPresetProjectPersistenceTypes.ts',
    '../project/caseInsertPresetProjectPersistence.ts',
    '../project/savedProjectNormalization.ts',
  ].map(readSource).join('\n')

  assert.doesNotMatch(
    persistedSources,
    /continuousEdit|ContinuousEdit|continuous-edit/,
  )
  assert.match(persistedSources, /schemaVersion: '0\.4\.0'/)
})
