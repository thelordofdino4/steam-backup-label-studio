import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { discTemplates } from '../../templates/discTemplates.ts'
import {
  addAdditionalArtworkElement,
  createDefaultProjectAdditionalArtwork,
  removeAdditionalArtworkElement,
} from '../../project/projectAdditionalArtwork.ts'
import { parseEditorRoleFocusRequest } from '../../editor/editorRoleFocus.ts'
import {
  createEditorRoleFocusControllerStore,
  type EditorRoleFocusControllerStore,
} from '../../editor/editorRoleFocusController.ts'
import {
  registerAdditionalArtworkAddFocusTarget,
  registerAlwaysMountedAdditionalArtworkFocusTargets,
} from './discAdditionalArtworkRoleFocusRegistration.ts'

const adapterSource = readFileSync(
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
const optionalFeatureSource = readFileSync(
  new URL('./OptionalFeatureSection.tsx', import.meta.url),
  'utf8',
)
const appSource = readFileSync('src/app/App.tsx', 'utf8')
const caseInsertSource = readFileSync(
  'src/components/caseInsert/CaseInsertEditorShell.tsx',
  'utf8',
)

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

function requestTarget(
  store: EditorRoleFocusControllerStore,
  focusTarget:
    | 'disc:additional-artwork:enable'
    | 'disc:additional-artwork:add',
  behavior: 'focus' | 'reveal' = 'focus',
) {
  return store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior,
    destination: {
      roleId: 'additional-artwork',
      focusTarget,
    },
  })
}

function registerAlways({
  enable,
  store,
}: {
  enable: HTMLElement | null
  store: EditorRoleFocusControllerStore
}) {
  return registerAlwaysMountedAdditionalArtworkFocusTargets({
    enableElement: () => enable,
    registerFocusTarget: store.registerFocusTarget,
    registerFocusTargetFallback: store.registerFocusTargetFallback,
  })
}

function registerAdd({
  add,
  store,
}: {
  add: HTMLElement | null
  store: EditorRoleFocusControllerStore
}) {
  return registerAdditionalArtworkAddFocusTarget({
    addElement: () => add,
    registerFocusTarget: store.registerFocusTarget,
  })
}

test('global enable opens the role, focuses once, and preserves editor state', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const artworkState = {
    enabled: false,
    elements: [
      {
        id: 'artwork-a',
        enabled: true,
        imageDataUrl: 'data:image/png;base64,keep',
        source: 'custom',
        layout: { x: 20, y: 30, scale: 1 },
      },
    ],
    dirty: false,
    undoEntries: 2,
    previewSelection: 'background',
    selectedDiscTextKey: 'title',
    contextualRibbonActive: true,
    serializedProject: 'unchanged',
  }
  const initialState = structuredClone(artworkState)
  registerAlways({
    enable: createElement('enable', calls),
    store,
  })
  store.setRoleOpen('legal-info', true)

  const first = requestTarget(store, 'disc:additional-artwork:enable')
  assert.equal(store.isRoleOpen('additional-artwork'), true)
  assert.equal(store.isRoleOpen('legal-info'), true)
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  const second = requestTarget(store, 'disc:additional-artwork:enable')
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.equal(second.requestId, first.requestId + 1)
  assert.deepEqual(calls, [
    'enable:focus:true',
    'enable:scroll:nearest:auto',
    'enable:focus:true',
    'enable:scroll:nearest:auto',
  ])
  assert.deepEqual(artworkState, initialState)
})

test('enabled Add focus does not activate the collection action', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  let addHandlerCalls = 0
  const artworkState = {
    enabled: true,
    elements: [
      { id: 'artwork-a' },
      { id: 'artwork-b' },
    ],
    dirty: false,
    undoEntries: 0,
  }
  const initialState = structuredClone(artworkState)
  registerAlways({
    enable: createElement('enable', calls),
    store,
  })
  registerAdd({
    add: {
      ...createElement('add', calls),
      click() {
        addHandlerCalls += 1
      },
    } as unknown as HTMLElement,
    store,
  })

  requestTarget(store, 'disc:additional-artwork:add')
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.deepEqual(calls, [
    'add:focus:true',
    'add:scroll:nearest:auto',
  ])
  assert.equal(addHandlerCalls, 0)
  assert.deepEqual(artworkState, initialState)
})

