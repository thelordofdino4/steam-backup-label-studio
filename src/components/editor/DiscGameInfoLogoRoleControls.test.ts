import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type {
  DiscRoleFocusTargetId,
  EditorRoleFocusBehavior,
} from '../../editor/editorRoleFocus.ts'
import {
  createEditorRoleFocusControllerStore,
  type EditorRoleFocusControllerStore,
} from '../../editor/editorRoleFocusController.ts'
import {
  registerAlwaysMountedMediaFocusTargets,
  registerAlwaysMountedOperatingSystemFocusTarget,
  registerEnabledMediaFormatFocusTarget,
  shouldOpenMediaPanelForRequest,
  shouldOpenOperatingSystemPanelForRequest,
} from './discGameInfoRoleFocusRegistration.ts'
import {
  registerAlwaysMountedRatingFocusTargets,
  registerEnabledRatingSelectFocusTargets,
  registerRatingValueFocusTarget,
  shouldOpenRatingPanelForRequest,
} from './discRatingRoleFocusRegistration.ts'

const adapterSource = readFileSync(
  new URL('./DiscGameInfoLogoRoleControls.tsx', import.meta.url),
  'utf8',
)
const gameInfoRegistrationSource = readFileSync(
  new URL('./discGameInfoRoleFocusRegistration.ts', import.meta.url),
  'utf8',
)
const registrationSource = readFileSync(
  new URL('./discRatingRoleFocusRegistration.ts', import.meta.url),
  'utf8',
)
const gameInfoSource = readFileSync(
  new URL('../sidebar/branding/GameInfoLogoControls.tsx', import.meta.url),
  'utf8',
)
const ratingSource = readFileSync(
  new URL('../sidebar/branding/RatingBadgeControls.tsx', import.meta.url),
  'utf8',
)
const mediaSource = readFileSync(
  new URL('../sidebar/branding/MediaMarkControls.tsx', import.meta.url),
  'utf8',
)
const platformSource = readFileSync(
  new URL('../sidebar/branding/PlatformMarkControls.tsx', import.meta.url),
  'utf8',
)
const markSource = readFileSync(
  new URL('./EditorMarkImageSourceControls.tsx', import.meta.url),
  'utf8',
)
const appSource = readFileSync('src/app/App.tsx', 'utf8')
const caseInsertSource = readFileSync(
  'src/components/caseInsert/CaseInsertEditorShell.tsx',
  'utf8',
)

type RatingFocusTarget = Extract<
  DiscRoleFocusTargetId,
  `disc:rating:${string}`
>

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

function requestRatingTarget(
  store: EditorRoleFocusControllerStore,
  focusTarget: RatingFocusTarget,
  behavior: EditorRoleFocusBehavior = 'focus',
) {
  return store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior,
    destination: {
      roleId: 'game-info-logos',
      focusTarget,
    },
  })
}

function requestGameInfoTarget(
  store: EditorRoleFocusControllerStore,
  focusTarget: Extract<
    DiscRoleFocusTargetId,
    `disc:media-format-mark:${string}` |
      'disc:operating-system-marks:enable'
  >,
  behavior: EditorRoleFocusBehavior = 'focus',
) {
  const sectionAlignmentTarget = focusTarget ===
      'disc:operating-system-marks:enable'
    ? 'disc:operating-system-marks:section'
    : 'disc:media-format-mark:section'

  return store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior,
    scrollAlignment: behavior === 'focus' ? 'section-start' : 'role-start',
    destination: {
      roleId: 'game-info-logos',
      focusTarget,
      ...(behavior === 'focus' ? { sectionAlignmentTarget } : {}),
    },
  })
}

function registerAlways({
  calls,
  enable,
  setRatingPanelOpen,
  store,
}: {
  calls: string[]
  enable: HTMLElement | null
  setRatingPanelOpen?: (open: boolean) => void
  store: EditorRoleFocusControllerStore
}) {
  return registerAlwaysMountedRatingFocusTargets({
    enableElement: () => enable,
    openRatingPanel: () => {
      calls.push('ancestor:rating')
      setRatingPanelOpen?.(true)
    },
    registerFocusTarget: store.registerFocusTarget,
    registerFocusTargetFallback: store.registerFocusTargetFallback,
  })
}

