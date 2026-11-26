// Full-App Playwright fixture. Native transport substitutes live in the test server.
import { StrictMode, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import App from '/src/app/App.tsx'
import { ApplicationLifecycleBoundary } from '/src/app/ApplicationLifecycleBoundary.tsx'
import { createApplicationLifecycleRuntime } from '/src/app/applicationLifecycleRuntime.ts'
import { ApplicationMenuBoundary } from '/src/app/ApplicationMenuBoundary.tsx'
import { createApplicationMenuRuntime } from '/src/applicationMenu/applicationMenuRuntime.ts'
import { createApplicationLifecycleCompositionRoot } from '/src/lifecycle/applicationLifecycleCompositionRoot.ts'
import { createLifecyclePerformanceObserver } from '/src/lifecycle/lifecyclePerformanceObserver.ts'
import { selectIsActiveProjectDirty } from '/src/lifecycle/projectSession.ts'
import { materializeDiscProject } from '/src/lifecycle/canonicalProject.ts'
import { InteractionPerformanceContext } from '/src/diagnostics/InteractionPerformanceContext.ts'
import '/src/app/testing/discHistoryOutputFixture.mjs'
import '/src/styles/index.css'
import '/src/styles/layoutFix.css'

const max = 160
const revisions = [], scopes = []
let armed, trial, staleRatingTrial
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
const imageEvidence = (dataUrl, size, id) => ({
  dataUrl: dataUrl ?? null, width: size?.width, height: size?.height, bounds: size?.contentBounds, id,
})

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
    artworkData: {
      source: p.titleArtwork?.source,
      enabled: p.titleArtwork?.layout?.enabled,
      active: imageEvidence(p.titleArtwork?.imageDataUrl, p.titleArtwork?.imageSize, p.titleArtwork?.steamArtworkAssetId),
      remembered: imageEvidence(p.titleArtwork?.defaultSteamLogo?.imageDataUrl, p.titleArtwork?.defaultSteamLogo?.imageSize,
        p.titleArtwork?.defaultSteamLogo?.steamArtworkAssetId),
    },
    rating: Boolean(p.ratingBadge?.layout.enabled),
    ratingLayout: p.ratingBadge?.layout,
    usk: { enabled: p.ratingBadge?.uskBadge?.layout.enabled, value: p.ratingBadge?.uskBadge?.ratingValue },
    platform: { source: p.platformMarks?.inference?.source, values: p.platformMarks?.values ?? [] },
    text: { appId: p.discText?.values?.appId, legal: p.discText?.values?.copyright,
      copyrightSource: p.discText?.valueSources?.copyright, legalEnabled: p.discText?.settings?.copyright },
    guided: { id: p.editor?.guidedLayout?.id, completed: p.editor?.guidedLayout?.completedSlotIds ?? [] },
  }
}
const lifecycleRuntime = createApplicationLifecycleRuntime({
  performanceObserver: observer,
  casePresetProjection: true,
  createRoot(options) {
    const root = createApplicationLifecycleCompositionRoot({ ...options, discHistoryLimit: 4, caseHistoryLimit: 4 })
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
      if (staleRatingTrial?.armed && session.id === staleRatingTrial.sessionId &&
          session.revision === staleRatingTrial.revision + 1 &&
          session.project.ratingBadge?.uskBadge.ratingValue === '16') {
        staleRatingTrial.armed = false
        const accepted = materializeDiscProject(session.project)
        const { background, ...legacy } = accepted
        staleRatingTrial.projected = root.synchronizeDiscLegacyProject({
          sessionId: session.id, legacy: { ...legacy, ratingBadge: staleRatingTrial.oldBadge },
        })
        staleRatingTrial.full = root.synchronizeCurrentProject({
          sessionId: session.id, kind: 'disc',
          project: { ...legacy, background, ratingBadge: staleRatingTrial.oldBadge },
        })
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
window.armDiscStaleRatingReplay = () => {
  const session = lifecycleRuntime.root.getLifecycleState().activeSession
  if (session?.kind !== 'disc' || staleRatingTrial) throw Error('Expected active Disc and no prior replay')
  const oldBadge = materializeDiscProject(session.project).ratingBadge
  if (!oldBadge || oldBadge.uskBadge.layout.enabled) throw Error('Expected a disabled supplemental rating')
  staleRatingTrial = { armed: true, sessionId: session.id, revision: session.revision, oldBadge }
}
window.readDiscStaleRatingReplay = () => ({
  projected: staleRatingTrial?.projected, full: staleRatingTrial?.full,
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
let stepHistory
const connectDiscHistoryDiagnostic = step => {
  stepHistory = step
  return () => { if (stepHistory === step) stepHistory = undefined }
}
window.stepDiscHistoryDiagnostic = direction => {
  if (direction !== 'undo' && direction !== 'redo') throw Error('Expected Undo or Redo')
  return stepHistory?.(direction)
}
window.readDiscHistoryDiagnostic = () => {
  const { state, discHistory, discHistoryProjectionPending } = lifecycleRuntime.root.getStateSnapshot()
  return { revision: state.activeSession?.revision, pending: Boolean(discHistoryProjectionPending),
    past: discHistory?.past.length, future: discHistory?.future.length,
    path: state.activeSession?.currentPath, dirty: selectIsActiveProjectDirty(state) }
}
let stepCaseHistory
const connectCaseHistoryDiagnostic = step => {
  stepCaseHistory = step
  return () => { if (stepCaseHistory === step) stepCaseHistory = undefined }
}
window.stepCaseHistoryDiagnostic = direction => {
  if (direction !== 'undo' && direction !== 'redo') throw Error('Expected Undo or Redo')
  return stepCaseHistory?.(direction)
}
window.readCaseSteamDiagnostic = () => {
  const { state, caseSteamProjectionPending, caseHistory } = lifecycleRuntime.root.getStateSnapshot()
  const session = state.activeSession
  if (session?.kind !== 'caseInsert') return null
  return { sessionId: session.id, revision: session.revision, project: session.project,
    path: session.currentPath, dirty: selectIsActiveProjectDirty(state), pending: Boolean(caseSteamProjectionPending),
    past: caseHistory?.past.length, future: caseHistory?.future.length,
    applicationRevision: session.caseInsertPresetApplication.applicationRevision,
    attached: session.caseInsertPresetApplication.attachment.status === 'attached' }
}
window.readDiscHistoryProject = () => {
  const session = lifecycleRuntime.root.getStateSnapshot().state.activeSession
  if (session?.kind !== 'disc') throw new Error('Expected active Disc')
  const { savedAt, ...document } = materializeDiscProject(session.project)
  return document
}
createRoot(appNode).render(createElement(ApplicationLifecycleBoundary, { runtime: lifecycleRuntime },
  createElement(ApplicationMenuBoundary, { runtime: menuRuntime },
    createElement(StrictMode, null, createElement(InteractionPerformanceContext.Provider,
      { value: undefined }, createElement(App, { connectDiscHistoryDiagnostic, connectCaseHistoryDiagnostic }))))))
window.readDiscSteamReceipt = () => ({
  overflow,
  revisions: structuredClone(revisions),
  scopes: structuredClone(scopes),
  commands: observer.snapshot(),
})
