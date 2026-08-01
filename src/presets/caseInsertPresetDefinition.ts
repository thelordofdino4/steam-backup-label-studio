export const CASE_INSERT_PRESET_DEFINITION_KIND =
  'sbls/case-insert-preset' as const
export const CASE_INSERT_PRESET_FORMAT_VERSION = 1 as const
export const CASE_INSERT_PRESET_MAX_NAME_LENGTH = 120
export const CASE_INSERT_PRESET_MAX_DESCRIPTION_LENGTH = 1000
export const CASE_INSERT_PRESET_MAX_TEMPLATE_ID_LENGTH = 120
export const CASE_INSERT_PRESET_MAX_OBJECT_ID_LENGTH = 160
export const CASE_INSERT_PRESET_MAX_SLOTS = 128
export const CASE_INSERT_PRESET_MAX_ASSIGNMENTS = 256

export type CaseInsertPresetId =
  | `builtin:case-preset:${string}`
  | `user:case-preset:${string}`

export const CASE_INSERT_PRESET_CONCRETE_REGION_IDS = Object.freeze([
  'front-cover',
  'tray-card',
  'back-panel',
  'left-spine',
  'right-spine',
] as const)

export type CaseInsertPresetConcreteRegionId =
  typeof CASE_INSERT_PRESET_CONCRETE_REGION_IDS[number]

export const CASE_INSERT_PRESET_COORDINATE_BASES = Object.freeze([
  'front',
  'frontSafe',
  'back',
  'backSafe',
  'backPanel',
  'backPanelSafe',
  'leftSpine',
  'leftSpineSafe',
  'rightSpine',
  'rightSpineSafe',
] as const)

export type CaseInsertPresetCoordinateBasis =
  typeof CASE_INSERT_PRESET_COORDINATE_BASES[number]

export const CASE_INSERT_PRESET_COORDINATE_BASES_BY_REGION = Object.freeze({
  'front-cover': Object.freeze(['front', 'frontSafe'] as const),
  'tray-card': Object.freeze(['back', 'backSafe'] as const),
  'back-panel': Object.freeze(['backPanel', 'backPanelSafe'] as const),
  'left-spine': Object.freeze(['leftSpine', 'leftSpineSafe'] as const),
  'right-spine': Object.freeze(['rightSpine', 'rightSpineSafe'] as const),
} satisfies Readonly<Record<
  CaseInsertPresetConcreteRegionId,
  readonly CaseInsertPresetCoordinateBasis[]
>>)

export const CASE_INSERT_PRESET_ROLE_IDS = Object.freeze([
  'game-title',
  'background-artwork',
  'game-info-logos',
  'company-logos',
  'legal-info',
  'additional-artwork',
  'additional-text',
  'game-description-text',
  'feature-bullets-callouts',
  'screenshots',
  'system-requirements',
  'vertical-game-logo-title',
  'optional-media-format-type',
  'spine-background-artwork',
] as const)

export type CaseInsertPresetRoleId =
  typeof CASE_INSERT_PRESET_ROLE_IDS[number]

export const CASE_INSERT_PRESET_OWNER_IDS = Object.freeze([
  'case.cover.background',
  'case.cover.title-artwork',
  'case.cover.text-blocks',
  'case.cover.artwork-slots',
  'case.cover.logo-slots',
  'case.cover.mark-slots',
  'case.tray.background',
  'case.tray.title-artwork',
  'case.tray.text-blocks',
  'case.tray.text-lists',
  'case.tray.artwork-slots',
  'case.tray.logo-slots',
  'case.tray.mark-slots',
  'case.spine.left.background',
  'case.spine.left.title-artwork',
  'case.spine.left.title-text',
  'case.spine.left.text-blocks',
  'case.spine.left.logo-slots',
  'case.spine.left.mark-slots',
  'case.spine.right.background',
  'case.spine.right.title-artwork',
  'case.spine.right.title-text',
  'case.spine.right.text-blocks',
  'case.spine.right.logo-slots',
  'case.spine.right.mark-slots',
] as const)

export type CaseInsertPresetOwnerId =
  typeof CASE_INSERT_PRESET_OWNER_IDS[number]

export type CaseInsertPresetNormalizedRegion = Readonly<{
  centerXPercent: number
  centerYPercent: number
  widthPercent: number
  heightPercent: number
}>

