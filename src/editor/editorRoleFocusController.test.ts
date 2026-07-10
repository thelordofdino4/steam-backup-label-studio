import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  createEditorRoleFocusControllerStore,
  type EditorRoleFocusRequestInput,
} from './editorRoleFocusController.ts'

const GAME_TITLE_FOCUS_REQUEST = {
  surfaceId: 'disc-label',
  behavior: 'focus',
  destination: {
    roleId: 'game-title',
    focusTarget: 'disc:game-title:artwork-upload',
  },
} as const satisfies EditorRoleFocusRequestInput

const GAME_TITLE_REVEAL_REQUEST = {
  ...GAME_TITLE_FOCUS_REQUEST,
  behavior: 'reveal',
} as const satisfies EditorRoleFocusRequestInput

const RATING_FOCUS_REQUEST = {
  surfaceId: 'disc-label',
  behavior: 'focus',
  destination: {
    roleId: 'game-info-logos',
    focusTarget: 'disc:rating:value',
  },
} as const satisfies EditorRoleFocusRequestInput

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

test('generates positive monotonic IDs and ignores caller ID injection', () => {
  const store = createEditorRoleFocusControllerStore()
  const injectedInput = {
    ...GAME_TITLE_FOCUS_REQUEST,
    requestId: 9000,
  } as unknown as EditorRoleFocusRequestInput
  const first = store.requestRoleFocus(injectedInput)
  const second = store.requestRoleFocus(GAME_TITLE_FOCUS_REQUEST)

  assert.equal(first.requestId, 1)
  assert.equal(second.requestId, 2)
  assert.ok(Number.isSafeInteger(first.requestId) && first.requestId > 0)
  assert.deepEqual(first.destination, second.destination)
})

test('integrates reducer role state without accordion behavior', () => {
  const store = createEditorRoleFocusControllerStore()

  store.setRoleOpen('legal-info', true)
  store.setRoleOpen('additional-text', true)
  store.requestRoleFocus(GAME_TITLE_FOCUS_REQUEST)

  assert.equal(store.isRoleOpen('game-title'), true)
  assert.equal(store.isRoleOpen('legal-info'), true)
  assert.equal(store.isRoleOpen('additional-text'), true)

  store.setRoleOpen('game-title', false)
  assert.equal(store.isRoleOpen('game-title'), false)

  store.requestRoleFocus(GAME_TITLE_FOCUS_REQUEST)
  assert.equal(store.isRoleOpen('game-title'), true)
})

test('a new store starts a fresh transient provider session', () => {
  const firstMount = createEditorRoleFocusControllerStore()
  firstMount.setRoleOpen('legal-info', true)
  firstMount.requestRoleFocus(GAME_TITLE_FOCUS_REQUEST)

  const remount = createEditorRoleFocusControllerStore()

  assert.deepEqual([...remount.getSnapshot().openRoleIds], [])
  assert.equal(remount.getSnapshot().pendingRequest, null)
  assert.equal(remount.requestRoleFocus(GAME_TITLE_FOCUS_REQUEST).requestId, 1)
})

test('role registrations unregister only their matching generation', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const oldSummary = createElement('old-summary', calls)
  const newSummary = createElement('new-summary', calls)
  const unregisterOld = store.registerRolePanel('game-title', {
    detailsElement: () => null,
    summaryElement: () => oldSummary,
  })
  const unregisterNew = store.registerRolePanel('game-title', {
    detailsElement: () => null,
    summaryElement: () => newSummary,
  })

  unregisterOld()
  store.requestRoleFocus(GAME_TITLE_REVEAL_REQUEST)

  assert.equal(store.processPendingRequest(), 'role-revealed')
  assert.deepEqual(calls, ['new-summary:scroll:nearest:auto'])

  unregisterNew()
  store.requestRoleFocus(GAME_TITLE_REVEAL_REQUEST)
  assert.equal(store.processPendingRequest(), 'unavailable')
})

