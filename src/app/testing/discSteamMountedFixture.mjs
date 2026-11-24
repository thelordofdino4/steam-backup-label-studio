// Full-App Playwright fixture. Only Steam's transport is substituted.
import { StrictMode, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import App from '/src/app/App.tsx'
import { ApplicationLifecycleBoundary } from '/src/app/ApplicationLifecycleBoundary.tsx'
import { createApplicationLifecycleRuntime } from '/src/app/applicationLifecycleRuntime.ts'
import { ApplicationMenuBoundary } from '/src/app/ApplicationMenuBoundary.tsx'
import { createApplicationMenuRuntime } from '/src/applicationMenu/applicationMenuRuntime.ts'
import { createApplicationLifecycleCompositionRoot } from '/src/lifecycle/applicationLifecycleCompositionRoot.ts'
import { createLifecyclePerformanceObserver } from '/src/lifecycle/lifecyclePerformanceObserver.ts'
import { materializeDiscProject } from '/src/lifecycle/canonicalProject.ts'
import { InteractionPerformanceContext } from '/src/diagnostics/InteractionPerformanceContext.ts'
import '/src/styles/index.css'
import '/src/styles/layoutFix.css'

const max = 160
const revisions = [], scopes = []
let overflow = false, lastRevision = '', lastScopes = ''
const add = (list, record) => {
  if (list.length >= max) { overflow = true; return }
  list.push(record)
}
const observer = createLifecyclePerformanceObserver()
function summarize(session) {
  const p = materializeDiscProject(session.project)
  return {
    revision: session.revision,
    title: p.title,
    game: { manualTitle: p.game.manualTitle, appId: p.game.selectedSteamGame?.appId ?? null },
    metadata: {
      title: p.metadata?.title, subtitle: p.metadata?.subtitle, developer: p.metadata?.developer,
      publisher: p.metadata?.publisher, legacyAppId: p.metadata?.steamAppId,
      legal: p.metadata?.copyrightText, ratingSystem: p.metadata?.ratingSystem,
      ratingValue: p.metadata?.ratingValue,
    },
    artwork: {
      hasActive: Boolean(p.titleArtwork?.imageDataUrl),
      hasDefault: Boolean(p.titleArtwork?.defaultSteamLogo),
    },
    rating: Boolean(p.ratingBadge?.layout.enabled),
    platform: { source: p.platformMarks?.inference?.source, values: p.platformMarks?.values ?? [] },
    text: { appId: p.discText?.values?.appId, legal: p.discText?.values?.copyright,
      copyrightSource: p.discText?.valueSources?.copyright, legalEnabled: p.discText?.settings?.copyright },
    guided: { id: p.editor?.guidedLayout?.id, completed: p.editor?.guidedLayout?.completedSlotIds ?? [] },
  }
}
const lifecycleRuntime = createApplicationLifecycleRuntime({
  performanceObserver: observer,
  createRoot(options) {
    const root = createApplicationLifecycleCompositionRoot(options)
    root.subscribe(snapshot => {
      const session = snapshot.lifecycle.activeSession
      if (!session || session.kind !== 'disc') return
      const key = session.id + ':' + session.revision
      if (key !== lastRevision) {
        lastRevision = key
        add(revisions, summarize(session))
      }
      const activeScopes = [...snapshot.busy.occupiedScopes]
      const scopeKey = activeScopes.join('|')
      if (scopeKey !== lastScopes) {
        lastScopes = scopeKey
        add(scopes, { revision: session.revision, activeScopes })
      }
    })
    return root
  },
})
const menuRuntime = createApplicationMenuRuntime(lifecycleRuntime.root)
const appNode = document.getElementById('root')
createRoot(appNode).render(createElement(ApplicationLifecycleBoundary, { runtime: lifecycleRuntime },
  createElement(ApplicationMenuBoundary, { runtime: menuRuntime },
    createElement(StrictMode, null, createElement(InteractionPerformanceContext.Provider,
      { value: undefined }, createElement(App))))))
window.readDiscSteamReceipt = () => ({
  overflow,
  revisions: structuredClone(revisions),
  scopes: structuredClone(scopes),
  commands: observer.snapshot(),
})
