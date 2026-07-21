import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  createEditorRoleFocusControllerStore,
} from '../editor/editorRoleFocusController.ts'
import {
  DISC_ROLE_FOCUS_TARGET_IDS,
  DISC_ROLE_SECTION_ALIGNMENT_TARGET_IDS,
  DISC_SECTION_START_TARGETS_BY_FOCUS_TARGET,
} from '../editor/editorRoleFocus.ts'
import {
  registerAlwaysMountedRatingFocusTargets,
  registerEnabledRatingSelectFocusTargets,
} from '../components/editor/discRatingRoleFocusRegistration.ts'
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

function getRatingSetupAction() {
  const setup = getDiscGuidedPlaceholderSetup('rating-badge')
  assert.equal(setup.kind, 'direct')
  if (setup.kind !== 'direct') {
    throw new Error('Rating Badge setup must remain direct.')
  }
  return setup.action
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

const GUIDED_ACTION_ROUTE_INVENTORY = [
  {
    label: 'Game Title - Image',
    visibleWhen: 'Game Title is unfilled or suggested',
    actionId: 'game-title-image',
    alignment: 'role-start',
    roleId: 'game-title',
    sectionAlignmentTarget: null,
    requestedFocusTarget: 'disc:game-title:artwork-upload',
    registeredFallbackTarget: 'disc:game-title:artwork-enable',
  },
  {
    label: 'Game Title - Text',
    visibleWhen: 'Game Title is unfilled or suggested',
    actionId: 'game-title-text',
    alignment: 'role-start',
    roleId: 'game-title',
    sectionAlignmentTarget: null,
    requestedFocusTarget: 'disc:game-title:text-fallback',
    registeredFallbackTarget: 'disc:game-title:text-fallback',
  },
  {
    label: 'Background Image',
    visibleWhen: 'Background is unfilled or suggested',
    actionId: 'background-local-upload',
    alignment: 'role-start',
    roleId: 'background-artwork',
    sectionAlignmentTarget: null,
    requestedFocusTarget: 'disc:background-image:local-upload',
    registeredFallbackTarget: 'disc:background-image:local-upload',
  },
  {
    label: 'Rating Badge',
    visibleWhen: 'Rating is disabled or otherwise unclaimed',
    actionId: 'rating-system',
    alignment: 'role-start',
    roleId: 'game-info-logos',
    sectionAlignmentTarget: null,
    requestedFocusTarget: 'disc:rating:system',
    registeredFallbackTarget: 'disc:rating:enable',
  },
  {
    label: 'Media Format Mark',
    visibleWhen: 'Media is disabled or otherwise unclaimed',
    actionId: 'media-format',
    alignment: 'section-start',
    roleId: 'game-info-logos',
    sectionAlignmentTarget: 'disc:media-format-mark:section',
    requestedFocusTarget: 'disc:media-format-mark:format',
    registeredFallbackTarget: 'disc:media-format-mark:enable',
  },
  {
    label: 'Operating System Marks',
    visibleWhen: 'No selected enabled renderable operating-system mark exists',
    actionId: 'operating-system-marks-enable',
    alignment: 'section-start',
    roleId: 'game-info-logos',
    sectionAlignmentTarget: 'disc:operating-system-marks:section',
    requestedFocusTarget: 'disc:operating-system-marks:enable',
    registeredFallbackTarget: 'disc:operating-system-marks:enable',
  },
  {
    label: 'Developer Logo',
    visibleWhen: 'The primary Developer feature is disabled',
    actionId: 'developer-logo-upload',
    alignment: 'section-start',
    roleId: 'company-logos',
    sectionAlignmentTarget: 'disc:company-logo:developer-section',
    requestedFocusTarget: 'disc:company-logo:developer-upload',
    registeredFallbackTarget: 'disc:company-logo:developer-enable',
  },
  {
    label: 'Publisher Logo',
    visibleWhen: 'The primary Publisher feature is disabled',
    actionId: 'publisher-logo-upload',
    alignment: 'section-start',
    roleId: 'company-logos',
    sectionAlignmentTarget: 'disc:company-logo:publisher-section',
    requestedFocusTarget: 'disc:company-logo:publisher-upload',
    registeredFallbackTarget: 'disc:company-logo:publisher-enable',
  },
  {
    label: 'Copyright / Legal Text',
    visibleWhen: 'Copyright text is unfilled or suggested',
    actionId: 'legal-copyright',
    alignment: 'role-start',
    roleId: 'legal-info',
    sectionAlignmentTarget: null,
    requestedFocusTarget: 'disc:legal-text:copyright',
    registeredFallbackTarget: 'disc:legal-text:copyright',
  },
] as const

const REGISTERED_SEMANTIC_TARGET_INVENTORY = [
  {
    label: 'Enabled Rating system',
    roleId: 'game-info-logos',
    alignment: 'role-start',
    sectionAlignmentTarget: null,
    focusTarget: 'disc:rating:system',
  },
  {
    label: 'Enabled Media format',
    roleId: 'game-info-logos',
    alignment: 'section-start',
    sectionAlignmentTarget: 'disc:media-format-mark:section',
    focusTarget: 'disc:media-format-mark:format',
  },
  {
    label: 'Enabled Developer upload',
    roleId: 'company-logos',
    alignment: 'section-start',
    sectionAlignmentTarget: 'disc:company-logo:developer-section',
    focusTarget: 'disc:company-logo:developer-upload',
  },
  {
    label: 'Enabled Publisher upload',
    roleId: 'company-logos',
    alignment: 'section-start',
    sectionAlignmentTarget: 'disc:company-logo:publisher-section',
    focusTarget: 'disc:company-logo:publisher-upload',
  },
] as const

function getSetupActionById(
  actionId: typeof GUIDED_ACTION_ROUTE_INVENTORY[number]['actionId'],
) {
  for (const [, , setupKind] of PLACEHOLDERS) {
    const setup = getDiscGuidedPlaceholderSetup(setupKind)
    const actions = setup.kind === 'choice'
      ? setup.actions
      : setup.kind === 'direct'
        ? [setup.action]
        : []
    const action = actions.find(({ id }) => id === actionId)

    if (action) return action
  }

  throw new Error(`Missing setup action: ${actionId}`)
}

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
    ['rating-badge', { roleId: 'game-info-logos', focusTarget: 'disc:rating:system' }],
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

test('every lifecycle-reachable guided action is explicitly classified and registered', () => {
  assert.equal(GUIDED_ACTION_ROUTE_INVENTORY.length, 9)
  assert.equal(
    new Set(DISC_ROLE_SECTION_ALIGNMENT_TARGET_IDS).size,
    DISC_ROLE_SECTION_ALIGNMENT_TARGET_IDS.length,
  )

  for (const {
    label,
    actionId,
    alignment,
    roleId,
    sectionAlignmentTarget,
    requestedFocusTarget,
    registeredFallbackTarget,
    visibleWhen,
  } of GUIDED_ACTION_ROUTE_INVENTORY) {
    const action = getSetupActionById(actionId)
    const destination = action.request.destination

    assert.ok(visibleWhen.length > 0, `${label}: lifecycle visibility`)
    assert.equal(action.request.scrollAlignment, alignment, label)
    assert.equal(destination.roleId, roleId, label)
    assert.equal(destination.focusTarget, requestedFocusTarget, label)
    assert.equal(
      DISC_ROLE_FOCUS_TARGET_IDS.includes(requestedFocusTarget),
      true,
      `${label}: requested focus registration`,
    )
    assert.equal(
      DISC_ROLE_FOCUS_TARGET_IDS.includes(registeredFallbackTarget),
      true,
      `${label}: fallback focus registration`,
    )

    if (alignment === 'section-start') {
      assert.equal('sectionAlignmentTarget' in destination, true, label)
      assert.equal(
        'sectionAlignmentTarget' in destination
          ? destination.sectionAlignmentTarget
          : null,
        sectionAlignmentTarget,
        label,
      )
      assert.equal(
        DISC_ROLE_SECTION_ALIGNMENT_TARGET_IDS.includes(
          sectionAlignmentTarget,
        ),
        true,
        `${label}: section registration`,
      )
      assert.deepEqual(
        DISC_SECTION_START_TARGETS_BY_FOCUS_TARGET[requestedFocusTarget],
        { roleId, sectionAlignmentTarget },
        label,
      )
    } else {
      assert.equal(sectionAlignmentTarget, null, label)
      assert.equal('sectionAlignmentTarget' in destination, false, label)
    }
  }

  assert.equal(
    GUIDED_ACTION_ROUTE_INVENTORY.some(({ alignment }) =>
      alignment === ('control-visible' as typeof alignment)),
    false,
  )
})

test('registered semantic targets remain broader than lifecycle-reachable guide variants', () => {
  assert.equal(REGISTERED_SEMANTIC_TARGET_INVENTORY.length, 4)

  for (const {
    alignment,
    focusTarget,
    label,
    roleId,
    sectionAlignmentTarget,
  } of REGISTERED_SEMANTIC_TARGET_INVENTORY) {
    assert.equal(
      DISC_ROLE_FOCUS_TARGET_IDS.includes(focusTarget),
      true,
      label,
    )

    if (alignment === 'section-start') {
      assert.equal(
        DISC_ROLE_SECTION_ALIGNMENT_TARGET_IDS.includes(
          sectionAlignmentTarget,
        ),
        true,
        label,
      )
      assert.deepEqual(
        DISC_SECTION_START_TARGETS_BY_FOCUS_TARGET[focusTarget],
        { roleId, sectionAlignmentTarget },
        label,
      )
    } else {
      assert.equal(sectionAlignmentTarget, null, label)
    }
  }
})

test('Rating Badge routes to the specific system control with role-start alignment', () => {
  const action = getRatingSetupAction()

  assert.deepEqual(action.request, {
    surfaceId: 'disc-label',
    behavior: 'focus',
    scrollAlignment: 'role-start',
    destination: {
      roleId: 'game-info-logos',
      focusTarget: 'disc:rating:system',
    },
  })
  assert.notEqual(
    action.request.destination.focusTarget,
    'disc:rating:enable',
  )
})

test('registered enabled Rating target focuses system without changing Rating state', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const ratingState = {
    enabled: true,
    system: 'PEGI',
    value: '16',
    source: 'custom',
    customImageDataUrl: 'data:image/png;base64,keep',
    dirty: false,
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

  store.requestRoleFocus(getRatingSetupAction().request)
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  assert.deepEqual(calls, [
    'ancestor:rating',
    'rating-system:focus:true',
    'game-info-summary:scroll:start',
  ])
  assert.deepEqual(ratingState, initialState)
})

test('reachable disabled Rating action falls back once without mutation or replay', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const ratingState = {
    enabled: false,
    system: 'ESRB',
    value: 'M',
    source: 'placeholder',
    dirty: false,
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

  store.requestRoleFocus(getRatingSetupAction().request)
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  assert.deepEqual(calls, [
    'ancestor:rating',
    'rating-enable:focus:true',
    'game-info-summary:scroll:start',
  ])
  assert.deepEqual(ratingState, initialState)

  ratingState.enabled = true
  registerEnabledRatingSelectFocusTargets({
    openRatingPanel: () => calls.push('ancestor:rating'),
    registerFocusTarget: store.registerFocusTarget,
    sourceElement: () => createElement('rating-source', calls),
    systemElement: () => createElement('rating-system', calls),
  })
  assert.equal(store.processPendingRequest(), 'no-pending-request')
})

test('every section-start setup dispatches its exact typed destination', () => {
  const expectations = [
    [
      'media-format-mark',
      'Set up Media Format Mark',
      'disc:media-format-mark:format',
      'disc:media-format-mark:section',
    ],
    [
      'operating-system-marks',
      'Set up Operating System Marks',
      'disc:operating-system-marks:enable',
      'disc:operating-system-marks:section',
    ],
    [
      'developer-logo',
      'Set up Developer Logo',
      'disc:company-logo:developer-upload',
      'disc:company-logo:developer-section',
    ],
    [
      'publisher-logo',
      'Set up Publisher Logo',
      'disc:company-logo:publisher-upload',
      'disc:company-logo:publisher-section',
    ],
  ] as const

  for (const [kind, label, focusTarget, sectionAlignmentTarget] of
    expectations) {
    const setup = getDiscGuidedPlaceholderSetup(kind)
    assert.equal(setup.kind, 'direct')
    if (setup.kind !== 'direct') continue
    assert.equal(setup.action.label, label)
    assert.deepEqual(setup.action.request, {
      surfaceId: 'disc-label',
      behavior: 'focus',
      scrollAlignment: 'section-start',
      destination: {
        roleId: kind === 'developer-logo' || kind === 'publisher-logo'
          ? 'company-logos'
          : 'game-info-logos',
        focusTarget,
        sectionAlignmentTarget,
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