export type CaseInsertPresetTemplateCompatibility =
  | Readonly<{ mode: 'any-case-template' }>
  | Readonly<{
      mode: 'specific-template'
      templateId: string
    }>

export type CaseInsertPresetObjectBinding =
  | Readonly<{
      kind: 'fixed'
      id: string
    }>
  | Readonly<{
      kind: 'repeated'
      id: string
    }>

export type CaseInsertPresetApplicationScope =
  | Readonly<{
      kind: 'region'
      region: CaseInsertPresetConcreteRegionId
    }>
  | Readonly<{
      kind: 'section'
      section: 'front' | 'back' | 'spine'
    }>
  | Readonly<{ kind: 'complete' }>

export type CaseInsertPresetAssignmentDefinitionV1 = Readonly<{
  id: `case:preset-assignment:${string}`
  region: CaseInsertPresetConcreteRegionId
  coordinateBasis: CaseInsertPresetCoordinateBasis
  ownerId: CaseInsertPresetOwnerId
  object: CaseInsertPresetObjectBinding
  contentRegion: CaseInsertPresetNormalizedRegion
  actionRegion?: CaseInsertPresetNormalizedRegion
}>

export type CaseInsertPresetSlotDefinitionV1 = Readonly<{
  id: `case:preset-slot:${string}`
  roleId: CaseInsertPresetRoleId
  assignments: readonly CaseInsertPresetAssignmentDefinitionV1[]
}>

export type CaseInsertPresetDefinitionV1 = Readonly<{
  kind: typeof CASE_INSERT_PRESET_DEFINITION_KIND
  formatVersion: typeof CASE_INSERT_PRESET_FORMAT_VERSION
  id: CaseInsertPresetId
  revision: number
  name: string
  description?: string
  surface: 'case-insert'
  compatibility: CaseInsertPresetTemplateCompatibility
  applicationScopes: readonly CaseInsertPresetApplicationScope[]
  slots: readonly CaseInsertPresetSlotDefinitionV1[]
}>

export type CaseInsertPresetDefinitionParseErrorCode =
  | 'invalid-root'
  | 'unexpected-field'
  | 'unsupported-kind'
  | 'unsupported-format-version'
  | 'invalid-id'
  | 'invalid-revision'
  | 'invalid-name'
  | 'invalid-description'
  | 'invalid-surface'
  | 'invalid-compatibility'
  | 'invalid-scope'
  | 'duplicate-scope'
  | 'unsupported-scope'
  | 'too-many-slots'
  | 'invalid-slot'
  | 'duplicate-slot'
  | 'unsupported-role'
  | 'too-many-assignments'
  | 'invalid-assignment'
  | 'duplicate-assignment'
  | 'invalid-region'
  | 'invalid-coordinate-basis'
  | 'region-coordinate-basis-mismatch'
  | 'role-region-mismatch'
  | 'unsupported-owner'
  | 'owner-region-mismatch'
  | 'invalid-object-binding'
  | 'owner-role-mismatch'
  | 'duplicate-owner-object-binding'

export type CaseInsertPresetDefinitionParseResult =
  | Readonly<{ ok: true; value: CaseInsertPresetDefinitionV1 }>
  | Readonly<{
      ok: false
      error: Readonly<{
        code: CaseInsertPresetDefinitionParseErrorCode
        path: string
      }>
    }>

export type CaseInsertPresetApplicationScopeParseResult =
  | Readonly<{ ok: true; value: CaseInsertPresetApplicationScope }>
  | Readonly<{
      ok: false
      error: Readonly<{
        code: 'invalid-scope'
        path: string
      }>
    }>

type UnknownRecord = Record<string, unknown>

type FixedOwnerRule = Readonly<{
  region: CaseInsertPresetConcreteRegionId
  bindingKind: 'fixed'
  objects: Readonly<Record<string, CaseInsertPresetRoleId>>
}>

type RepeatedOwnerRule = Readonly<{
  region: CaseInsertPresetConcreteRegionId
  bindingKind: 'repeated'
  roles: readonly CaseInsertPresetRoleId[]
}>

type CaseInsertPresetOwnerRule = FixedOwnerRule | RepeatedOwnerRule