function registerEnabledSelects({
  calls,
  source,
  store,
  system,
}: {
  calls: string[]
  source: HTMLElement | null
  store: EditorRoleFocusControllerStore
  system: HTMLElement | null
}) {
  return registerEnabledRatingSelectFocusTargets({
    openRatingPanel: () => calls.push('ancestor:rating'),
    registerFocusTarget: store.registerFocusTarget,
    sourceElement: () => source,
    systemElement: () => system,
  })
}

function registerValue({
  calls,
  store,
  value,
}: {
  calls: string[]
  store: EditorRoleFocusControllerStore
  value: HTMLElement | null
}) {
  return registerRatingValueFocusTarget({
    openRatingPanel: () => calls.push('ancestor:rating'),
    registerFocusTarget: store.registerFocusTarget,
    valueElement: () => value,
  })
}

test('Rating enable opens both levels and preserves project state', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  let ratingPanelOpen = false
  const ratingState = {
    enabled: false,
    system: 'ESRB',
    value: 'M',
    source: 'placeholder',
    customImageDataUrl: 'data:image/png;base64,keep',
    metadata: { imported: true },
    layout: { x: 12, y: 8, scale: 1.1 },
    dirty: false,
    undoEntries: 3,
    previewSelection: 'background',
    selectedDiscTextKey: 'title',
    contextualRibbonActive: true,
    serializedProject: 'unchanged',
  }
  const initialState = structuredClone(ratingState)
  registerAlways({
    calls,
    enable: createElement('enable', calls),
    setRatingPanelOpen: (open) => { ratingPanelOpen = open },
    store,
  })
  store.setRoleOpen('legal-info', true)

  const first = requestRatingTarget(store, 'disc:rating:enable')
  assert.equal(store.isRoleOpen('game-info-logos'), true)
  assert.equal(store.isRoleOpen('legal-info'), true)
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  const second = requestRatingTarget(store, 'disc:rating:enable')
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.equal(second.requestId, first.requestId + 1)
  assert.equal(ratingPanelOpen, true)
  assert.deepEqual(calls, [
    'ancestor:rating',
    'enable:focus:true',
    'enable:scroll:nearest:auto',
    'ancestor:rating',
    'enable:focus:true',
    'enable:scroll:nearest:auto',
  ])
  assert.deepEqual(ratingState, initialState)
})

test('enabled system and source targets focus their actual selectors', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const state = {
    enabled: true,
    system: 'PEGI',
    value: '16',
    source: 'custom',
    customImageDataUrl: 'data:image/png;base64,keep',
  }
  const initialState = structuredClone(state)
  registerAlways({
    calls,
    enable: createElement('enable', calls),
    store,
  })
  registerEnabledSelects({
    calls,
    source: createElement('source-select', calls),
    store,
    system: createElement('system-select', calls),
  })

  requestRatingTarget(store, 'disc:rating:system')
  assert.equal(store.processPendingRequest(), 'target-focused')
  requestRatingTarget(store, 'disc:rating:source')
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.deepEqual(calls, [
    'ancestor:rating',
    'system-select:focus:true',
    'system-select:scroll:nearest:auto',
    'ancestor:rating',
    'source-select:focus:true',
    'source-select:scroll:nearest:auto',
  ])
  assert.equal(calls.some((call) => call.includes('upload')), false)
  assert.deepEqual(state, initialState)
})

test('disabled body targets use persistent enable fallback without replay', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const enable = createElement('enable', calls)
  const ratingState = {
    enabled: false,
    system: 'USK',
    value: '12',
    source: 'placeholder',
  }
  const initialState = structuredClone(ratingState)
  registerAlways({ calls, enable, store })

  for (const focusTarget of [
    'disc:rating:system',
    'disc:rating:value',
    'disc:rating:source',
  ] as const) {
    requestRatingTarget(store, focusTarget)
    assert.equal(store.processPendingRequest(), 'target-focused')
    assert.equal(store.processPendingRequest(), 'no-pending-request')
  }

  assert.deepEqual(calls, [
    'ancestor:rating',
    'enable:focus:true',
    'enable:scroll:nearest:auto',
    'ancestor:rating',
    'enable:focus:true',
    'enable:scroll:nearest:auto',
    'ancestor:rating',
    'enable:focus:true',
    'enable:scroll:nearest:auto',
  ])
  assert.deepEqual(ratingState, initialState)

  ratingState.enabled = true
  const unregisterSelects = registerEnabledSelects({
    calls,
    source: createElement('source-select', calls),
    store,
    system: createElement('system-select', calls),
  })
  const unregisterValue = registerValue({
    calls,
    store,
    value: createElement('value-select', calls),
  })
  assert.equal(store.processPendingRequest(), 'no-pending-request')

  requestRatingTarget(store, 'disc:rating:system')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(calls.at(-2), 'system-select:focus:true')
  assert.equal(ratingState.enabled, true)
  unregisterValue()
  unregisterSelects()
})

