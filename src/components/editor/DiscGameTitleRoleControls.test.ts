import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  createEditorRoleFocusControllerStore,
  type EditorRoleFocusControllerStore,
} from '../../editor/editorRoleFocusController.ts'
import type {
  DiscRoleFocusTargetId,
} from '../../editor/editorRoleFocus.ts'
import {
  registerAlwaysMountedGameTitleFocusTargets,
  registerGameTitleArtworkUploadFocusTarget,
} from './discGameTitleRoleFocusRegistration.ts'

const componentSource = readFileSync(
  new URL('./DiscGameTitleRoleControls.tsx', import.meta.url),
  'utf8',
)
const registrationSource = readFileSync(
  new URL('./discGameTitleRoleFocusRegistration.ts', import.meta.url),
  'utf8',
)
const optionalFeatureSource = readFileSync(
  new URL('./OptionalFeatureSection.tsx', import.meta.url),
  'utf8',
)
const titleArtworkSource = readFileSync(
  new URL('../sidebar/artwork/TitleArtworkControls.tsx', import.meta.url),
  'utf8',
)
const titleTextSource = readFileSync(
  new URL('../sidebar/text/DiscGameTitleTextControls.tsx', import.meta.url),
  'utf8',
)
const discTextControlSource = readFileSync(
  new URL('../sidebar/DiscTextControl.tsx', import.meta.url),
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
  focusTarget: Extract<
    DiscRoleFocusTargetId,
    `disc:game-title:${string}`
  >,
) {
  return store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior: 'focus',
    destination: {
      roleId: 'game-title',
      focusTarget,
    },
  })
}

function registerAlwaysMountedTargets({
  artworkEnable,
  calls,
  store,
  textFallback,
}: {
  artworkEnable: HTMLElement | null
  calls: string[]
  store: EditorRoleFocusControllerStore
  textFallback: HTMLElement | null
}) {
  return registerAlwaysMountedGameTitleFocusTargets({
    artworkEnableElement: () => artworkEnable,
    openGameTitleRole: () => {
      calls.push('ancestor:game-title')
      store.setRoleOpen('game-title', true)
    },
    registerFocusTarget: store.registerFocusTarget,
    registerFocusTargetFallback: store.registerFocusTargetFallback,
    textFallbackElement: () => textFallback,
  })
}

function registerUploadTarget({
  calls,
  store,
  upload,
}: {
  calls: string[]
  store: EditorRoleFocusControllerStore
  upload: HTMLElement | null
}) {
  return registerGameTitleArtworkUploadFocusTarget({
    artworkUploadElement: () => upload,
    openGameTitleRole: () => {
      calls.push('ancestor:game-title')
      store.setRoleOpen('game-title', true)
    },
    registerFocusTarget: store.registerFocusTarget,
  })
}

test('artwork enable focus opens Game Title and consumes each request once', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const enable = createElement('enable', calls)
  const text = createElement('text', calls)
  const featureState = {
    artworkEnabled: false,
    artworkSource: 'steam-logo',
    artworkAsset: 'data:image/png;base64,keep',
    titleText: 'Keep this title',
    dirty: false,
  }
  const initialState = structuredClone(featureState)
  registerAlwaysMountedTargets({ artworkEnable: enable, calls, store, textFallback: text })
  store.setRoleOpen('legal-info', true)

  const first = requestTarget(store, 'disc:game-title:artwork-enable')
  assert.equal(store.isRoleOpen('game-title'), true)
  assert.equal(store.isRoleOpen('legal-info'), true)
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  const second = requestTarget(store, 'disc:game-title:artwork-enable')
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.equal(second.requestId, first.requestId + 1)
  assert.deepEqual(calls, [
    'ancestor:game-title',
    'enable:focus:true',
    'enable:scroll:nearest:auto',
    'ancestor:game-title',
    'enable:focus:true',
    'enable:scroll:nearest:auto',
  ])
  assert.deepEqual(featureState, initialState)
})

