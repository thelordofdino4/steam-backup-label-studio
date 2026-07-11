import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import type { DiscGuidedPlaceholderViewModel } from './discGuidedPlaceholderViewModel.ts'
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
  ['disc:guided:game-title:primary', 'Game Title', 'game-title-choice'],
  ['disc:guided:background-image:primary', 'Background Image', 'background'],
  ['disc:guided:rating-badge:primary', 'Rating Badge', 'rating-badge'],
  ['disc:guided:media-format-mark:primary', 'Media Format Mark', 'media-format-mark'],
  ['disc:guided:operating-system-marks:group', 'Operating System Marks', 'operating-system-marks'],
  ['disc:guided:developer-logo:primary', 'Developer Logo', 'developer-logo'],
  ['disc:guided:publisher-logo:primary', 'Publisher Logo', 'publisher-logo'],
  ['disc:guided:legal-text:copyright', 'Copyright / Legal Text', 'legal-text'],
] as const

function createPlaceholders(
  lifecycle: DiscGuidedPlaceholderViewModel['lifecycle'] = 'unfilled',
) {
  return PLACEHOLDERS.map(([slotId, label, setupKind]) => ({
    slotId,
    label,
    visualGeometry: GEOMETRY,
    actionGeometry: GEOMETRY,
    visualLayer: setupKind === 'background' ? 'background' : 'foreground',
    lifecycle,
    setupKind,
    ownerContentLayering: 'guidance-behind-real-content',
  })) satisfies DiscGuidedPlaceholderViewModel[]
}

test('blank Classic exposes eight exact action models', () => {
  const actions = createDiscGuidedPlaceholderActionViewModels(createPlaceholders())
  assert.equal(actions.length, 8)
  assert.deepEqual(actions.map(({ slotId }) => slotId), PLACEHOLDERS.map(([id]) => id))
  assert.deepEqual(actions.map(({ label }) => label), PLACEHOLDERS.map(([, label]) => label))
  assert.equal(Object.isFrozen(actions), true)
})

test('Game Title remains the only Image and Text chooser', () => {
  const title = getDiscGuidedPlaceholderSetup('game-title-choice')
  assert.equal(title.kind, 'choice')
  if (title.kind !== 'choice') return
  assert.deepEqual(title.actions.map(({ label }) => label), ['Image', 'Text'])
  assert.deepEqual(title.actions.map(({ request }) => request.destination), [
    { roleId: 'game-title', focusTarget: 'disc:game-title:artwork-upload' },
    { roleId: 'game-title', focusTarget: 'disc:game-title:text-fallback' },
  ])

  for (const kind of PLACEHOLDERS.map(([, , setupKind]) => setupKind)) {
    if (kind !== 'game-title-choice') {
      assert.notEqual(getDiscGuidedPlaceholderSetup(kind).kind, 'choice')
    }
  }
})

test('existing exact setup targets remain direct and independent', () => {
  const expectations = [
    ['background', { roleId: 'background-artwork', focusTarget: 'disc:background-image:local-upload' }],
    ['rating-badge', { roleId: 'game-info-logos', focusTarget: 'disc:rating:enable' }],
    ['developer-logo', { roleId: 'company-logos', focusTarget: 'disc:company-logo:developer-upload' }],
    ['publisher-logo', { roleId: 'company-logos', focusTarget: 'disc:company-logo:publisher-upload' }],
    ['legal-text', { roleId: 'legal-info', focusTarget: 'disc:legal-text:copyright' }],
  ] as const

  for (const [kind, destination] of expectations) {
    const setup = getDiscGuidedPlaceholderSetup(kind)
    assert.equal(setup.kind, 'direct')
    if (setup.kind !== 'direct') continue
    assert.deepEqual(setup.action.request.destination, destination)
    assert.equal(setup.action.request.scrollAlignment, 'role-start')
  }
})

test('Media and OS setup dispatch exact typed Game Info destinations', () => {
  const expectations = [
    [
      'media-format-mark',
      'Set up Media Format Mark',
      'disc:media-format-mark:format',
    ],
    [
      'operating-system-marks',
      'Set up Operating System Marks',
      'disc:operating-system-marks:enable',
    ],
  ] as const

  for (const [kind, label, focusTarget] of expectations) {
    const setup = getDiscGuidedPlaceholderSetup(kind)
    assert.equal(setup.kind, 'direct')
    if (setup.kind !== 'direct') continue
    assert.equal(setup.action.label, label)
    assert.deepEqual(setup.action.request, {
      surfaceId: 'disc-label',
      behavior: 'focus',
      scrollAlignment: 'role-start',
      destination: {
        roleId: 'game-info-logos',
        focusTarget,
      },
    })
  }

  const source = readFileSync(new URL('./discGuidedPlaceholderSetup.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /game-info-logos:setup|company-logo-choice|Set up Game Info Logos/)
  assert.doesNotMatch(
    source,
    /'media-format-mark':[\s\S]*?kind: 'unavailable'|'operating-system-marks':[\s\S]*?kind: 'unavailable'/,
  )
  assert.doesNotMatch(source, /handleMedia|handlePlatform|setProject|toggleEnabled/)
})

test('suggested placeholders retain exact setup without accepting content', () => {
  const actions = createDiscGuidedPlaceholderActionViewModels(
    createPlaceholders('suggested'),
  )
  assert.ok(actions.every(({ lifecycle }) => lifecycle === 'suggested'))
  assert.deepEqual(actions.map(({ setup }) => setup.kind), [
    'choice', 'direct', 'direct', 'direct', 'direct', 'direct', 'direct', 'direct',
  ])
})

test('setup definitions stay pure and outside owner mutation and application domains', () => {
  const source = readFileSync(
    new URL('./discGuidedPlaceholderSetup.ts', import.meta.url),
    'utf8',
  )
  for (const forbidden of [
    'App.tsx',
    'components/',
    'projectSchema',
    'createProjectSnapshot',
    'restoreProject',
    'render/',
    'export/',
    'caseInsert',
    'groupedPlatformMarkPlacement',
    'fetch(',
    'setProject',
    'handleMedia',
    'handlePlatform',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden)
  }
})
