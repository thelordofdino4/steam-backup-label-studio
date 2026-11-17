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
  const lifecycleRuntime = createApplicationLifecycleRuntime({ performanceObserver })
  const menuRuntime = createApplicationMenuRuntime(lifecycleRuntime.root)

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      void menuRuntime.dispose()
      void lifecycleRuntime.dispose()
    })
  }

  createRoot(document.getElementById('root')!).render(
    <ApplicationLifecycleBoundary runtime={lifecycleRuntime}>
      <ApplicationMenuBoundary runtime={menuRuntime}>
        <StrictMode>
          <App />
          {performanceObserver && <LifecyclePerformanceReport observer={performanceObserver} />}
        </StrictMode>
      </ApplicationMenuBoundary>
    </ApplicationLifecycleBoundary>,
  )
}

mountApplication()