test('focus target registrations coexist and stale cleanup preserves replacements', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const oldTarget = createElement('old-target', calls)
  const newTarget = createElement('new-target', calls)
  const ratingTarget = createElement('rating-target', calls)
  const unregisterOld = store.registerFocusTarget(
    'disc:game-title:artwork-upload',
    { element: () => oldTarget },
  )
  store.registerFocusTarget('disc:game-title:artwork-upload', {
    element: () => newTarget,
  })
  const unregisterRating = store.registerFocusTarget('disc:rating:value', {
    element: () => ratingTarget,
  })

  unregisterOld()
  store.requestRoleFocus(GAME_TITLE_FOCUS_REQUEST)

  assert.equal(store.processPendingRequest(), 'target-focused')
  store.requestRoleFocus(RATING_FOCUS_REQUEST)
  assert.equal(store.processPendingRequest(), 'target-focused')
  unregisterRating()
  store.requestRoleFocus(RATING_FOCUS_REQUEST)
  assert.equal(store.processPendingRequest(), 'unavailable')
  assert.deepEqual(calls, [
    'new-target:focus:true',
    'new-target:scroll:nearest:auto',
    'rating-target:focus:true',
    'rating-target:scroll:nearest:auto',
  ])
  assert.equal('roleRegistrations' in store, false)
  assert.equal('focusTargetRegistrations' in store, false)
})

test('reveal scrolls the role summary once without focusing a target', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const summary = createElement('summary', calls)
  const target = createElement('target', calls)
  store.registerRolePanel('game-title', {
    detailsElement: () => null,
    summaryElement: () => summary,
  })
  store.registerFocusTarget('disc:game-title:artwork-upload', {
    element: () => target,
  })
  store.requestRoleFocus(GAME_TITLE_REVEAL_REQUEST)

  assert.equal(store.processPendingRequest(), 'role-revealed')
  assert.deepEqual(calls, ['summary:scroll:nearest:auto'])
  assert.equal(store.getSnapshot().pendingRequest, null)
  assert.equal(store.processPendingRequest(), 'no-pending-request')
})

test('focus opens explicit ancestors in order then focuses and reveals', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const target = createElement('target', calls)
  store.registerFocusTarget('disc:game-title:artwork-upload', {
    openAncestors: [
      () => calls.push('ancestor:first'),
      () => calls.push('ancestor:second'),
    ],
    element: () => target,
  })
  store.requestRoleFocus(GAME_TITLE_FOCUS_REQUEST)

  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls, [
    'ancestor:first',
    'ancestor:second',
    'target:focus:true',
    'target:scroll:nearest:auto',
  ])
  assert.equal(store.getSnapshot().pendingRequest, null)
})

test('explicit target fallback is bounded and processes repeated requests', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const enableTarget = createElement('enable', calls)
  store.registerFocusTarget('disc:game-title:artwork-upload', {
    element: () => null,
  })
  store.registerFocusTargetFallback(
    'disc:game-title:artwork-upload',
    'disc:game-title:artwork-enable',
  )
  store.registerFocusTarget('disc:game-title:artwork-enable', {
    element: () => enableTarget,
  })

  const first = store.requestRoleFocus(GAME_TITLE_FOCUS_REQUEST)
  assert.equal(store.processPendingRequest(), 'target-focused')
  const second = store.requestRoleFocus(GAME_TITLE_FOCUS_REQUEST)
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.equal(second.requestId, first.requestId + 1)
  assert.deepEqual(calls, [
    'enable:focus:true',
    'enable:scroll:nearest:auto',
    'enable:focus:true',
    'enable:scroll:nearest:auto',
  ])
})

test('repeatable target registrations resolve exact persisted element IDs', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const uploadA = {
    focusTarget: 'disc:additional-artwork:upload',
    elementId: 'artwork:A|B/C:D',
  } as const
  const uploadB = {
    focusTarget: 'disc:additional-artwork:upload',
    elementId: 'artwork:B|A/C:D',
  } as const
  store.registerFocusTarget(uploadA, {
    element: () => createElement('upload-a', calls),
  })
  store.registerFocusTarget(uploadB, {
    element: () => createElement('upload-b', calls),
  })

  for (const [identity, expectedLabel] of [
    [uploadA, 'upload-a'],
    [uploadB, 'upload-b'],
  ] as const) {
    store.requestRoleFocus({
      surfaceId: 'disc-label',
      behavior: 'focus',
      destination: {
        roleId: 'additional-artwork',
        ...identity,
      },
    })
    assert.equal(store.processPendingRequest(), 'target-focused')
    assert.equal(calls.at(-2), `${expectedLabel}:focus:true`)
  }

  store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior: 'focus',
    destination: {
      roleId: 'additional-artwork',
      focusTarget: 'disc:additional-artwork:upload',
      elementId: 'artwork:C',
    },
  })
  assert.equal(store.processPendingRequest(), 'unavailable')
  assert.deepEqual(calls, [
    'upload-a:focus:true',
    'upload-a:scroll:nearest:auto',
    'upload-b:focus:true',
    'upload-b:scroll:nearest:auto',
  ])
})

