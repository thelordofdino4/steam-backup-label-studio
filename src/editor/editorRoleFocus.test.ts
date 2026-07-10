import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import type { DiscRolePresetRole } from '../layout/discRolePresets.ts'
import {
  DISC_ROLE_FOCUS_TARGET_IDS,
  createInitialEditorRoleFocusState,
  parseEditorRoleFocusRequest,
  reduceEditorRoleFocus,
  type DiscRoleFocusDestination,
  type EditorRoleFocusBehavior,
  type EditorRoleFocusRequest,
  type EditorRoleFocusState,
} from './editorRoleFocus.ts'

const VALID_DESTINATIONS = [
  {
    roleId: 'background-artwork',
    focusTarget: 'disc:background-image:enable',
  },
  {
    roleId: 'background-artwork',
    focusTarget: 'disc:background-image:local-upload',
  },
  {
    roleId: 'game-title',
    focusTarget: 'disc:game-title:artwork-enable',
  },
  {
    roleId: 'game-title',
    focusTarget: 'disc:game-title:artwork-upload',
  },
  {
    roleId: 'game-title',
    focusTarget: 'disc:game-title:text-fallback',
  },
  {
    roleId: 'game-info-logos',
    focusTarget: 'disc:rating:enable',
  },
  {
    roleId: 'game-info-logos',
    focusTarget: 'disc:rating:system',
  },
  {
    roleId: 'game-info-logos',
    focusTarget: 'disc:rating:value',
  },
  {
    roleId: 'game-info-logos',
    focusTarget: 'disc:rating:source',
  },
  {
    roleId: 'company-logos',
    focusTarget: 'disc:company-logo:developer-upload',
  },
  {
    roleId: 'company-logos',
    focusTarget: 'disc:company-logo:publisher-upload',
  },
  {
    roleId: 'legal-info',
    focusTarget: 'disc:legal-text:copyright',
  },
  {
    roleId: 'additional-artwork',
    focusTarget: 'disc:additional-artwork:add',
  },
  {
    roleId: 'additional-artwork',
    focusTarget: 'disc:additional-artwork:upload',
  },
  {
    roleId: 'additional-text',
    focusTarget: 'disc:additional-text:custom-note',
  },
] as const satisfies readonly DiscRoleFocusDestination[]

function createRequest(
  requestId: number,
  destination: DiscRoleFocusDestination = VALID_DESTINATIONS[0],
  behavior: EditorRoleFocusBehavior = 'focus',
): EditorRoleFocusRequest {
  return {
    requestId,
    surfaceId: 'disc-label',
    behavior,
    destination,
  }
}

function openRole(
  state: EditorRoleFocusState,
  roleId: DiscRolePresetRole,
) {
  return reduceEditorRoleFocus(state, {
    type: 'set-role-open',
    roleId,
    open: true,
  }).state
}

test('parses every documented valid role and focus-target destination', () => {
  assert.equal(VALID_DESTINATIONS.length, DISC_ROLE_FOCUS_TARGET_IDS.length)

  VALID_DESTINATIONS.forEach((destination, index) => {
    const result = parseEditorRoleFocusRequest(
      createRequest(index + 1, destination),
    )

    assert.equal(result.ok, true, JSON.stringify(destination))
    if (result.ok) {
      assert.deepEqual(result.request.destination, destination)
    }
  })
})

test('rejects invalid surface and behavior values', () => {
  assert.deepEqual(
    parseEditorRoleFocusRequest({
      ...createRequest(1),
      surfaceId: 'case-front',
    }),
    { ok: false, error: 'invalid-surface' },
  )
  assert.deepEqual(
    parseEditorRoleFocusRequest({
      ...createRequest(1),
      behavior: 'scroll-and-focus',
    }),
    { ok: false, error: 'invalid-behavior' },
  )
})

test('rejects invalid request IDs without coercion', () => {
  const invalidIds: readonly unknown[] = [
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    '1',
    null,
  ]

  for (const requestId of invalidIds) {
    assert.deepEqual(
      parseEditorRoleFocusRequest({ ...createRequest(1), requestId }),
      { ok: false, error: 'invalid-request-id' },
    )
  }
})

