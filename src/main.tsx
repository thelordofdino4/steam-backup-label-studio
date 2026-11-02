import './styles/index.css'
import './styles/layoutFix.css'
import { createApplicationCommandDiagnostics } from './diagnostics/applicationCommandDiagnostics.ts'
import { createApplicationStartupAttempt, type ApplicationStartupStage } from './app/applicationStartup.ts'
import { showApplicationStartupFailure } from './app/applicationStartupFallback.ts'

const diagnostics = createApplicationCommandDiagnostics()
const startup = createApplicationStartupAttempt(diagnostics.observeApplicationStartup)
let cleanup: (() => void) | undefined
let failed = false
let disposed = false
function fail(stage: ApplicationStartupStage, cause: unknown) {
  if (failed || disposed) return
  failed = true
  startup.fail(stage, cause)
  // Capture the safe report before disposal clears the in-memory collector.
  const report = diagnostics.toJson()
  queueMicrotask(() => {
    if (disposed) return
    try { cleanup?.() } catch { /* Keep the captured safe fallback accessible. */ }
    showApplicationStartupFailure(document, stage, report)
  })
}
async function start() {
  try {
    const element = document.getElementById('root')
    if (!element) throw new Error('Application mount point unavailable')
    startup.stage('module-load')
    const { mountApplication } = await import('./app/bootstrapApplication.tsx')
    if (disposed) return
    cleanup = mountApplication({ element, diagnostics, startup, onFailure: fail })
  } catch (cause) { fail(startup.getStage(), cause) }
}
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposed = true
    cleanup?.()
    diagnostics.dispose()
  })
}
void start()
