import type {
  DiscGuidedBindingCandidate,
  DiscGuidedResolvedBinding,
} from '../guidedPresets/discGuidedSlots.ts'
import type { DiscRolePresetRole } from '../layout/discRolePresets.ts'

export type EditorRoleFocusSurfaceId = 'disc-label'

export type EditorRoleFocusBehavior = 'reveal' | 'focus'

export type EditorRoleFocusScrollAlignment = 'nearest' | 'role-start'

export type EditorRoleFocusRequestId = number

export const DISC_COMPANY_LOGO_FOCUS_TARGET_IDS = [
  'disc:company-logo:developer-enable',
  'disc:company-logo:developer-upload',
  'disc:company-logo:publisher-enable',
  'disc:company-logo:publisher-upload',
] as const

export type DiscCompanyLogoFocusTarget =
  (typeof DISC_COMPANY_LOGO_FOCUS_TARGET_IDS)[number]

export const DISC_ADDITIONAL_ARTWORK_FOCUS_TARGET_IDS = [
  'disc:additional-artwork:enable',
  'disc:additional-artwork:add',
  'disc:additional-artwork:item-enable',
  'disc:additional-artwork:upload',
] as const

export type DiscAdditionalArtworkFocusTarget =
  (typeof DISC_ADDITIONAL_ARTWORK_FOCUS_TARGET_IDS)[number]

export type DiscAdditionalArtworkItemFocusTarget = Extract<
  DiscAdditionalArtworkFocusTarget,
  | 'disc:additional-artwork:item-enable'
  | 'disc:additional-artwork:upload'
>

export const DISC_GAME_INFO_LOGO_FOCUS_TARGET_IDS = [
  'disc:rating:enable',
  'disc:rating:system',
  'disc:rating:value',
  'disc:rating:source',
  'disc:media-format-mark:enable',
  'disc:media-format-mark:format',
  'disc:operating-system-marks:enable',
] as const

export type DiscGameInfoLogoFocusTarget =
  (typeof DISC_GAME_INFO_LOGO_FOCUS_TARGET_IDS)[number]

export const DISC_ROLE_FOCUS_TARGET_IDS = [
  'disc:background-image:enable',
  'disc:background-image:local-upload',
  'disc:game-title:artwork-enable',
  'disc:game-title:artwork-upload',
  'disc:game-title:text-fallback',
  ...DISC_GAME_INFO_LOGO_FOCUS_TARGET_IDS,
  ...DISC_COMPANY_LOGO_FOCUS_TARGET_IDS,
  'disc:legal-text:copyright',
  ...DISC_ADDITIONAL_ARTWORK_FOCUS_TARGET_IDS,
  'disc:additional-text:custom-note',
] as const

export type DiscRoleFocusTargetId =
  (typeof DISC_ROLE_FOCUS_TARGET_IDS)[number]

export type DiscFixedRoleFocusTargetId = Exclude<
  DiscRoleFocusTargetId,
  DiscAdditionalArtworkItemFocusTarget
>

export type EditorRoleFocusTargetIdentity =
  | {
      focusTarget: DiscFixedRoleFocusTargetId
    }
  | {
      focusTarget: DiscAdditionalArtworkItemFocusTarget
      elementId: string
    }

export type EditorRoleFocusTargetIdentityInput =
  | DiscFixedRoleFocusTargetId
  | EditorRoleFocusTargetIdentity

export type DiscRoleFocusDestination =
  | {
      roleId: Extract<DiscRolePresetRole, 'background-artwork'>
      focusTarget:
        | 'disc:background-image:enable'
        | 'disc:background-image:local-upload'
    }
  | {
      roleId: Extract<DiscRolePresetRole, 'game-title'>
      focusTarget:
        | 'disc:game-title:artwork-enable'
        | 'disc:game-title:artwork-upload'
        | 'disc:game-title:text-fallback'
    }
  | {
      roleId: Extract<DiscRolePresetRole, 'game-info-logos'>
      focusTarget: DiscGameInfoLogoFocusTarget
    }
  | {
      roleId: Extract<DiscRolePresetRole, 'company-logos'>
      focusTarget: DiscCompanyLogoFocusTarget
    }
  | {
      roleId: Extract<DiscRolePresetRole, 'legal-info'>
      focusTarget: 'disc:legal-text:copyright'
    }
  | DiscAdditionalArtworkRoleFocusDestination
  | {
      roleId: Extract<DiscRolePresetRole, 'additional-text'>
      focusTarget: 'disc:additional-text:custom-note'
    }