const DEFINITION_FIELDS = new Set([
  'kind',
  'formatVersion',
  'id',
  'revision',
  'name',
  'description',
  'surface',
  'compatibility',
  'applicationScopes',
  'slots',
])
const ANY_TEMPLATE_FIELDS = new Set(['mode'])
const SPECIFIC_TEMPLATE_FIELDS = new Set(['mode', 'templateId'])
const REGION_SCOPE_FIELDS = new Set(['kind', 'region'])
const SECTION_SCOPE_FIELDS = new Set(['kind', 'section'])
const COMPLETE_SCOPE_FIELDS = new Set(['kind'])
const SLOT_FIELDS = new Set(['id', 'roleId', 'assignments'])
const ASSIGNMENT_FIELDS = new Set([
  'id',
  'region',
  'coordinateBasis',
  'ownerId',
  'object',
  'contentRegion',
  'actionRegion',
])
const OBJECT_BINDING_FIELDS = new Set(['kind', 'id'])
const NORMALIZED_REGION_FIELDS = new Set([
  'centerXPercent',
  'centerYPercent',
  'widthPercent',
  'heightPercent',
])

const BUILTIN_ID_PATTERN =
  /^builtin:case-preset:[a-z0-9]+(?:-[a-z0-9]+)*$/
const USER_ID_PATTERN =
  /^user:case-preset:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const TEMPLATE_ID_PATTERN = /^[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*$/
const SLOT_ID_PATTERN =
  /^case:preset-slot:[a-z0-9]+(?:-[a-z0-9]+)*$/
const ASSIGNMENT_ID_PATTERN =
  /^case:preset-assignment:[a-z0-9]+(?:-[a-z0-9]+)*$/
const REPEATED_OBJECT_ID_PATTERN =
  /^[a-z][a-z0-9]*(?:(?:-|:)[a-z0-9]+)*$/

const CONCRETE_REGION_ID_SET =
  new Set<string>(CASE_INSERT_PRESET_CONCRETE_REGION_IDS)
const COORDINATE_BASIS_SET =
  new Set<string>(CASE_INSERT_PRESET_COORDINATE_BASES)
const ROLE_ID_SET = new Set<string>(CASE_INSERT_PRESET_ROLE_IDS)
const OWNER_ID_SET = new Set<string>(CASE_INSERT_PRESET_OWNER_IDS)

const ROLE_REGIONS = Object.freeze({
  'game-title': Object.freeze(['front-cover', 'back-panel'] as const),
  'background-artwork': Object.freeze(['front-cover', 'tray-card'] as const),
  'game-info-logos': Object.freeze([
    'front-cover',
    'back-panel',
    'left-spine',
    'right-spine',
  ] as const),
  'company-logos': Object.freeze([
    'front-cover',
    'back-panel',
    'left-spine',
    'right-spine',
  ] as const),
  'legal-info': Object.freeze([
    'front-cover',
    'back-panel',
    'left-spine',
    'right-spine',
  ] as const),
  'additional-artwork': Object.freeze(['front-cover'] as const),
  'additional-text': Object.freeze([
    'front-cover',
    'back-panel',
    'left-spine',
    'right-spine',
  ] as const),
  'game-description-text': Object.freeze(['back-panel'] as const),
  'feature-bullets-callouts': Object.freeze(['back-panel'] as const),
  screenshots: Object.freeze(['back-panel'] as const),
  'system-requirements': Object.freeze(['back-panel'] as const),
  'vertical-game-logo-title': Object.freeze([
    'left-spine',
    'right-spine',
  ] as const),
  'optional-media-format-type': Object.freeze([
    'left-spine',
    'right-spine',
  ] as const),
  'spine-background-artwork': Object.freeze([
    'left-spine',
    'right-spine',
  ] as const),
} satisfies Readonly<Record<
  CaseInsertPresetRoleId,
  readonly CaseInsertPresetConcreteRegionId[]
>>)

const ADDITIONAL_TEXT_OBJECTS = Object.freeze({
  subtitle: 'additional-text',
  'disc-number': 'additional-text',
  'backup-date': 'additional-text',
  'steam-app-id': 'additional-text',
  developer: 'additional-text',
  publisher: 'additional-text',
  'install-notes': 'additional-text',
  'custom-note': 'additional-text',
} as const satisfies Readonly<Record<string, CaseInsertPresetRoleId>>)

function fixedObjects(
  prefix: string,
  objects: Readonly<Record<string, CaseInsertPresetRoleId>>,
): Readonly<Record<string, CaseInsertPresetRoleId>> {
  return Object.freeze(Object.fromEntries(
    Object.entries(objects).map(([id, role]) => [`${prefix}:${id}`, role]),
  ))
}

function fixedOwner(
  region: CaseInsertPresetConcreteRegionId,
  objects: Readonly<Record<string, CaseInsertPresetRoleId>>,
): FixedOwnerRule {
  return Object.freeze({
    region,
    bindingKind: 'fixed',
    objects: Object.freeze({ ...objects }),
  })
}

function repeatedOwner(
  region: CaseInsertPresetConcreteRegionId,
  roles: readonly CaseInsertPresetRoleId[],
): RepeatedOwnerRule {
  return Object.freeze({
    region,
    bindingKind: 'repeated',
    roles: Object.freeze([...roles]),
  })
}

const CASE_INSERT_PRESET_OWNER_RULES = Object.freeze({
  'case.cover.background': fixedOwner('front-cover', {
    'case:cover:background': 'background-artwork',
  }),
  'case.cover.title-artwork': fixedOwner('front-cover', {
    'case:cover:title-artwork': 'game-title',
  }),
  'case.cover.text-blocks': fixedOwner('front-cover', {
    'case:cover:text:title': 'game-title',
    ...fixedObjects('case:cover:text', ADDITIONAL_TEXT_OBJECTS),
    'case:cover:text:copyright': 'legal-info',
  }),
  'case.cover.artwork-slots': repeatedOwner('front-cover', [
    'additional-artwork',
  ]),
  'case.cover.logo-slots': repeatedOwner('front-cover', ['company-logos']),
  'case.cover.mark-slots': repeatedOwner('front-cover', ['game-info-logos']),
  'case.tray.background': fixedOwner('tray-card', {
    'case:tray:background': 'background-artwork',
  }),
  'case.tray.title-artwork': fixedOwner('back-panel', {
    'case:tray:title-artwork': 'game-title',
  }),
  'case.tray.text-blocks': fixedOwner('back-panel', {
    'case:tray:text:title': 'game-title',
    ...fixedObjects('case:tray:text', ADDITIONAL_TEXT_OBJECTS),
    'case:tray:text:description': 'game-description-text',
    'case:tray:text:minimum-requirements': 'system-requirements',
    'case:tray:text:recommended-requirements': 'system-requirements',
    'case:tray:text:copyright': 'legal-info',
  }),
  'case.tray.text-lists': fixedOwner('back-panel', {
    'case:tray:text-list:feature-bullets': 'feature-bullets-callouts',
  }),
  'case.tray.artwork-slots': repeatedOwner('back-panel', ['screenshots']),
  'case.tray.logo-slots': repeatedOwner('back-panel', ['company-logos']),
  'case.tray.mark-slots': repeatedOwner('back-panel', ['game-info-logos']),
  'case.spine.left.background': fixedOwner('left-spine', {
    'case:spine:left:background': 'spine-background-artwork',
  }),
  'case.spine.left.title-artwork': fixedOwner('left-spine', {
    'case:spine:left:title-artwork': 'vertical-game-logo-title',
  }),
  'case.spine.left.title-text': fixedOwner('left-spine', {
    'case:spine:left:text:title': 'vertical-game-logo-title',
  }),
  'case.spine.left.text-blocks': fixedOwner('left-spine', {
    ...fixedObjects('case:spine:left:text', ADDITIONAL_TEXT_OBJECTS),
    'case:spine:left:text:copyright': 'legal-info',
  }),
  'case.spine.left.logo-slots': repeatedOwner('left-spine', [
    'company-logos',
  ]),
  'case.spine.left.mark-slots': repeatedOwner('left-spine', [
    'game-info-logos',
    'optional-media-format-type',
  ]),
  'case.spine.right.background': fixedOwner('right-spine', {
    'case:spine:right:background': 'spine-background-artwork',
  }),
  'case.spine.right.title-artwork': fixedOwner('right-spine', {
    'case:spine:right:title-artwork': 'vertical-game-logo-title',
  }),
  'case.spine.right.title-text': fixedOwner('right-spine', {
    'case:spine:right:text:title': 'vertical-game-logo-title',
  }),
  'case.spine.right.text-blocks': fixedOwner('right-spine', {
    ...fixedObjects('case:spine:right:text', ADDITIONAL_TEXT_OBJECTS),
    'case:spine:right:text:copyright': 'legal-info',
  }),
  'case.spine.right.logo-slots': repeatedOwner('right-spine', [
    'company-logos',
  ]),
  'case.spine.right.mark-slots': repeatedOwner('right-spine', [
    'game-info-logos',
    'optional-media-format-type',
  ]),
} satisfies Readonly<Record<CaseInsertPresetOwnerId, CaseInsertPresetOwnerRule>>)

export const CASE_INSERT_PRESET_FIXED_OBJECT_IDS_BY_OWNER = Object.freeze(
  Object.fromEntries(
    Object.entries(CASE_INSERT_PRESET_OWNER_RULES)
      .filter(([, rule]) => rule.bindingKind === 'fixed')
      .map(([ownerId, rule]) => [
        ownerId,
        Object.freeze(Object.keys((rule as FixedOwnerRule).objects).sort()),
      ]),
  ) as Readonly<Partial<Record<
    CaseInsertPresetOwnerId,
    readonly string[]
  >>>,
)

function failure(
  code: CaseInsertPresetDefinitionParseErrorCode,
  path: string,
): CaseInsertPresetDefinitionParseResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ code, path }),
  })
}

