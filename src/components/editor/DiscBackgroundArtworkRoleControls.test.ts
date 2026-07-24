import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type {
  DiscRoleFocusTargetId,
} from '../../editor/editorRoleFocus.ts'
import {
  createEditorRoleFocusControllerStore,
  type EditorRoleFocusControllerStore,
} from '../../editor/editorRoleFocusController.ts'
import {
  registerBackgroundArtworkFocusTargets,
  shouldOpenBackgroundLocalFilePanelForRequest,
} from './discBackgroundArtworkRoleFocusRegistration.ts'

const componentSource = readFileSync(
  new URL('./DiscBackgroundArtworkRoleControls.tsx', import.meta.url),
  'utf8',
)
const registrationSource = readFileSync(
  new URL('./discBackgroundArtworkRoleFocusRegistration.ts', import.meta.url),
  'utf8',
)
const backgroundSource = readFileSync(
  new URL('../sidebar/artwork/BackgroundArtworkControls.tsx', import.meta.url),
  'utf8',
)
const localFileSource = readFileSync(
  new URL('../sidebar/artwork/LocalFileArtworkControls.tsx', import.meta.url),
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
    `disc:background-image:${string}`
  >,
) {
  return store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior: 'focus',
    destination: {
      roleId: 'background-artwork',
      focusTarget,
    },
  })
}

function registerTargets({
  calls,
  enable,
  localUpload,
  setLocalFilePanelOpen,
  store,
}: {
  calls: string[]
  enable: HTMLElement | null
  localUpload: HTMLElement | null
  setLocalFilePanelOpen?: (open: boolean) => void
  store: EditorRoleFocusControllerStore
}) {
  return registerBackgroundArtworkFocusTargets({
    enableElement: () => enable,
    localUploadElement: () => localUpload,
    openLocalFilePanel: () => {
      calls.push('ancestor:local-file')
      setLocalFilePanelOpen?.(true)
    },
    registerFocusTarget: store.registerFocusTarget,
  })
}

test('background enable opens the role and consumes each focus request once', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const enable = createElement('enable', calls)
  const upload = createElement('upload', calls)
  const backgroundState = {
    enabled: false,
    imageDataUrl: 'data:image/png;base64,keep',
    source: 'steam-artwork',
    layout: { scale: 1.25, x: 4, y: -3 },
    dirty: false,
  }
  const initialState = structuredClone(backgroundState)
  registerTargets({ calls, enable, localUpload: upload, store })
  store.setRoleOpen('legal-info', true)

  const first = requestTarget(store, 'disc:background-image:enable')
  assert.equal(store.isRoleOpen('background-artwork'), true)
  assert.equal(store.isRoleOpen('legal-info'), true)
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  const second = requestTarget(store, 'disc:background-image:enable')
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.equal(second.requestId, first.requestId + 1)
  assert.deepEqual(calls, [
    'enable:focus:true',
    'enable:scroll:nearest:auto',
    'enable:focus:true',
    'enable:scroll:nearest:auto',
  ])
  assert.deepEqual(backgroundState, initialState)
})

test('enabled local upload pre-opens its panel then focuses the real input', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const enable = createElement('enable', calls)
  const upload = createElement('upload', calls)
  let localFilePanelOpen = false
  const backgroundState = {
    enabled: true,
    imageDataUrl: 'data:image/png;base64,keep',
    source: 'local-file',
  }
  const initialState = structuredClone(backgroundState)
  registerTargets({
    calls,
    enable,
    localUpload: upload,
    setLocalFilePanelOpen: (open) => { localFilePanelOpen = open },
    store,
  })

  const request = requestTarget(store, 'disc:background-image:local-upload')
  assert.equal(
    shouldOpenBackgroundLocalFilePanelForRequest(request),
    true,
  )
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.equal(localFilePanelOpen, true)
  assert.deepEqual(calls, [
    'ancestor:local-file',
    'upload:focus:true',
    'upload:scroll:nearest:auto',
  ])
  assert.deepEqual(backgroundState, initialState)
  assert.equal(store.getSnapshot().pendingRequest, null)
})