export type DiscAdditionalArtworkRoleFocusDestination =
  | {
      roleId: Extract<DiscRolePresetRole, 'additional-artwork'>
      focusTarget:
        | 'disc:additional-artwork:enable'
        | 'disc:additional-artwork:add'
    }
  | {
      roleId: Extract<DiscRolePresetRole, 'additional-artwork'>
      focusTarget: DiscAdditionalArtworkItemFocusTarget
      elementId: string
    }

export type EditorRoleFocusOwnerTarget =
  | DiscGuidedBindingCandidate
  | DiscGuidedResolvedBinding

export type EditorRoleFocusRequest = {
  requestId: EditorRoleFocusRequestId
  surfaceId: EditorRoleFocusSurfaceId
  behavior: EditorRoleFocusBehavior
  destination: DiscRoleFocusDestination
  scrollAlignment?: EditorRoleFocusScrollAlignment
  ownerTarget?: EditorRoleFocusOwnerTarget
}

export type EditorRoleFocusRequestParseError =
  | 'invalid-request'
  | 'unexpected-field'
  | 'invalid-request-id'
  | 'invalid-surface'
  | 'invalid-behavior'
  | 'invalid-scroll-alignment'
  | 'invalid-destination'
  | 'invalid-role'
  | 'invalid-focus-target'
  | 'invalid-role-target-combination'
  | 'invalid-element-id'
  | 'invalid-owner-target'

export type EditorRoleFocusRequestParseResult =
  | {
      ok: true
      request: EditorRoleFocusRequest
    }
  | {
      ok: false
      error: EditorRoleFocusRequestParseError
    }

export const DISC_ROLE_FOCUS_ROLE_IDS = [
  'background-artwork',
  'game-title',
  'game-info-logos',
  'company-logos',
  'legal-info',
  'additional-artwork',
  'additional-text',
] as const satisfies readonly DiscRolePresetRole[]

const FOCUS_TARGETS_BY_ROLE = {
  'background-artwork': [
    'disc:background-image:enable',
    'disc:background-image:local-upload',
  ],
  'game-title': [
    'disc:game-title:artwork-enable',
    'disc:game-title:artwork-upload',
    'disc:game-title:text-fallback',
  ],
  'game-info-logos': [
    ...DISC_GAME_INFO_LOGO_FOCUS_TARGET_IDS,
  ],
  'company-logos': [
    ...DISC_COMPANY_LOGO_FOCUS_TARGET_IDS,
  ],
  'legal-info': ['disc:legal-text:copyright'],
  'additional-artwork': [
    ...DISC_ADDITIONAL_ARTWORK_FOCUS_TARGET_IDS,
  ],
  'additional-text': ['disc:additional-text:custom-note'],
} as const satisfies Record<
  DiscRolePresetRole,
  readonly DiscRoleFocusTargetId[]
>

type InternalParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: EditorRoleFocusRequestParseError }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
) {
  return Object.keys(value).every((key) => allowedKeys.includes(key))
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value > 0
}

function isEditorRoleFocusScrollAlignment(
  value: unknown,
): value is EditorRoleFocusScrollAlignment {
  return value === 'nearest' || value === 'role-start'
}

function isDiscRolePresetRole(value: unknown): value is DiscRolePresetRole {
  return typeof value === 'string' &&
    (DISC_ROLE_FOCUS_ROLE_IDS as readonly string[]).includes(value)
}

function isDiscRoleFocusTargetId(
  value: unknown,
): value is DiscRoleFocusTargetId {
  return typeof value === 'string' &&
    (DISC_ROLE_FOCUS_TARGET_IDS as readonly string[]).includes(value)
}