function scopeFailure(path: string): CaseInsertPresetApplicationScopeParseResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ code: 'invalid-scope', path }),
  })
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyFields(value: UnknownRecord, fields: ReadonlySet<string>) {
  return Object.keys(value).every((field) => fields.has(field))
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0
}

function isFiniteInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
}

export function isCaseInsertPresetId(value: unknown): value is CaseInsertPresetId {
  return typeof value === 'string' &&
    (BUILTIN_ID_PATTERN.test(value) || USER_ID_PATTERN.test(value))
}

export function isBuiltInCaseInsertPresetId(
  value: unknown,
): value is `builtin:case-preset:${string}` {
  return typeof value === 'string' && BUILTIN_ID_PATTERN.test(value)
}

export function isUserCaseInsertPresetId(
  value: unknown,
): value is `user:case-preset:${string}` {
  return typeof value === 'string' && USER_ID_PATTERN.test(value)
}

export function isCaseInsertPresetConcreteRegionId(
  value: unknown,
): value is CaseInsertPresetConcreteRegionId {
  return typeof value === 'string' && CONCRETE_REGION_ID_SET.has(value)
}

export function isCaseInsertPresetCoordinateBasis(
  value: unknown,
): value is CaseInsertPresetCoordinateBasis {
  return typeof value === 'string' && COORDINATE_BASIS_SET.has(value)
}