test('repeatable replacement and cleanup remain generation-safe per composite identity', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const uploadA = {
    focusTarget: 'disc:additional-artwork:upload',
    elementId: 'artwork-a',
  } as const
  const uploadB = {
    focusTarget: 'disc:additional-artwork:upload',
    elementId: 'artwork-b',
  } as const
  const enableA = {
    focusTarget: 'disc:additional-artwork:item-enable',
    elementId: 'artwork-a',
  } as const
  const unregisterOldA = store.registerFocusTarget(uploadA, {
    element: () => createElement('old-upload-a', calls),
  })
  const unregisterNewA = store.registerFocusTarget(uploadA, {
    element: () => createElement('new-upload-a', calls),
  })
  const unregisterB = store.registerFocusTarget(uploadB, {
    element: () => createElement('upload-b', calls),
  })
  store.registerFocusTarget(enableA, {
    element: () => createElement('enable-a', calls),
  })
  unregisterOldA()

  for (const identity of [uploadA, uploadB, enableA] as const) {
    store.requestRoleFocus({
      surfaceId: 'disc-label',
      behavior: 'focus',
      destination: {
        roleId: 'additional-artwork',
        ...identity,
      },
    })
    assert.equal(store.processPendingRequest(), 'target-focused')
  }
  unregisterNewA()
  unregisterB()

  assert.deepEqual(calls, [
    'new-upload-a:focus:true',
    'new-upload-a:scroll:nearest:auto',
    'upload-b:focus:true',
    'upload-b:scroll:nearest:auto',
    'enable-a:focus:true',
    'enable-a:scroll:nearest:auto',
  ])
})

test('composite fallback traversal follows the exact future artwork chain', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const uploadA = {
    focusTarget: 'disc:additional-artwork:upload',
    elementId: 'artwork-a',
  } as const
  const enableA = {
    focusTarget: 'disc:additional-artwork:item-enable',
    elementId: 'artwork-a',
  } as const
  const add = 'disc:additional-artwork:add' as const
  const globalEnable = 'disc:additional-artwork:enable' as const
  store.registerFocusTargetFallback(uploadA, enableA)
  store.registerFocusTargetFallback(enableA, add)
  store.registerFocusTargetFallback(add, globalEnable)
  const unregisterGlobal = store.registerFocusTarget(globalEnable, {
    element: () => createElement('global-enable', calls),
  })

  const requestUploadA = () => store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior: 'focus',
    destination: {
      roleId: 'additional-artwork',
      ...uploadA,
    },
  })
  requestUploadA()
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(calls.at(-2), 'global-enable:focus:true')

  const unregisterAdd = store.registerFocusTarget(add, {
    element: () => createElement('add', calls),
  })
  requestUploadA()
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(calls.at(-2), 'add:focus:true')

  const unregisterEnableA = store.registerFocusTarget(enableA, {
    element: () => createElement('enable-a', calls),
  })
  requestUploadA()
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(calls.at(-2), 'enable-a:focus:true')

  const unregisterUploadA = store.registerFocusTarget(uploadA, {
    element: () => createElement('upload-a', calls),
  })
  const finalRequest = requestUploadA()
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  assert.equal(calls.at(-2), 'upload-a:focus:true')
  assert.equal(store.getSnapshot().lastHandledRequestId, finalRequest.requestId)

  unregisterUploadA()
  unregisterEnableA()
  unregisterAdd()
  unregisterGlobal()
  store.registerRolePanel('additional-artwork', {
    detailsElement: () => null,
    summaryElement: () => createElement('artwork-summary', calls),
  })
  requestUploadA()
  assert.equal(store.processPendingRequest(), 'role-summary-fallback')
  assert.deepEqual(calls.slice(-2), [
    'artwork-summary:focus:true',
    'artwork-summary:scroll:nearest:auto',
  ])
})