test('rejects invalid roles, targets, and role-target combinations', () => {
  assert.deepEqual(
    parseEditorRoleFocusRequest({
      ...createRequest(1),
      destination: {
        roleId: 'template',
        focusTarget: 'disc:background-image:enable',
      },
    }),
    { ok: false, error: 'invalid-role' },
  )
  assert.deepEqual(
    parseEditorRoleFocusRequest({
      ...createRequest(1),
      destination: {
        roleId: 'background-artwork',
        focusTarget: 'disc:background-image:unknown',
      },
    }),
    { ok: false, error: 'invalid-focus-target' },
  )
  assert.deepEqual(
    parseEditorRoleFocusRequest({
      ...createRequest(1),
      destination: {
        roleId: 'game-title',
        focusTarget: 'disc:background-image:enable',
      },
    }),
    { ok: false, error: 'invalid-role-target-combination' },
  )
})

test('validates Additional Artwork add and persisted-ID upload destinations', () => {
  const addResult = parseEditorRoleFocusRequest(createRequest(1, {
    roleId: 'additional-artwork',
    focusTarget: 'disc:additional-artwork:add',
  }))
  const uploadResult = parseEditorRoleFocusRequest(createRequest(2, {
    roleId: 'additional-artwork',
    focusTarget: 'disc:additional-artwork:upload',
    elementId: 'persisted-artwork-id',
  }))

  assert.equal(addResult.ok, true)
  assert.equal(uploadResult.ok, true)
  if (uploadResult.ok) {
    assert.equal(
      uploadResult.request.destination.roleId === 'additional-artwork'
        ? uploadResult.request.destination.elementId
        : null,
      'persisted-artwork-id',
    )
  }

  for (const elementId of ['', '   ']) {
    assert.deepEqual(
      parseEditorRoleFocusRequest({
        ...createRequest(3),
        destination: {
          roleId: 'additional-artwork',
          focusTarget: 'disc:additional-artwork:upload',
          elementId,
        },
      }),
      { ok: false, error: 'invalid-element-id' },
    )
  }
})

test('validates owner targets without accepting feature payload', () => {
  const candidateResult = parseEditorRoleFocusRequest({
    ...createRequest(1),
    ownerTarget: {
      owner: 'additionalArtwork',
      selection: 'first-renderable-existing',
    },
  })
  const resolvedResult = parseEditorRoleFocusRequest({
    ...createRequest(2),
    ownerTarget: {
      owner: 'additionalArtwork',
      elementId: 'persisted-artwork-id',
    },
  })

  assert.equal(candidateResult.ok, true)
  assert.equal(resolvedResult.ok, true)
  assert.deepEqual(
    parseEditorRoleFocusRequest({
      ...createRequest(3),
      ownerTarget: {
        owner: 'backgroundImage',
        imageDataUrl: 'data:image/png;base64,not-navigation-state',
      },
    }),
    { ok: false, error: 'invalid-owner-target' },
  )
  assert.deepEqual(
    parseEditorRoleFocusRequest({
      ...createRequest(4),
      ownerTarget: {
        owner: 'additionalArtwork',
        elementId: '   ',
      },
    }),
    { ok: false, error: 'invalid-owner-target' },
  )
})

test('rejects unknown fields instead of admitting DOM or callback payloads', () => {
  assert.deepEqual(
    parseEditorRoleFocusRequest({
      ...createRequest(1),
      selector: '#background-upload',
    }),
    { ok: false, error: 'unexpected-field' },
  )
  assert.deepEqual(
    parseEditorRoleFocusRequest({
      ...createRequest(2),
      callback: () => undefined,
    }),
    { ok: false, error: 'unexpected-field' },
  )
  assert.deepEqual(
    parseEditorRoleFocusRequest({
      ...createRequest(3),
      destination: {
        ...VALID_DESTINATIONS[0],
        domId: 'background-upload',
      },
    }),
    { ok: false, error: 'unexpected-field' },
  )
})

test('unknown and hostile runtime input never throws', () => {
  const hostileProxy = new Proxy({}, {
    ownKeys() {
      throw new Error('hostile proxy')
    },
  })
  const values: readonly unknown[] = [
    undefined,
    null,
    true,
    12,
    'request',
    [],
    {},
    hostileProxy,
  ]

  for (const value of values) {
    assert.doesNotThrow(() => parseEditorRoleFocusRequest(value))
    assert.equal(parseEditorRoleFocusRequest(value).ok, false)
  }
})