function isDiscAdditionalArtworkItemFocusTarget(
  value: DiscRoleFocusTargetId,
): value is DiscAdditionalArtworkItemFocusTarget {
  return value === 'disc:additional-artwork:item-enable' ||
    value === 'disc:additional-artwork:upload'
}

function isNonblankElementId(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim())
}

export function normalizeEditorRoleFocusTargetIdentity(
  value: unknown,
): EditorRoleFocusTargetIdentity | null {
  if (typeof value === 'string') {
    return isDiscRoleFocusTargetId(value) &&
        !isDiscAdditionalArtworkItemFocusTarget(value)
      ? { focusTarget: value }
      : null
  }

  if (!isRecord(value) || !isDiscRoleFocusTargetId(value.focusTarget)) {
    return null
  }

  if (isDiscAdditionalArtworkItemFocusTarget(value.focusTarget)) {
    return hasOnlyKeys(value, ['focusTarget', 'elementId']) &&
        isNonblankElementId(value.elementId)
      ? {
          focusTarget: value.focusTarget,
          elementId: value.elementId,
        }
      : null
  }

  return hasOnlyKeys(value, ['focusTarget'])
    ? { focusTarget: value.focusTarget }
    : null
}

export function getEditorRoleFocusTargetIdentity(
  destination: DiscRoleFocusDestination,
): EditorRoleFocusTargetIdentity {
  if (destination.roleId === 'additional-artwork' &&
    (destination.focusTarget === 'disc:additional-artwork:item-enable' ||
      destination.focusTarget === 'disc:additional-artwork:upload')) {
    return {
      focusTarget: destination.focusTarget,
      elementId: destination.elementId,
    }
  }

  return {
    focusTarget: destination.focusTarget as DiscFixedRoleFocusTargetId,
  }
}

function parseDestination(
  value: unknown,
): InternalParseResult<DiscRoleFocusDestination> {
  if (!isRecord(value)) {
    return { ok: false, error: 'invalid-destination' }
  }

  if (!isDiscRolePresetRole(value.roleId)) {
    return { ok: false, error: 'invalid-role' }
  }

  if (!isDiscRoleFocusTargetId(value.focusTarget)) {
    return { ok: false, error: 'invalid-focus-target' }
  }

  if (!(FOCUS_TARGETS_BY_ROLE[value.roleId] as readonly string[])
    .includes(value.focusTarget)) {
    return { ok: false, error: 'invalid-role-target-combination' }
  }

  if (value.roleId === 'additional-artwork') {
    if (!(DISC_ADDITIONAL_ARTWORK_FOCUS_TARGET_IDS as readonly string[])
      .includes(value.focusTarget)) {
      return { ok: false, error: 'invalid-role-target-combination' }
    }

    if (value.focusTarget === 'disc:additional-artwork:item-enable' ||
      value.focusTarget === 'disc:additional-artwork:upload') {
      if (!hasOnlyKeys(value, ['roleId', 'focusTarget', 'elementId'])) {
        return { ok: false, error: 'unexpected-field' }
      }

      if (!isNonblankElementId(value.elementId)) {
        return { ok: false, error: 'invalid-element-id' }
      }

      return {
        ok: true,
        value: {
          roleId: value.roleId,
          focusTarget: value.focusTarget,
          elementId: value.elementId,
        },
      }
    }

    if (value.focusTarget !== 'disc:additional-artwork:enable' &&
      value.focusTarget !== 'disc:additional-artwork:add') {
      return { ok: false, error: 'invalid-role-target-combination' }
    }

    if (!hasOnlyKeys(value, ['roleId', 'focusTarget'])) {
      return { ok: false, error: 'unexpected-field' }
    }

    return {
      ok: true,
      value: {
        roleId: value.roleId,
        focusTarget: value.focusTarget,
      },
    }
  }

  if (!hasOnlyKeys(value, ['roleId', 'focusTarget'])) {
    return { ok: false, error: 'unexpected-field' }
  }

  return {
    ok: true,
    value: {
      roleId: value.roleId,
      focusTarget: value.focusTarget,
    } as DiscRoleFocusDestination,
  }
}

