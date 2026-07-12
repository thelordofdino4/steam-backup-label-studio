import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  registerAlwaysMountedRatingFocusTargets,
  registerEnabledRatingSelectFocusTargets,
} from '../components/editor/discRatingRoleFocusRegistration.ts'
import {
  createEditorRoleFocusControllerStore,
} from '../editor/editorRoleFocusController.ts'
import type { DiscGuidedPlaceholderViewModel } from './discGuidedPlaceholderViewModel.ts'
import {
  createDiscGuidedPlaceholderActionViewModels,
  getDiscGuidedPlaceholderSetup,
} from './discGuidedPlaceholderSetup.ts'

const GEOMETRY = Object.freeze({
  kind: 'rect' as const,
  centerXPercent: 50,
  centerYPercent: 50,
  widthPercent: 20,
  heightPercent: 10,
})

const PLACEHOLDERS = [
  ['disc:guided:game-title:primary', 'Game Title', 'game-title-choice'],
  ['disc:guided:background-image:primary', 'Background Image', 'background'],
  ['disc:guided:rating-badge:primary', 'Rating Badge', 'rating-badge'],
  ['disc:guided:media-format-mark:primary', 'Media Format Mark', 'media-format-mark'],
  ['disc:guided:operating-system-marks:group', 'Operating System Marks', 'operating-system-marks'],
  ['disc:guided:developer-logo:primary', 'Developer Logo', 'developer-logo'],
  ['disc:guided:publisher-logo:primary', 'Publisher Logo', 'publisher-logo'],
  ['disc:guided:legal-text:copyright', 'Copyright / Legal Text', 'legal-text'],
] as const

const SETUP_EXPECTATIONS = [
  ['game-title-choice', ['Image', 'Text'], [
    ['game-title', 'disc:game-title:artwork-upload'],
    ['game-title', 'disc:game-title:text-fallback'],
  ]],
  ['background', ['Set up Background Image'], [
    ['background-artwork', 'disc:background-image:local-upload'],
  ]],
  ['rating-badge', ['Set up Rating Badge'], [
    ['game-info-logos', 'disc:rating:system'],
  ]],
  ['media-format-mark', ['Set up Media Format Mark'], [
    ['game-info-logos', 'disc:media-format-mark:format'],
  ]],
  ['operating-system-marks', ['Set up Operating System Marks'], [
    ['game-info-logos', 'disc:operating-system-marks:enable'],
  ]],
  ['developer-logo', ['Set up Developer Logo'], [
    ['company-logos', 'disc:company-logo:developer-upload'],
  ]],
  ['publisher-logo', ['Set up Publisher Logo'], [
    ['company-logos', 'disc:company-logo:publisher-upload'],
  ]],
  ['legal-text', ['Set up Copyright / Legal Text'], [
    ['legal-info', 'disc:legal-text:copyright'],
  ]],
] as const

function createPlaceholders(
  lifecycle: DiscGuidedPlaceholderViewModel['lifecycle'] = 'unfilled',
) {
  return PLACEHOLDERS.map(([slotId, label, setupKind]) => ({
    slotId,
    label,
    visualGeometry: GEOMETRY,
    actionGeometry: GEOMETRY,
    visualLayer: setupKind === 'background' ? 'background' as const : 'foreground' as const,
    lifecycle,
    setupKind,
    ownerContentLayering: 'guidance-behind-real-content' as const,
  }))
}

function createElement(label: string, calls: string[]) {
  return {
    focus(options?: FocusOptions) {
      calls.push(`${label}:focus:${String(options?.preventScroll)}`)
    },
    scrollIntoView(options?: ScrollIntoViewOptions) {
      calls.push(`${label}:scroll:${String(options?.block)}`)
    },
  } as unknown as HTMLElement
}

test('blank Classic exposes eight exact immutable action models', () => {
  const actions = createDiscGuidedPlaceholderActionViewModels(createPlaceholders())
  assert.deepEqual(actions.map(({ slotId }) => slotId), PLACEHOLDERS.map(([id]) => id))
  assert.deepEqual(actions.map(({ label }) => label), PLACEHOLDERS.map(([, label]) => label))
  assert.ok(actions.every(({ setup }) => setup.kind === 'menu'))
  assert.equal(Object.isFrozen(actions), true)
})

test('all setup menus expose exact typed role-focus routes with role-start alignment', () => {
  for (const [kind, labels, destinations] of SETUP_EXPECTATIONS) {
    const setup = getDiscGuidedPlaceholderSetup(kind)
    assert.equal(setup.kind, 'menu')
    assert.deepEqual(setup.actions.map(({ label }) => label), labels)
    assert.deepEqual(
      setup.actions.map(({ request }) => [
        request.destination.roleId,
        request.destination.focusTarget,
      ]),
      destinations,
    )
    assert.ok(setup.actions.every(({ request }) =>
      request.surfaceId === 'disc-label' &&
      request.behavior === 'focus' &&
      request.scrollAlignment === 'role-start'))
  }
})

test('Rating setup focuses its specific system control without owner mutation', () => {
  const action = getDiscGuidedPlaceholderSetup('rating-badge').actions[0]
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const ratingState = {
    enabled: true,
    system: 'PEGI',
    value: '16',
    source: 'custom',
    customImageDataUrl: 'data:image/png;base64,keep',
  }
  const initialState = structuredClone(ratingState)

  store.registerRolePanel('game-info-logos', {
    detailsElement: () => null,
    summaryElement: () => createElement('game-info-summary', calls),
  })
  registerAlwaysMountedRatingFocusTargets({
    enableElement: () => createElement('rating-enable', calls),
    openRatingPanel: () => calls.push('ancestor:rating'),
    registerFocusTarget: store.registerFocusTarget,
    registerFocusTargetFallback: store.registerFocusTargetFallback,
  })
  registerEnabledRatingSelectFocusTargets({
    openRatingPanel: () => calls.push('ancestor:rating'),
    registerFocusTarget: store.registerFocusTarget,
    sourceElement: () => createElement('rating-source', calls),
    systemElement: () => createElement('rating-system', calls),
  })

  store.requestRoleFocus(action.request)
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls, [
    'ancestor:rating',
    'rating-system:focus:true',
    'game-info-summary:scroll:start',
  ])
  assert.deepEqual(ratingState, initialState)
})

test('suggested placeholders retain menus without accepting content', () => {
  const actions = createDiscGuidedPlaceholderActionViewModels(
    createPlaceholders('suggested'),
  )
  assert.ok(actions.every(({ lifecycle }) => lifecycle === 'suggested'))
  assert.ok(actions.every(({ setup }) => setup.kind === 'menu'))
})

test('setup definitions remain pure and exclude generic broad-role destinations', () => {
  const source = readFileSync(new URL('./discGuidedPlaceholderSetup.ts', import.meta.url), 'utf8')
  for (const forbidden of [
    'projectSchema',
    'createProjectSnapshot',
    'restoreProject',
    'render/',
    'export/',
    'caseInsert',
    'setProject',
    'handleMedia',
    'handlePlatform',
    'company-logo-choice',
    'game-info-logos:setup',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden)
  }
})
