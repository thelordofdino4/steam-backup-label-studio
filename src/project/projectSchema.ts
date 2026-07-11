import type { SavedProject } from './projectTypes'
import {
  DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
  UNAVAILABLE_CASE_INSERT_TEMPLATE_TYPES,
  type CaseInsertTemplateType,
  type EditorProjectType,
} from '../editor/editorTypes.ts'

export const PREVIOUS_PROJECT_SCHEMA_VERSION = '0.1.0' as const
export const CURRENT_PROJECT_SCHEMA_VERSION = '0.2.0' as const

export type CurrentProjectSchemaVersion = typeof CURRENT_PROJECT_SCHEMA_VERSION

export const SUPPORTED_PROJECT_SCHEMA_VERSIONS = [
  CURRENT_PROJECT_SCHEMA_VERSION,
] as const

type JsonRecord = Record<string, unknown>

export type ProjectSchemaMigration = {
  from: string
  to: string
  migrate: (project: JsonRecord) => unknown
}

const PROJECT_SCHEMA_MIGRATIONS: readonly ProjectSchemaMigration[] = [
  {
    from: PREVIOUS_PROJECT_SCHEMA_VERSION,
    to: CURRENT_PROJECT_SCHEMA_VERSION,
    migrate: (project) => ({
      ...project,
      schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    }),
  },
]

const CASE_INSERT_TEMPLATE_TYPES: readonly CaseInsertTemplateType[] = [
  DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
  ...UNAVAILABLE_CASE_INSERT_TEMPLATE_TYPES,
]

export class ProjectSchemaError extends Error {
  readonly issues: readonly string[]

  constructor(message: string, issues: readonly string[] = [message]) {
    super(message)
    this.name = 'ProjectSchemaError'
    this.issues = issues
  }
}

export function parseSavedProjectContents(contents: string): SavedProject {
  const project = migrateProjectSchemaRecord(parseProjectJsonRecord(contents))

  validateSavedProjectSchema(project)

  return project as SavedProject
}

export function validateSavedProjectSchema(
  project: unknown,
): asserts project is SavedProject {
  const issues = getSavedProjectSchemaIssues(project)

  if (issues.length > 0) {
    throw new ProjectSchemaError(
      `Project file failed schema validation: ${issues[0]}`,
      issues,
    )
  }
}

