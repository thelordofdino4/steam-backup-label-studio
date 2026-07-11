import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  createEditorRoleFocusControllerStore,
  type EditorRoleFocusControllerStore,
} from '../../editor/editorRoleFocusController.ts'
import {
  registerAdditionalArtworkItemEnableFocusTarget,
  registerAdditionalArtworkItemFallbacks,
  registerAdditionalArtworkItemUploadFocusTarget,
  registerAlwaysMountedAdditionalArtworkFocusTargets,
} from './discAdditionalArtworkRoleFocusRegistration.ts'

const itemAdapterSource = readFileSync(
  new URL('./DiscAdditionalArtworkItemControls.tsx', import.meta.url),
  'utf8',
)
const roleAdapterSource = readFileSync(
  new URL('./DiscAdditionalArtworkRoleControls.tsx', import.meta.url),
  'utf8',
)
const registrationSource = readFileSync(
  new URL('./discAdditionalArtworkRoleFocusRegistration.ts', import.meta.url),
  'utf8',
)
const controlsSource = readFileSync(
  new URL('../sidebar/artwork/AdditionalArtworkControls.tsx', import.meta.url),
  'utf8',
)
const cardSource = readFileSync(
  new URL('../sidebar/RepeatedVisualElementCard.tsx', import.meta.url),
  'utf8',
)
const imageSourceControlsSource = readFileSync(
  new URL('./EditorImageSourceControls.tsx', import.meta.url),
  'utf8',
)
const appSource = readFileSync('src/app/App.tsx', 'utf8')
const caseInsertSource = readFileSync(
  'src/components/caseInsert/CaseInsertEditorShell.tsx',
  'utf8',
)

const IDS = [
  'artwork:A|one/two',
  'artwork:B|two/one',
  'artwork:C|three:four',
] as const

function createElement(label: string, calls: string[]) {
  return {
    focus(options?: FocusOptions) {
      calls.push(`${label}:focus:${String(options?.preventScroll)}`)
    },
    scrollIntoView(options?: ScrollIntoViewOptions) {
      calls.push(
        `${label}:scroll:${String(options?.block)}:${String(options?.behavior)}`,
      )
    },
  } as unknown as HTMLElement
}

function requestItem(
  store: EditorRoleFocusControllerStore,
  elementId: string,
  focusTarget:
    | 'disc:additional-artwork:item-enable'
    | 'disc:additional-artwork:upload',
  behavior: 'focus' | 'reveal' = 'focus',
) {
  return store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior,
    destination: {
      roleId: 'additional-artwork',
      focusTarget,
      elementId,
    },
  })
}

function registerFallbacks(
  store: EditorRoleFocusControllerStore,
  elementIds: readonly string[],
) {
  return registerAdditionalArtworkItemFallbacks({
    elementIds,
    registerFocusTargetFallback: store.registerFocusTargetFallback,
  })
}

function registerEnable(
  store: EditorRoleFocusControllerStore,
  elementId: string,
  calls: string[],
) {
  return registerAdditionalArtworkItemEnableFocusTarget({
    elementId,
    enableElement: () => createElement(`enable:${elementId}`, calls),
    openItemCard: () => calls.push(`open-card:${elementId}`),
    registerFocusTarget: store.registerFocusTarget,
  })
}

function registerUpload(
  store: EditorRoleFocusControllerStore,
  elementId: string,
  calls: string[],
) {
  return registerAdditionalArtworkItemUploadFocusTarget({
    elementId,
    openItemCard: () => calls.push(`open-card:${elementId}`),
    openLocalFilePanel: () => calls.push(`open-local:${elementId}`),
    registerFocusTarget: store.registerFocusTarget,
    uploadElement: () => createElement(`upload:${elementId}`, calls),
  })
}

test('three exact item-enable targets coexist and never mutate editor state', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const editorState = {
    globalEnabled: true,
    itemEnabled: { [IDS[0]]: true, [IDS[1]]: true, [IDS[2]]: false },
    itemOrder: [...IDS],
    assets: ['asset-a', 'asset-b', null],
    sourceModes: ['local-file', 'steam-artwork', null],
    layouts: [{ x: 1 }, { x: 2 }, { x: 3 }],
    dirty: false,
    undoEntries: 4,
    previewSelection: 'background',
    discTextSelection: 'title',
    contextualRibbon: 'unchanged',
    serializedProject: 'unchanged',
  }
  const before = structuredClone(editorState)
  registerFallbacks(store, IDS)
  IDS.forEach((id) => registerEnable(store, id, calls))

  for (const id of IDS) {
    requestItem(store, id, 'disc:additional-artwork:item-enable')
    assert.equal(store.processPendingRequest(), 'target-focused')
    assert.deepEqual(calls.slice(-3), [
      `open-card:${id}`,
      `enable:${id}:focus:true`,
      `enable:${id}:scroll:nearest:auto`,
    ])
  }

  const repeated = requestItem(
    store,
    IDS[0],
    'disc:additional-artwork:item-enable',
  )
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  assert.equal(store.getSnapshot().lastHandledRequestId, repeated.requestId)
  assert.deepEqual(editorState, before)
})

