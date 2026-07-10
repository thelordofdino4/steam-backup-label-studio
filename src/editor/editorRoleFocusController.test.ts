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
    fallbackFocusTarget: 'disc:game-title:artwork-enable',
  })
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
