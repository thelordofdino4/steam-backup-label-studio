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
let armed, trial
const readLayout = ({ discTextLayout, discTextSettings, projectRatingBadge }) => ({
  title: discTextLayout?.title,
  legal: discTextLayout?.copyright,
  rating: projectRatingBadge?.layout,
  uskRating: projectRatingBadge?.uskBadge?.layout,
  settings: discTextSettings,
})
const readSavedLayout = p => readLayout({
  discTextLayout: p.discText?.layout, discTextSettings: p.discText?.settings, projectRatingBadge: p.ratingBadge,
})
window.noteDiscCommandCapture = (command, input, revision) => {
  if (trial?.command === command) trial.capture = { input, revision }
}
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
      if (armed && session.id === armed.sessionId && session.revision === armed.start + 1 &&
          !session.project.editor?.guidedLayout) {
        const { command, previous } = armed
        armed = undefined // allow nested busy notifications, but dispatch exactly once
        trial = { command, previous, accepted: readSavedLayout(materializeDiscProject(session.project)),
          revision: session.revision, synchronousCapture: false }
        const current = trial
        void root.dispatch(command).then(result => {
          current.terminal = result.disposition === 'executed' ? result.result.status : result.disposition
        })
        current.synchronousCapture = Boolean(current.capture)
      }
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
window.armDiscPresetReadback = command => {
  if (!['project.save', 'export.png'].includes(command) || armed || trial) throw Error('Invalid probe arm')
  const session = lifecycleRuntime.root.getLifecycleState().activeSession
  if (session?.kind !== 'disc') throw Error('Expected active Disc')
  armed = { command, sessionId: session.id, start: session.revision, previous: readSavedLayout(materializeDiscProject(session.project)) }
}
window.readDiscPresetReadback = () => structuredClone(trial)
window.observeOrdinaryDiscExport = () => {
  const session = lifecycleRuntime.root.getLifecycleState().activeSession
  if (session?.kind !== 'disc' || armed) throw Error('Expected settled active Disc')
  trial = { command: 'export.png', accepted: readSavedLayout(materializeDiscProject(session.project)),
    revision: session.revision }
}
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