test('disabled Add falls back to enable once and a later request reaches Add', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const artworkState = { enabled: false, elements: [] as string[] }
  registerAlways({
    enable: createElement('enable', calls),
    store,
  })

  requestTarget(store, 'disc:additional-artwork:add')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  assert.deepEqual(calls, [
    'enable:focus:true',
    'enable:scroll:nearest:auto',
  ])
  assert.deepEqual(artworkState, { enabled: false, elements: [] })

  artworkState.enabled = true
  registerAdd({ add: createElement('add', calls), store })
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  requestTarget(store, 'disc:additional-artwork:add')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls.slice(-2), [
    'add:focus:true',
    'add:scroll:nearest:auto',
  ])
  assert.deepEqual(artworkState, { enabled: true, elements: [] })
})

test('registration transitions and stale cleanup preserve enable and fallback', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const unregisterOldAlways = registerAlways({
    enable: createElement('old-enable', calls),
    store,
  })
  registerAlways({
    enable: createElement('new-enable', calls),
    store,
  })
  unregisterOldAlways()
  const unregisterOldAdd = registerAdd({
    add: createElement('old-add', calls),
    store,
  })
  const unregisterNewAdd = registerAdd({
    add: createElement('new-add', calls),
    store,
  })
  unregisterOldAdd()

  requestTarget(store, 'disc:additional-artwork:add')
  assert.equal(store.processPendingRequest(), 'target-focused')
  unregisterNewAdd()
  requestTarget(store, 'disc:additional-artwork:add')
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.deepEqual(calls, [
    'new-add:focus:true',
    'new-add:scroll:nearest:auto',
    'new-enable:focus:true',
    'new-enable:scroll:nearest:auto',
  ])
})

test('reveal stays at the role summary and never traverses Add fallback', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  registerAlways({
    enable: createElement('enable', calls),
    store,
  })
  store.registerRolePanel('additional-artwork', {
    detailsElement: () => null,
    summaryElement: () => createElement('summary', calls),
  })

  requestTarget(store, 'disc:additional-artwork:add', 'reveal')
  assert.equal(store.processPendingRequest(), 'role-revealed')
  assert.deepEqual(calls, ['summary:scroll:nearest:auto'])

  requestTarget(store, 'disc:additional-artwork:add')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls.slice(1), [
    'enable:focus:true',
    'enable:scroll:nearest:auto',
  ])
})

test('missing controls fall back safely without retry or item creation', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const elements: string[] = []
  registerAlways({ enable: createElement('enable', calls), store })
  registerAdd({ add: null, store })

  requestTarget(store, 'disc:additional-artwork:add')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  assert.deepEqual(elements, [])
  assert.deepEqual(calls, [
    'enable:focus:true',
    'enable:scroll:nearest:auto',
  ])

  const missingStore = createEditorRoleFocusControllerStore()
  missingStore.registerRolePanel('additional-artwork', {
    detailsElement: () => null,
    summaryElement: () => createElement('summary', calls),
  })
  registerAlways({ enable: null, store: missingStore })
  requestTarget(missingStore, 'disc:additional-artwork:enable')
  assert.equal(missingStore.processPendingRequest(), 'role-summary-fallback')
  assert.deepEqual(calls.slice(-2), [
    'summary:focus:true',
    'summary:scroll:nearest:auto',
  ])
})