export function isCaseInsertPresetCoordinateBasisAllowed(
  region: CaseInsertPresetConcreteRegionId,
  coordinateBasis: CaseInsertPresetCoordinateBasis,
) {
  return CASE_INSERT_PRESET_COORDINATE_BASES_BY_REGION[region]
    .includes(coordinateBasis as never)
}

function parseNormalizedRegion(
  value: unknown,
): CaseInsertPresetNormalizedRegion | null {
  if (!isRecord(value) || !hasOnlyFields(value, NORMALIZED_REGION_FIELDS)) {
    return null
  }
  if (
    !isFiniteInRange(value.centerXPercent, 0, 100) ||
    !isFiniteInRange(value.centerYPercent, 0, 100) ||
    !isFiniteInRange(value.widthPercent, Number.EPSILON, 100) ||
    !isFiniteInRange(value.heightPercent, Number.EPSILON, 100)
  ) {
    return null
  }

  return Object.freeze({
    centerXPercent: value.centerXPercent,
    centerYPercent: value.centerYPercent,
    widthPercent: value.widthPercent,
    heightPercent: value.heightPercent,
  })
}

function parseCompatibility(
  value: unknown,
): CaseInsertPresetTemplateCompatibility | null {
  if (!isRecord(value)) return null

  if (value.mode === 'any-case-template') {
    return hasOnlyFields(value, ANY_TEMPLATE_FIELDS)
      ? Object.freeze({ mode: value.mode })
      : null
  }

  if (value.mode !== 'specific-template' ||
      !hasOnlyFields(value, SPECIFIC_TEMPLATE_FIELDS) ||
      typeof value.templateId !== 'string') {
    return null
  }
  const templateId = value.templateId.trim()
  if (!templateId ||
      templateId.length > CASE_INSERT_PRESET_MAX_TEMPLATE_ID_LENGTH ||
      !TEMPLATE_ID_PATTERN.test(templateId)) {
    return null
  }

  return Object.freeze({ mode: value.mode, templateId })
}