test('guided disabled Rating fallbacks retain focus and top-align Game Info Logos', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const summary = createElement('game-info-summary', calls)
  const enable = createElement('enable', calls)
  store.registerRolePanel('game-info-logos', {
    detailsElement: () => null,
    summaryElement: () => summary,
  })
  registerAlways({ calls, enable, store })

  for (const focusTarget of [
    'disc:rating:system',
    'disc:rating:value',
    'disc:rating:source',
  ] as const) {
    store.requestRoleFocus({
      surfaceId: 'disc-label',
      behavior: 'focus',
      scrollAlignment: 'role-start',
      destination: { roleId: 'game-info-logos', focusTarget },
    })
    assert.equal(store.processPendingRequest(), 'target-focused')
  }

  assert.deepEqual(calls, [
    'ancestor:rating',
    'enable:focus:true',
    'game-info-summary:scroll:start:auto',
    'ancestor:rating',
    'enable:focus:true',
    'game-info-summary:scroll:start:auto',
    'ancestor:rating',
    'enable:focus:true',
    'game-info-summary:scroll:start:auto',
  ])
})

test('value target follows select and input variants with safe replacement', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const ratingState = { system: 'ESRB', value: 'M' }
  registerAlways({
    calls,
    enable: createElement('enable', calls),
    store,
  })
  const unregisterSelect = registerValue({
    calls,
    store,
    value: createElement('value-select', calls),
  })

  requestRatingTarget(store, 'disc:rating:value')
  assert.equal(store.processPendingRequest(), 'target-focused')
  ratingState.system = 'custom'
  ratingState.value = 'Teen Plus'
  const unregisterInput = registerValue({
    calls,
    store,
    value: createElement('value-input', calls),
  })
  unregisterSelect()

  requestRatingTarget(store, 'disc:rating:value')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls, [
    'ancestor:rating',
    'value-select:focus:true',
    'value-select:scroll:nearest:auto',
    'ancestor:rating',
    'value-input:focus:true',
    'value-input:scroll:nearest:auto',
  ])
  assert.deepEqual(ratingState, {
    system: 'custom',
    value: 'Teen Plus',
  })
  unregisterInput()
})

test('direct body cleanup retains fallbacks across disable and re-enable', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const enable = createElement('enable', calls)
  const unregisterAlwaysOld = registerAlways({ calls, enable, store })
  const unregisterAlwaysNew = registerAlways({ calls, enable, store })
  unregisterAlwaysOld()
  const unregisterSelects = registerEnabledSelects({
    calls,
    source: createElement('source', calls),
    store,
    system: createElement('system', calls),
  })
  const unregisterValue = registerValue({
    calls,
    store,
    value: createElement('value', calls),
  })

  unregisterValue()
  unregisterSelects()
  requestRatingTarget(store, 'disc:rating:value')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(calls.at(-2), 'enable:focus:true')

  const unregisterReplacement = registerValue({
    calls,
    store,
    value: createElement('replacement-value', calls),
  })
  requestRatingTarget(store, 'disc:rating:value')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(calls.at(-2), 'replacement-value:focus:true')
  unregisterReplacement()
  unregisterAlwaysNew()
})

test('manual Rating panel state is independent and focus can reopen it', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  let ratingPanelOpen = true
  registerAlways({
    calls,
    enable: createElement('enable', calls),
    setRatingPanelOpen: (open) => { ratingPanelOpen = open },
    store,
  })
  store.setRoleOpen('game-info-logos', true)
  store.setRoleOpen('legal-info', true)

  assert.equal(ratingPanelOpen, true)
  ratingPanelOpen = false
  store.setRoleOpen('game-info-logos', false)
  assert.equal(ratingPanelOpen, false)
  assert.equal(store.isRoleOpen('legal-info'), true)

  requestRatingTarget(store, 'disc:rating:enable')
  assert.equal(store.isRoleOpen('game-info-logos'), true)
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(ratingPanelOpen, true)
  assert.equal(store.isRoleOpen('legal-info'), true)
})

