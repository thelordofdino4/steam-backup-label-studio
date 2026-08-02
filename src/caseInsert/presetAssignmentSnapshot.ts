import {
  captureNormalizedProjectSnapshot,
  getNormalizedProjectKind,
  type DeepReadonly,
  type NormalizedPersistableProject,
} from '../lifecycle/canonicalProject.ts'
import {
  CASE_INSERT_PRESET_CONCRETE_REGION_IDS,
  CASE_INSERT_PRESET_COORDINATE_BASES_BY_REGION,
  CASE_INSERT_PRESET_OWNER_IDS,
  type CaseInsertPresetObjectBinding,
  type CaseInsertPresetOwnerId,
} from '../presets/caseInsertPresetDefinition.ts'
import type {
  CaseInsertPresetOwnerCapability,
  CaseInsertPresetTemplateCapability,
} from '../presets/caseInsertPresetCompatibility.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectJewelCaseState,
  SavedProject,
} from '../project/projectTypes.ts'
import { caseInsertTemplates } from '../templates/caseInsertTemplates.ts'
import type { DiscTextKey } from '../discText/types.ts'
import { getCaseInsertDiscTextBlockId } from './textContent.ts'

export const CASE_INSERT_PRESET_ASSIGNMENT_SNAPSHOT_KIND =
  'case-insert-preset-assignment-snapshot' as const

export type CaseInsertPresetTemplateIdentity = Readonly<{
  id: string
  revision: null
}>

export type CaseInsertPresetAssignmentSnapshotIdentity = Readonly<{
  sessionId: string
  projectRevision: number
  template: CaseInsertPresetTemplateIdentity
}>

export type CaseInsertPresetAssignmentSnapshot = Readonly<{
  kind: typeof CASE_INSERT_PRESET_ASSIGNMENT_SNAPSHOT_KIND
  identity: CaseInsertPresetAssignmentSnapshotIdentity
  caseInsert: DeepReadonly<ProjectJewelCaseState>
}>

export type CaseInsertPresetAssignmentSnapshotCreateResult =
  | Readonly<{
      ok: true
      value: CaseInsertPresetAssignmentSnapshot
    }>
  | Readonly<{
      ok: false
      error: Readonly<{
        code:
          | 'invalid-snapshot-identity'
          | 'unsupported-project-kind'
          | 'unsupported-snapshot'
          | 'unsupported-template'
      }>
    }>

type CaseInsertPresetAssignmentSnapshotCreateErrorCode =
  | 'invalid-snapshot-identity'
  | 'unsupported-project-kind'
  | 'unsupported-snapshot'
  | 'unsupported-template'

export type CaseInsertPresetSnapshotObjectState = DeepReadonly<
  | ProjectCaseInsertImageSlot
  | ProjectCaseInsertTextBlock
  | ProjectCaseInsertTextList
>

export type CaseInsertPresetSnapshotEnablement = Readonly<{
  objectEnabled: boolean
  ownerEnabled: boolean | null
  effectiveEnabled: boolean
}>

export type CaseInsertPresetSnapshotBindingResult =
  | Readonly<{
      status: 'found'
      currentState: CaseInsertPresetSnapshotObjectState
      enablement: CaseInsertPresetSnapshotEnablement
    }>
  | Readonly<{ status: 'missing' }>
  | Readonly<{ status: 'ambiguous'; matches: number }>
  | Readonly<{ status: 'unsupported' }>

type NormalizedCaseInsertProject = Extract<
  NormalizedPersistableProject,
  Readonly<{ projectType: 'caseInsert' }>
>

type RepeatedOwner = Readonly<{
  items: readonly CaseInsertPresetSnapshotObjectState[]
  ownerEnabled: boolean | null
}>

const SYNTHETIC_TEXT_SUFFIX_TO_DISC_KEY = Object.freeze({
  title: 'title',
  subtitle: 'subtitle',
  'disc-number': 'discNumber',
  'backup-date': 'backupDate',
  'steam-app-id': 'appId',
  developer: 'developer',
  publisher: 'publisher',
  'install-notes': 'installNotes',
  'custom-note': 'customNote',
  copyright: 'copyright',
} satisfies Readonly<Record<string, DiscTextKey>>)

function failure(
  code: CaseInsertPresetAssignmentSnapshotCreateErrorCode,
): CaseInsertPresetAssignmentSnapshotCreateResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ code }),
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
}

function isSnapshotObject(value: unknown): value is CaseInsertPresetSnapshotObjectState {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.enabled === 'boolean'
}

function isSnapshotObjectArray(value: unknown) {
  return Array.isArray(value) && value.every(isSnapshotObject)
}