export function parseCaseInsertPresetApplicationScope(
  value: unknown,
  path = '$',
): CaseInsertPresetApplicationScopeParseResult {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    return scopeFailure(path)
  }

  if (value.kind === 'region') {
    if (!hasOnlyFields(value, REGION_SCOPE_FIELDS) ||
        !isCaseInsertPresetConcreteRegionId(value.region)) {
      return scopeFailure(path)
    }
    return Object.freeze({
      ok: true,
      value: Object.freeze({ kind: value.kind, region: value.region }),
    })
  }

  if (value.kind === 'section') {
    if (!hasOnlyFields(value, SECTION_SCOPE_FIELDS) ||
        !['front', 'back', 'spine'].includes(String(value.section))) {
      return scopeFailure(path)
    }
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        kind: value.kind,
        section: value.section as 'front' | 'back' | 'spine',
      }),
    })
  }

  if (value.kind === 'complete' && hasOnlyFields(value, COMPLETE_SCOPE_FIELDS)) {
    return Object.freeze({
      ok: true,
      value: Object.freeze({ kind: value.kind }),
    })
  }

  return scopeFailure(path)
}

export function getCaseInsertPresetApplicationScopeKey(
  scope: CaseInsertPresetApplicationScope,
) {
  switch (scope.kind) {
    case 'region':
      return `region:${scope.region}` as const
    case 'section':
      return `section:${scope.section}` as const
    case 'complete':
      return 'complete' as const
  }
}

function isScopeSupportedByRegions(
  scope: CaseInsertPresetApplicationScope,
  regions: ReadonlySet<CaseInsertPresetConcreteRegionId>,
) {
  if (scope.kind === 'complete') return regions.size > 0
  if (scope.kind === 'region') return regions.has(scope.region)
  if (scope.section === 'front') return regions.has('front-cover')
  if (scope.section === 'back') {
    return regions.has('tray-card') || regions.has('back-panel')
  }
  return regions.has('left-spine') || regions.has('right-spine')
}

function getScopeOrder(scope: CaseInsertPresetApplicationScope) {
  const key = getCaseInsertPresetApplicationScopeKey(scope)
  const orderedKeys = [
    ...CASE_INSERT_PRESET_CONCRETE_REGION_IDS.map((region) => `region:${region}`),
    'section:front',
    'section:back',
    'section:spine',
    'complete',
  ]
  return orderedKeys.indexOf(key)
}

function parseObjectBinding(
  value: unknown,
): CaseInsertPresetObjectBinding | null {
  if (!isRecord(value) || !hasOnlyFields(value, OBJECT_BINDING_FIELDS) ||
      (value.kind !== 'fixed' && value.kind !== 'repeated') ||
      typeof value.id !== 'string' || value.id.length === 0 ||
      value.id.length > CASE_INSERT_PRESET_MAX_OBJECT_ID_LENGTH ||
      value.id.trim() !== value.id) {
    return null
  }

  return Object.freeze({ kind: value.kind, id: value.id })
}

