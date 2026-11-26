import { createInteractionPerformanceObserver, isInteractionTimingEnabled } from './diagnostics/interactionPerformanceObserver.ts'
import { InteractionPerformanceContext } from './diagnostics/InteractionPerformanceContext.ts'
import { InteractionPerformanceReport } from './diagnostics/InteractionPerformanceReport.tsx'
import { bindInteractionSession } from './diagnostics/interactionPerformanceSession.ts'
import { createLifecyclePerformanceObserver, isLifecycleTimingEnabled } from './lifecycle/lifecyclePerformanceObserver.ts'
import { LifecyclePerformanceReport } from './diagnostics/LifecyclePerformanceReport.tsx'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ApplicationLifecycleBoundary,
} from './app/ApplicationLifecycleBoundary.tsx'
import { ApplicationMenuBoundary } from './app/ApplicationMenuBoundary.tsx'
import {
  createApplicationLifecycleRuntime,
} from './app/applicationLifecycleRuntime.ts'
import {
  createApplicationMenuRuntime,
} from './applicationMenu/applicationMenuRuntime.ts'
import './styles/index.css'
import './styles/layoutFix.css'
import App from './app/App.tsx'

function mountApplication() {
  const performanceObserver = isLifecycleTimingEnabled(
    import.meta.env.DEV, import.meta.env.VITE_SBLS_LIFECYCLE_TIMING,
  )
    ? createLifecyclePerformanceObserver() : undefined
  const interactionObserver = isInteractionTimingEnabled(
    import.meta.env.DEV, import.meta.env.VITE_SBLS_INTERACTION_TIMING,
  ) ? createInteractionPerformanceObserver() : undefined
  const lifecycleRuntime = createApplicationLifecycleRuntime({ performanceObserver, casePresetProjection: true })
  const unbindInteractionSession = bindInteractionSession(interactionObserver, lifecycleRuntime.root)
  const menuRuntime = createApplicationMenuRuntime(lifecycleRuntime.root)

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      unbindInteractionSession()
      void menuRuntime.dispose()
      void lifecycleRuntime.dispose()
    })
  }

  createRoot(document.getElementById('root')!).render(
    <ApplicationLifecycleBoundary runtime={lifecycleRuntime}>
      <ApplicationMenuBoundary runtime={menuRuntime}>
        <StrictMode>
          <InteractionPerformanceContext.Provider value={interactionObserver}>
            <App />
          </InteractionPerformanceContext.Provider>
          {interactionObserver && <InteractionPerformanceReport observer={interactionObserver} />}
          {performanceObserver && <LifecyclePerformanceReport observer={performanceObserver} />}
        </StrictMode>
      </ApplicationMenuBoundary>
    </ApplicationLifecycleBoundary>,
  )
}

mountApplication()
