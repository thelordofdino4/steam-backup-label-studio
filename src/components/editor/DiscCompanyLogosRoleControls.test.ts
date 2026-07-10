import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  parseEditorRoleFocusRequest,
  type DiscCompanyLogoFocusTarget,
  type EditorRoleFocusBehavior,
} from '../../editor/editorRoleFocus.ts'
import {
  createEditorRoleFocusControllerStore,
  type EditorRoleFocusControllerStore,
} from '../../editor/editorRoleFocusController.ts'
import {
  registerAlwaysMountedCompanyLogoFocusTargets,
  registerDeveloperCompanyLogoUploadFocusTarget,
  registerPublisherCompanyLogoUploadFocusTarget,
  shouldOpenCompanyLogoPanelForRequest,
} from './discCompanyLogosRoleFocusRegistration.ts'

const adapterSource = readFileSync(
  new URL('./DiscCompanyLogosRoleControls.tsx', import.meta.url),
  'utf8',
)
const registrationSource = readFileSync(
  new URL('./discCompanyLogosRoleFocusRegistration.ts', import.meta.url),
  'utf8',
)
const companyControlsSource = readFileSync(
  new URL('../sidebar/branding/CompanyLogoControls.tsx', import.meta.url),
  'utf8',
)
const logoControlsSource = readFileSync(
  new URL('../sidebar/branding/LogoAssetControls.tsx', import.meta.url),
  'utf8',
)
const editorLogoControlsSource = readFileSync(
  new URL('./EditorLogoAssetControls.tsx', import.meta.url),
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

function requestCompanyTarget(
  store: EditorRoleFocusControllerStore,
  focusTarget: DiscCompanyLogoFocusTarget,
  behavior: EditorRoleFocusBehavior = 'focus',
  ownerTarget?: {
    owner: 'logoAssets'
    logoKey: 'developer' | 'publisher'
    scope: 'primary'
  },
) {
  return store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior,
    destination: {
      roleId: 'company-logos',
      focusTarget,
    },
    ...(ownerTarget ? { ownerTarget } : {}),
  })
}

function registerAlways({
  calls,
  developerEnable,
  publisherEnable,
  setPanelOpen,
  store,
}: {
  calls: string[]
  developerEnable: HTMLElement | null
  publisherEnable: HTMLElement | null
  setPanelOpen?: (open: boolean) => void
  store: EditorRoleFocusControllerStore
}) {
  return registerAlwaysMountedCompanyLogoFocusTargets({
    developerEnableElement: () => developerEnable,
    openCompanyLogoPanel: () => {
      calls.push('ancestor:company-logo-panel')
      setPanelOpen?.(true)
    },
    publisherEnableElement: () => publisherEnable,
    registerFocusTarget: store.registerFocusTarget,
    registerFocusTargetFallback: store.registerFocusTargetFallback,
  })
}

function registerDeveloperUpload({
  calls,
  store,
  upload,
}: {
  calls: string[]
  store: EditorRoleFocusControllerStore
  upload: HTMLElement | null
}) {
  return registerDeveloperCompanyLogoUploadFocusTarget({
    openCompanyLogoPanel: () => calls.push('ancestor:company-logo-panel'),
    registerFocusTarget: store.registerFocusTarget,
    uploadElement: () => upload,
  })
}

function registerPublisherUpload({
  calls,
  store,
  upload,
}: {
  calls: string[]
  store: EditorRoleFocusControllerStore
  upload: HTMLElement | null
}) {
  return registerPublisherCompanyLogoUploadFocusTarget({
    openCompanyLogoPanel: () => calls.push('ancestor:company-logo-panel'),
    registerFocusTarget: store.registerFocusTarget,
    uploadElement: () => upload,
  })
}

