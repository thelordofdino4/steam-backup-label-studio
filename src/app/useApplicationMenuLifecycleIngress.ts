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
import type {
  EditorWorkflowNavigationPort,
} from '../editor/editorNavigationRouter.ts'

type ApplicationMenuIngressDependencies =
  ApplicationCommandFeedbackPublicationDependencies & Readonly<{
    workflowNavigation: EditorWorkflowNavigationPort
  }>

export function connectApplicationMenuCommandIngress(
  runtime: Pick<ApplicationMenuRuntime, 'connectCommandIngress'>,
  dependencies: ApplicationMenuIngressDependencies,
): () => void {
  return runtime.connectCommandIngress({
    workflowNavigation: dependencies.workflowNavigation,
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
  dependencies: ApplicationMenuIngressDependencies,
): void {
  const runtime = useContext(ApplicationMenuRuntimeContext)
  if (!runtime) {
    throw new Error('ApplicationMenuBoundary is required.')
  }
  const {
    announceStatus,
    setHomeStatusMessage,
    workflowNavigation,
  } = dependencies

  useLayoutEffect(() => connectApplicationMenuCommandIngress(runtime, {
    announceStatus,
    setHomeStatusMessage,
    workflowNavigation,
  }), [
    announceStatus,
    runtime,
    setHomeStatusMessage,
    workflowNavigation,
  ])
}