test('accepts first and newer requests while rejecting stale IDs', () => {
  const initial = createInitialEditorRoleFocusState()
  const first = reduceEditorRoleFocus(initial, {
    type: 'request',
    request: createRequest(1),
  })
  const newer = reduceEditorRoleFocus(first.state, {
    type: 'request',
    request: createRequest(2, VALID_DESTINATIONS[1]),
  })
  const consumed = reduceEditorRoleFocus(newer.state, {
    type: 'consume',
    requestId: 2,
  })
  const sameId = reduceEditorRoleFocus(consumed.state, {
    type: 'request',
    request: createRequest(2),
  })
  const lowerId = reduceEditorRoleFocus(consumed.state, {
    type: 'request',
    request: createRequest(1),
  })

  assert.equal(first.outcome, 'accepted')
  assert.equal(newer.outcome, 'accepted')
  assert.equal(newer.state.pendingRequest?.requestId, 2)
  assert.equal(sameId.outcome, 'rejected-stale')
  assert.equal(lowerId.outcome, 'rejected-stale')
  assert.equal(sameId.state, consumed.state)
  assert.equal(lowerId.state, consumed.state)
})

test('distinct same-target requests work and the newer pending request replaces the older one', () => {
  const requestOne = createRequest(1, VALID_DESTINATIONS[2])
  const requestTwo = createRequest(2, VALID_DESTINATIONS[2])
  const first = reduceEditorRoleFocus(createInitialEditorRoleFocusState(), {
    type: 'request',
    request: requestOne,
  })
  const second = reduceEditorRoleFocus(first.state, {
    type: 'request',
    request: requestTwo,
  })

  assert.equal(first.outcome, 'accepted')
  assert.equal(second.outcome, 'accepted')
  assert.equal(second.state.pendingRequest?.requestId, 2)
  assert.deepEqual(second.state.pendingRequest?.destination, requestOne.destination)
})

test('accepted requests open only the target role without accordion behavior', () => {
  let state = createInitialEditorRoleFocusState()
  state = openRole(state, 'legal-info')
  state = openRole(state, 'additional-text')

  const result = reduceEditorRoleFocus(state, {
    type: 'request',
    request: createRequest(1, VALID_DESTINATIONS[2]),
  })

  assert.equal(result.outcome, 'accepted')
  assert.deepEqual(
    [...result.state.openRoleIds].sort(),
    ['additional-text', 'game-title', 'legal-info'],
  )
})

test('manual open and close affect one role and a later request reopens it', () => {
  const initial = createInitialEditorRoleFocusState()
  const opened = reduceEditorRoleFocus(initial, {
    type: 'set-role-open',
    roleId: 'game-title',
    open: true,
  })
  const withUnrelated = reduceEditorRoleFocus(opened.state, {
    type: 'set-role-open',
    roleId: 'legal-info',
    open: true,
  })
  const closed = reduceEditorRoleFocus(withUnrelated.state, {
    type: 'set-role-open',
    roleId: 'game-title',
    open: false,
  })
  const reopened = reduceEditorRoleFocus(closed.state, {
    type: 'request',
    request: createRequest(1, VALID_DESTINATIONS[2]),
  })

  assert.equal(opened.outcome, 'manual-role-opened')
  assert.equal(closed.outcome, 'manual-role-closed')
  assert.deepEqual([...closed.state.openRoleIds], ['legal-info'])
  assert.deepEqual(
    [...reopened.state.openRoleIds].sort(),
    ['game-title', 'legal-info'],
  )
})

test('matching consumption clears pending state and advances handled identity', () => {
  const requested = reduceEditorRoleFocus(
    createInitialEditorRoleFocusState(),
    { type: 'request', request: createRequest(5) },
  )
  const consumed = reduceEditorRoleFocus(requested.state, {
    type: 'consume',
    requestId: 5,
  })

  assert.equal(consumed.outcome, 'consumed')
  assert.equal(consumed.state.pendingRequest, null)
  assert.equal(consumed.state.lastHandledRequestId, 5)
  assert.deepEqual(consumed.state.openRoleIds, requested.state.openRoleIds)
})

test('wrong and repeated consumption are stable no-ops', () => {
  const requested = reduceEditorRoleFocus(
    createInitialEditorRoleFocusState(),
    { type: 'request', request: createRequest(5) },
  )
  const wrong = reduceEditorRoleFocus(requested.state, {
    type: 'consume',
    requestId: 4,
  })
  const consumed = reduceEditorRoleFocus(requested.state, {
    type: 'consume',
    requestId: 5,
  })
  const repeated = reduceEditorRoleFocus(consumed.state, {
    type: 'consume',
    requestId: 5,
  })

  assert.equal(wrong.outcome, 'ignored-request-id-mismatch')
  assert.equal(wrong.state, requested.state)
  assert.equal(repeated.outcome, 'ignored-no-pending-request')
  assert.equal(repeated.state, consumed.state)
})