test('repeatable reveal ignores composite target traversal', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const uploadA = {
    focusTarget: 'disc:additional-artwork:upload',
    elementId: 'artwork-a',
  } as const
  store.registerRolePanel('additional-artwork', {
    detailsElement: () => null,
    summaryElement: () => createElement('artwork-summary', calls),
  })
  store.registerFocusTarget(uploadA, {
    element: () => createElement('upload-a', calls),
  })
  store.registerFocusTargetFallback(
    uploadA,
    'disc:additional-artwork:add',
  )

  store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior: 'reveal',
    destination: {
      roleId: 'additional-artwork',
      ...uploadA,
    },
  })
  assert.equal(store.processPendingRequest(), 'role-revealed')
  assert.deepEqual(calls, ['artwork-summary:scroll:nearest:auto'])
})

test('repeatable fallbacks cannot cross element identities', () => {
  const store = createEditorRoleFocusControllerStore()
  const uploadA = {
    focusTarget: 'disc:additional-artwork:upload',
    elementId: 'artwork-a',
  } as const
  const enableA = {
    focusTarget: 'disc:additional-artwork:item-enable',
    elementId: 'artwork-a',
  } as const
  const enableB = {
    focusTarget: 'disc:additional-artwork:item-enable',
    elementId: 'artwork-b',
  } as const

  assert.throws(
    () => store.registerFocusTargetFallback(uploadA, enableB),
    /cannot cross repeatable identities/,
  )
  assert.throws(
    () => store.registerFocusTargetFallback(
      'disc:additional-artwork:add',
      enableA,
    ),
    /cannot cross repeatable identities/,
  )
  assert.doesNotThrow(() =>
    store.registerFocusTargetFallback(uploadA, enableA))
})

test('fallback registration rejects self, direct, and longer cycles safely', () => {
  const store = createEditorRoleFocusControllerStore()
  const uploadA = {
    focusTarget: 'disc:additional-artwork:upload',
    elementId: 'artwork-a',
  } as const
  const enableA = {
    focusTarget: 'disc:additional-artwork:item-enable',
    elementId: 'artwork-a',
  } as const
  const add = 'disc:additional-artwork:add' as const
  const globalEnable = 'disc:additional-artwork:enable' as const

  assert.throws(
    () => store.registerFocusTargetFallback(add, add),
    /cannot target itself/,
  )
  store.registerFocusTargetFallback(uploadA, enableA)
  assert.throws(
    () => store.registerFocusTargetFallback(enableA, uploadA),
    /cycle detected/,
  )
  store.registerFocusTargetFallback(enableA, add)
  store.registerFocusTargetFallback(add, globalEnable)
  assert.throws(
    () => store.registerFocusTargetFallback(globalEnable, uploadA),
    /cannot cross repeatable identities/,
  )

  const fixedStore = createEditorRoleFocusControllerStore()
  fixedStore.registerFocusTargetFallback(
    'disc:rating:system',
    'disc:rating:value',
  )
  fixedStore.registerFocusTargetFallback(
    'disc:rating:value',
    'disc:rating:source',
  )
  assert.throws(
    () => fixedStore.registerFocusTargetFallback(
      'disc:rating:source',
      'disc:rating:system',
    ),
    /cycle detected/,
  )

  assert.doesNotThrow(() => {
    store.requestRoleFocus({
      surfaceId: 'disc-label',
      behavior: 'focus',
      destination: {
        roleId: 'additional-artwork',
        ...uploadA,
      },
    })
    assert.equal(store.processPendingRequest(), 'unavailable')
  })
  assert.equal(store.processPendingRequest(), 'no-pending-request')
})