test('reveal stays on Game Info summary and does not open Rating', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  let ratingPanelOpen = false
  registerAlways({
    calls,
    enable: createElement('enable', calls),
    setRatingPanelOpen: (open) => { ratingPanelOpen = open },
    store,
  })
  store.registerRolePanel('game-info-logos', {
    detailsElement: () => null,
    summaryElement: () => createElement('summary', calls),
  })

  const reveal = requestRatingTarget(
    store,
    'disc:rating:system',
    'reveal',
  )
  assert.equal(shouldOpenRatingPanelForRequest(reveal), false)
  assert.equal(store.processPendingRequest(), 'role-revealed')
  assert.equal(ratingPanelOpen, false)
  assert.deepEqual(calls, ['summary:scroll:nearest:auto'])

  const focus = requestRatingTarget(store, 'disc:rating:system')
  assert.equal(shouldOpenRatingPanelForRequest(focus), true)
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(ratingPanelOpen, true)
  assert.deepEqual(calls.slice(1), [
    'ancestor:rating',
    'enable:focus:true',
    'enable:scroll:nearest:auto',
  ])
})

test('missing enabled controls safely use enable fallback once', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  registerAlways({
    calls,
    enable: createElement('enable', calls),
    store,
  })
  registerEnabledSelects({
    calls,
    source: null,
    store,
    system: null,
  })
  registerValue({ calls, store, value: null })

  assert.doesNotThrow(() => {
    for (const focusTarget of [
      'disc:rating:system',
      'disc:rating:value',
      'disc:rating:source',
    ] as const) {
      requestRatingTarget(store, focusTarget)
      assert.equal(store.processPendingRequest(), 'target-focused')
      assert.equal(store.processPendingRequest(), 'no-pending-request')
    }
  })
  assert.equal(
    calls.filter((call) => call === 'enable:focus:true').length,
    3,
  )
})

test('Media enable and enabled format focus exact controls without mutation', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const state = {
    enabled: true,
    value: 'dvd-rom',
    source: 'custom',
    theme: 'light',
    customImageDataUrl: 'data:image/png;base64,keep',
    layout: { x: 78, y: 74, scale: 1.2 },
    dirty: false,
    undoEntries: 2,
    previewSelection: 'background',
    selectedDiscTextKey: 'title',
  }
  const initialState = structuredClone(state)
  const summary = createElement('game-info-summary', calls)
  store.registerRolePanel('game-info-logos', {
    detailsElement: () => null,
    summaryElement: () => summary,
  })
  registerAlwaysMountedMediaFocusTargets({
    enableElement: () => createElement('media-enable', calls),
    openMediaPanel: () => calls.push('ancestor:media'),
    registerFocusTarget: store.registerFocusTarget,
    registerFocusTargetFallback: store.registerFocusTargetFallback,
    registerSectionAlignmentTarget: store.registerSectionAlignmentTarget,
    sectionElement: () => createElement('media-section', calls),
  })
  registerEnabledMediaFormatFocusTarget({
    formatElement: () => createElement('media-format', calls),
    openMediaPanel: () => calls.push('ancestor:media'),
    registerFocusTarget: store.registerFocusTarget,
  })

  requestGameInfoTarget(store, 'disc:media-format-mark:enable')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  requestGameInfoTarget(store, 'disc:media-format-mark:format')
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.deepEqual(calls, [
    'ancestor:media',
    'media-section:scroll:start:auto',
    'media-enable:focus:true',
    'media-section:scroll:start:auto',
    'ancestor:media',
    'media-section:scroll:start:auto',
    'media-format:focus:true',
    'media-section:scroll:start:auto',
  ])
  assert.deepEqual(state, initialState)
})