function parseOwnerTarget(
  value: unknown,
): InternalParseResult<EditorRoleFocusOwnerTarget> {
  if (!isRecord(value) || typeof value.owner !== 'string') {
    return { ok: false, error: 'invalid-owner-target' }
  }

  switch (value.owner) {
    case 'backgroundImage':
    case 'titleArtwork':
      return hasOnlyKeys(value, ['owner'])
        ? { ok: true, value: { owner: value.owner } }
        : { ok: false, error: 'invalid-owner-target' }
    case 'discText':
      if (hasOnlyKeys(value, ['owner', 'key']) &&
        (value.key === 'title' ||
          value.key === 'copyright' ||
          value.key === 'customNote')) {
        return { ok: true, value: { owner: value.owner, key: value.key } }
      }
      break
    case 'ratingBadge':
      if (hasOnlyKeys(value, ['owner', 'badgeKey']) &&
        value.badgeKey === 'primary') {
        return {
          ok: true,
          value: { owner: value.owner, badgeKey: value.badgeKey },
        }
      }
      break
    case 'mediaMark':
      return hasOnlyKeys(value, ['owner'])
        ? { ok: true, value: { owner: value.owner } }
        : { ok: false, error: 'invalid-owner-target' }
    case 'platformMarks':
      if (hasOnlyKeys(value, ['owner', 'selection']) &&
        value.selection === 'enabled-values') {
        return {
          ok: true,
          value: { owner: value.owner, selection: value.selection },
        }
      }
      break
    case 'logoAssets':
      if (hasOnlyKeys(value, ['owner', 'logoKey', 'scope']) &&
        (value.logoKey === 'developer' || value.logoKey === 'publisher') &&
        value.scope === 'primary') {
        return {
          ok: true,
          value: {
            owner: value.owner,
            logoKey: value.logoKey,
            scope: value.scope,
          },
        }
      }
      break
    case 'additionalArtwork':
      if (hasOnlyKeys(value, ['owner', 'selection']) &&
        value.selection === 'first-renderable-existing') {
        return {
          ok: true,
          value: { owner: value.owner, selection: value.selection },
        }
      }

      if (hasOnlyKeys(value, ['owner', 'elementId']) &&
        typeof value.elementId === 'string' && value.elementId.trim()) {
        return {
          ok: true,
          value: { owner: value.owner, elementId: value.elementId },
        }
      }
      break
  }

  return { ok: false, error: 'invalid-owner-target' }
}

function isOwnerTargetCompatibleWithDestination(
  destination: DiscRoleFocusDestination,
  ownerTarget: EditorRoleFocusOwnerTarget,
): boolean {
  switch (destination.roleId) {
    case 'background-artwork':
      return ownerTarget.owner === 'backgroundImage'
    case 'game-title':
      return destination.focusTarget === 'disc:game-title:text-fallback'
        ? ownerTarget.owner === 'discText' && ownerTarget.key === 'title'
        : ownerTarget.owner === 'titleArtwork'
    case 'game-info-logos':
      switch (destination.focusTarget) {
        case 'disc:rating:enable':
        case 'disc:rating:system':
        case 'disc:rating:value':
        case 'disc:rating:source':
          return ownerTarget.owner === 'ratingBadge' &&
            ownerTarget.badgeKey === 'primary'
        case 'disc:media-format-mark:enable':
        case 'disc:media-format-mark:format':
          return ownerTarget.owner === 'mediaMark'
        case 'disc:operating-system-marks:enable':
          return ownerTarget.owner === 'platformMarks' &&
            ownerTarget.selection === 'enabled-values'
      }

      return false
    case 'company-logos': {
      if (ownerTarget.owner !== 'logoAssets' ||
        ownerTarget.scope !== 'primary') {
        return false
      }

      const expectedLogoKey =
        destination.focusTarget === 'disc:company-logo:developer-enable' ||
        destination.focusTarget === 'disc:company-logo:developer-upload'
          ? 'developer'
          : 'publisher'

      return ownerTarget.logoKey === expectedLogoKey
    }
    case 'legal-info':
      return ownerTarget.owner === 'discText' &&
        ownerTarget.key === 'copyright'
    case 'additional-artwork':
      if (destination.focusTarget !== 'disc:additional-artwork:item-enable' &&
        destination.focusTarget !== 'disc:additional-artwork:upload') {
        return false
      }

      return ownerTarget.owner === 'additionalArtwork' &&
        'elementId' in ownerTarget &&
        ownerTarget.elementId === destination.elementId
    case 'additional-text':
      return ownerTarget.owner === 'discText' &&
        ownerTarget.key === 'customNote'
  }

  destination satisfies never
  return false
}