test('enabled upload opens only the exact card and Local file panel', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  let fileChooserCalls = 0
  registerFallbacks(store, IDS)
  IDS.forEach((id) => {
    registerEnable(store, id, calls)
    registerUpload(store, id, calls)
  })
  const uploadA = {
    ...createElement('upload-click-sentinel', calls),
    click() {
      fileChooserCalls += 1
    },
  } as unknown as HTMLElement
  store.registerFocusTarget({
    focusTarget: 'disc:additional-artwork:upload',
    elementId: IDS[0],
  }, {
    element: () => uploadA,
    openAncestors: [
      () => calls.push(`open-card:${IDS[0]}`),
      () => calls.push(`open-local:${IDS[0]}`),
    ],
  })

  requestItem(store, IDS[0], 'disc:additional-artwork:upload')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls, [
    `open-card:${IDS[0]}`,
    `open-local:${IDS[0]}`,
    'upload-click-sentinel:focus:true',
    'upload-click-sentinel:scroll:nearest:auto',
  ])
  assert.equal(fileChooserCalls, 0)
})

test('disabled upload falls back to its own enable once, then a new request reaches upload', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  registerFallbacks(store, IDS)
  IDS.forEach((id) => registerEnable(store, id, calls))

  const first = requestItem(store, IDS[0], 'disc:additional-artwork:upload')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  assert.deepEqual(calls, [
    `open-card:${IDS[0]}`,
    `enable:${IDS[0]}:focus:true`,
    `enable:${IDS[0]}:scroll:nearest:auto`,
  ])

  registerUpload(store, IDS[0], calls)
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  const second = requestItem(store, IDS[0], 'disc:additional-artwork:upload')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(second.requestId, first.requestId + 1)
  assert.deepEqual(calls.slice(-4), [
    `open-card:${IDS[0]}`,
    `open-local:${IDS[0]}`,
    `upload:${IDS[0]}:focus:true`,
    `upload:${IDS[0]}:scroll:nearest:auto`,
  ])
  assert.equal(calls.some((call) => call.includes(IDS[1])), false)
})

test('composite chain reaches Add then global enable without mutation or creation', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const artworkState = { enabled: false, elements: [...IDS] }
  const before = structuredClone(artworkState)
  registerFallbacks(store, IDS)
  registerAlwaysMountedAdditionalArtworkFocusTargets({
    enableElement: () => createElement('global-enable', calls),
    registerFocusTarget: store.registerFocusTarget,
    registerFocusTargetFallback: store.registerFocusTargetFallback,
  })
  const unregisterAdd = store.registerFocusTarget(
    'disc:additional-artwork:add',
    { element: () => createElement('add', calls) },
  )

  requestItem(store, IDS[1], 'disc:additional-artwork:upload')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls, [
    'add:focus:true',
    'add:scroll:nearest:auto',
  ])
  unregisterAdd()

  const request = requestItem(store, IDS[1], 'disc:additional-artwork:upload')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  assert.equal(store.getSnapshot().lastHandledRequestId, request.requestId)
  assert.deepEqual(calls.slice(-2), [
    'global-enable:focus:true',
    'global-enable:scroll:nearest:auto',
  ])
  assert.deepEqual(artworkState, before)
})