test('disabled Media format falls back once and a new request reaches the selector', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const mediaState = { enabled: false, value: 'blu-ray' }
  const ratingEnable = createElement('rating-enable', calls)
  const mediaEnable = createElement('media-enable', calls)
  registerAlways({ calls, enable: ratingEnable, store })
  registerAlwaysMountedMediaFocusTargets({
    enableElement: () => mediaEnable,
    openMediaPanel: () => calls.push('ancestor:media'),
    registerFocusTarget: store.registerFocusTarget,
    registerFocusTargetFallback: store.registerFocusTargetFallback,
    registerSectionAlignmentTarget: store.registerSectionAlignmentTarget,
    sectionElement: () => createElement('media-section', calls),
  })

  requestGameInfoTarget(store, 'disc:media-format-mark:format')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  assert.equal(mediaState.enabled, false)
  assert.equal(calls.includes('rating-enable:focus:true'), false)
  assert.equal(calls.includes('media-enable:focus:true'), true)

  mediaState.enabled = true
  registerEnabledMediaFormatFocusTarget({
    formatElement: () => createElement('media-format', calls),
    openMediaPanel: () => calls.push('ancestor:media'),
    registerFocusTarget: store.registerFocusTarget,
  })
  assert.equal(store.processPendingRequest(), 'no-pending-request')

  requestGameInfoTarget(store, 'disc:media-format-mark:format')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls.slice(-3), [
    'media-section:scroll:start:auto',
    'media-format:focus:true',
    'media-section:scroll:start:auto',
  ])
  assert.deepEqual(mediaState, { enabled: true, value: 'blu-ray' })
})

test('Operating System enable focuses repeatedly without selecting marks', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const platformState = {
    values: ['windows', 'linux'],
    enabledValues: [],
    source: 'placeholder',
    theme: 'light',
    customAssets: {},
    groupedPlacementCalls: 0,
    dirty: false,
    undoEntries: 0,
    previewSelection: null,
  }
  const initialState = structuredClone(platformState)
  store.registerRolePanel('game-info-logos', {
    detailsElement: () => null,
    summaryElement: () => createElement('game-info-summary', calls),
  })
  registerAlwaysMountedOperatingSystemFocusTarget({
    enableElement: () => createElement('os-enable', calls),
    openOperatingSystemPanel: () => calls.push('ancestor:os'),
    registerFocusTarget: store.registerFocusTarget,
    registerSectionAlignmentTarget: store.registerSectionAlignmentTarget,
    sectionElement: () => createElement('os-section', calls),
  })

  const first = requestGameInfoTarget(
    store,
    'disc:operating-system-marks:enable',
  )
  assert.equal(store.processPendingRequest(), 'target-focused')
  const second = requestGameInfoTarget(
    store,
    'disc:operating-system-marks:enable',
  )
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.equal(second.requestId, first.requestId + 1)
  assert.equal(
    calls.filter((call) => call === 'os-enable:focus:true').length,
    2,
  )
  assert.equal(
    calls.filter((call) =>
      call === 'game-info-summary:scroll:start:auto').length,
    0,
  )
  assert.equal(
    calls.filter((call) => call === 'os-section:scroll:start:auto').length,
    4,
  )
  assert.deepEqual(platformState, initialState)
})

test('Rating, Media, and OS registrations coexist and clean up independently', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const unregisterRating = registerAlways({
    calls,
    enable: createElement('rating-enable', calls),
    store,
  })
  const unregisterMedia = registerAlwaysMountedMediaFocusTargets({
    enableElement: () => createElement('media-enable', calls),
    openMediaPanel: () => calls.push('ancestor:media'),
    registerFocusTarget: store.registerFocusTarget,
    registerFocusTargetFallback: store.registerFocusTargetFallback,
    registerSectionAlignmentTarget: store.registerSectionAlignmentTarget,
    sectionElement: () => createElement('media-section', calls),
  })
  const unregisterOs = registerAlwaysMountedOperatingSystemFocusTarget({
    enableElement: () => createElement('os-enable', calls),
    openOperatingSystemPanel: () => calls.push('ancestor:os'),
    registerFocusTarget: store.registerFocusTarget,
    registerSectionAlignmentTarget: store.registerSectionAlignmentTarget,
    sectionElement: () => createElement('os-section', calls),
  })

  requestRatingTarget(store, 'disc:rating:enable')
  assert.equal(store.processPendingRequest(), 'target-focused')
  requestGameInfoTarget(store, 'disc:media-format-mark:enable')
  assert.equal(store.processPendingRequest(), 'target-focused')
  requestGameInfoTarget(store, 'disc:operating-system-marks:enable')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(
    calls.filter((call) => call.includes(':focus:true')),
    [
      'rating-enable:focus:true',
      'media-enable:focus:true',
      'os-enable:focus:true',
    ],
  )

  unregisterMedia()
  requestRatingTarget(store, 'disc:rating:enable')
  assert.equal(store.processPendingRequest(), 'target-focused')
  requestGameInfoTarget(store, 'disc:operating-system-marks:enable')
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls.slice(-3), [
    'os-section:scroll:start:auto',
    'os-enable:focus:true',
    'os-section:scroll:start:auto',
  ])
  unregisterOs()
  unregisterRating()
})

