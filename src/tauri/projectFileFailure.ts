export const PROJECT_FILE_FAILURE_MESSAGES = Object.freeze({
  'project.file-too-large': 'The project input exceeds the supported size limit.',
  'project.read-failed': 'The project file could not be read.',
  'project.write-failed': 'The project file could not be written.',
  'project.atomic-write.validate-destination': 'The project destination is invalid.',
  'project.atomic-write.create-temporary': 'A temporary project file could not be created safely.',
  'project.atomic-write.collision-exhausted': 'A safe temporary project file name could not be reserved.',
  'project.atomic-write.write-temporary': 'The project bytes could not be written completely.',
  'project.atomic-write.flush-temporary': 'The temporary project file could not be flushed.',
  'project.atomic-write.sync-temporary': 'The temporary project file could not be synchronized.',
  'project.atomic-write.close-temporary': 'The temporary project file could not be closed before replacement.',
  'project.atomic-write.replace-destination': 'The existing project file could not be replaced safely.',
} as const)

export type ProjectFileFailureCode = keyof typeof PROJECT_FILE_FAILURE_MESSAGES

export type ProjectFileCommandSecondaryCause = Readonly<{
  category: string
  operation: string
  platformCode?: number
}>

export type ProjectFileCommandCause = Readonly<{
  category: string
  operation: string
  platformCode?: number
  secondary?: readonly ProjectFileCommandSecondaryCause[]
}>

export type ProjectFileCommandFailure = Readonly<{
  status: 'failure'
  code: ProjectFileFailureCode
  recoverable: true
  message: string
  cause?: ProjectFileCommandCause
}>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowed.includes(key))
}

function isSafeCause(value: unknown): value is ProjectFileCommandSecondaryCause {
  if (!isRecord(value)) {
    return false
  }
  return hasOnlyKeys(value, ['category', 'operation', 'platformCode']) &&
    typeof value.category === 'string' && value.category.length > 0 &&
    typeof value.operation === 'string' && value.operation.length > 0 &&
    (value.platformCode === undefined ||
      (typeof value.platformCode === 'number' && Number.isSafeInteger(value.platformCode)))
}

function isSafePrimaryCause(value: unknown): value is ProjectFileCommandCause {
  if (!isRecord(value)) {
    return false
  }
  const secondary = value.secondary
  return hasOnlyKeys(
    value,
    ['category', 'operation', 'platformCode', 'secondary'],
  ) &&
    typeof value.category === 'string' && value.category.length > 0 &&
    typeof value.operation === 'string' && value.operation.length > 0 &&
    (value.platformCode === undefined ||
      (typeof value.platformCode === 'number' && Number.isSafeInteger(value.platformCode))) &&
    (secondary === undefined ||
      (Array.isArray(secondary) && secondary.every(isSafeCause)))
}

export function isProjectFileCommandFailure(
  value: unknown,
): value is ProjectFileCommandFailure {
  if (!isRecord(value) || value.status !== 'failure' || value.recoverable !== true) {
    return false
  }
  if (!hasOnlyKeys(
    value,
    ['status', 'code', 'recoverable', 'message', 'cause'],
  )) {
    return false
  }
  if (typeof value.code !== 'string' || !(value.code in PROJECT_FILE_FAILURE_MESSAGES)) {
    return false
  }
  const code = value.code as ProjectFileFailureCode
  return value.message === PROJECT_FILE_FAILURE_MESSAGES[code] &&
    (value.cause === undefined || isSafePrimaryCause(value.cause))
}

export function createProjectFileCommandFailure(
  code: ProjectFileFailureCode,
  category: string,
  operation: string,
): ProjectFileCommandFailure {
  return Object.freeze({
    status: 'failure',
    code,
    recoverable: true,
    message: PROJECT_FILE_FAILURE_MESSAGES[code],
    cause: Object.freeze({ category, operation }),
  })
}
