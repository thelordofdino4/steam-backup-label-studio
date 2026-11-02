import type { ApplicationCommandError } from '../lifecycle/applicationCommandTypes.ts'

export const IMAGE_IMPORT_FAILURES = Object.freeze({
  'image.read-failed': { stage: 'read', userMessage: 'The image could not be read. Check the file and try again.' },
  'image.prepare-failed': { stage: 'prepare', userMessage: 'The image could not be imported. Check the source or connection and try again.' },
  'image.validation-failed': { stage: 'validate', userMessage: 'The image could not be validated for project saving. Try again in the desktop app.' },
  'image.decode-failed': { stage: 'decode', userMessage: 'The image could not be displayed. Re-export it as PNG and try again.' },
  'image.inspect-failed': { stage: 'inspect', userMessage: 'The image bounds could not be inspected. Re-export it as PNG and try again.' },
} as const)
export type ImageImportFailureCode = keyof typeof IMAGE_IMPORT_FAILURES

/** The existing application error contract, with Error compatibility for import owners. */
export class ImageImportError extends Error implements ApplicationCommandError {
  readonly code: ImageImportFailureCode
  readonly userMessage: string
  readonly recoverable = true
  constructor(code: ImageImportFailureCode, cause?: unknown, message = IMAGE_IMPORT_FAILURES[code].userMessage as string) {
    super(message, { cause })
    this.name = 'ImageImportError'
    this.code = code
    this.userMessage = message
  }
}
export function imageImportFailure(cause: unknown): ApplicationCommandError {
  return cause instanceof ImageImportError ? cause : new ImageImportError('image.prepare-failed', cause)
}