test('primary enable targets open the shared panel and remain isolated', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  let panelOpen = false
  const logoState = {
    developer: {
      enabled: false,
      imageDataUrl: 'data:image/png;base64,developer',
      source: 'local-file',
      layout: { x: 22, y: 78, scale: 1 },
    },
    publisher: {
      enabled: true,
      imageDataUrl: 'data:image/png;base64,publisher',
      source: 'steam-candidate',
      layout: { x: 78, y: 78, scale: 0.9 },
    },
    additionalDeveloperLogos: [{ id: 'repeatable-developer' }],
    additionalPublisherLogos: [{ id: 'repeatable-publisher' }],
    dirty: false,
    undoEntries: 2,
    previewSelection: 'background',
    selectedDiscTextKey: 'title',
    contextualRibbonActive: true,
    serializedProject: 'unchanged',
  }
  const initialState = structuredClone(logoState)
  registerAlways({
    calls,
    developerEnable: createElement('developer-enable', calls),
    publisherEnable: createElement('publisher-enable', calls),
    setPanelOpen: (open) => { panelOpen = open },
    store,
  })
  store.setRoleOpen('legal-info', true)

  const first = requestCompanyTarget(
    store,
    'disc:company-logo:developer-enable',
  )
  assert.equal(store.isRoleOpen('company-logos'), true)
  assert.equal(store.isRoleOpen('legal-info'), true)
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  const second = requestCompanyTarget(
    store,
    'disc:company-logo:developer-enable',
  )
  assert.equal(store.processPendingRequest(), 'target-focused')
  requestCompanyTarget(store, 'disc:company-logo:publisher-enable')
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.equal(second.requestId, first.requestId + 1)
  assert.equal(panelOpen, true)
  assert.deepEqual(calls, [
    'ancestor:company-logo-panel',
    'developer-enable:focus:true',
    'developer-enable:scroll:nearest:auto',
    'ancestor:company-logo-panel',
    'developer-enable:focus:true',
    'developer-enable:scroll:nearest:auto',
    'ancestor:company-logo-panel',
    'publisher-enable:focus:true',
    'publisher-enable:scroll:nearest:auto',
  ])
  assert.deepEqual(logoState, initialState)
})

test('enabled uploads focus only their matching primary file inputs', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const state = {
    developerEnabled: true,
    publisherEnabled: true,
    developerImage: 'developer-image',
    publisherImage: 'publisher-image',
    developerSource: 'local-file',
    publisherSource: 'candidate',
  }
  const initialState = structuredClone(state)
  registerAlways({
    calls,
    developerEnable: createElement('developer-enable', calls),
    publisherEnable: createElement('publisher-enable', calls),
    store,
  })
  registerDeveloperUpload({
    calls,
    store,
    upload: createElement('developer-upload', calls),
  })
  registerPublisherUpload({
    calls,
    store,
    upload: createElement('publisher-upload', calls),
  })

  requestCompanyTarget(store, 'disc:company-logo:developer-upload')
  assert.equal(store.processPendingRequest(), 'target-focused')
  requestCompanyTarget(store, 'disc:company-logo:publisher-upload')
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.deepEqual(calls, [
    'ancestor:company-logo-panel',
    'developer-upload:focus:true',
    'developer-upload:scroll:nearest:auto',
    'ancestor:company-logo-panel',
    'publisher-upload:focus:true',
    'publisher-upload:scroll:nearest:auto',
  ])
  assert.deepEqual(state, initialState)
})

test('disabled uploads fall back only to matching enables without replay', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const logoState = { developerEnabled: false, publisherEnabled: false }
  registerAlways({
    calls,
    developerEnable: createElement('developer-enable', calls),
    publisherEnable: createElement('publisher-enable', calls),
    store,
  })

  requestCompanyTarget(store, 'disc:company-logo:developer-upload')
  assert.equal(store.processPendingRequest(), 'target-focused')
  requestCompanyTarget(store, 'disc:company-logo:publisher-upload')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls, [
    'ancestor:company-logo-panel',
    'developer-enable:focus:true',
    'developer-enable:scroll:nearest:auto',
    'ancestor:company-logo-panel',
    'publisher-enable:focus:true',
    'publisher-enable:scroll:nearest:auto',
  ])
  assert.deepEqual(logoState, {
    developerEnabled: false,
    publisherEnabled: false,
  })

  logoState.developerEnabled = true
  registerDeveloperUpload({
    calls,
    store,
    upload: createElement('developer-upload', calls),
  })
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  requestCompanyTarget(store, 'disc:company-logo:developer-upload')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls.slice(-3), [
    'ancestor:company-logo-panel',
    'developer-upload:focus:true',
    'developer-upload:scroll:nearest:auto',
  ])
})

test('all enablement combinations resolve each primary upload independently', () => {
  for (const [developerEnabled, publisherEnabled] of [
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ] as const) {
    const store = createEditorRoleFocusControllerStore()
    const calls: string[] = []
    registerAlways({
      calls,
      developerEnable: createElement('developer-enable', calls),
      publisherEnable: createElement('publisher-enable', calls),
      store,
    })
    if (developerEnabled) {
      registerDeveloperUpload({
        calls,
        store,
        upload: createElement('developer-upload', calls),
      })
    }
    if (publisherEnabled) {
      registerPublisherUpload({
        calls,
        store,
        upload: createElement('publisher-upload', calls),
      })
    }

    requestCompanyTarget(store, 'disc:company-logo:developer-upload')
    assert.equal(store.processPendingRequest(), 'target-focused')
    requestCompanyTarget(store, 'disc:company-logo:publisher-upload')
    assert.equal(store.processPendingRequest(), 'target-focused')

    assert.equal(
      calls.includes(`${developerEnabled ? 'developer-upload' : 'developer-enable'}:focus:true`),
      true,
    )
    assert.equal(
      calls.includes(`${publisherEnabled ? 'publisher-upload' : 'publisher-enable'}:focus:true`),
      true,
    )
    assert.equal(calls.some((call) =>
      call.startsWith(
        `${developerEnabled ? 'developer-enable' : 'developer-upload'}:focus`,
      )), false)
    assert.equal(calls.some((call) =>
      call.startsWith(
        `${publisherEnabled ? 'publisher-enable' : 'publisher-upload'}:focus`,
      )), false)
  }
})

