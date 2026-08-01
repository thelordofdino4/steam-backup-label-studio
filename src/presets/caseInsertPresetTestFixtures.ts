import {
  CASE_INSERT_PRESET_DEFINITION_KIND,
  CASE_INSERT_PRESET_FORMAT_VERSION,
  type CaseInsertPresetConcreteRegionId,
  type CaseInsertPresetCoordinateBasis,
  type CaseInsertPresetOwnerId,
  type CaseInsertPresetRoleId,
} from './caseInsertPresetDefinition.ts'

type MutableRecord = Record<string, unknown>

const DEFAULT_REGIONS = {
  'front-cover': {
    roleId: 'background-artwork',
    ownerId: 'case.cover.background',
    object: { kind: 'fixed', id: 'case:cover:background' },
  },
  'tray-card': {
    roleId: 'background-artwork',
    ownerId: 'case.tray.background',
    object: { kind: 'fixed', id: 'case:tray:background' },
  },
  'back-panel': {
    roleId: 'game-description-text',
    ownerId: 'case.tray.text-blocks',
    object: { kind: 'fixed', id: 'case:tray:text:description' },
  },
  'left-spine': {
    roleId: 'spine-background-artwork',
    ownerId: 'case.spine.left.background',
    object: { kind: 'fixed', id: 'case:spine:left:background' },
  },
  'right-spine': {
    roleId: 'spine-background-artwork',
    ownerId: 'case.spine.right.background',
    object: { kind: 'fixed', id: 'case:spine:right:background' },
  },
} as const satisfies Readonly<Record<
  CaseInsertPresetConcreteRegionId,
  Readonly<{
    roleId: CaseInsertPresetRoleId
    ownerId: CaseInsertPresetOwnerId
    object: Readonly<{ kind: 'fixed'; id: string }>
  }>
>>

export function createCaseInsertPresetAssignment(
  region: CaseInsertPresetConcreteRegionId,
  coordinateBasis: CaseInsertPresetCoordinateBasis,
  suffix = region,
): MutableRecord {
  const defaults = DEFAULT_REGIONS[region]
  return {
    id: `case:preset-assignment:${suffix}`,
    region,
    coordinateBasis,
    ownerId: defaults.ownerId,
    object: { ...defaults.object },
    contentRegion: {
      centerXPercent: 50,
      centerYPercent: 50,
      widthPercent: 80,
      heightPercent: 80,
    },
  }
}

export function createMinimalCaseInsertPresetDefinition(): MutableRecord {
  return {
    kind: CASE_INSERT_PRESET_DEFINITION_KIND,
    formatVersion: CASE_INSERT_PRESET_FORMAT_VERSION,
    id: 'builtin:case-preset:minimal-cover',
    revision: 1,
    name: 'Minimal Cover',
    description: 'A pure definition fixture.',
    surface: 'case-insert',
    compatibility: { mode: 'any-case-template' },
    applicationScopes: [{ kind: 'region', region: 'front-cover' }],
    slots: [{
      id: 'case:preset-slot:cover-background',
      roleId: 'background-artwork',
      assignments: [createCaseInsertPresetAssignment(
        'front-cover',
        'frontSafe',
      )],
    }],
  }
}

export function createCoordinatedCaseInsertPresetDefinition(): MutableRecord {
  const definitions = [
    ['right-spine', 'rightSpineSafe'],
    ['back-panel', 'backPanelSafe'],
    ['front-cover', 'frontSafe'],
    ['tray-card', 'back'],
    ['left-spine', 'leftSpineSafe'],
  ] as const

  return {
    kind: CASE_INSERT_PRESET_DEFINITION_KIND,
    formatVersion: CASE_INSERT_PRESET_FORMAT_VERSION,
    id: 'builtin:case-preset:coordinated-five-region',
    revision: 3,
    name: 'Coordinated Five Region',
    surface: 'case-insert',
    compatibility: {
      mode: 'specific-template',
      templateId: 'jewelCase',
    },
    applicationScopes: [
      { kind: 'complete' },
      { kind: 'section', section: 'spine' },
      { kind: 'section', section: 'back' },
      { kind: 'section', section: 'front' },
      { kind: 'region', region: 'right-spine' },
      { kind: 'region', region: 'left-spine' },
      { kind: 'region', region: 'back-panel' },
      { kind: 'region', region: 'tray-card' },
      { kind: 'region', region: 'front-cover' },
    ],
    slots: definitions.map(([region, basis]) => ({
      id: `case:preset-slot:${region}`,
      roleId: DEFAULT_REGIONS[region].roleId,
      assignments: [createCaseInsertPresetAssignment(region, basis)],
    })),
  }
}

export function cloneFixture<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