export function parseProjectJsonRecord(contents: string): JsonRecord {
  let parsed: unknown

  try {
    parsed = JSON.parse(contents) as unknown
  } catch (error) {
    throw new ProjectSchemaError(
      `Project file is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const record = asRecord(parsed)

  if (!record) {
    throw new ProjectSchemaError('Project file root must be a JSON object.')
  }

  return record
}

export function getSavedProjectSchemaIssues(project: unknown): string[] {
  const record = asRecord(project)

  if (!record) {
    return ['Project file root must be a JSON object.']
  }

  const issues: string[] = []

  validateStringField(record, 'schemaVersion', 'schemaVersion', issues)
  validateOptionalEditorProjectTypeField(
    record,
    'projectType',
    'projectType',
    issues,
  )

  const editorRecord = validateOptionalEditorRecord(record, issues)

  if (
    typeof record.schemaVersion === 'string' &&
    !isSupportedProjectSchemaVersion(record.schemaVersion)
  ) {
    issues.push(
      `schemaVersion must be ${CURRENT_PROJECT_SCHEMA_VERSION}; received ${record.schemaVersion}.`,
    )
  }

  validateStringField(record, 'title', 'title', issues)
  validateStringField(record, 'savedAt', 'savedAt', issues)
  validateGameRecord(record.game, issues)

  const templateRecord = asRecord(record.template)

  if (!templateRecord) {
    issues.push('template must be an object.')
    return issues
  }

  const projectType = resolveSchemaProjectType(record, templateRecord, editorRecord)

  if (!projectType) {
    issues.push(
      'projectType/template.type must identify a supported disc or case insert project.',
    )
    return issues
  }

  if (projectType === 'disc') {
    validateDiscProjectRecord(record, templateRecord, issues)
  } else {
    validateCaseInsertProjectRecord(record, templateRecord, issues)
  }

  return issues
}

export function migrateProjectSchemaRecord(
  project: JsonRecord,
  migrations: readonly ProjectSchemaMigration[] = PROJECT_SCHEMA_MIGRATIONS,
): JsonRecord {
  let migratedProject = project
  let schemaVersion = readSchemaVersion(migratedProject)
  const visitedVersions = new Set<string>()

  while (schemaVersion !== CURRENT_PROJECT_SCHEMA_VERSION) {
    if (visitedVersions.has(schemaVersion)) {
      throw new ProjectSchemaError(
        `Project schema migration loop detected at version ${schemaVersion}.`,
      )
    }

    visitedVersions.add(schemaVersion)

    const migration = migrations.find(({ from }) => from === schemaVersion)

    if (!migration) {
      throw new ProjectSchemaError(
        `Unsupported project schema version ${schemaVersion}. Supported versions: ${getAcceptedProjectSchemaVersions(migrations).join(', ')}.`,
      )
    }

    const migrationResult = asRecord(migration.migrate(migratedProject))

    if (!migrationResult) {
      throw new ProjectSchemaError(
        `Project schema migration ${migration.from} -> ${migration.to} did not return a project object.`,
      )
    }

    const migratedVersion = readSchemaVersion(migrationResult)

    if (migratedVersion !== migration.to) {
      throw new ProjectSchemaError(
        `Project schema migration ${migration.from} -> ${migration.to} produced schemaVersion ${migratedVersion}.`,
      )
    }

    migratedProject = migrationResult
    schemaVersion = migratedVersion
  }

  return migratedProject
}

export function getAcceptedProjectSchemaVersions(
  migrations: readonly ProjectSchemaMigration[] = PROJECT_SCHEMA_MIGRATIONS,
): string[] {
  const versions = new Set<string>([CURRENT_PROJECT_SCHEMA_VERSION])

  for (const migration of migrations) {
    versions.add(migration.from)
  }

  return [...versions]
}

function readSchemaVersion(project: JsonRecord) {
  const schemaVersion = project.schemaVersion

  if (typeof schemaVersion !== 'string' || !schemaVersion.trim()) {
    throw new ProjectSchemaError(
      `Project file is missing schemaVersion ${CURRENT_PROJECT_SCHEMA_VERSION}.`,
    )
  }

  return schemaVersion
}

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null
}

function isSupportedProjectSchemaVersion(
  value: string,
): value is CurrentProjectSchemaVersion {
  return SUPPORTED_PROJECT_SCHEMA_VERSIONS.includes(
    value as CurrentProjectSchemaVersion,
  )
}

function validateStringField(
  record: JsonRecord,
  key: string,
  path: string,
  issues: string[],
) {
  if (typeof record[key] !== 'string') {
    issues.push(`${path} must be a string.`)
  }
}

function validateGameRecord(game: unknown, issues: string[]) {
  const gameRecord = asRecord(game)

  if (!gameRecord) {
    issues.push('game must be an object.')
    return
  }

  validateStringField(gameRecord, 'manualTitle', 'game.manualTitle', issues)

  if (!Object.hasOwn(gameRecord, 'selectedSteamGame')) {
    issues.push('game.selectedSteamGame must be present.')
    return
  }

  if (
    gameRecord.selectedSteamGame !== null &&
    !asRecord(gameRecord.selectedSteamGame)
  ) {
    issues.push('game.selectedSteamGame must be an object or null.')
    return
  }

  const selectedSteamGameRecord = asRecord(gameRecord.selectedSteamGame)

  if (selectedSteamGameRecord) {
    validateFiniteNumberField(
      selectedSteamGameRecord,
      'appId',
      'game.selectedSteamGame.appId',
      issues,
    )
    validateStringField(
      selectedSteamGameRecord,
      'title',
      'game.selectedSteamGame.title',
      issues,
    )
  }
}

function normalizeEditorProjectType(value: unknown): EditorProjectType | null {
  return value === 'disc' || value === 'caseInsert' ? value : null
}

function isCaseInsertTemplateType(value: unknown): value is CaseInsertTemplateType {
  return (
    typeof value === 'string' &&
    CASE_INSERT_TEMPLATE_TYPES.includes(value as CaseInsertTemplateType)
  )
}

function resolveSchemaProjectType(
  record: JsonRecord,
  templateRecord: JsonRecord,
  editorRecord: JsonRecord | null,
): EditorProjectType | null {
  const templateType = templateRecord.type

  return (
    normalizeEditorProjectType(record.projectType) ??
    normalizeEditorProjectType(editorRecord?.projectType) ??
    normalizeEditorProjectType(editorRecord?.workspace) ??
    normalizeEditorProjectType(templateType) ??
    (isCaseInsertTemplateType(templateType) ? 'caseInsert' : null)
  )
}

function validateOptionalEditorRecord(
  record: JsonRecord,
  issues: string[],
): JsonRecord | null {
  if (record.editor === undefined) {
    return null
  }

  const editorRecord = asRecord(record.editor)

  if (!editorRecord) {
    return null
  }

  validateOptionalEditorProjectTypeField(
    editorRecord,
    'projectType',
    'editor.projectType',
    issues,
  )
  validateOptionalEditorProjectTypeField(
    editorRecord,
    'workspace',
    'editor.workspace',
    issues,
  )

  return editorRecord
}

function validateOptionalEditorProjectTypeField(
  record: JsonRecord,
  key: string,
  path: string,
  issues: string[],
) {
  if (record[key] === undefined) {
    return
  }

  if (!normalizeEditorProjectType(record[key])) {
    issues.push(`${path} must be "disc" or "caseInsert" when present.`)
  }
}

function validateDiscProjectRecord(
  record: JsonRecord,
  templateRecord: JsonRecord,
  issues: string[],
) {
  if (templateRecord.type !== 'disc') {
    issues.push('disc projects must use template.type "disc".')
  }

  validateStringField(templateRecord, 'variant', 'template.variant', issues)

  if (
    templateRecord.customDimensions !== undefined &&
    templateRecord.customDimensions !== null &&
    !asRecord(templateRecord.customDimensions)
  ) {
    issues.push('template.customDimensions must be an object or null.')
  }

  const steamBackupLogoRecord = asRecord(record.steamBackupLogo)

  if (!steamBackupLogoRecord) {
    issues.push('steamBackupLogo must be an object for disc projects.')
  } else {
    validateStringField(
      steamBackupLogoRecord,
      'placement',
      'steamBackupLogo.placement',
      issues,
    )
  }

  const backgroundRecord = asRecord(record.background)

  if (!backgroundRecord) {
    issues.push('background must be an object for disc projects.')
    return
  }

  validateFiniteNumberField(backgroundRecord, 'scale', 'background.scale', issues)

  const offsetRecord = asRecord(backgroundRecord.offset)

  if (!offsetRecord) {
    issues.push('background.offset must be an object.')
  } else {
    validateFiniteNumberField(offsetRecord, 'x', 'background.offset.x', issues)
    validateFiniteNumberField(offsetRecord, 'y', 'background.offset.y', issues)
  }

  if (
    backgroundRecord.imageDataUrl !== null &&
    typeof backgroundRecord.imageDataUrl !== 'string'
  ) {
    issues.push('background.imageDataUrl must be a string or null.')
  }
}

function validateCaseInsertProjectRecord(
  record: JsonRecord,
  templateRecord: JsonRecord,
  issues: string[],
) {
  const templateType = templateRecord.type

  if (
    templateType !== 'caseInsert' &&
    !isCaseInsertTemplateType(templateType)
  ) {
    issues.push(
      'case insert projects must use template.type "caseInsert" or a legacy case insert template type.',
    )
  }

  if (
    templateRecord.variant !== undefined &&
    !isCaseInsertTemplateType(templateRecord.variant)
  ) {
    issues.push('template.variant must be a supported case insert template type.')
  }

  const caseInsertRecord = asRecord(record.caseInsert) ?? asRecord(record.jewelCase)

  if (!caseInsertRecord) {
    issues.push('case insert projects must include caseInsert state.')
    return
  }

  validateCaseInsertStateRecord(caseInsertRecord, issues)
}

function validateCaseInsertStateRecord(
  caseInsertRecord: JsonRecord,
  issues: string[],
) {
  if (
    caseInsertRecord.templateType !== undefined &&
    !isCaseInsertTemplateType(caseInsertRecord.templateType)
  ) {
    issues.push('caseInsert.templateType must be a supported case insert template type.')
  }

  validateOptionalRecordField(
    caseInsertRecord,
    'templates',
    'caseInsert.templates',
    issues,
  )
  validateOptionalRecordField(
    caseInsertRecord,
    'spine',
    'caseInsert.spine',
    issues,
  )

  const exportRecord = validateOptionalRecordField(
    caseInsertRecord,
    'export',
    'caseInsert.export',
    issues,
  )

  if (exportRecord) {
    validateOptionalStringArrayField(
      exportRecord,
      'surfaces',
      'caseInsert.export.surfaces',
      issues,
    )
    validateOptionalStringArrayField(
      exportRecord,
      'guideIds',
      'caseInsert.export.guideIds',
      issues,
    )
  }
}

function validateOptionalRecordField(
  record: JsonRecord,
  key: string,
  path: string,
  issues: string[],
): JsonRecord | null {
  if (record[key] === undefined) {
    return null
  }

  const nestedRecord = asRecord(record[key])

  if (!nestedRecord) {
    issues.push(`${path} must be an object when present.`)
    return null
  }

  return nestedRecord
}

function validateOptionalStringArrayField(
  record: JsonRecord,
  key: string,
  path: string,
  issues: string[],
) {
  const value = record[key]

  if (value === undefined) {
    return
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    issues.push(`${path} must be an array of strings when present.`)
  }
}

function validateFiniteNumberField(
  record: JsonRecord,
  key: string,
  path: string,
  issues: string[],
) {
  const value = record[key]

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push(`${path} must be a finite number.`)
  }
}
