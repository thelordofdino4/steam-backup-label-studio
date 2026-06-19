export const PROJECT_PARITY_PHASES = [
  'runtime',
  'saved',
  'restored',
  'export',
] as const

export type ProjectParityPhase = typeof PROJECT_PARITY_PHASES[number]

export type ProjectParityValues = Partial<Record<ProjectParityPhase, unknown>>

export type ProjectParityNormalizer = (value: unknown) => unknown

export type ProjectParityField = {
  path: string
  values: ProjectParityValues
  normalize?: ProjectParityNormalizer
  phases?: readonly ProjectParityPhase[]
}

export type ProjectParityFixture = {
  label: string
  fields: readonly ProjectParityField[]
  phases?: readonly ProjectParityPhase[]
}

const LAYOUT_FIELDS = [
  'enabled',
  'scale',
  'x',
  'y',
  'width',
  'rotation',
  'offsetX',
  'offsetY',
  'align',
  'mode',
  'arcDegrees',
  'arcSide',
  'avoidVisualElements',
] as const

const SOURCE_FIELDS = [
  'source',
  'sourceId',
  'sourceLabel',
  'sourceUrl',
] as const

const IMAGE_ASSET_FIELDS = [
  'id',
  'label',
  'enabled',
  'imageDataUrl',
  'imageSource',
  'imageSize',
  'defaultSteamLogo',
  'source',
  'sourceId',
  'sourceLabel',
  'fit',
  'layout',
  'frame',
] as const

const STYLE_FIELDS = [
  'fontFamily',
  'color',
  'bold',
  'italic',
  'underline',
  'contrast',
  'backgroundEnabled',
  'backgroundColor',
  'backgroundOpacity',
  'backgroundPadding',
  'borderEnabled',
  'borderColor',
  'borderRadius',
] as const

const TEXT_FIELDS = [
  'id',
  'label',
  'enabled',
  'value',
  'items',
  'contentMode',
  'htmlSource',
  'markdownSource',
  'source',
  'avoidVisualElements',
  'align',
  'layout',
  'style',
] as const

function hasPhase(values: ProjectParityValues, phase: ProjectParityPhase) {
  return Object.prototype.hasOwnProperty.call(values, phase)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function formatValue(value: unknown) {
  return JSON.stringify(value, null, 2) ?? String(value)
}

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertNoMissingPhases(
  missingPhases: readonly ProjectParityPhase[],
  message: string,
) {
  if (missingPhases.length > 0) {
    throw new Error(
      `${message}: ${missingPhases.join(', ')}`,
    )
  }
}

function assertNormalizedEqual(
  actual: unknown,
  expected: unknown,
  message: string,
) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}\nExpected:\n${formatValue(expected)}\nActual:\n${formatValue(actual)}`,
    )
  }
}

function pickFields(
  value: unknown,
  fields: readonly string[],
): Record<string, unknown> | unknown {
  if (!isRecord(value)) {
    return value
  }

  return fields.reduce<Record<string, unknown>>((result, field) => {
    if (Object.prototype.hasOwnProperty.call(value, field)) {
      result[field] = value[field]
    }

    return result
  }, {})
}

export function normalizeProjectParityValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeProjectParityValue)
  }

  if (isRecord(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const entry = value[key]

        if (entry !== undefined) {
          result[key] = normalizeProjectParityValue(entry)
        }

        return result
      }, {})
  }

  return value
}

export function normalizeProjectParityLayout(value: unknown): unknown {
  return normalizeProjectParityValue(pickFields(value, LAYOUT_FIELDS))
}

export function normalizeProjectParitySource(value: unknown): unknown {
  return normalizeProjectParityValue(pickFields(value, SOURCE_FIELDS))
}

export function normalizeProjectParityImageAsset(value: unknown): unknown {
  return normalizeProjectParityValue(pickFields(value, IMAGE_ASSET_FIELDS))
}

export function normalizeProjectParityText(value: unknown): unknown {
  return normalizeProjectParityValue(pickFields(value, TEXT_FIELDS))
}

export function normalizeProjectParityStyle(value: unknown): unknown {
  return normalizeProjectParityValue(pickFields(value, STYLE_FIELDS))
}

export function normalizeProjectParityExportState(value: unknown): unknown {
  return normalizeProjectParityValue(value)
}

export function assertProjectParityFixture(fixture: ProjectParityFixture) {
  assertCondition(
    fixture.fields.length > 0,
    `Project parity fixture "${fixture.label}" must include at least one field.`,
  )

  fixture.fields.forEach((field) => {
    const phases = field.phases ?? fixture.phases ?? PROJECT_PARITY_PHASES
    const missingPhases = phases.filter((phase) => !hasPhase(field.values, phase))

    assertNoMissingPhases(
      missingPhases,
      `Project parity field "${fixture.label}.${field.path}" is missing phase(s)`,
    )

    assertCondition(
      phases.length >= 2,
      `Project parity field "${fixture.label}.${field.path}" must compare at least two phases.`,
    )

    const baselinePhase = phases[0]
    const normalize = field.normalize ?? normalizeProjectParityValue
    const expected = normalize(field.values[baselinePhase])

    phases.slice(1).forEach((phase) => {
      const actual = normalize(field.values[phase])

      assertNormalizedEqual(
        actual,
        expected,
        `Project parity drift in "${fixture.label}.${field.path}": ${
          phase
        } differs from ${baselinePhase}.`,
      )
    })
  })
}

export function assertProjectParityFixtures(
  fixtures: readonly ProjectParityFixture[],
) {
  assertCondition(
    fixtures.length > 0,
    'Project parity harness requires at least one fixture.',
  )

  fixtures.forEach(assertProjectParityFixture)
}