function parseEditorRoleFocusRequestUnsafe(
  value: unknown,
): EditorRoleFocusRequestParseResult {
  if (!isRecord(value)) {
    return { ok: false, error: 'invalid-request' }
  }

  if (!hasOnlyKeys(value, [
    'requestId',
    'surfaceId',
    'behavior',
    'destination',
    'scrollAlignment',
    'ownerTarget',
  ])) {
    return { ok: false, error: 'unexpected-field' }
  }

  if (!isPositiveSafeInteger(value.requestId)) {
    return { ok: false, error: 'invalid-request-id' }
  }

  if (value.surfaceId !== 'disc-label') {
    return { ok: false, error: 'invalid-surface' }
  }

  if (value.behavior !== 'reveal' && value.behavior !== 'focus') {
    return { ok: false, error: 'invalid-behavior' }
  }

  const hasScrollAlignment = hasOwn(value, 'scrollAlignment')
  const scrollAlignment = hasScrollAlignment
    ? value.scrollAlignment
    : undefined

  if (hasScrollAlignment &&
    !isEditorRoleFocusScrollAlignment(scrollAlignment)) {
    return { ok: false, error: 'invalid-scroll-alignment' }
  }

  const validatedScrollAlignment =
    isEditorRoleFocusScrollAlignment(scrollAlignment)
      ? scrollAlignment
      : undefined

  const destination = parseDestination(value.destination)

  if (!destination.ok) {
    return destination
  }

  if (hasOwn(value, 'ownerTarget')) {
    const ownerTarget = parseOwnerTarget(value.ownerTarget)

    if (!ownerTarget.ok) {
      return ownerTarget
    }

    if (!isOwnerTargetCompatibleWithDestination(
      destination.value,
      ownerTarget.value,
    )) {
      return { ok: false, error: 'invalid-owner-target' }
    }

    return {
      ok: true,
      request: {
        requestId: value.requestId,
        surfaceId: value.surfaceId,
        behavior: value.behavior,
        destination: destination.value,
        ...(validatedScrollAlignment
          ? { scrollAlignment: validatedScrollAlignment }
          : {}),
        ownerTarget: ownerTarget.value,
      },
    }
  }

  return {
    ok: true,
    request: {
      requestId: value.requestId,
      surfaceId: value.surfaceId,
      behavior: value.behavior,
      destination: destination.value,
      ...(validatedScrollAlignment
        ? { scrollAlignment: validatedScrollAlignment }
        : {}),
    },
  }
}

export function parseEditorRoleFocusRequest(
  value: unknown,
): EditorRoleFocusRequestParseResult {
  try {
    return parseEditorRoleFocusRequestUnsafe(value)
  } catch {
    return { ok: false, error: 'invalid-request' }
  }
}

export const INITIAL_EDITOR_ROLE_FOCUS_REQUEST_ID = 0

export type EditorRoleFocusState = {
  openRoleIds: ReadonlySet<DiscRolePresetRole>
  pendingRequest: EditorRoleFocusRequest | null
  lastHandledRequestId: number
}

export type EditorRoleFocusAction =
  | {
      type: 'request'
      request: unknown
    }
  | {
      type: 'consume'
      requestId: EditorRoleFocusRequestId
    }
  | {
      type: 'set-role-open'
      roleId: DiscRolePresetRole
      open: boolean
    }
  | {
      type: 'reset'
    }

