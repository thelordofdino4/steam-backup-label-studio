import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  createEditorRoleFocusControllerStore,
} from '../editor/editorRoleFocusController.ts'
import type {
  DiscGuidedPlaceholderViewModel,
} from './discGuidedPlaceholderViewModel.ts'
import {
  createDiscGuidedPlaceholderActionViewModels,
  getDiscGuidedPlaceholderSetup,
} from './discGuidedPlaceholderSetup.ts'

const GEOMETRY = {
  kind: 'rect' as const,
  centerXPercent: 50,
  centerYPercent: 50,
  widthPercent: 20,
  heightPercent: 10,
}

const PLACEHOLDERS = [
  ['disc:guided:background-image:primary', 'Background Image', 'background'],
  ['disc:guided:game-title:primary', 'Game Title', 'game-title-choice'],
  ['disc:guided:rating:primary', 'Game Info Logos', 'rating'],
  ['disc:guided:company-logo:primary', 'Company Logos', 'company-logo-choice'],
  ['disc:guided:legal-text:copyright', 'Legal Info', 'legal'],
] as const

function createPlaceholders(
  lifecycle: DiscGuidedPlaceholderViewModel['lifecycle'] = 'unfilled',
) {
  return PLACEHOLDERS.map(([slotId, label, setupKind]) => ({
    slotId,
    label,
    visualGeometry: GEOMETRY,
    actionGeometry: setupKind === 'background'
      ? { ...GEOMETRY, centerYPercent: 36, widthPercent: 34 }
      : GEOMETRY,
    visualLayer: setupKind === 'background' ? 'background' : 'foreground',
    lifecycle,
    setupKind,
    ownerContentLayering: 'guidance-behind-real-content',
  })) satisfies DiscGuidedPlaceholderViewModel[]
}

test('blank Classic projects exactly five ordered accessible action models', () => {
  const placeholders = createPlaceholders()
  const actions = createDiscGuidedPlaceholderActionViewModels(placeholders)

  assert.equal(actions.length, 5)
  assert.deepEqual(actions.map(({ label }) => label), PLACEHOLDERS.map(([, label]) => label))
  assert.deepEqual(actions.map(({ slotId }) => slotId), PLACEHOLDERS.map(([slotId]) => slotId))
  assert.equal(Object.isFrozen(actions), true)
  assert.ok(actions.every(Object.isFrozen))
  assert.equal(actions[0]?.actionGeometry.centerYPercent, 36)
  assert.equal(actions[0]?.actionGeometry.widthPercent, 34)
})

test('Game Title offers only Image and Text with exact typed destinations', () => {
  const setup = getDiscGuidedPlaceholderSetup('game-title-choice')

  assert.equal(setup.kind, 'choice')
  if (setup.kind !== 'choice') return

  assert.deepEqual(setup.actions.map(({ label }) => label), ['Image', 'Text'])
  assert.deepEqual(setup.actions.map(({ request }) => request.destination), [
    {
      roleId: 'game-title',
      focusTarget: 'disc:game-title:artwork-upload',
    },
    {
      roleId: 'game-title',
      focusTarget: 'disc:game-title:text-fallback',
    },
  ])
})

test('Background, primary Rating, and Legal use exact direct typed destinations', () => {
  const directSetups = [
    ['background', {
      roleId: 'background-artwork',
      focusTarget: 'disc:background-image:local-upload',
    }],
    ['rating', {
      roleId: 'game-info-logos',
      focusTarget: 'disc:rating:enable',
    }],
    ['legal', {
      roleId: 'legal-info',
      focusTarget: 'disc:legal-text:copyright',
    }],
  ] as const

  for (const [setupKind, destination] of directSetups) {
    const setup = getDiscGuidedPlaceholderSetup(setupKind)
    assert.equal(setup.kind, 'direct')
    if (setup.kind !== 'direct') continue
    assert.deepEqual(setup.action.request, {
      surfaceId: 'disc-label',
      behavior: 'focus',
      destination,
    })
  }
})

test('Company Logos keeps developer and publisher upload paths distinct', () => {
  const setup = getDiscGuidedPlaceholderSetup('company-logo-choice')

  assert.equal(setup.kind, 'choice')
  if (setup.kind !== 'choice') return

  assert.deepEqual(setup.actions.map(({ label }) => label), [
    'Developer',
    'Publisher',
  ])
  assert.deepEqual(setup.actions.map(({ request }) => request.destination), [
    {
      roleId: 'company-logos',
      focusTarget: 'disc:company-logo:developer-upload',
    },
    {
      roleId: 'company-logos',
      focusTarget: 'disc:company-logo:publisher-upload',
    },
  ])
})

test('suggested placeholders retain the same setup actions without acceptance', () => {
  const unfilled = createDiscGuidedPlaceholderActionViewModels(createPlaceholders())
  const suggested = createDiscGuidedPlaceholderActionViewModels(
    createPlaceholders('suggested'),
  )

  assert.deepEqual(
    suggested.map(({ lifecycle }) => lifecycle),
    Array(5).fill('suggested'),
  )
  assert.deepEqual(
    suggested.map(({ setup }) => setup),
    unfilled.map(({ setup }) => setup),
  )
})

test('slot lifecycle projection removes and restores only its matching action', () => {
  const placeholders = createPlaceholders()

  for (const placeholder of placeholders) {
    const remainingPlaceholders = placeholders.filter(
      ({ slotId }) => slotId !== placeholder.slotId,
    )
    const remainingActions = createDiscGuidedPlaceholderActionViewModels(
      remainingPlaceholders,
    )

    assert.equal(remainingActions.length, 4)
    assert.equal(
      remainingActions.some(({ slotId }) => slotId === placeholder.slotId),
      false,
    )
    assert.deepEqual(
      createDiscGuidedPlaceholderActionViewModels(placeholders)
        .map(({ slotId }) => slotId),
      PLACEHOLDERS.map(([slotId]) => slotId),
    )
  }
})

test('every setup request is accepted by the typed role-focus controller', () => {
  const store = createEditorRoleFocusControllerStore()
  const actions = createDiscGuidedPlaceholderActionViewModels(createPlaceholders())
    .flatMap(({ setup }) => setup.kind === 'direct'
      ? [setup.action]
      : [...setup.actions])

  for (const action of actions) {
    const request = store.requestRoleFocus(action.request)
    assert.equal(request.surfaceId, 'disc-label')
    assert.equal(request.behavior, 'focus')
    store.processPendingRequest()
  }
})

test('setup model has no mutation, persistence, renderer, export, Case Insert, or Steam dependencies', () => {
  const source = readFileSync(
    new URL('./discGuidedPlaceholderSetup.ts', import.meta.url),
    'utf8',
  )

  for (const forbidden of [
    'setProject',
    'onEnabledChange',
    'toggle',
    'undo',
    'dirty',
    'projectSchema',
    'snapshot',
    'restoreProject',
    'render/',
    'export/',
    'caseInsert',
    'steam/',
    'network',
    'autoFill',
    'acceptSuggestion',
  ]) {
    assert.equal(source.includes(forbidden), false, `unexpected source: ${forbidden}`)
  }
})