function hasSupportedSurfaceState(value: unknown) {
  if (!isRecord(value)) return false
  return isSnapshotObject(value.background) &&
    isSnapshotObject(value.titleArtwork) &&
    typeof value.additionalArtworkEnabled === 'boolean' &&
    isSnapshotObjectArray(value.artworkSlots) &&
    isSnapshotObjectArray(value.logoSlots) &&
    isSnapshotObjectArray(value.markSlots) &&
    isSnapshotObjectArray(value.textBlocks) &&
    isSnapshotObjectArray(value.textLists)
}

function hasSupportedSpineSideState(value: unknown) {
  if (!isRecord(value)) return false
  return isSnapshotObject(value.background) &&
    isSnapshotObject(value.titleArtwork) &&
    isSnapshotObject(value.title) &&
    typeof value.additionalArtworkEnabled === 'boolean' &&
    isSnapshotObjectArray(value.artworkSlots) &&
    isSnapshotObjectArray(value.logoSlots) &&
    isSnapshotObjectArray(value.markSlots) &&
    isSnapshotObjectArray(value.textBlocks)
}

function isSupportedCaseInsertState(value: unknown): value is ProjectJewelCaseState {
  if (!isRecord(value) || typeof value.templateType !== 'string') return false
  const templates = isRecord(value.templates) ? value.templates : null
  const spine = isRecord(value.spine) ? value.spine : null

  return Boolean(
    templates &&
    hasSupportedSurfaceState(templates.cover) &&
    hasSupportedSurfaceState(templates.tray) &&
    spine &&
    typeof spine.mirrored === 'boolean' &&
    hasSupportedSpineSideState(spine.left) &&
    hasSupportedSpineSideState(spine.right),
  )
}

function isSupportedTemplateState(project: NormalizedCaseInsertProject) {
  const templateId = project.caseInsert.templateType
  const template = caseInsertTemplates[templateId]

  return project.template.type === 'caseInsert' &&
    project.template.variant === templateId &&
    template?.id === templateId &&
    template.type === 'caseInsert'
}

export function createCaseInsertPresetAssignmentSnapshot(input: Readonly<{
  sessionId: string
  projectRevision: number
  project: NormalizedPersistableProject
}>): CaseInsertPresetAssignmentSnapshotCreateResult {
  if (!input.sessionId.trim() ||
      !isNonNegativeSafeInteger(input.projectRevision)) {
    return failure('invalid-snapshot-identity')
  }

  let project: NormalizedPersistableProject
  try {
    project = captureNormalizedProjectSnapshot(input.project as SavedProject)
  } catch {
    return failure('unsupported-snapshot')
  }

  if (getNormalizedProjectKind(project) !== 'caseInsert') {
    return failure('unsupported-project-kind')
  }
  const caseProject = project as NormalizedCaseInsertProject
  if (!isSupportedCaseInsertState(caseProject.caseInsert)) {
    return failure('unsupported-snapshot')
  }
  if (!isSupportedTemplateState(caseProject)) {
    return failure('unsupported-template')
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      kind: CASE_INSERT_PRESET_ASSIGNMENT_SNAPSHOT_KIND,
      identity: Object.freeze({
        sessionId: input.sessionId,
        projectRevision: input.projectRevision,
        template: Object.freeze({
          id: caseProject.caseInsert.templateType,
          revision: null,
        }),
      }),
      caseInsert: caseProject.caseInsert,
    }),
  })
}

export function isCaseInsertPresetAssignmentSnapshot(
  value: unknown,
): value is CaseInsertPresetAssignmentSnapshot {
  if (!isRecord(value) ||
      value.kind !== CASE_INSERT_PRESET_ASSIGNMENT_SNAPSHOT_KIND ||
      !isRecord(value.identity) ||
      !isRecord(value.identity.template)) {
    return false
  }

  return typeof value.identity.sessionId === 'string' &&
    value.identity.sessionId.trim().length > 0 &&
    isNonNegativeSafeInteger(value.identity.projectRevision) &&
    typeof value.identity.template.id === 'string' &&
    value.identity.template.revision === null &&
    isSupportedCaseInsertState(value.caseInsert) &&
    value.caseInsert.templateType === value.identity.template.id &&
    isDeeplyFrozen(value)
}

function isDeeplyFrozen(value: unknown): boolean {
  if (!isRecord(value) && !Array.isArray(value)) return true
  return Object.isFrozen(value) &&
    Object.values(value).every(isDeeplyFrozen)
}

