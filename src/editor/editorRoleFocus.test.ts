import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import type { DiscRolePresetRole } from '../layout/discRolePresets.ts'
import {
  DISC_ADDITIONAL_ARTWORK_FOCUS_TARGET_IDS,
  DISC_COMPANY_LOGO_FOCUS_TARGET_IDS,
  DISC_GAME_INFO_LOGO_FOCUS_TARGET_IDS,
  DISC_ROLE_FOCUS_TARGET_IDS,
  createInitialEditorRoleFocusState,
  getEditorRoleFocusTargetIdentity,
  normalizeEditorRoleFocusTargetIdentity,
  parseEditorRoleFocusRequest,
  reduceEditorRoleFocus,
  type DiscRoleFocusDestination,
  type DiscCompanyLogoFocusTarget,
  type DiscGameInfoLogoFocusTarget,
  type EditorRoleFocusBehavior,
  type EditorRoleFocusRequest,
  type EditorRoleFocusScrollAlignment,
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
    roleId: 'game-info-logos',
    focusTarget: 'disc:media-format-mark:enable',
  },
  {
    roleId: 'game-info-logos',
    focusTarget: 'disc:media-format-mark:format',
  },
  {
    roleId: 'game-info-logos',
    focusTarget: 'disc:operating-system-marks:enable',
  },
  {
    roleId: 'company-logos',
    focusTarget: 'disc:company-logo:developer-enable',
  },
  {
    roleId: 'company-logos',
    focusTarget: 'disc:company-logo:developer-upload',
  },
  {
    roleId: 'company-logos',
    focusTarget: 'disc:company-logo:publisher-enable',
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
    focusTarget: 'disc:additional-artwork:enable',
  },
  {
    roleId: 'additional-artwork',
    focusTarget: 'disc:additional-artwork:add',
  },
  {
    roleId: 'additional-artwork',
    focusTarget: 'disc:additional-artwork:item-enable',
    elementId: 'persisted-artwork-id',
  },
  {
    roleId: 'additional-artwork',
    focusTarget: 'disc:additional-artwork:upload',
    elementId: 'persisted-artwork-id',
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
  scrollAlignment?: EditorRoleFocusScrollAlignment,
): EditorRoleFocusRequest {
  return {
    requestId,
    surfaceId: 'disc-label',
    behavior,
    destination,
    ...(scrollAlignment ? { scrollAlignment } : {}),
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

test('accepts omitted, nearest, and role-start scroll alignment exactly', () => {
  const omitted = parseEditorRoleFocusRequest(createRequest(1))
  const nearest = parseEditorRoleFocusRequest(
    createRequest(2, VALID_DESTINATIONS[0], 'focus', 'nearest'),
  )
  const roleStart = parseEditorRoleFocusRequest(
    createRequest(3, VALID_DESTINATIONS[0], 'focus', 'role-start'),
  )

  assert.equal(omitted.ok, true)
  assert.equal(nearest.ok, true)
  assert.equal(roleStart.ok, true)
  if (!omitted.ok || !nearest.ok || !roleStart.ok) return

  assert.equal(Object.hasOwn(omitted.request, 'scrollAlignment'), false)
  assert.equal(nearest.request.scrollAlignment, 'nearest')
  assert.equal(roleStart.request.scrollAlignment, 'role-start')
})

test('rejects malformed scroll alignment without throwing', () => {
  for (const scrollAlignment of [
    '',
    'start',
    'role-nearest',
    1,
    true,
    {},
    null,
    undefined,
  ]) {
    assert.doesNotThrow(() => parseEditorRoleFocusRequest({
      ...createRequest(1),
      scrollAlignment,
    }))
    assert.deepEqual(
      parseEditorRoleFocusRequest({
        ...createRequest(1),
        scrollAlignment,
      }),
      { ok: false, error: 'invalid-scroll-alignment' },
    )
  }
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

test('accepts every fixed destination with omitted or exact owner identity', () => {
  const cases = [
    [VALID_DESTINATIONS[0], { owner: 'backgroundImage' }],
    [VALID_DESTINATIONS[1], { owner: 'backgroundImage' }],
    [VALID_DESTINATIONS[2], { owner: 'titleArtwork' }],
    [VALID_DESTINATIONS[3], { owner: 'titleArtwork' }],
    [VALID_DESTINATIONS[4], { owner: 'discText', key: 'title' }],
    [VALID_DESTINATIONS[5], { owner: 'ratingBadge', badgeKey: 'primary' }],
    [VALID_DESTINATIONS[6], { owner: 'ratingBadge', badgeKey: 'primary' }],
    [VALID_DESTINATIONS[7], { owner: 'ratingBadge', badgeKey: 'primary' }],
    [VALID_DESTINATIONS[8], { owner: 'ratingBadge', badgeKey: 'primary' }],
    [VALID_DESTINATIONS[9], { owner: 'mediaMark' }],
    [VALID_DESTINATIONS[10], { owner: 'mediaMark' }],
    [VALID_DESTINATIONS[11], {
      owner: 'platformMarks',
      selection: 'enabled-values',
    }],
    [VALID_DESTINATIONS[16], { owner: 'discText', key: 'copyright' }],
    [VALID_DESTINATIONS[21], { owner: 'discText', key: 'customNote' }],
  ] as const

  cases.forEach(([destination, ownerTarget], index) => {
    assert.equal(
      parseEditorRoleFocusRequest(
        createRequest(index + 1, destination),
      ).ok,
      true,
      `omitted:${destination.focusTarget}`,
    )
    assert.equal(
      parseEditorRoleFocusRequest({
        ...createRequest(index + 1, destination),
        ownerTarget,
      }).ok,
      true,
      `matching:${destination.focusTarget}`,
    )
  })
})

test('defines the exact Rating Media and OS Game Info target vocabulary', () => {
  assert.deepEqual(DISC_GAME_INFO_LOGO_FOCUS_TARGET_IDS, [
    'disc:rating:enable',
    'disc:rating:system',
    'disc:rating:value',
    'disc:rating:source',
    'disc:media-format-mark:enable',
    'disc:media-format-mark:format',
    'disc:operating-system-marks:enable',
  ])
  assert.doesNotMatch(DISC_GAME_INFO_LOGO_FOCUS_TARGET_IDS.join(' '),
    /game-info-logos:setup|platform-mark:primary|technical/)
})

test('new Media and OS targets parse with focus role-start and optional exact owners', () => {
  const cases = [
    {
      focusTarget: 'disc:media-format-mark:enable',
      ownerTarget: { owner: 'mediaMark' },
    },
    {
      focusTarget: 'disc:media-format-mark:format',
      ownerTarget: { owner: 'mediaMark' },
    },
    {
      focusTarget: 'disc:operating-system-marks:enable',
      ownerTarget: { owner: 'platformMarks', selection: 'enabled-values' },
    },
  ] as const satisfies readonly {
    focusTarget: DiscGameInfoLogoFocusTarget
    ownerTarget: NonNullable<EditorRoleFocusRequest['ownerTarget']>
  }[]

  cases.forEach(({ focusTarget, ownerTarget }, index) => {
    const destination = { roleId: 'game-info-logos', focusTarget } as const
    const omitted = parseEditorRoleFocusRequest(
      createRequest(index * 2 + 1, destination, 'focus', 'role-start'),
    )
    const matching = parseEditorRoleFocusRequest({
      ...createRequest(index * 2 + 2, destination, 'focus', 'role-start'),
      ownerTarget,
    })

    assert.equal(omitted.ok, true, `omitted:${focusTarget}`)
    assert.equal(matching.ok, true, `matching:${focusTarget}`)
    if (!omitted.ok || !matching.ok) return
    assert.equal(omitted.request.behavior, 'focus')
    assert.equal(omitted.request.scrollAlignment, 'role-start')
    assert.deepEqual(omitted.request.destination, destination)
    assert.deepEqual(matching.request.ownerTarget, ownerTarget)
  })
})

test('new Media and OS targets reject every non-Game-Info role', () => {
  const targets = [
    'disc:media-format-mark:enable',
    'disc:media-format-mark:format',
    'disc:operating-system-marks:enable',
  ] as const
  const roles = [
    'background-artwork',
    'game-title',
    'company-logos',
    'legal-info',
    'additional-artwork',
    'additional-text',
  ] as const

  for (const focusTarget of targets) {
    for (const roleId of roles) {
      assert.deepEqual(
        parseEditorRoleFocusRequest({
          ...createRequest(1),
          destination: { roleId, focusTarget },
        }),
        { ok: false, error: 'invalid-role-target-combination' },
        `${roleId}:${focusTarget}`,
      )
    }
  }
})

test('new Media and OS owner identities remain strict and payload-free', () => {
  const mediaDestination = {
    roleId: 'game-info-logos',
    focusTarget: 'disc:media-format-mark:format',
  } as const
  const osDestination = {
    roleId: 'game-info-logos',
    focusTarget: 'disc:operating-system-marks:enable',
  } as const
  const invalidMediaOwners = [
    { owner: 'platformMarks', selection: 'enabled-values' },
    { owner: 'ratingBadge', badgeKey: 'primary' },
    { owner: 'backgroundImage' },
    { owner: 'titleArtwork' },
    { owner: 'discText', key: 'copyright' },
    { owner: 'logoAssets', logoKey: 'developer', scope: 'primary' },
    { owner: 'additionalArtwork', elementId: 'artwork-id' },
    { owner: 'mediaMark', value: 'dvdRom' },
    { owner: 'mediaMark', enabled: true },
  ]
  const invalidOsOwners = [
    { owner: 'mediaMark' },
    { owner: 'ratingBadge', badgeKey: 'primary' },
    { owner: 'backgroundImage' },
    { owner: 'titleArtwork' },
    { owner: 'discText', key: 'copyright' },
    { owner: 'logoAssets', logoKey: 'publisher', scope: 'primary' },
    { owner: 'additionalArtwork', elementId: 'artwork-id' },
    { owner: 'platformMarks', selection: 'windows' },
    { owner: 'platformMarks', selection: 'enabled-values', values: ['windows'] },
    { owner: 'platformMarks', selection: 'enabled-values', enabled: true },
  ]

  for (const ownerTarget of invalidMediaOwners) {
    assert.deepEqual(
      parseEditorRoleFocusRequest({
        ...createRequest(1, mediaDestination),
        ownerTarget,
      }),
      { ok: false, error: 'invalid-owner-target' },
    )
  }
  for (const ownerTarget of invalidOsOwners) {
    assert.deepEqual(
      parseEditorRoleFocusRequest({
        ...createRequest(1, osDestination),
        ownerTarget,
      }),
      { ok: false, error: 'invalid-owner-target' },
    )
  }
})

test('reducer retains new destinations and opens only Game Info Logos', () => {
  const destinations = [
    { roleId: 'game-info-logos', focusTarget: 'disc:media-format-mark:enable' },
    { roleId: 'game-info-logos', focusTarget: 'disc:media-format-mark:format' },
    { roleId: 'game-info-logos', focusTarget: 'disc:operating-system-marks:enable' },
  ] as const satisfies readonly DiscRoleFocusDestination[]
  let state = createInitialEditorRoleFocusState()

  destinations.forEach((destination, index) => {
    const result = reduceEditorRoleFocus(state, {
      type: 'request',
      request: createRequest(index + 1, destination, 'focus', 'role-start'),
    })
    assert.equal(result.outcome, 'accepted')
    assert.deepEqual(result.state.pendingRequest?.destination, destination)
    assert.equal(result.state.pendingRequest?.scrollAlignment, 'role-start')
    assert.deepEqual([...result.state.openRoleIds], ['game-info-logos'])
    state = reduceEditorRoleFocus(result.state, {
      type: 'consume',
      requestId: index + 1,
    }).state
  })
})

test('owner identities cannot leak across fixed or repeatable target groups', () => {
  const artworkId = 'persisted-artwork-id'
  const groups = [
    {
      label: 'background',
      destination: VALID_DESTINATIONS[0],
      ownerTarget: { owner: 'backgroundImage' },
    },
    {
      label: 'title-artwork',
      destination: VALID_DESTINATIONS[2],
      ownerTarget: { owner: 'titleArtwork' },
    },
    {
      label: 'title-text',
      destination: VALID_DESTINATIONS[4],
      ownerTarget: { owner: 'discText', key: 'title' },
    },
    {
      label: 'rating',
      destination: VALID_DESTINATIONS[5],
      ownerTarget: { owner: 'ratingBadge', badgeKey: 'primary' },
    },
    {
      label: 'developer-logo',
      destination: VALID_DESTINATIONS[12],
      ownerTarget: {
        owner: 'logoAssets',
        logoKey: 'developer',
        scope: 'primary',
      },
    },
    {
      label: 'publisher-logo',
      destination: VALID_DESTINATIONS[14],
      ownerTarget: {
        owner: 'logoAssets',
        logoKey: 'publisher',
        scope: 'primary',
      },
    },
    {
      label: 'legal',
      destination: VALID_DESTINATIONS[16],
      ownerTarget: { owner: 'discText', key: 'copyright' },
    },
    {
      label: 'additional-artwork',
      destination: {
        roleId: 'additional-artwork',
        focusTarget: 'disc:additional-artwork:item-enable',
        elementId: artworkId,
      },
      ownerTarget: { owner: 'additionalArtwork', elementId: artworkId },
    },
    {
      label: 'additional-text',
      destination: VALID_DESTINATIONS[21],
      ownerTarget: { owner: 'discText', key: 'customNote' },
    },
  ] as const

  groups.forEach((destinationGroup, destinationIndex) => {
    groups.forEach((ownerGroup, ownerIndex) => {
      const result = parseEditorRoleFocusRequest({
        ...createRequest(destinationIndex * groups.length + ownerIndex + 1),
        destination: destinationGroup.destination,
        ownerTarget: ownerGroup.ownerTarget,
      })

      assert.equal(
        result.ok,
        destinationIndex === ownerIndex,
        `${destinationGroup.label}:${ownerGroup.label}`,
      )
      if (destinationIndex !== ownerIndex) {
        assert.deepEqual(result, {
          ok: false,
          error: 'invalid-owner-target',
        })
      }
    })
  })
})

test('parses every Company Logo target for focus and reveal without coercion', () => {
  for (const behavior of ['focus', 'reveal'] as const) {
    DISC_COMPANY_LOGO_FOCUS_TARGET_IDS.forEach((focusTarget, index) => {
      const destination = {
        roleId: 'company-logos',
        focusTarget,
      } as const
      const result = parseEditorRoleFocusRequest(
        createRequest(index + 1, destination, behavior),
      )

      assert.equal(result.ok, true, `${behavior}:${focusTarget}`)
      if (result.ok) {
        assert.equal(result.request.behavior, behavior)
        assert.deepEqual(result.request.destination, destination)
      }
    })
  }
})

test('rejects every Company Logo target with every non-company role', () => {
  const nonCompanyRoles = [
    'background-artwork',
    'game-title',
    'game-info-logos',
    'legal-info',
    'additional-artwork',
    'additional-text',
  ] as const

  for (const focusTarget of DISC_COMPANY_LOGO_FOCUS_TARGET_IDS) {
    for (const roleId of nonCompanyRoles) {
      assert.deepEqual(
        parseEditorRoleFocusRequest({
          ...createRequest(1),
          destination: { roleId, focusTarget },
        }),
        { ok: false, error: 'invalid-role-target-combination' },
        `${roleId}:${focusTarget}`,
      )
    }
  }
})

test('rejects unknown or malformed Company Logo targets exactly', () => {
  const invalidTargets = [
    'disc:company-logo:enable',
    'disc:company-logo:upload',
    'disc:company-logo:developer-source',
    'disc:company-logo:publisher-source',
    'disc:company-logo:additional-logo-enable',
    'disc:company-logo:additional-logo-upload',
    'disc:company:developer-enable',
    'disc:company-logo:developer-enabl',
    'disc:company-logo:publisher-upload-extra',
    '',
    'unknown',
  ]

  for (const focusTarget of invalidTargets) {
    assert.deepEqual(
      parseEditorRoleFocusRequest({
        ...createRequest(1),
        destination: { roleId: 'company-logos', focusTarget },
      }),
      { ok: false, error: 'invalid-focus-target' },
      focusTarget,
    )
  }
})

test('preserves distinct developer and publisher target identities', () => {
  const parsedTargets = DISC_COMPANY_LOGO_FOCUS_TARGET_IDS.map(
    (focusTarget, index) => parseEditorRoleFocusRequest(
      createRequest(index + 1, {
        roleId: 'company-logos',
        focusTarget,
      }),
    ),
  )

  assert.equal(
    new Set(DISC_COMPANY_LOGO_FOCUS_TARGET_IDS).size,
    DISC_COMPANY_LOGO_FOCUS_TARGET_IDS.length,
  )
  assert.deepEqual(
    parsedTargets.map((result) => result.ok
      ? result.request.destination.focusTarget
      : null),
    DISC_COMPANY_LOGO_FOCUS_TARGET_IDS,
  )
})

test('validates Company Logo owner targets against matching primary identity', () => {
  const logoKeyByTarget: Record<DiscCompanyLogoFocusTarget, 'developer' | 'publisher'> = {
    'disc:company-logo:developer-enable': 'developer',
    'disc:company-logo:developer-upload': 'developer',
    'disc:company-logo:publisher-enable': 'publisher',
    'disc:company-logo:publisher-upload': 'publisher',
  }

  DISC_COMPANY_LOGO_FOCUS_TARGET_IDS.forEach((focusTarget, index) => {
    const logoKey = logoKeyByTarget[focusTarget]
    const oppositeLogoKey = logoKey === 'developer' ? 'publisher' : 'developer'
    const request = createRequest(index + 1, {
      roleId: 'company-logos',
      focusTarget,
    })
    const matching = parseEditorRoleFocusRequest({
      ...request,
      ownerTarget: { owner: 'logoAssets', logoKey, scope: 'primary' },
    })
    const mismatched = parseEditorRoleFocusRequest({
      ...request,
      ownerTarget: {
        owner: 'logoAssets',
        logoKey: oppositeLogoKey,
        scope: 'primary',
      },
    })
    const unrelated = parseEditorRoleFocusRequest({
      ...request,
      ownerTarget: { owner: 'ratingBadge', badgeKey: 'primary' },
    })
    const withFeaturePayload = parseEditorRoleFocusRequest({
      ...request,
      ownerTarget: {
        owner: 'logoAssets',
        logoKey,
        scope: 'primary',
        enabled: true,
        imageDataUrl: 'data:image/png;base64,not-navigation-state',
      },
    })

    assert.equal(parseEditorRoleFocusRequest(request).ok, true)
    assert.equal(matching.ok, true, focusTarget)
    if (matching.ok) {
      assert.deepEqual(matching.request.ownerTarget, {
        owner: 'logoAssets',
        logoKey,
        scope: 'primary',
      })
    }
    assert.deepEqual(
      mismatched,
      { ok: false, error: 'invalid-owner-target' },
    )
    assert.deepEqual(
      unrelated,
      { ok: false, error: 'invalid-owner-target' },
    )
    assert.deepEqual(
      withFeaturePayload,
      { ok: false, error: 'invalid-owner-target' },
    )
  })
})

test('validates the four discriminated Additional Artwork destinations', () => {
  const validDestinations = [
    {
      roleId: 'additional-artwork',
      focusTarget: 'disc:additional-artwork:enable',
    },
    {
      roleId: 'additional-artwork',
      focusTarget: 'disc:additional-artwork:add',
    },
    {
      roleId: 'additional-artwork',
      focusTarget: 'disc:additional-artwork:item-enable',
      elementId: 'artwork:item/A|B',
    },
    {
      roleId: 'additional-artwork',
      focusTarget: 'disc:additional-artwork:upload',
      elementId: 'artwork:item/A|B',
    },
  ] as const satisfies readonly DiscRoleFocusDestination[]

  assert.deepEqual(
    validDestinations.map((destination, index) =>
      parseEditorRoleFocusRequest(createRequest(index + 1, destination)).ok),
    [true, true, true, true],
  )
  assert.deepEqual(
    DISC_ADDITIONAL_ARTWORK_FOCUS_TARGET_IDS,
    validDestinations.map((destination) => destination.focusTarget),
  )

  for (const focusTarget of [
    'disc:additional-artwork:enable',
    'disc:additional-artwork:add',
  ] as const) {
    assert.deepEqual(
      parseEditorRoleFocusRequest({
        ...createRequest(10),
        destination: {
          roleId: 'additional-artwork',
          focusTarget,
          elementId: 'unexpected-item-id',
        },
      }),
      { ok: false, error: 'unexpected-field' },
    )
  }

  for (const focusTarget of [
    'disc:additional-artwork:item-enable',
    'disc:additional-artwork:upload',
  ] as const) {
    for (const elementId of [undefined, '', '   ', 0, 1, null]) {
      assert.deepEqual(
        parseEditorRoleFocusRequest({
          ...createRequest(11),
          destination: {
            roleId: 'additional-artwork',
            focusTarget,
            ...(elementId === undefined ? {} : { elementId }),
          },
        }),
        { ok: false, error: 'invalid-element-id' },
      )
    }
  }

  assert.deepEqual(
    parseEditorRoleFocusRequest({
      ...createRequest(12),
      destination: {
        roleId: 'additional-artwork',
        focusTarget: 'disc:additional-artwork:first-item',
      },
    }),
    { ok: false, error: 'invalid-focus-target' },
  )
})

test('rejects every Additional Artwork target with every other role', () => {
  const otherRoles = [
    'background-artwork',
    'game-title',
    'game-info-logos',
    'company-logos',
    'legal-info',
    'additional-text',
  ] as const

  for (const focusTarget of DISC_ADDITIONAL_ARTWORK_FOCUS_TARGET_IDS) {
    for (const roleId of otherRoles) {
      assert.deepEqual(
        parseEditorRoleFocusRequest({
          ...createRequest(1),
          destination: {
            roleId,
            focusTarget,
            ...(focusTarget === 'disc:additional-artwork:item-enable' ||
                focusTarget === 'disc:additional-artwork:upload'
              ? { elementId: 'persisted-artwork-id' }
              : {}),
          },
        }),
        { ok: false, error: 'invalid-role-target-combination' },
        `${roleId}:${focusTarget}`,
      )
    }
  }
})

test('requires matching resolved Additional Artwork owners for item targets', () => {
  const destination = {
    roleId: 'additional-artwork',
    focusTarget: 'disc:additional-artwork:upload',
    elementId: 'persisted-artwork-id',
  } as const satisfies DiscRoleFocusDestination
  const request = createRequest(1, destination)
  const matching = parseEditorRoleFocusRequest({
    ...request,
    ownerTarget: {
      owner: 'additionalArtwork',
      elementId: 'persisted-artwork-id',
    },
  })

  assert.equal(parseEditorRoleFocusRequest(request).ok, true)
  assert.equal(matching.ok, true)
  assert.equal(parseEditorRoleFocusRequest({
    ...createRequest(2, {
      roleId: 'additional-artwork',
      focusTarget: 'disc:additional-artwork:item-enable',
      elementId: 'persisted-artwork-id',
    }),
    ownerTarget: {
      owner: 'additionalArtwork',
      elementId: 'persisted-artwork-id',
    },
  }).ok, true)
  assert.deepEqual(
    parseEditorRoleFocusRequest({
      ...request,
      ownerTarget: {
        owner: 'additionalArtwork',
        elementId: 'different-artwork-id',
      },
    }),
    { ok: false, error: 'invalid-owner-target' },
  )
  assert.deepEqual(
    parseEditorRoleFocusRequest({
      ...request,
      ownerTarget: {
        owner: 'additionalArtwork',
        selection: 'first-renderable-existing',
      },
    }),
    { ok: false, error: 'invalid-owner-target' },
  )
  assert.deepEqual(
    parseEditorRoleFocusRequest({
      ...request,
      ownerTarget: { owner: 'backgroundImage' },
    }),
    { ok: false, error: 'invalid-owner-target' },
  )

  for (const focusTarget of [
    'disc:additional-artwork:enable',
    'disc:additional-artwork:add',
  ] as const) {
    assert.deepEqual(
      parseEditorRoleFocusRequest({
        ...createRequest(2, {
          roleId: 'additional-artwork',
          focusTarget,
        }),
        ownerTarget: {
          owner: 'additionalArtwork',
          elementId: 'persisted-artwork-id',
        },
      }),
      { ok: false, error: 'invalid-owner-target' },
    )
  }

  assert.deepEqual(
    parseEditorRoleFocusRequest({
      ...request,
      ownerTarget: {
        owner: 'additionalArtwork',
        elementId: 'persisted-artwork-id',
        imageDataUrl: 'data:image/png;base64,not-navigation-state',
      },
    }),
    { ok: false, error: 'invalid-owner-target' },
  )
})

test('normalizes fixed and repeatable registration identities deterministically', () => {
  const fixed = { focusTarget: 'disc:rating:enable' } as const
  const itemEnableA = {
    focusTarget: 'disc:additional-artwork:item-enable',
    elementId: 'artwork:A|B/C:D',
  } as const
  const itemEnableB = { ...itemEnableA, elementId: 'artwork:B|A/C:D' }
  const uploadA = {
    focusTarget: 'disc:additional-artwork:upload',
    elementId: itemEnableA.elementId,
  } as const

  assert.deepEqual(normalizeEditorRoleFocusTargetIdentity(fixed), fixed)
  assert.deepEqual(
    normalizeEditorRoleFocusTargetIdentity('disc:rating:enable'),
    fixed,
  )
  assert.deepEqual(
    normalizeEditorRoleFocusTargetIdentity({ ...itemEnableA }),
    itemEnableA,
  )
  assert.notDeepEqual(itemEnableA, itemEnableB)
  assert.notDeepEqual(itemEnableA, uploadA)
  assert.equal(
    normalizeEditorRoleFocusTargetIdentity(
      'disc:additional-artwork:upload',
    ),
    null,
  )
  assert.equal(normalizeEditorRoleFocusTargetIdentity({
    focusTarget: 'disc:additional-artwork:item-enable',
  }), null)
  assert.equal(normalizeEditorRoleFocusTargetIdentity({
    focusTarget: 'disc:rating:enable',
    elementId: 'not-allowed',
  }), null)

  assert.deepEqual(
    getEditorRoleFocusTargetIdentity({
      roleId: 'additional-artwork',
      ...uploadA,
    }),
    uploadA,
  )
  assert.deepEqual(
    getEditorRoleFocusTargetIdentity({
      roleId: 'game-info-logos',
      focusTarget: 'disc:rating:enable',
    }),
    fixed,
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

test('scroll alignment remains orthogonal to compatible owner identity', () => {
  const result = parseEditorRoleFocusRequest({
    ...createRequest(
      1,
      VALID_DESTINATIONS[0],
      'focus',
      'role-start',
    ),
    ownerTarget: { owner: 'backgroundImage' },
  })

  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.equal(result.request.scrollAlignment, 'role-start')
  assert.deepEqual(result.request.ownerTarget, { owner: 'backgroundImage' })
  assert.deepEqual(result.request.destination, VALID_DESTINATIONS[0])
})

test('reducer preserves each repeated request scroll alignment', () => {
  const first = reduceEditorRoleFocus(createInitialEditorRoleFocusState(), {
    type: 'request',
    request: createRequest(
      1,
      VALID_DESTINATIONS[2],
      'focus',
      'role-start',
    ),
  })
  const second = reduceEditorRoleFocus(first.state, {
    type: 'request',
    request: createRequest(
      2,
      VALID_DESTINATIONS[2],
      'focus',
      'nearest',
    ),
  })

  assert.equal(first.outcome, 'accepted')
  assert.equal(first.state.pendingRequest?.scrollAlignment, 'role-start')
  assert.equal(second.outcome, 'accepted')
  assert.equal(second.state.pendingRequest?.scrollAlignment, 'nearest')
  assert.deepEqual(second.state.pendingRequest?.destination, VALID_DESTINATIONS[2])
})

test('new Company enable targets preserve request identity and consumption', () => {
  for (const [index, focusTarget] of [
    'disc:company-logo:developer-enable',
    'disc:company-logo:publisher-enable',
  ].entries()) {
    const destination = {
      roleId: 'company-logos',
      focusTarget,
    } as const
    const initial = createInitialEditorRoleFocusState()
    const first = reduceEditorRoleFocus(initial, {
      type: 'request',
      request: createRequest(index + 1, destination),
    })
    const consumed = reduceEditorRoleFocus(first.state, {
      type: 'consume',
      requestId: index + 1,
    })
    const second = reduceEditorRoleFocus(consumed.state, {
      type: 'request',
      request: createRequest(index + 10, destination),
    })

    assert.equal(first.outcome, 'accepted')
    assert.deepEqual([...first.state.openRoleIds], ['company-logos'])
    assert.equal(consumed.outcome, 'consumed')
    assert.equal(second.outcome, 'accepted')
    assert.equal(second.state.pendingRequest?.requestId, index + 10)
    assert.deepEqual(second.state.pendingRequest?.destination, destination)
  }
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
    'steam/',
    'tauri/',
    'fetch(',
    'groupedPlatformMarkPlacement',
  ]

  for (const forbiddenDependency of forbiddenDependencies) {
    assert.equal(
      source.includes(forbiddenDependency),
      false,
      `unexpected dependency: ${forbiddenDependency}`,
    )
  }
})
