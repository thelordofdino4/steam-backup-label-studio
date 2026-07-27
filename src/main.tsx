import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ApplicationLifecycleBoundary,
} from './app/ApplicationLifecycleBoundary.tsx'
import {
  createApplicationLifecycleRuntime,
} from './app/applicationLifecycleRuntime.ts'
import './styles/index.css'
import './styles/layoutFix.css'
import App from './app/App.tsx'

function mountApplication() {
  const lifecycleRuntime = createApplicationLifecycleRuntime()

  createRoot(document.getElementById('root')!).render(
    <ApplicationLifecycleBoundary runtime={lifecycleRuntime}>
      <StrictMode>
        <App />
      </StrictMode>
    </ApplicationLifecycleBoundary>,
  )
}

mountApplication()