export function getCaseInsertPresetSnapshotTemplateCapabilities(
  snapshot: CaseInsertPresetAssignmentSnapshot,
): readonly CaseInsertPresetTemplateCapability[] {
  const template = caseInsertTemplates[
    snapshot.identity.template.id as keyof typeof caseInsertTemplates
  ]
  if (!template) return Object.freeze([])
  const availableRegionIds = new Set(template.regions.map(({ id }) => id))

  return Object.freeze(CASE_INSERT_PRESET_CONCRETE_REGION_IDS.map((region) =>
    Object.freeze({
      region,
      coordinateBases: Object.freeze(
        CASE_INSERT_PRESET_COORDINATE_BASES_BY_REGION[region]
          .filter((basis) => availableRegionIds.has(basis)),
      ),
    })))
}

function getRepeatedOwner(
  caseInsert: DeepReadonly<ProjectJewelCaseState>,
  ownerId: CaseInsertPresetOwnerId,
): RepeatedOwner | null {
  const { cover, tray } = caseInsert.templates
  const { left, right } = caseInsert.spine

  switch (ownerId) {
    case 'case.cover.artwork-slots':
      return { items: cover.artworkSlots, ownerEnabled: cover.additionalArtworkEnabled }
    case 'case.cover.logo-slots':
      return { items: cover.logoSlots, ownerEnabled: null }
    case 'case.cover.mark-slots':
      return { items: cover.markSlots, ownerEnabled: null }
    case 'case.tray.artwork-slots':
      return { items: tray.artworkSlots, ownerEnabled: tray.additionalArtworkEnabled }
    case 'case.tray.logo-slots':
      return { items: tray.logoSlots, ownerEnabled: null }
    case 'case.tray.mark-slots':
      return { items: tray.markSlots, ownerEnabled: null }
    case 'case.spine.left.logo-slots':
      return { items: left.logoSlots, ownerEnabled: null }
    case 'case.spine.left.mark-slots':
      return { items: left.markSlots, ownerEnabled: null }
    case 'case.spine.right.logo-slots':
      return { items: right.logoSlots, ownerEnabled: null }
    case 'case.spine.right.mark-slots':
      return { items: right.markSlots, ownerEnabled: null }
    default:
      return null
  }
}

export function getCaseInsertPresetSnapshotOwnerCapabilities(
  snapshot: CaseInsertPresetAssignmentSnapshot,
): readonly CaseInsertPresetOwnerCapability[] {
  return Object.freeze(CASE_INSERT_PRESET_OWNER_IDS.map((ownerId) => {
    const repeated = getRepeatedOwner(snapshot.caseInsert, ownerId)
    return Object.freeze({
      ownerId,
      repeatedObjectIds: Object.freeze(
        repeated?.items.map(({ id }) => id) ?? [],
      ),
    })
  }))
}

function getTextBlockRuntimeId(
  objectId: string,
  syntheticPrefix: string,
  runtimePrefix: string,
) {
  if (!objectId.startsWith(syntheticPrefix)) return null
  const suffix = objectId.slice(syntheticPrefix.length)
  const discKey = SYNTHETIC_TEXT_SUFFIX_TO_DISC_KEY[
    suffix as keyof typeof SYNTHETIC_TEXT_SUFFIX_TO_DISC_KEY
  ]
  return discKey ? getCaseInsertDiscTextBlockId(runtimePrefix, discKey) : null
}

function findFixedArrayObject(
  items: readonly CaseInsertPresetSnapshotObjectState[],
  runtimeId: string | null,
): CaseInsertPresetSnapshotBindingResult {
  if (!runtimeId) return Object.freeze({ status: 'unsupported' })
  const matches = items.filter(({ id }) => id === runtimeId)
  if (matches.length === 0) return Object.freeze({ status: 'missing' })
  if (matches.length > 1) {
    return Object.freeze({ status: 'ambiguous', matches: matches.length })
  }
  return found(matches[0]!, null)
}

function found(
  currentState: CaseInsertPresetSnapshotObjectState,
  ownerEnabled: boolean | null,
): CaseInsertPresetSnapshotBindingResult {
  const objectEnabled = currentState.enabled
  return Object.freeze({
    status: 'found',
    currentState,
    enablement: Object.freeze({
      objectEnabled,
      ownerEnabled,
      effectiveEnabled: objectEnabled && ownerEnabled !== false,
    }),
  })
}