function parseAssignment(
  value: unknown,
  path: string,
  roleId: CaseInsertPresetRoleId,
): CaseInsertPresetDefinitionParseResult |
  CaseInsertPresetAssignmentDefinitionV1 {
  if (!isRecord(value) || !hasOnlyFields(value, ASSIGNMENT_FIELDS)) {
    return failure(isRecord(value) ? 'unexpected-field' : 'invalid-assignment', path)
  }
  if (typeof value.id !== 'string' || !ASSIGNMENT_ID_PATTERN.test(value.id)) {
    return failure('invalid-assignment', `${path}.id`)
  }
  if (!isCaseInsertPresetConcreteRegionId(value.region)) {
    return failure('invalid-region', `${path}.region`)
  }
  if (!isCaseInsertPresetCoordinateBasis(value.coordinateBasis)) {
    return failure('invalid-coordinate-basis', `${path}.coordinateBasis`)
  }
  if (!isCaseInsertPresetCoordinateBasisAllowed(value.region, value.coordinateBasis)) {
    return failure(
      'region-coordinate-basis-mismatch',
      `${path}.coordinateBasis`,
    )
  }
  if (!ROLE_REGIONS[roleId].includes(value.region as never)) {
    return failure('role-region-mismatch', `${path}.region`)
  }
  if (typeof value.ownerId !== 'string' || !OWNER_ID_SET.has(value.ownerId)) {
    return failure('unsupported-owner', `${path}.ownerId`)
  }
  const ownerId = value.ownerId as CaseInsertPresetOwnerId
  const ownerRule = CASE_INSERT_PRESET_OWNER_RULES[ownerId]
  if (ownerRule.region !== value.region) {
    return failure('owner-region-mismatch', `${path}.ownerId`)
  }

  const object = parseObjectBinding(value.object)
  if (!object || object.kind !== ownerRule.bindingKind) {
    return failure('invalid-object-binding', `${path}.object`)
  }

  if (ownerRule.bindingKind === 'fixed') {
    if (ownerRule.objects[object.id] !== roleId) {
      return failure(
        Object.hasOwn(ownerRule.objects, object.id)
          ? 'owner-role-mismatch'
          : 'invalid-object-binding',
        `${path}.object.id`,
      )
    }
  } else {
    if (!REPEATED_OBJECT_ID_PATTERN.test(object.id)) {
      return failure('invalid-object-binding', `${path}.object.id`)
    }
    if (!ownerRule.roles.includes(roleId)) {
      return failure('owner-role-mismatch', `${path}.ownerId`)
    }
  }

  const contentRegion = parseNormalizedRegion(value.contentRegion)
  if (!contentRegion) {
    return failure('invalid-region', `${path}.contentRegion`)
  }
  const actionRegion = value.actionRegion === undefined
    ? undefined
    : parseNormalizedRegion(value.actionRegion)
  if (value.actionRegion !== undefined && !actionRegion) {
    return failure('invalid-region', `${path}.actionRegion`)
  }

  return Object.freeze({
    id: value.id as `case:preset-assignment:${string}`,
    region: value.region,
    coordinateBasis: value.coordinateBasis,
    ownerId,
    object,
    contentRegion,
    ...(actionRegion ? { actionRegion } : {}),
  })
}

function parseSlot(
  value: unknown,
  index: number,
): CaseInsertPresetDefinitionParseResult | CaseInsertPresetSlotDefinitionV1 {
  const path = `slots[${index}]`
  if (!isRecord(value) || !hasOnlyFields(value, SLOT_FIELDS)) {
    return failure(isRecord(value) ? 'unexpected-field' : 'invalid-slot', path)
  }
  if (typeof value.id !== 'string' || !SLOT_ID_PATTERN.test(value.id)) {
    return failure('invalid-slot', `${path}.id`)
  }
  if (typeof value.roleId !== 'string' || !ROLE_ID_SET.has(value.roleId)) {
    return failure('unsupported-role', `${path}.roleId`)
  }
  if (!Array.isArray(value.assignments) || value.assignments.length === 0) {
    return failure('invalid-assignment', `${path}.assignments`)
  }
  if (value.assignments.length > CASE_INSERT_PRESET_MAX_ASSIGNMENTS) {
    return failure('too-many-assignments', `${path}.assignments`)
  }

  const roleId = value.roleId as CaseInsertPresetRoleId
  const assignments: CaseInsertPresetAssignmentDefinitionV1[] = []
  const assignmentIds = new Set<string>()
  const bindings = new Set<string>()

  for (let index = 0; index < value.assignments.length; index += 1) {
    const assignment = parseAssignment(
      value.assignments[index],
      `${path}.assignments[${index}]`,
      roleId,
    )
    if ('ok' in assignment) return assignment
    if (assignmentIds.has(assignment.id)) {
      return failure('duplicate-assignment', `${path}.assignments[${index}].id`)
    }
    const bindingKey = `${assignment.ownerId}\u0000${assignment.object.id}`
    if (bindings.has(bindingKey)) {
      return failure(
        'duplicate-owner-object-binding',
        `${path}.assignments[${index}].object.id`,
      )
    }
    assignmentIds.add(assignment.id)
    bindings.add(bindingKey)
    assignments.push(assignment)
  }

  assignments.sort((left, right) => left.id.localeCompare(right.id))
  return Object.freeze({
    id: value.id as `case:preset-slot:${string}`,
    roleId,
    assignments: Object.freeze(assignments),
  })
}