test('enabled artwork upload opens its explicit ancestor and focuses the file input', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const enable = createElement('enable', calls)
  const text = createElement('text', calls)
  const upload = createElement('upload', calls)
  const featureState = {
    enabled: true,
    source: 'custom-upload',
    imageDataUrl: 'data:image/png;base64,keep',
  }
  const initialState = structuredClone(featureState)
  registerAlwaysMountedTargets({ artworkEnable: enable, calls, store, textFallback: text })
  registerUploadTarget({ calls, store, upload })

  requestTarget(store, 'disc:game-title:artwork-upload')

  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls, [
    'ancestor:game-title',
    'upload:focus:true',
    'upload:scroll:nearest:auto',
  ])
  assert.deepEqual(featureState, initialState)
  assert.equal(store.getSnapshot().pendingRequest, null)
})

test('disabled artwork upload falls back once without enabling or replaying', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const enable = createElement('enable', calls)
  const text = createElement('text', calls)
  const upload = createElement('upload', calls)
  const artworkState = { enabled: false }
  registerAlwaysMountedTargets({ artworkEnable: enable, calls, store, textFallback: text })

  requestTarget(store, 'disc:game-title:artwork-upload')

  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(artworkState.enabled, false)
  assert.deepEqual(calls, [
    'ancestor:game-title',
    'enable:focus:true',
    'enable:scroll:nearest:auto',
  ])

  artworkState.enabled = true
  registerUploadTarget({ calls, store, upload })
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  assert.equal(artworkState.enabled, true)
  requestTarget(store, 'disc:game-title:artwork-upload')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls, [
    'ancestor:game-title',
    'enable:focus:true',
    'enable:scroll:nearest:auto',
    'ancestor:game-title',
    'upload:focus:true',
    'upload:scroll:nearest:auto',
  ])
})

test('guided title Image and Text keep focus while top-aligning Game Title', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const summary = createElement('game-title-summary', calls)
  const enable = createElement('enable', calls)
  const text = createElement('text', calls)
  store.registerRolePanel('game-title', {
    detailsElement: () => null,
    summaryElement: () => summary,
  })
  registerAlwaysMountedTargets({
    artworkEnable: enable,
    calls,
    store,
    textFallback: text,
  })

  for (const focusTarget of [
    'disc:game-title:artwork-upload',
    'disc:game-title:text-fallback',
  ] as const) {
    store.requestRoleFocus({
      surfaceId: 'disc-label',
      behavior: 'focus',
      scrollAlignment: 'role-start',
      destination: { roleId: 'game-title', focusTarget },
    })
    assert.equal(store.processPendingRequest(), 'target-focused')
  }

  assert.deepEqual(calls, [
    'ancestor:game-title',
    'enable:focus:true',
    'game-title-summary:scroll:start:auto',
    'ancestor:game-title',
    'text:focus:true',
    'game-title-summary:scroll:start:auto',
  ])
})

test('title text fallback focus preserves text and editor selection state', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const enable = createElement('enable', calls)
  const text = createElement('text', calls)
  const editorState = {
    titleText: 'Keep title text',
    valueSource: 'metadata',
    htmlMode: true,
    selectedDiscTextKey: null,
    contextualRibbonActive: false,
    previewSelection: 'title-artwork',
    dirty: false,
  }
  const initialState = structuredClone(editorState)
  registerAlwaysMountedTargets({ artworkEnable: enable, calls, store, textFallback: text })

  requestTarget(store, 'disc:game-title:text-fallback')

  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls, [
    'ancestor:game-title',
    'text:focus:true',
    'text:scroll:nearest:auto',
  ])
  assert.deepEqual(editorState, initialState)
})