test('a consumed request cannot be replayed', () => {
  const requested = reduceEditorRoleFocus(
    createInitialEditorRoleFocusState(),
    { type: 'request', request: createRequest(1) },
  )
  const consumed = reduceEditorRoleFocus(requested.state, {
    type: 'consume',
    requestId: 1,
  })
  const replayed = reduceEditorRoleFocus(consumed.state, {
    type: 'request',
    request: createRequest(1),
  })

  assert.equal(replayed.outcome, 'rejected-stale')
  assert.equal(replayed.state, consumed.state)
})

test('reveal and focus behavior survive parsing and reducer handling', () => {
  for (const behavior of ['reveal', 'focus'] as const) {
    const result = reduceEditorRoleFocus(
      createInitialEditorRoleFocusState(),
      { type: 'request', request: createRequest(1, VALID_DESTINATIONS[0], behavior) },
    )

    assert.equal(result.outcome, 'accepted')
    assert.equal(result.state.pendingRequest?.behavior, behavior)
  }
})

test('reset clears only transient role-focus state', () => {
  const requested = reduceEditorRoleFocus(
    openRole(createInitialEditorRoleFocusState(), 'legal-info'),
    { type: 'request', request: createRequest(1) },
  )
  const reset = reduceEditorRoleFocus(requested.state, { type: 'reset' })

  assert.equal(reset.outcome, 'reset')
  assert.deepEqual([...reset.state.openRoleIds], [])
  assert.equal(reset.state.pendingRequest, null)
  assert.equal(reset.state.lastHandledRequestId, 0)
  assert.deepEqual(
    Object.keys(reset.state).sort(),
    ['lastHandledRequestId', 'openRoleIds', 'pendingRequest'],
  )
})

test('reducer does not mutate state or open-role collections', () => {
  const initial = openRole(
    createInitialEditorRoleFocusState(),
    'legal-info',
  )
  const initialRoles = [...initial.openRoleIds]
  const result = reduceEditorRoleFocus(initial, {
    type: 'request',
    request: createRequest(1, VALID_DESTINATIONS[2]),
  })

  assert.deepEqual([...initial.openRoleIds], initialRoles)
  assert.notEqual(result.state, initial)
  assert.notEqual(result.state.openRoleIds, initial.openRoleIds)
})

test('frozen inputs work and invalid values leave state untouched', () => {
  const frozenState = Object.freeze({
    ...createInitialEditorRoleFocusState(),
    openRoleIds: Object.freeze(new Set<DiscRolePresetRole>(['legal-info'])),
  })
  const frozenRequest = Object.freeze(createRequest(1, VALID_DESTINATIONS[2]))
  const accepted = reduceEditorRoleFocus(frozenState, {
    type: 'request',
    request: frozenRequest,
  })
  const invalid = reduceEditorRoleFocus(frozenState, {
    type: 'request',
    request: Object.freeze({ ...createRequest(1), requestId: 0 }),
  })

  assert.equal(accepted.outcome, 'accepted')
  assert.deepEqual(
    [...accepted.state.openRoleIds].sort(),
    ['game-title', 'legal-info'],
  )
  assert.equal(invalid.outcome, 'rejected-invalid')
  assert.equal(invalid.state, frozenState)
  assert.deepEqual([...frozenState.openRoleIds], ['legal-info'])
})

test('source has no React, component, preview, schema, renderer, export, or Case Insert dependencies', () => {
  const source = readFileSync(
    new URL('./editorRoleFocus.ts', import.meta.url),
    'utf8',
  )
  const forbiddenDependencies = [
    "from 'react'",
    'App.tsx',
    'components/',
    'DiscPreview',
    'previewEditableRegistry',
    'previewElementOverlay',
    'useDiscText',
    'projectSchema',
    'createProjectSnapshot',
    'restoreProject',
    'render/',
    'export/',
    'caseInsert',
  ]

  for (const forbiddenDependency of forbiddenDependencies) {
    assert.equal(
      source.includes(forbiddenDependency),
      false,
      `unexpected dependency: ${forbiddenDependency}`,
    )
  }
})