test('guided Background upload keeps focus and top-aligns Background Artwork', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const summary = createElement('background-summary', calls)
  const upload = createElement('upload', calls)
  store.registerRolePanel('background-artwork', {
    detailsElement: () => null,
    summaryElement: () => summary,
  })
  registerTargets({
    calls,
    enable: createElement('enable', calls),
    localUpload: upload,
    store,
  })
  store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior: 'focus',
    scrollAlignment: 'role-start',
    destination: {
      roleId: 'background-artwork',
      focusTarget: 'disc:background-image:local-upload',
    },
  })

  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls, [
    'ancestor:local-file',
    'upload:focus:true',
    'background-summary:scroll:start:auto',
  ])
})

test('disabled background keeps local upload targetable without enable fallback', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const enable = createElement('enable', calls)
  const upload = createElement('upload', calls)
  const backgroundState = {
    enabled: false,
    imageDataUrl: null as string | null,
    source: null as string | null,
    selectedArtworkId: null as string | null,
    dirty: false,
    previewSelection: 'none',
    selectedDiscTextKey: null,
    contextualRibbonActive: false,
    serializedProject: 'unchanged',
  }
  let localFilePanelOpen = false
  registerTargets({
    calls,
    enable,
    localUpload: upload,
    setLocalFilePanelOpen: (open) => { localFilePanelOpen = open },
    store,
  })

  requestTarget(store, 'disc:background-image:local-upload')
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.equal(localFilePanelOpen, true)
  assert.equal(backgroundState.enabled, false)
  assert.deepEqual(calls, [
    'ancestor:local-file',
    'upload:focus:true',
    'upload:scroll:nearest:auto',
  ])
  assert.equal(calls.some((call) => call.startsWith('enable:')), false)

  backgroundState.enabled = true
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  assert.equal(calls.length, 3)
  assert.deepEqual(backgroundState, {
    enabled: true,
    imageDataUrl: null,
    source: null,
    selectedArtworkId: null,
    dirty: false,
    previewSelection: 'none',
    selectedDiscTextKey: null,
    contextualRibbonActive: false,
    serializedProject: 'unchanged',
  })
})

test('pending panel opening is limited to Background local-upload focus', () => {
  const store = createEditorRoleFocusControllerStore()
  const localUpload = requestTarget(
    store,
    'disc:background-image:local-upload',
  )
  const unrelatedStore = createEditorRoleFocusControllerStore()
  const enable = requestTarget(
    unrelatedStore,
    'disc:background-image:enable',
  )
  const reveal = {
    ...localUpload,
    behavior: 'reveal',
  } as const

  assert.equal(
    shouldOpenBackgroundLocalFilePanelForRequest(localUpload),
    true,
  )
  assert.equal(shouldOpenBackgroundLocalFilePanelForRequest(enable), false)
  assert.equal(shouldOpenBackgroundLocalFilePanelForRequest(reveal), false)
  assert.equal(shouldOpenBackgroundLocalFilePanelForRequest(null), false)
})

test('manual role and Local file state remain independent and reopenable', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const enable = createElement('enable', calls)
  const upload = createElement('upload', calls)
  let localFilePanelOpen = true
  registerTargets({
    calls,
    enable,
    localUpload: upload,
    setLocalFilePanelOpen: (open) => { localFilePanelOpen = open },
    store,
  })
  store.setRoleOpen('background-artwork', true)
  store.setRoleOpen('additional-text', true)

  assert.equal(localFilePanelOpen, true)
  localFilePanelOpen = false
  store.setRoleOpen('background-artwork', false)
  assert.equal(localFilePanelOpen, false)
  assert.equal(store.isRoleOpen('additional-text'), true)

  requestTarget(store, 'disc:background-image:local-upload')
  assert.equal(store.isRoleOpen('background-artwork'), true)
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(localFilePanelOpen, true)
  assert.equal(store.isRoleOpen('additional-text'), true)
})