test('one global Add action remains stable for empty, single, and multiple items', () => {
  const componentBody = controlsSource.match(
    /export function AdditionalArtworkControls[\s\S]*$/,
  )?.[0]
  const itemBody = controlsSource.match(
    /function AdditionalArtworkElementControls[\s\S]*?export type AdditionalArtworkControlsProps/,
  )?.[0]
  assert.ok(componentBody)
  assert.ok(itemBody)
  assert.equal(
    (componentBody.match(/<AddAdditionalArtworkButton/g) ?? []).length,
    1,
  )
  assert.doesNotMatch(itemBody, /AddAdditionalArtworkButton|showAddButton/)
  assert.match(
    componentBody,
    /<AddAdditionalArtworkButton[\s\S]*projectAdditionalArtwork\.elements\.map/,
  )
  assert.doesNotMatch(
    componentBody,
    /projectAdditionalArtwork\.elements\.map[\s\S]*<AddAdditionalArtworkButton/,
  )

  let state = createDefaultProjectAdditionalArtwork()
  const addOnce = () => {
    state = addAdditionalArtworkElement(
      state,
      discTemplates.standardPrintableDisc,
    )
  }
  addOnce()
  assert.equal(state.elements.length, 1)
  const firstId = state.elements[0]!.id
  addOnce()
  assert.equal(state.elements.length, 2)
  assert.equal(state.elements[0]!.id, firstId)
  const secondId = state.elements[1]!.id
  state = {
    ...state,
    elements: [state.elements[1]!, state.elements[0]!],
  }
  assert.deepEqual(state.elements.map(({ id }) => id), [secondId, firstId])
  state = removeAdditionalArtworkElement(state, secondId)
  state = removeAdditionalArtworkElement(state, firstId)
  assert.deepEqual(state.elements, [])

  assert.equal(
    (componentBody.match(/onClick=\{handleAddAdditionalArtworkElement\}/g) ?? [])
      .length,
    1,
  )
})

test('adapter uses only fixed global identities and ordinary direct refs', () => {
  assert.equal(
    (adapterSource.match(/useRef<[^>]+>\(null\)/g) ?? []).length,
    2,
  )
  assert.match(adapterSource, /if \(!additionalArtworkEnabled\) return undefined/)
  assert.match(adapterSource, /addControlRef=\{addRef\}/)
  assert.match(adapterSource, /enableControlRef=\{enableRef\}/)
  assert.match(controlsSource, /addControlRef\?: Ref<HTMLButtonElement>/)
  assert.match(controlsSource, /enableControlRef\?: Ref<HTMLInputElement>/)
  assert.match(controlsSource, /ref=\{controlRef\}/)
  assert.match(optionalFeatureSource, /ref=\{enableControlRef\}/)

  const targetIds = registrationSource.match(
    /disc:additional-artwork:[a-z-]+/g,
  ) ?? []
  assert.deepEqual([...new Set(targetIds)].sort(), [
    'disc:additional-artwork:add',
    'disc:additional-artwork:enable',
  ])
  assert.doesNotMatch(
    `${adapterSource}\n${registrationSource}`,
    /item-enable|additional-artwork:upload|elementId/,
  )
  assert.deepEqual(
    parseEditorRoleFocusRequest({
      requestId: 1,
      surfaceId: 'disc-label',
      behavior: 'focus',
      destination: {
        roleId: 'additional-artwork',
        focusTarget: 'disc:additional-artwork:add',
        elementId: 'invalid-for-global-add',
      },
    }),
    { ok: false, error: 'unexpected-field' },
  )
})

test('production integration remains Disc-global-only and dependency-safe', () => {
  assert.match(
    appSource,
    /section\.id === 'additional-artwork'[\s\S]*<DiscAdditionalArtworkRoleControls[\s\S]*artworkControls=\{artworkPanelProps\}/,
  )
  assert.doesNotMatch(caseInsertSource, /DiscAdditionalArtworkRoleControls/)

  const combinedSource = `${adapterSource}\n${registrationSource}`
  const forbiddenDependencies = [
    'document.',
    'querySelector',
    'querySelectorAll',
    'getElementById',
    '.closest(',
    '.click(',
    'setTimeout',
    'setInterval',
    'MutationObserver',
    'requestAnimationFrame',
    'projectSchema',
    'createProjectSnapshot',
    'restoreProject',
    'render/',
    'export/',
    'DiscPreview',
    'previewEditableRegistry',
    'selectedDiscTextKey',
    'contextualTextRibbon',
    'caseInsert',
    'autoFill',
    'Steam',
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