test('upload lifecycle keeps fallback and replacement registrations generation-safe', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const oldEnable = createElement('old-enable', calls)
  const newEnable = createElement('new-enable', calls)
  const oldUpload = createElement('old-upload', calls)
  const newUpload = createElement('new-upload', calls)
  const text = createElement('text', calls)
  const unregisterOldAlways = registerAlwaysMountedTargets({
    artworkEnable: oldEnable,
    calls,
    store,
    textFallback: text,
  })
  registerAlwaysMountedTargets({
    artworkEnable: newEnable,
    calls,
    store,
    textFallback: text,
  })
  unregisterOldAlways()
  const unregisterOldUpload = registerUploadTarget({ calls, store, upload: oldUpload })
  const unregisterNewUpload = registerUploadTarget({ calls, store, upload: newUpload })
  unregisterOldUpload()

  requestTarget(store, 'disc:game-title:artwork-upload')
  assert.equal(store.processPendingRequest(), 'target-focused')
  unregisterNewUpload()
  requestTarget(store, 'disc:game-title:artwork-upload')
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.deepEqual(calls, [
    'ancestor:game-title',
    'new-upload:focus:true',
    'new-upload:scroll:nearest:auto',
    'ancestor:game-title',
    'new-enable:focus:true',
    'new-enable:scroll:nearest:auto',
  ])
})

test('missing text target falls back to the role summary and never retries', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const enable = createElement('enable', calls)
  const summary = createElement('summary', calls)
  registerAlwaysMountedTargets({ artworkEnable: enable, calls, store, textFallback: null })
  store.registerRolePanel('game-title', {
    detailsElement: () => null,
    summaryElement: () => summary,
  })

  requestTarget(store, 'disc:game-title:text-fallback')

  assert.equal(store.processPendingRequest(), 'role-summary-fallback')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  assert.deepEqual(calls, [
    'ancestor:game-title',
    'summary:focus:true',
    'summary:scroll:nearest:auto',
  ])
})

test('Game Title adapter registers only the three typed targets with direct refs', () => {
  const targetIds = registrationSource.match(/disc:game-title:[a-z-]+/g) ?? []

  assert.deepEqual([...new Set(targetIds)].sort(), [
    'disc:game-title:artwork-enable',
    'disc:game-title:artwork-upload',
    'disc:game-title:text-fallback',
  ])
  assert.match(componentSource, /useRef<HTMLInputElement \| null>\(null\)/)
  assert.match(componentSource, /setRoleOpen\('game-title', true\)/)
  assert.match(componentSource, /registerAlwaysMountedGameTitleFocusTargets/)
  assert.match(componentSource, /if \(!titleArtworkEnabled\) return undefined/)
  assert.match(componentSource, /registerGameTitleArtworkUploadFocusTarget/)
  assert.match(componentSource, /enableControlRef=\{artworkEnableRef\}/)
  assert.match(componentSource, /uploadControlRef=\{artworkUploadRef\}/)
  assert.match(componentSource, /enableControlRef=\{textFallbackRef\}/)
})

test('ref support remains generic and the hidden upload input exposes visible focus', () => {
  assert.match(optionalFeatureSource, /enableControlRef\?: Ref<HTMLInputElement>/)
  assert.match(optionalFeatureSource, /ref=\{enableControlRef\}/)
  assert.match(titleArtworkSource, /enableControlRef\?: Ref<HTMLInputElement>/)
  assert.match(titleArtworkSource, /uploadControlRef\?: Ref<HTMLInputElement>/)
  assert.match(titleArtworkSource, /ref=\{uploadControlRef\}/)
  assert.match(titleTextSource, /enableControlRef\?: Ref<HTMLInputElement>/)
  assert.match(discTextControlSource, /ref=\{enableControlRef\}/)
  assert.match(
    readFileSync('src/styles/app-base.css', 'utf8'),
    /\.logo-upload-button:has\(\+ \.logo-file-input:focus-visible\)/,
  )
})

test('production integration stays Game Title-only and avoids forbidden coupling', () => {
  assert.match(
    appSource,
    /section\.id === 'game-title'[\s\S]*<DiscGameTitleRoleControls[\s\S]*artworkControls=\{artworkPanelProps\}[\s\S]*textControls=\{textPanelProps\}/,
  )
  assert.doesNotMatch(caseInsertSource, /DiscGameTitleRoleControls/)

  const combinedSource = `${componentSource}\n${registrationSource}`
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
    'Steam',
    'autoFill',
  ]

  for (const forbiddenDependency of forbiddenDependencies) {
    assert.equal(
      combinedSource.includes(forbiddenDependency),
      false,
      `unexpected dependency: ${forbiddenDependency}`,
    )
  }
})
