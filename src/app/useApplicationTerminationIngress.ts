import { useContext, useLayoutEffect } from 'react'
import { ApplicationLifecycleRuntimeContext } from './applicationLifecycleRuntimeContext.ts'
import { publishApplicationCommandFeedback, type ApplicationCommandFeedbackPublicationDependencies } from './appApplicationCommandFeedback.ts'

export function useApplicationTerminationIngress(
  dependencies: ApplicationCommandFeedbackPublicationDependencies & Readonly<{ applicationModalActive: boolean }>,
): void {
  const runtime = useContext(ApplicationLifecycleRuntimeContext)
  if (!runtime) throw new Error('ApplicationLifecycleBoundary is required.')
  const { announceStatus, setHomeStatusMessage, applicationModalActive } = dependencies
  useLayoutEffect(() => runtime.connectNativeTerminationIngress((dispatch) => {
    publishApplicationCommandFeedback(dispatch, { announceStatus, setHomeStatusMessage })
  }), [runtime, announceStatus, setHomeStatusMessage])
  useLayoutEffect(() => runtime.root.refreshCommandCapabilities(), [runtime, applicationModalActive])
}