test('reveal stays at Game Info summary for Media and OS destinations', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  let mediaPanelOpen = false
  let operatingSystemPanelOpen = false
  registerAlwaysMountedMediaFocusTargets({
    enableElement: () => createElement('media-enable', calls),
    openMediaPanel: () => { mediaPanelOpen = true },
    registerFocusTarget: store.registerFocusTarget,
    registerFocusTargetFallback: store.registerFocusTargetFallback,
    registerSectionAlignmentTarget: store.registerSectionAlignmentTarget,
    sectionElement: () => createElement('media-section', calls),
  })
  registerAlwaysMountedOperatingSystemFocusTarget({
    enableElement: () => createElement('os-enable', calls),
    openOperatingSystemPanel: () => { operatingSystemPanelOpen = true },
    registerFocusTarget: store.registerFocusTarget,
    registerSectionAlignmentTarget: store.registerSectionAlignmentTarget,
    sectionElement: () => createElement('os-section', calls),
  })
  store.registerRolePanel('game-info-logos', {
    detailsElement: () => null,
    summaryElement: () => createElement('summary', calls),
  })

  const mediaReveal = requestGameInfoTarget(
    store,
    'disc:media-format-mark:format',
    'reveal',
  )
  assert.equal(shouldOpenMediaPanelForRequest(mediaReveal), false)
  assert.equal(store.processPendingRequest(), 'role-revealed')
  const osReveal = requestGameInfoTarget(
    store,
    'disc:operating-system-marks:enable',
    'reveal',
  )
  assert.equal(shouldOpenOperatingSystemPanelForRequest(osReveal), false)
  assert.equal(store.processPendingRequest(), 'role-revealed')

  assert.equal(mediaPanelOpen, false)
  assert.equal(operatingSystemPanelOpen, false)
  assert.deepEqual(calls, [
    'summary:scroll:start:auto',
    'summary:scroll:start:auto',
  ])
})

test('Game Info role adapter owns independent panel state and registrations', () => {
  assert.match(adapterSource, /useState\(false\)/)
  assert.match(adapterSource, /useRef<HTMLInputElement \| null>\(null\)/)
  assert.match(adapterSource, /useRef<HTMLSelectElement \| null>\(null\)/)
  assert.equal(
    (adapterSource.match(/useRef<HTMLDetailsElement \| null>\(null\)/g) ?? [])
      .length,
    2,
  )
  assert.match(
    adapterSource,
    /useRef<[\s\S]*?HTMLInputElement \| HTMLSelectElement \| null[\s\S]*?>\(null\)/,
  )
  assert.match(adapterSource, /registerAlwaysMountedRatingFocusTargets/)
  assert.match(adapterSource, /registerEnabledRatingSelectFocusTargets/)
  assert.match(adapterSource, /registerRatingValueFocusTarget/)
  assert.match(adapterSource, /registerAlwaysMountedMediaFocusTargets/)
  assert.match(adapterSource, /registerEnabledMediaFormatFocusTarget/)
  assert.match(
    adapterSource,
    /registerAlwaysMountedOperatingSystemFocusTarget/,
  )
  assert.match(adapterSource, /registerSectionAlignmentTarget/)
  assert.match(adapterSource, /sectionElement: \(\) => mediaSectionRef\.current/)
  assert.match(
    adapterSource,
    /sectionElement: \(\) => operatingSystemSectionRef\.current/,
  )
  assert.match(
    gameInfoRegistrationSource,
    /'disc:media-format-mark:section'/,
  )
  assert.match(
    gameInfoRegistrationSource,
    /'disc:operating-system-marks:section'/,
  )
  assert.match(adapterSource, /if \(!ratingEnabled\) return undefined/g)
  assert.match(adapterSource, /if \(!mediaEnabled\) return undefined/)
  assert.match(adapterSource, /ratingValueControlKind/)
  assert.match(
    adapterSource,
    /shouldOpenRatingPanelForRequest\(pendingRequest\)/,
  )
  assert.match(
    adapterSource,
    /mediaPanelOpen=\{mediaPanelOpen \|\|[\s\S]*shouldOpenMediaPanelForRequest\(pendingRequest\)\}/,
  )
  assert.match(
    adapterSource,
    /operatingSystemPanelOpen=\{operatingSystemPanelOpen \|\|[\s\S]*shouldOpenOperatingSystemPanelForRequest\(pendingRequest\)\}/,
  )
  assert.match(registrationSource, /'disc:rating:system',[\s\S]*'disc:rating:enable'/)
  assert.match(registrationSource, /'disc:rating:value',[\s\S]*'disc:rating:enable'/)
  assert.match(registrationSource, /'disc:rating:source',[\s\S]*'disc:rating:enable'/)
})

