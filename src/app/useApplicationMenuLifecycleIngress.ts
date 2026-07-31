import { useContext, useLayoutEffect } from 'react'

import type {
  ApplicationCommandFeedbackPublicationDependencies,
} from './appApplicationCommandFeedback.ts'
import {
  publishApplicationCommandFeedback,
} from './appApplicationCommandFeedback.ts'
import { ApplicationMenuRuntimeContext } from './applicationMenuRuntimeContext.ts'
import type {
  ApplicationMenuRuntime,
} from '../applicationMenu/applicationMenuRuntime.ts'

export function connectApplicationMenuCommandIngress(
  runtime: Pick<ApplicationMenuRuntime, 'connectCommandIngress'>,
  dependencies: ApplicationCommandFeedbackPublicationDependencies,
): () => void {
  return runtime.connectCommandIngress({
    publishFeedback(dispatch) {
      publishApplicationCommandFeedback(dispatch, dependencies)
    },
  })
}

/**
 * Connects the native menu only after the shared React-owned feedback
 * dependencies have committed. Lifecycle behavior remains in the composition
 * root; this hook only publishes its terminal result through the shared owner.
 */
export function useApplicationMenuCommandIngress(
  dependencies: ApplicationCommandFeedbackPublicationDependencies,
): void {
  const runtime = useContext(ApplicationMenuRuntimeContext)
  if (!runtime) {
    throw new Error('ApplicationMenuBoundary is required.')
  }
  const { announceStatus, setHomeStatusMessage } = dependencies

  useLayoutEffect(() => connectApplicationMenuCommandIngress(runtime, {
    announceStatus,
    setHomeStatusMessage,
  }), [
    announceStatus,
    runtime,
    setHomeStatusMessage,
  ])
}