test('replacement registrations survive stale cleanup for both targets', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const oldEnable = createElement('old-enable', calls)
  const oldUpload = createElement('old-upload', calls)
  const newEnable = createElement('new-enable', calls)
  const newUpload = createElement('new-upload', calls)
  const unregisterOld = registerTargets({
    calls,
    enable: oldEnable,
    localUpload: oldUpload,
    store,
  })
  const unregisterNew = registerTargets({
    calls,
    enable: newEnable,
    localUpload: newUpload,
    store,
  })
  unregisterOld()

  requestTarget(store, 'disc:background-image:enable')
  assert.equal(store.processPendingRequest(), 'target-focused')
  requestTarget(store, 'disc:background-image:local-upload')
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.deepEqual(calls, [
    'new-enable:focus:true',
    'new-enable:scroll:nearest:auto',
    'ancestor:local-file',
    'new-upload:focus:true',
    'new-upload:scroll:nearest:auto',
  ])
  unregisterNew()
})

test('missing upload uses role-summary fallback once without enable fallback', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const enable = createElement('enable', calls)
  const summary = createElement('summary', calls)
  registerTargets({ calls, enable, localUpload: null, store })
  store.registerRolePanel('background-artwork', {
    detailsElement: () => null,
    summaryElement: () => summary,
  })

  requestTarget(store, 'disc:background-image:local-upload')

  assert.doesNotThrow(() => {
    assert.equal(store.processPendingRequest(), 'role-summary-fallback')
  })
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  assert.deepEqual(calls, [
    'ancestor:local-file',
    'summary:focus:true',
    'summary:scroll:nearest:auto',
  ])
})

test('Background adapter exposes direct refs and controlled Local file state', () => {
  assert.match(componentSource, /useState\(false\)/)
  assert.match(componentSource, /useRef<HTMLInputElement \| null>\(null\)/)
  assert.match(
    componentSource,
    /shouldOpenBackgroundLocalFilePanelForRequest\(state\.pendingRequest\)/,
  )
  assert.match(componentSource, /registerBackgroundArtworkFocusTargets/)
  assert.match(componentSource, /enableControlRef=\{enableRef\}/)
  assert.match(componentSource, /localUploadControlRef=\{localUploadRef\}/)
  assert.match(
    componentSource,
    /localFilePanelOpen=\{localFilePanelOpen \|\| localFilePanelFocusPending\}/,
  )
  assert.match(
    componentSource,
    /onLocalFilePanelOpenChange=\{setLocalFilePanelOpen\}/,
  )
  assert.doesNotMatch(registrationSource, /fallbackFocusTarget|registerFocusTargetFallback/)
})

test('presentation controls forward ordinary ref and controlled-panel props', () => {
  assert.match(backgroundSource, /enableControlRef\?: Ref<HTMLInputElement>/)
  assert.match(backgroundSource, /ref=\{enableControlRef\}/)
  assert.match(backgroundSource, /localUploadControlRef\?: Ref<HTMLInputElement>/)
  assert.match(backgroundSource, /open=\{localFilePanelOpen\}/)
  assert.match(
    backgroundSource,
    /onOpenChange=\{onLocalFilePanelOpenChange\}/,
  )
  assert.match(localFileSource, /uploadControlRef\?: Ref<HTMLInputElement>/)
  assert.match(localFileSource, /open=\{open\}/)
  assert.match(localFileSource, /onOpenChange=\{onOpenChange\}/)
  assert.match(localFileSource, /ref=\{uploadControlRef\}/)
  assert.match(localFileSource, /className="logo-file-input"/)
  assert.match(
    readFileSync('src/styles/app-base.css', 'utf8'),
    /\.logo-upload-button:has\(\+ \.logo-file-input:focus-visible\)/,
  )
})

test('production integration remains Background-only and dependency-safe', () => {
  assert.match(
    appSource,
    /section\.id === 'background-artwork'[\s\S]*<DiscBackgroundArtworkRoleControls[\s\S]*artworkControls=\{artworkPanelProps\}/,
  )
  assert.doesNotMatch(caseInsertSource, /DiscBackgroundArtworkRoleControls/)

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