test('generic controls forward refs to exact Rating, Media, and OS elements', () => {
  assert.match(gameInfoSource, /open=\{ratingPanelOpen\}/)
  assert.match(gameInfoSource, /onOpenChange=\{onRatingPanelOpenChange\}/)
  assert.match(ratingSource, /enableControlRef=\{enableControlRef\}/)
  assert.match(ratingSource, /<select ref=\{systemControlRef\}/)
  assert.match(ratingSource, /<input ref=\{valueControlRef\}/)
  assert.match(ratingSource, /<select ref=\{valueControlRef\}/)
  assert.match(ratingSource, /sourceControlRef=\{sourceControlRef\}/)
  assert.match(markSource, /<select\s+ref=\{sourceControlRef\}/)
  assert.match(gameInfoSource, /open=\{mediaPanelOpen\}/)
  assert.match(gameInfoSource, /detailsRef=\{mediaPanelDetailsRef\}/)
  assert.match(gameInfoSource, /onOpenChange=\{onMediaPanelOpenChange\}/)
  assert.match(gameInfoSource, /open=\{operatingSystemPanelOpen\}/)
  assert.match(
    gameInfoSource,
    /detailsRef=\{operatingSystemPanelDetailsRef\}/,
  )
  assert.match(
    gameInfoSource,
    /onOpenChange=\{onOperatingSystemPanelOpenChange\}/,
  )
  assert.match(mediaSource, /enableControlRef=\{enableControlRef\}/)
  assert.match(mediaSource, /<select ref=\{formatControlRef\}/)
  assert.match(platformSource, /<input ref=\{enableControlRef\}/)
  const uploadInputTag = markSource.match(
    /<input\s+[\s\S]*?type="file"[\s\S]*?\/>/,
  )?.[0]
  assert.ok(uploadInputTag)
  assert.doesNotMatch(uploadInputTag, /ref=\{sourceControlRef\}/)
})

test('production integration is role-owned and dependency-safe', () => {
  assert.match(
    appSource,
    /section\.id === 'game-info-logos'[\s\S]*<DiscGameInfoLogoRoleControls[\s\S]*brandingControls=\{brandingPanelProps\}/,
  )
  assert.match(
    appSource,
    /section\.id === 'company-logos'[\s\S]*<DiscCompanyLogosRoleControls[\s\S]*brandingControls=\{brandingPanelProps\}/,
  )
  assert.match(
    appSource,
    /section\.id === 'additional-artwork'[\s\S]*<DiscAdditionalArtworkRoleControls[\s\S]*artworkControls=\{artworkPanelProps\}/,
  )
  assert.doesNotMatch(caseInsertSource, /DiscGameInfoLogoRoleControls/)

  const combinedSource = `${adapterSource}\n${registrationSource}\n${gameInfoRegistrationSource}`
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
    'groupedPlatformMarkPlacement',
    'handlePlatformMarkToggle',
    'handleMediaMarkLayoutChange',
    'projectSchema',
    'createProjectSnapshot',
    'restoreProject',
    'shouldRenderRatingBadge',
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
