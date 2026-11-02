import { ApplicationRendered } from './ApplicationRendered.tsx'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ApplicationLifecycleBoundary,
} from './ApplicationLifecycleBoundary.tsx'
import { ApplicationMenuBoundary } from './ApplicationMenuBoundary.tsx'
import {
  createApplicationLifecycleRuntime,
} from './applicationLifecycleRuntime.ts'
import {
  createApplicationMenuRuntime,
} from '../applicationMenu/applicationMenuRuntime.ts'
import App from './App.tsx'
import type { ApplicationCommandDiagnostics } from '../diagnostics/applicationCommandDiagnostics.ts'
import type { ApplicationStartupAttempt, ApplicationStartupStage } from './applicationStartup.ts'

export function mountApplication({ element, diagnostics, startup, onFailure }: Readonly<{
  element: HTMLElement
  diagnostics: ApplicationCommandDiagnostics
  startup: ApplicationStartupAttempt
  onFailure: (stage: ApplicationStartupStage, cause: unknown) => void
}>) {
  startup.stage('lifecycle-root')
  const lifecycleRuntime = createApplicationLifecycleRuntime({ diagnostics })
  try {
    startup.stage('menu-runtime')
    const menuRuntime = createApplicationMenuRuntime(lifecycleRuntime.root, {
      observeStartup: lifecycleRuntime.diagnostics.observeMenuStartup,
      onDiagnostic: lifecycleRuntime.diagnostics.recordMenuDiagnostic,
    })

    startup.stage('react-root')
    const root = createRoot(element, {
      onUncaughtError: cause => onFailure('react-render', cause),
      onCaughtError: cause => startup.reportRuntimeFailure('react-render', cause),
      onRecoverableError: cause => startup.reportRuntimeFailure('react-render', cause),
    })
    startup.stage('react-render')
    root.render(
      <ApplicationLifecycleBoundary runtime={lifecycleRuntime}>
        <ApplicationMenuBoundary runtime={menuRuntime}>
          <StrictMode>
            <App />
            <ApplicationRendered startup={startup} />
          </StrictMode>
        </ApplicationMenuBoundary>
      </ApplicationLifecycleBoundary>,
    )
    return () => {
      root.unmount()
      void menuRuntime.dispose()
      lifecycleRuntime.dispose()
    }
  } catch (cause) {
    lifecycleRuntime.dispose()
    throw cause
  }
}