test('fallback replacement and stale cleanup preserve exact registrations', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const uploadA = {
    focusTarget: 'disc:additional-artwork:upload',
    elementId: 'artwork-a',
  } as const
  const enableA = {
    focusTarget: 'disc:additional-artwork:item-enable',
    elementId: 'artwork-a',
  } as const
  const uploadB = {
    focusTarget: 'disc:additional-artwork:upload',
    elementId: 'artwork-b',
  } as const
  const unregisterOld = store.registerFocusTargetFallback(
    uploadA,
    'disc:additional-artwork:add',
  )
  store.registerFocusTargetFallback(uploadA, enableA)
  store.registerFocusTargetFallback(
    uploadB,
    'disc:additional-artwork:add',
  )
  unregisterOld()
  store.registerFocusTarget(enableA, {
    element: () => createElement('enable-a', calls),
  })
  store.registerFocusTarget('disc:additional-artwork:add', {
    element: () => createElement('add', calls),
  })

  store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior: 'focus',
    destination: {
      roleId: 'additional-artwork',
      ...uploadA,
    },
  })
  assert.equal(store.processPendingRequest(), 'target-focused')
  store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior: 'focus',
    destination: {
      roleId: 'additional-artwork',
      ...uploadB,
    },
  })
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls, [
    'enable-a:focus:true',
    'enable-a:scroll:nearest:auto',
    'add:focus:true',
    'add:scroll:nearest:auto',
  ])
})

test('invalid repeatable registration identities are rejected at runtime', () => {
  const store = createEditorRoleFocusControllerStore()
  const registerFocusTarget = store.registerFocusTarget as (
    identity: unknown,
    registration: { element: () => HTMLElement | null },
  ) => () => void
  const registerFallback = store.registerFocusTargetFallback as (
    from: unknown,
    to: unknown,
  ) => () => void

  for (const identity of [
    'disc:additional-artwork:upload',
    { focusTarget: 'disc:additional-artwork:upload' },
    {
      focusTarget: 'disc:additional-artwork:item-enable',
      elementId: '   ',
    },
    { focusTarget: 'disc:rating:enable', elementId: 'unexpected' },
  ]) {
    assert.throws(
      () => registerFocusTarget(identity, { element: () => null }),
      /Invalid editor role-focus target identity/,
    )
    assert.throws(
      () => registerFallback(identity, 'disc:rating:enable'),
      /Invalid editor role-focus target identity/,
    )
  }
})

test('missing targets fall back to a focused and revealed role summary', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const summary = createElement('summary', calls)
  store.registerRolePanel('game-title', {
    detailsElement: () => null,
    summaryElement: () => summary,
  })
  store.requestRoleFocus(GAME_TITLE_FOCUS_REQUEST)

  assert.equal(store.processPendingRequest(), 'role-summary-fallback')
  assert.deepEqual(calls, [
    'summary:focus:true',
    'summary:scroll:nearest:auto',
  ])
  assert.equal(store.getSnapshot().pendingRequest, null)
})

test('missing role and target are unavailable and consumed without retry', () => {
  const store = createEditorRoleFocusControllerStore()
  store.requestRoleFocus(GAME_TITLE_FOCUS_REQUEST)

  assert.equal(store.processPendingRequest(), 'unavailable')
  assert.equal(store.getSnapshot().pendingRequest, null)
  assert.equal(store.processPendingRequest(), 'no-pending-request')
})

test('subscriptions observe immutable state transitions', () => {
  const store = createEditorRoleFocusControllerStore()
  const snapshots: number[] = []
  const unsubscribe = store.subscribe(() => {
    snapshots.push(store.getSnapshot().pendingRequest?.requestId ?? 0)
  })

  store.requestRoleFocus(GAME_TITLE_FOCUS_REQUEST)
  store.processPendingRequest()
  unsubscribe()
  store.setRoleOpen('legal-info', true)

  assert.deepEqual(snapshots, [1, 0])
})

test('controller has no preview, project, renderer, export, query, click, or retry dependencies', () => {
  const source = readFileSync(
    new URL('./editorRoleFocusController.ts', import.meta.url),
    'utf8',
  )
  const forbiddenDependencies = [
    'App.tsx',
    'guidedPresets',
    'DiscPreview',
    'previewEditableRegistry',
    'previewElementOverlay',
    'useDiscText',
    'contextualTextRibbon',
    'projectSchema',
    'createProjectSnapshot',
    'restoreProject',
    'render/',
    'export/',
    'caseInsert',
    'querySelector',
    'getElementById',
    '.closest(',
    '.click(',
    'setTimeout',
    'setInterval',
    'MutationObserver',
    'requestAnimationFrame',
  ]

  for (const forbiddenDependency of forbiddenDependencies) {
    assert.equal(
      source.includes(forbiddenDependency),
      false,
      `unexpected dependency: ${forbiddenDependency}`,
    )
  }
})
