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
  const lifecycleRuntime = createApplicationLifecycleRuntime()
  const menuRuntime = createApplicationMenuRuntime(lifecycleRuntime.root)

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      void menuRuntime.dispose()
      lifecycleRuntime.dispose()
    })
  }

  createRoot(document.getElementById('root')!).render(
    <ApplicationLifecycleBoundary runtime={lifecycleRuntime}>
      <ApplicationMenuBoundary runtime={menuRuntime}>
        <StrictMode>
          <App />
        </StrictMode>
      </ApplicationMenuBoundary>
    </ApplicationLifecycleBoundary>,
  )
}

mountApplication()