test('matching and omitted owners reach the fixed semantic registrations', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  registerAlways({
    calls,
    developerEnable: createElement('developer-enable', calls),
    publisherEnable: createElement('publisher-enable', calls),
    store,
  })

  requestCompanyTarget(
    store,
    'disc:company-logo:developer-enable',
    'focus',
    { owner: 'logoAssets', logoKey: 'developer', scope: 'primary' },
  )
  assert.equal(store.processPendingRequest(), 'target-focused')
  requestCompanyTarget(
    store,
    'disc:company-logo:publisher-enable',
    'focus',
    { owner: 'logoAssets', logoKey: 'publisher', scope: 'primary' },
  )
  assert.equal(store.processPendingRequest(), 'target-focused')
  requestCompanyTarget(store, 'disc:company-logo:developer-enable')
  assert.equal(store.processPendingRequest(), 'target-focused')

  const crossOwner = parseEditorRoleFocusRequest({
    requestId: 1,
    surfaceId: 'disc-label',
    behavior: 'focus',
    destination: {
      roleId: 'company-logos',
      focusTarget: 'disc:company-logo:developer-enable',
    },
    ownerTarget: {
      owner: 'logoAssets',
      logoKey: 'publisher',
      scope: 'primary',
    },
  })
  assert.deepEqual(crossOwner, {
    ok: false,
    error: 'invalid-owner-target',
  })
  assert.equal(store.getSnapshot().pendingRequest, null)
})

test('registration replacement and cleanup are generation-safe per identity', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const unregisterOldAlways = registerAlways({
    calls,
    developerEnable: createElement('old-developer-enable', calls),
    publisherEnable: createElement('old-publisher-enable', calls),
    store,
  })
  registerAlways({
    calls,
    developerEnable: createElement('new-developer-enable', calls),
    publisherEnable: createElement('new-publisher-enable', calls),
    store,
  })
  unregisterOldAlways()
  const unregisterOldDeveloper = registerDeveloperUpload({
    calls,
    store,
    upload: createElement('old-developer-upload', calls),
  })
  registerDeveloperUpload({
    calls,
    store,
    upload: createElement('new-developer-upload', calls),
  })
  const unregisterPublisher = registerPublisherUpload({
    calls,
    store,
    upload: createElement('publisher-upload', calls),
  })
  unregisterOldDeveloper()

  requestCompanyTarget(store, 'disc:company-logo:developer-upload')
  assert.equal(store.processPendingRequest(), 'target-focused')
  unregisterPublisher()
  requestCompanyTarget(store, 'disc:company-logo:publisher-upload')
  assert.equal(store.processPendingRequest(), 'target-focused')
  requestCompanyTarget(store, 'disc:company-logo:developer-enable')
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.deepEqual(calls.slice(-9), [
    'ancestor:company-logo-panel',
    'new-developer-upload:focus:true',
    'new-developer-upload:scroll:nearest:auto',
    'ancestor:company-logo-panel',
    'new-publisher-enable:focus:true',
    'new-publisher-enable:scroll:nearest:auto',
    'ancestor:company-logo-panel',
    'new-developer-enable:focus:true',
    'new-developer-enable:scroll:nearest:auto',
  ])
})

test('reveal remains at Company Logos summary and focus opens only its ancestor', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  let panelOpen = false
  registerAlways({
    calls,
    developerEnable: createElement('developer-enable', calls),
    publisherEnable: createElement('publisher-enable', calls),
    setPanelOpen: (open) => { panelOpen = open },
    store,
  })
  store.registerRolePanel('company-logos', {
    detailsElement: () => null,
    summaryElement: () => createElement('company-summary', calls),
  })

  const reveal = requestCompanyTarget(
    store,
    'disc:company-logo:developer-upload',
    'reveal',
  )
  assert.equal(shouldOpenCompanyLogoPanelForRequest(reveal), false)
  assert.equal(store.processPendingRequest(), 'role-revealed')
  assert.equal(panelOpen, false)
  assert.deepEqual(calls, ['company-summary:scroll:nearest:auto'])

  const focus = requestCompanyTarget(
    store,
    'disc:company-logo:developer-upload',
  )
  assert.equal(shouldOpenCompanyLogoPanelForRequest(focus), true)
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(panelOpen, true)
  assert.deepEqual(calls.slice(1), [
    'ancestor:company-logo-panel',
    'developer-enable:focus:true',
    'developer-enable:scroll:nearest:auto',
  ])
})