test('reorder, deletion, and stale cleanup preserve exact remaining identities', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const unregisterOldFallbacks = registerFallbacks(store, IDS)
  const unregisterEnable = new Map(
    IDS.map((id) => [id, registerEnable(store, id, calls)]),
  )
  const reordered = [IDS[2], IDS[0], IDS[1]]
  const unregisterReorderedFallbacks = registerFallbacks(store, reordered)
  unregisterOldFallbacks()

  requestItem(store, IDS[2], 'disc:additional-artwork:upload')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(calls.at(-2), `enable:${IDS[2]}:focus:true`)

  unregisterEnable.get(IDS[1])?.()
  unregisterEnable.delete(IDS[1])
  const unregisterAfterDeletion = registerFallbacks(store, [IDS[2], IDS[0]])
  unregisterReorderedFallbacks()
  store.registerRolePanel('additional-artwork', {
    detailsElement: () => null,
    summaryElement: () => createElement('role-summary', calls),
  })

  requestItem(store, IDS[1], 'disc:additional-artwork:upload')
  assert.equal(store.processPendingRequest(), 'role-summary-fallback')
  assert.deepEqual(calls.slice(-2), [
    'role-summary:focus:true',
    'role-summary:scroll:nearest:auto',
  ])
  assert.equal(store.processPendingRequest(), 'no-pending-request')

  for (const id of [IDS[0], IDS[2]]) {
    requestItem(store, id, 'disc:additional-artwork:upload')
    assert.equal(store.processPendingRequest(), 'target-focused')
    assert.equal(calls.at(-2), `enable:${id}:focus:true`)
  }
  unregisterAfterDeletion()
})

test('reveal remains at the role summary and does not open item ancestors', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  registerFallbacks(store, IDS)
  registerEnable(store, IDS[0], calls)
  registerUpload(store, IDS[0], calls)
  store.registerRolePanel('additional-artwork', {
    detailsElement: () => null,
    summaryElement: () => createElement('role-summary', calls),
  })

  requestItem(store, IDS[0], 'disc:additional-artwork:upload', 'reveal')
  assert.equal(store.processPendingRequest(), 'role-revealed')
  assert.deepEqual(calls, ['role-summary:scroll:nearest:auto'])
})

test('generic controls expose ordinary refs and independent controlled panels', () => {
  assert.match(cardSource, /detailsRef\?: Ref<HTMLDetailsElement>/)
  assert.match(cardSource, /enableControlRef\?: Ref<HTMLInputElement>/)
  assert.match(cardSource, /open\?: boolean/)
  assert.match(cardSource, /onOpenChange\?: \(open: boolean\) => void/)
  assert.match(cardSource, /ref=\{enableControlRef\}/)
  assert.match(cardSource, /open=\{open \?\? true\}/)
  assert.match(
    imageSourceControlsSource,
    /localFileUploadControlRef\?: Ref<HTMLInputElement>/,
  )
  assert.match(
    imageSourceControlsSource,
    /onLocalFilePanelOpenChange\?: \(open: boolean\) => void/,
  )
  assert.match(imageSourceControlsSource, /ref=\{localFileUploadControlRef\}/)
  assert.match(controlsSource, /enableControlRef=\{itemEnableControlRef\}/)
  assert.match(controlsSource, /localFileUploadControlRef=\{uploadControlRef\}/)
  assert.match(itemAdapterSource, /useState\(true\)/)
  assert.match(itemAdapterSource, /useState\(false\)/)
  assert.doesNotMatch(itemAdapterSource, /setItemCardOpen\(false\)/)
  assert.doesNotMatch(itemAdapterSource, /setLocalFilePanelOpen\(false\)/)
})

test('per-item focus wiring stays transient, Disc-only, and dependency-safe', () => {
  assert.match(roleAdapterSource, /ElementControlsComponent=\{DiscAdditionalArtworkItemControls\}/)
  assert.match(itemAdapterSource, /element\.id/)
  assert.doesNotMatch(itemAdapterSource, /elementIndex/)
  assert.doesNotMatch(caseInsertSource, /DiscAdditionalArtworkItemControls/)
  assert.match(
    appSource,
    /section\.id === 'additional-artwork'[\s\S]*DiscAdditionalArtworkRoleControls/,
  )

  const combinedSource = [
    itemAdapterSource,
    roleAdapterSource,
    registrationSource,
  ].join('\n')
  const forbiddenDependencies = [
    'document.',
    'querySelector',
    'getElementById',
    '.closest(',
    '.click(',
    'setTimeout',
    'setInterval',
    'MutationObserver',
    'requestAnimationFrame',
    'elementIndex',
    'first-item',
    'DiscPreview',
    'previewEditableRegistry',
    'selectedDiscTextKey',
    'contextualTextRibbon',
    'projectSchema',
    'createProjectSnapshot',
    'restoreProject',
    'render/',
    'export/',
    'caseInsert',
    'autoFill',
    'fetch(',
  ]

  for (const forbiddenDependency of forbiddenDependencies) {
    assert.equal(
      combinedSource.includes(forbiddenDependency),
      false,
      `unexpected dependency: ${forbiddenDependency}`,
    )
  }
})