export type EditorRoleFocusRequestOutcome =
  | 'accepted'
  | 'rejected-stale'
  | 'rejected-invalid'
  | 'consumed'
  | 'ignored-no-pending-request'
  | 'ignored-request-id-mismatch'

export type EditorRoleFocusOutcome =
  | EditorRoleFocusRequestOutcome
  | 'manual-role-opened'
  | 'manual-role-closed'
  | 'reset'

export type EditorRoleFocusReducerResult = {
  state: EditorRoleFocusState
  outcome: EditorRoleFocusOutcome
}

export function createInitialEditorRoleFocusState(): EditorRoleFocusState {
  return {
    openRoleIds: new Set(),
    pendingRequest: null,
    lastHandledRequestId: INITIAL_EDITOR_ROLE_FOCUS_REQUEST_ID,
  }
}

function requestRoleFocus(
  state: EditorRoleFocusState,
  requestValue: unknown,
): EditorRoleFocusReducerResult {
  const parsed = parseEditorRoleFocusRequest(requestValue)

  if (!parsed.ok) {
    return { state, outcome: 'rejected-invalid' }
  }

  const newestKnownRequestId = Math.max(
    state.lastHandledRequestId,
    state.pendingRequest?.requestId ?? INITIAL_EDITOR_ROLE_FOCUS_REQUEST_ID,
  )

  if (parsed.request.requestId <= newestKnownRequestId) {
    return { state, outcome: 'rejected-stale' }
  }

  const roleId = parsed.request.destination.roleId
  const openRoleIds = state.openRoleIds.has(roleId)
    ? state.openRoleIds
    : new Set([...state.openRoleIds, roleId])

  return {
    state: {
      ...state,
      openRoleIds,
      pendingRequest: parsed.request,
    },
    outcome: 'accepted',
  }
}

function consumeRoleFocusRequest(
  state: EditorRoleFocusState,
  requestId: EditorRoleFocusRequestId,
): EditorRoleFocusReducerResult {
  if (!state.pendingRequest) {
    return { state, outcome: 'ignored-no-pending-request' }
  }

  if (!isPositiveSafeInteger(requestId) ||
    state.pendingRequest.requestId !== requestId) {
    return { state, outcome: 'ignored-request-id-mismatch' }
  }

  // The future UI consumes once even if a nested target is unavailable. It
  // falls back to the role summary (or an optional feature's enable control)
  // and does not retry indefinitely. Availability is intentionally not part
  // of this pure reducer.
  return {
    state: {
      ...state,
      pendingRequest: null,
      lastHandledRequestId: requestId,
    },
    outcome: 'consumed',
  }
}

function setManualRoleOpen(
  state: EditorRoleFocusState,
  roleId: DiscRolePresetRole,
  open: boolean,
): EditorRoleFocusReducerResult {
  if (!isDiscRolePresetRole(roleId)) {
    return { state, outcome: 'rejected-invalid' }
  }

  const isOpen = state.openRoleIds.has(roleId)

  if (isOpen === open) {
    return {
      state,
      outcome: open ? 'manual-role-opened' : 'manual-role-closed',
    }
  }

  const openRoleIds = new Set(state.openRoleIds)

  if (open) {
    openRoleIds.add(roleId)
  } else {
    openRoleIds.delete(roleId)
  }

  return {
    state: { ...state, openRoleIds },
    outcome: open ? 'manual-role-opened' : 'manual-role-closed',
  }
}

export function reduceEditorRoleFocus(
  state: EditorRoleFocusState,
  action: EditorRoleFocusAction,
): EditorRoleFocusReducerResult {
  switch (action.type) {
    case 'request':
      return requestRoleFocus(state, action.request)
    case 'consume':
      return consumeRoleFocusRequest(state, action.requestId)
    case 'set-role-open':
      return setManualRoleOpen(state, action.roleId, action.open)
    case 'reset':
      return { state: createInitialEditorRoleFocusState(), outcome: 'reset' }
  }
}