test('missing direct uploads use only matching enable fallbacks once', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  registerAlways({
    calls,
    developerEnable: createElement('developer-enable', calls),
    publisherEnable: createElement('publisher-enable', calls),
    store,
  })
  registerDeveloperUpload({ calls, store, upload: null })
  registerPublisherUpload({ calls, store, upload: null })

  assert.doesNotThrow(() => {
    requestCompanyTarget(store, 'disc:company-logo:developer-upload')
    assert.equal(store.processPendingRequest(), 'target-focused')
    assert.equal(store.processPendingRequest(), 'no-pending-request')
    requestCompanyTarget(store, 'disc:company-logo:publisher-upload')
    assert.equal(store.processPendingRequest(), 'target-focused')
    assert.equal(store.processPendingRequest(), 'no-pending-request')
  })
  assert.deepEqual(calls.filter((call) => call.includes(':focus:')), [
    'developer-enable:focus:true',
    'publisher-enable:focus:true',
  ])
})

test('adapter and generic controls expose only primary refs and shared panel state', () => {
  assert.match(adapterSource, /useState\(false\)/)
  assert.equal(
    (adapterSource.match(/useRef<HTMLInputElement \| null>\(null\)/g) ?? [])
      .length,
    4,
  )
  assert.match(adapterSource, /if \(!developerEnabled\) return undefined/)
  assert.match(adapterSource, /if \(!publisherEnabled\) return undefined/)
  assert.match(
    adapterSource,
    /shouldOpenCompanyLogoPanelForRequest\(state\.pendingRequest\)/,
  )
  assert.match(
    adapterSource,
    /panelOpen=\{companyLogoPanelOpen \|\| companyLogoPanelFocusPending\}/,
  )
  assert.match(companyControlsSource, /open=\{panelOpen\}/)
  assert.match(companyControlsSource, /onOpenChange=\{onPanelOpenChange\}/)
  assert.match(companyControlsSource, /logoKey="developer"/)
  assert.match(companyControlsSource, /logoKey="publisher"/)
  assert.match(logoControlsSource, /enableControlRef\?: Ref<HTMLInputElement>/)
  assert.match(logoControlsSource, /uploadControlRef\?: Ref<HTMLInputElement>/)
  assert.match(optionalFeatureSource, /ref=\{enableControlRef\}/)
  assert.match(editorLogoControlsSource, /ref=\{uploadControlRef\}/)
  assert.match(editorLogoControlsSource, /className="logo-file-input"/)
  assert.match(
    readFileSync('src/styles/app-base.css', 'utf8'),
    /\.logo-upload-button:has\(\+ \.logo-file-input:focus-visible\)/,
  )

  const additionalBody = logoControlsSource.match(
    /function AdditionalLogoAssetControls[\s\S]*?export function LogoAssetControls/,
  )?.[0]
  assert.ok(additionalBody)
  assert.doesNotMatch(additionalBody, /uploadControlRef/)
})

test('production integration is Disc primary-logo-only and dependency-safe', () => {
  assert.match(
    appSource,
    /section\.id === 'company-logos'[\s\S]*<DiscCompanyLogosRoleControls[\s\S]*brandingControls=\{brandingPanelProps\}/,
  )
  assert.match(
    appSource,
    /section\.id === 'additional-artwork'[\s\S]*<DiscAdditionalArtworkRoleControls[\s\S]*artworkControls=\{artworkPanelProps\}/,
  )
  assert.doesNotMatch(caseInsertSource, /DiscCompanyLogosRoleControls/)

  const targetIds = registrationSource.match(/disc:company-logo:[a-z-]+/g) ?? []
  assert.deepEqual([...new Set(targetIds)].sort(), [
    'disc:company-logo:developer-enable',
    'disc:company-logo:developer-upload',
    'disc:company-logo:publisher-enable',
    'disc:company-logo:publisher-upload',
  ])
  assert.match(
    registrationSource,
    /'disc:company-logo:developer-upload',[\s\S]*'disc:company-logo:developer-enable'/,
  )
  assert.match(
    registrationSource,
    /'disc:company-logo:publisher-upload',[\s\S]*'disc:company-logo:publisher-enable'/,
  )

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
    'AdditionalArtwork',
    'additionalLogo',
    'handleAddAdditionalLogoAsset',
    'handleFindLogoCandidates',
    'handleApplyLogoCandidate',
    'Steam',
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
