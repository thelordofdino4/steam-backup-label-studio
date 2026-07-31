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

export function connectApplicationMenuLifecycleIngress(
  runtime: Pick<ApplicationMenuRuntime, 'connectLifecycleIngress'>,
  dependencies: ApplicationCommandFeedbackPublicationDependencies,
): () => void {
  return runtime.connectLifecycleIngress({
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
export function useApplicationMenuLifecycleIngress(
  dependencies: ApplicationCommandFeedbackPublicationDependencies,
): void {
  const runtime = useContext(ApplicationMenuRuntimeContext)
  if (!runtime) {
    throw new Error('ApplicationMenuBoundary is required.')
  }
  const { announceStatus, setHomeStatusMessage } = dependencies

  useLayoutEffect(() => connectApplicationMenuLifecycleIngress(runtime, {
    announceStatus,
    setHomeStatusMessage,
  }), [
    announceStatus,
    runtime,
    setHomeStatusMessage,
  ])
}
