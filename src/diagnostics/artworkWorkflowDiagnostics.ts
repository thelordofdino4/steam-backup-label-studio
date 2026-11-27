import { commandFailed, commandSucceeded, type ApplicationCommandResult } from '../lifecycle/applicationCommandTypes.ts'

export const ARTWORK_WORKFLOW_IDS = ['image.disc-background-import', 'artwork.discovery', 'artwork.import', 'company-logo.discovery', 'company-logo.import'] as const
export type ArtworkWorkflowId = typeof ARTWORK_WORKFLOW_IDS[number]
export const ARTWORK_WORKFLOW_FAILURES = {
  read: { code: 'image.read-failed', message: 'The image could not be read. Choose a readable image and try again.' },
  validate: { code: 'image.validation-failed', message: 'The image could not be validated. Choose a supported raster image and try again.' },
  decode: { code: 'image.decode-failed', message: 'The image could not be loaded. Re-export it as PNG and try again.' },
  discover: { code: 'artwork.discovery-failed', message: 'Artwork search could not be completed. Check your connection or use a local image.' },
  download: { code: 'artwork.download-failed', message: 'The artwork could not be downloaded. Try another result or use a local image.' },
  apply: { code: 'image.apply-failed', message: 'The image could not be applied. Check the current project and try again.' },
} as const
export type ArtworkWorkflowStage = keyof typeof ARTWORK_WORKFLOW_FAILURES
export type ArtworkWorkflowObservation = Readonly<{
  stage(stage: ArtworkWorkflowStage): void
  complete(result: ApplicationCommandResult<unknown>, partial?: true): void
}>
export type ArtworkWorkflowObserver = (operation: Readonly<{
  workflowId: ArtworkWorkflowId
  requestId: number
}>) => ArtworkWorkflowObservation | void

export function startArtworkWorkflow(
  observer: ArtworkWorkflowObserver,
  workflowId: ArtworkWorkflowId,
  requestId: number,
  initialStage: ArtworkWorkflowStage,
) {
  let observation: ArtworkWorkflowObservation | void
  let stage = initialStage
  try { observation = observer({ workflowId, requestId }) } catch { /* Observation only. */ }
  function move(next: ArtworkWorkflowStage) {
    stage = next
    try { observation?.stage(next) } catch { /* Observation only. */ }
  }
  function failure() { return ARTWORK_WORKFLOW_FAILURES[stage] }
  move(initialStage)
  return {
    stage: move,
    failureMessage: () => failure().message,
    finish(accepted: boolean, outcome: 'success' | 'failure' | 'partial' = 'success') {
      const { code, message } = failure()
      const result = !accepted ? { status: 'cancelled' as const, reason: 'operation-cancelled' as const }
        : outcome === 'failure' ? commandFailed({ code, userMessage: message, recoverable: true })
          : commandSucceeded(undefined)
      try { observation?.complete(result, accepted && outcome === 'partial' ? true : undefined) } catch { /* Observation only. */ }
    },
  }
}