function resolveFixedBinding(
  caseInsert: DeepReadonly<ProjectJewelCaseState>,
  ownerId: CaseInsertPresetOwnerId,
  objectId: string,
): CaseInsertPresetSnapshotBindingResult {
  const { cover, tray } = caseInsert.templates
  const { left, right } = caseInsert.spine

  switch (ownerId) {
    case 'case.cover.background':
      return objectId === 'case:cover:background'
        ? found(cover.background, null)
        : Object.freeze({ status: 'unsupported' })
    case 'case.cover.title-artwork':
      return objectId === 'case:cover:title-artwork'
        ? found(cover.titleArtwork, null)
        : Object.freeze({ status: 'unsupported' })
    case 'case.cover.text-blocks':
      return findFixedArrayObject(
        cover.textBlocks,
        getTextBlockRuntimeId(objectId, 'case:cover:text:', 'cover'),
      )
    case 'case.tray.background':
      return objectId === 'case:tray:background'
        ? found(tray.background, null)
        : Object.freeze({ status: 'unsupported' })
    case 'case.tray.title-artwork':
      return objectId === 'case:tray:title-artwork'
        ? found(tray.titleArtwork, null)
        : Object.freeze({ status: 'unsupported' })
    case 'case.tray.text-blocks': {
      const specialIds: Readonly<Record<string, string>> = {
        'case:tray:text:description': 'tray-description',
        'case:tray:text:minimum-requirements': 'tray-minimum-requirements',
        'case:tray:text:recommended-requirements': 'tray-recommended-requirements',
      }
      return findFixedArrayObject(
        tray.textBlocks,
        specialIds[objectId] ??
          getTextBlockRuntimeId(objectId, 'case:tray:text:', 'tray'),
      )
    }
    case 'case.tray.text-lists':
      return findFixedArrayObject(
        tray.textLists,
        objectId === 'case:tray:text-list:feature-bullets'
          ? 'tray-feature-bullets'
          : null,
      )
    case 'case.spine.left.background':
      return objectId === 'case:spine:left:background'
        ? found(left.background, null)
        : Object.freeze({ status: 'unsupported' })
    case 'case.spine.left.title-artwork':
      return objectId === 'case:spine:left:title-artwork'
        ? found(left.titleArtwork, null)
        : Object.freeze({ status: 'unsupported' })
    case 'case.spine.left.title-text':
      return objectId === 'case:spine:left:text:title'
        ? found(left.title, null)
        : Object.freeze({ status: 'unsupported' })
    case 'case.spine.left.text-blocks':
      return findFixedArrayObject(
        left.textBlocks,
        getTextBlockRuntimeId(
          objectId,
          'case:spine:left:text:',
          'left-spine',
        ),
      )
    case 'case.spine.right.background':
      return objectId === 'case:spine:right:background'
        ? found(right.background, null)
        : Object.freeze({ status: 'unsupported' })
    case 'case.spine.right.title-artwork':
      return objectId === 'case:spine:right:title-artwork'
        ? found(right.titleArtwork, null)
        : Object.freeze({ status: 'unsupported' })
    case 'case.spine.right.title-text':
      return objectId === 'case:spine:right:text:title'
        ? found(right.title, null)
        : Object.freeze({ status: 'unsupported' })
    case 'case.spine.right.text-blocks':
      return findFixedArrayObject(
        right.textBlocks,
        getTextBlockRuntimeId(
          objectId,
          'case:spine:right:text:',
          'right-spine',
        ),
      )
    default:
      return Object.freeze({ status: 'unsupported' })
  }
}

export function resolveCaseInsertPresetSnapshotBinding(
  snapshot: CaseInsertPresetAssignmentSnapshot,
  ownerId: CaseInsertPresetOwnerId,
  object: CaseInsertPresetObjectBinding,
): CaseInsertPresetSnapshotBindingResult {
  return resolveCaseInsertPresetAggregateBinding(snapshot.caseInsert, ownerId, object)
}

export function resolveCaseInsertPresetAggregateBinding(
  caseInsert: DeepReadonly<ProjectJewelCaseState>,
  ownerId: CaseInsertPresetOwnerId,
  object: CaseInsertPresetObjectBinding,
): CaseInsertPresetSnapshotBindingResult {
  if (object.kind === 'fixed') {
    return resolveFixedBinding(caseInsert, ownerId, object.id)
  }

  const repeated = getRepeatedOwner(caseInsert, ownerId)
  if (!repeated) return Object.freeze({ status: 'unsupported' })
  const matches = repeated.items.filter(({ id }) => id === object.id)
  if (matches.length === 0) return Object.freeze({ status: 'missing' })
  if (matches.length > 1) {
    return Object.freeze({ status: 'ambiguous', matches: matches.length })
  }
  return found(matches[0]!, repeated.ownerEnabled)
}
