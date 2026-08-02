import {
  encodeCaseInsertPresetDeterministicIdentity,
} from './caseInsertPresetReapplyIdentity.ts'

export const CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND =
  'sbls/case-insert-preset-attachment-state' as const
export const CASE_INSERT_PRESET_ATTACHMENT_STATE_VERSION = 1 as const
export const CASE_INSERT_PRESET_UNATTACHED_IDENTITY =
  'case:preset-attachment:v1:unattached' as const
export const CASE_INSERT_PRESET_ATTACHED_IDENTITY_PREFIX =
  'case:preset-attachment:v1:attached:' as const

export type CaseInsertPresetUnattachedEndpoint = Readonly<{
  kind: typeof CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND
  formatVersion: typeof CASE_INSERT_PRESET_ATTACHMENT_STATE_VERSION
  status: 'unattached'
  attachmentIdentity: typeof CASE_INSERT_PRESET_UNATTACHED_IDENTITY
}>

export type CaseInsertPresetAttachedEndpoint = Readonly<{
  kind: typeof CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND
  formatVersion: typeof CASE_INSERT_PRESET_ATTACHMENT_STATE_VERSION
  status: 'attached'
  attachmentIdentity: string
  configurationIdentity: string
}>

export type CaseInsertPresetAttachmentEndpoint =
  | CaseInsertPresetUnattachedEndpoint
  | CaseInsertPresetAttachedEndpoint

const CANONICAL_UNATTACHED_ENDPOINT = Object.freeze({
  kind: CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND,
  formatVersion: CASE_INSERT_PRESET_ATTACHMENT_STATE_VERSION,
  status: 'unattached' as const,
  attachmentIdentity: CASE_INSERT_PRESET_UNATTACHED_IDENTITY,
})

export function createCaseInsertPresetUnattachedEndpoint():
CaseInsertPresetUnattachedEndpoint {
  return CANONICAL_UNATTACHED_ENDPOINT
}

export function createCaseInsertPresetAttachedEndpoint(
  configurationIdentity: string,
): CaseInsertPresetAttachedEndpoint {
  const attachmentIdentity = `${CASE_INSERT_PRESET_ATTACHED_IDENTITY_PREFIX}${
    encodeCaseInsertPresetDeterministicIdentity({ configurationIdentity })
  }`
  return Object.freeze({
    kind: CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND,
    formatVersion: CASE_INSERT_PRESET_ATTACHMENT_STATE_VERSION,
    status: 'attached' as const,
    attachmentIdentity,
    configurationIdentity,
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const keys = Object.keys(value)
  return keys.length === expected.length &&
    keys.every((key) => expected.includes(key))
}

export function isCaseInsertPresetAttachmentEndpoint(
  value: unknown,
): value is CaseInsertPresetAttachmentEndpoint {
  if (!isRecord(value) || value.kind !==
      CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND || value.formatVersion !==
      CASE_INSERT_PRESET_ATTACHMENT_STATE_VERSION) {
    return false
  }
  if (value.status === 'unattached') {
    return hasExactKeys(value, [
      'kind', 'formatVersion', 'status', 'attachmentIdentity',
    ]) && value.attachmentIdentity === CASE_INSERT_PRESET_UNATTACHED_IDENTITY
  }
  if (value.status !== 'attached' || !hasExactKeys(value, [
    'kind', 'formatVersion', 'status', 'attachmentIdentity',
    'configurationIdentity',
  ]) || typeof value.configurationIdentity !== 'string' ||
      value.configurationIdentity.trim().length === 0) {
    return false
  }
  return value.attachmentIdentity === createCaseInsertPresetAttachedEndpoint(
    value.configurationIdentity,
  ).attachmentIdentity
}