export function parseCaseInsertPresetDefinition(
  value: unknown,
): CaseInsertPresetDefinitionParseResult {
  if (!isRecord(value)) return failure('invalid-root', '$')
  if (!hasOnlyFields(value, DEFINITION_FIELDS)) {
    return failure('unexpected-field', '$')
  }
  if (value.kind !== CASE_INSERT_PRESET_DEFINITION_KIND) {
    return failure('unsupported-kind', 'kind')
  }
  if (value.formatVersion !== CASE_INSERT_PRESET_FORMAT_VERSION) {
    return failure('unsupported-format-version', 'formatVersion')
  }
  if (!isCaseInsertPresetId(value.id)) return failure('invalid-id', 'id')
  if (!isPositiveSafeInteger(value.revision)) {
    return failure('invalid-revision', 'revision')
  }
  if (typeof value.name !== 'string') return failure('invalid-name', 'name')
  const name = value.name.trim()
  if (!name || name.length > CASE_INSERT_PRESET_MAX_NAME_LENGTH) {
    return failure('invalid-name', 'name')
  }
  if (value.description !== undefined && typeof value.description !== 'string') {
    return failure('invalid-description', 'description')
  }
  const description = typeof value.description === 'string'
    ? value.description.trim()
    : undefined
  if (description &&
      description.length > CASE_INSERT_PRESET_MAX_DESCRIPTION_LENGTH) {
    return failure('invalid-description', 'description')
  }
  if (value.surface !== 'case-insert') {
    return failure('invalid-surface', 'surface')
  }
  const compatibility = parseCompatibility(value.compatibility)
  if (!compatibility) return failure('invalid-compatibility', 'compatibility')
  if (!Array.isArray(value.applicationScopes) ||
      value.applicationScopes.length === 0) {
    return failure('invalid-scope', 'applicationScopes')
  }
  if (!Array.isArray(value.slots) || value.slots.length === 0) {
    return failure('invalid-slot', 'slots')
  }
  if (value.slots.length > CASE_INSERT_PRESET_MAX_SLOTS) {
    return failure('too-many-slots', 'slots')
  }

  const slots: CaseInsertPresetSlotDefinitionV1[] = []
  const slotIds = new Set<string>()
  const assignmentIds = new Set<string>()
  const bindingKeys = new Set<string>()
  const regions = new Set<CaseInsertPresetConcreteRegionId>()

  for (let index = 0; index < value.slots.length; index += 1) {
    const slot = parseSlot(value.slots[index], index)
    if ('ok' in slot) return slot
    if (slotIds.has(slot.id)) return failure('duplicate-slot', `slots[${index}].id`)
    slotIds.add(slot.id)

    for (const assignment of slot.assignments) {
      if (assignmentIds.has(assignment.id)) {
        return failure('duplicate-assignment', `slots[${index}].assignments`)
      }
      const bindingKey = `${assignment.ownerId}\u0000${assignment.object.id}`
      if (bindingKeys.has(bindingKey)) {
        return failure(
          'duplicate-owner-object-binding',
          `slots[${index}].assignments`,
        )
      }
      assignmentIds.add(assignment.id)
      bindingKeys.add(bindingKey)
      regions.add(assignment.region)
    }

    slots.push(slot)
  }

  const applicationScopes: CaseInsertPresetApplicationScope[] = []
  const scopeKeys = new Set<string>()
  for (let index = 0; index < value.applicationScopes.length; index += 1) {
    const scope = parseCaseInsertPresetApplicationScope(
      value.applicationScopes[index],
      `applicationScopes[${index}]`,
    )
    if (!scope.ok) return failure('invalid-scope', scope.error.path)
    const key = getCaseInsertPresetApplicationScopeKey(scope.value)
    if (scopeKeys.has(key)) {
      return failure('duplicate-scope', `applicationScopes[${index}]`)
    }
    if (!isScopeSupportedByRegions(scope.value, regions)) {
      return failure('unsupported-scope', `applicationScopes[${index}]`)
    }
    scopeKeys.add(key)
    applicationScopes.push(scope.value)
  }

  slots.sort((left, right) => left.id.localeCompare(right.id))
  applicationScopes.sort((left, right) => getScopeOrder(left) - getScopeOrder(right))

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      kind: CASE_INSERT_PRESET_DEFINITION_KIND,
      formatVersion: CASE_INSERT_PRESET_FORMAT_VERSION,
      id: value.id,
      revision: value.revision,
      name,
      ...(description ? { description } : {}),
      surface: 'case-insert',
      compatibility,
      applicationScopes: Object.freeze(applicationScopes),
      slots: Object.freeze(slots),
    }),
  })
}
