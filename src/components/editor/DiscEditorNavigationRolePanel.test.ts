import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { DISC_ROLE_FOCUS_ROLE_IDS } from '../../editor/editorRoleFocus.ts'
import {
  createEditorRoleFocusControllerStore,
} from '../../editor/editorRoleFocusController.ts'
import {
  getEditorNavigationShellRoleSectionItems,
} from './editorNavigationShellViewModel.ts'

const adapterSource = readFileSync(
  new URL('./DiscEditorNavigationRolePanel.tsx', import.meta.url),
  'utf8',
)
const navigationPanelSource = readFileSync(
  new URL('./EditorNavigationShell.tsx', import.meta.url),
  'utf8',
)
const appSource = readFileSync('src/app/App.tsx', 'utf8')
const caseInsertSource = readFileSync(
  'src/components/caseInsert/CaseInsertEditorShell.tsx',
  'utf8',
)

function createSummary(calls: string[]) {
  return {
    focus(options?: FocusOptions) {
      calls.push(`focus:${String(options?.preventScroll)}`)
    },
    scrollIntoView(options?: ScrollIntoViewOptions) {
      calls.push(
        `scroll:${String(options?.block)}:${String(options?.behavior)}`,
      )
    },
  } as unknown as HTMLElement
}

test('Disc role adapter uses canonical controlled role state and direct refs', () => {
  assert.match(adapterSource, /roleId: DiscRolePresetRole/)
  assert.match(adapterSource, /isRoleOpen,/)
  assert.match(adapterSource, /setRoleOpen,/)
  assert.match(adapterSource, /useRef<HTMLDetailsElement \| null>\(null\)/)
  assert.match(adapterSource, /useRef<HTMLElement \| null>\(null\)/)
  assert.match(adapterSource, /open=\{isRoleOpen\(roleId\)\}/)
  assert.match(
    adapterSource,
    /onOpenChange=\{\(open\) => setRoleOpen\(roleId, open\)\}/,
  )
  assert.match(adapterSource, /detailsRef=\{detailsRef\}/)
  assert.match(adapterSource, /summaryRef=\{summaryRef\}/)
})

test('Disc role registration is replacement-safe and effect-scoped by role', () => {
  assert.match(
    adapterSource,
    /useLayoutEffect\(\(\) => registerRolePanel\(roleId, \{/,
  )
  assert.match(
    adapterSource,
    /detailsElement: \(\) => detailsRef\.current/,
  )
  assert.match(
    adapterSource,
    /summaryElement: \(\) => summaryRef\.current/,
  )
  assert.match(adapterSource, /\[registerRolePanel, roleId\]/)
  assert.doesNotMatch(adapterSource, /registerFocusTarget|openAncestors/)
})

test('generic role panel forwards optional control props without owning state', () => {
  assert.match(
    navigationPanelSource,
    /'open' \| 'onOpenChange' \| 'detailsRef' \| 'summaryRef'/,
  )
  assert.match(navigationPanelSource, /open=\{open\}/)
  assert.match(navigationPanelSource, /onOpenChange=\{onOpenChange\}/)
  assert.match(navigationPanelSource, /detailsRef=\{detailsRef\}/)
  assert.match(navigationPanelSource, /summaryRef=\{summaryRef\}/)
  assert.doesNotMatch(navigationPanelSource, /useState|useReducer/)
})

test('Disc workspace alone mounts the provider around sidebar and preview', () => {
  const providerTags = appSource.match(/<EditorRoleFocusProvider>/g) ?? []
  const caseBranchIndex = appSource.indexOf("activeWorkspace === 'caseInsert'")
  const providerTagIndex = appSource.indexOf('<EditorRoleFocusProvider>')

  assert.equal(providerTags.length, 1)
  assert.ok(caseBranchIndex >= 0 && caseBranchIndex < providerTagIndex)
  assert.match(
    appSource,
    /<EditorRoleFocusProvider>\s*<ApplicationWorkflowHostBoundary[\s\S]*<main className="app-shell">[\s\S]*<aside className="sidebar">[\s\S]*<DiscPreview[\s\S]*<\/main>\s*<\/ApplicationWorkflowHostBoundary>\s*<\/EditorRoleFocusProvider>/,
  )
  assert.match(
    appSource,
    /discRoleSectionItems\.map[\s\S]*<DiscEditorNavigationRolePanel[\s\S]*roleId=\{section\.id\}/,
  )
})

test('all seven Disc roles keep their established order labels and closed initial state', () => {
  const roleItems = getEditorNavigationShellRoleSectionItems('disc-label')
  const store = createEditorRoleFocusControllerStore()

  assert.deepEqual(roleItems.map(({ id, label }) => ({ id, label })), [
    { id: 'background-artwork', label: 'Background Image' },
    { id: 'game-title', label: 'Game Title' },
    { id: 'game-info-logos', label: 'Game Info Logos' },
    { id: 'company-logos', label: 'Company Logos' },
    { id: 'legal-info', label: 'Legal Text' },
    { id: 'additional-artwork', label: 'Additional Artwork' },
    { id: 'additional-text', label: 'Additional Text' },
  ])
  assert.deepEqual(roleItems.map(({ id }) => id), DISC_ROLE_FOCUS_ROLE_IDS)
  assert.ok(roleItems.every(({ id }) => !store.isRoleOpen(id)))
  assert.match(
    appSource,
    /<ProjectPanel[\s\S]*<ExportOptionsPanel[\s\S]*<TemplatePanel[\s\S]*<GamePanel[\s\S]*<DiscSteamBrandingControls[\s\S]*<DiscLayoutPresetsPanel[\s\S]*discRoleSectionItems\.map/,
  )
})

test('manual multi-panel state and later request reopening remain independent', () => {
  const store = createEditorRoleFocusControllerStore()
  store.setRoleOpen('legal-info', true)
  store.setRoleOpen('additional-text', true)

  assert.equal(store.isRoleOpen('legal-info'), true)
  assert.equal(store.isRoleOpen('additional-text'), true)

  store.setRoleOpen('legal-info', false)
  assert.equal(store.isRoleOpen('legal-info'), false)
  assert.equal(store.isRoleOpen('additional-text'), true)

  store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior: 'reveal',
    destination: {
      roleId: 'legal-info',
      focusTarget: 'disc:legal-text:copyright',
    },
  })
  assert.equal(store.isRoleOpen('legal-info'), true)
  assert.equal(store.isRoleOpen('additional-text'), true)
})

test('registered summary handles reveal and unregistered-target focus fallback once', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const summary = createSummary(calls)
  store.registerRolePanel('game-title', {
    detailsElement: () => null,
    summaryElement: () => summary,
  })

  store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior: 'reveal',
    destination: {
      roleId: 'game-title',
      focusTarget: 'disc:game-title:artwork-upload',
    },
  })
  assert.equal(store.processPendingRequest(), 'role-revealed')

  store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior: 'focus',
    destination: {
      roleId: 'game-title',
      focusTarget: 'disc:game-title:artwork-upload',
    },
  })
  assert.equal(store.processPendingRequest(), 'role-summary-fallback')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  assert.deepEqual(calls, [
    'scroll:nearest:auto',
    'focus:true',
    'scroll:nearest:auto',
  ])
})

test('unmounted valid roles are unavailable and consumed without retry', () => {
  const store = createEditorRoleFocusControllerStore()
  store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior: 'focus',
    destination: {
      roleId: 'additional-artwork',
      focusTarget: 'disc:additional-artwork:add',
    },
  })

  assert.equal(store.processPendingRequest(), 'unavailable')
  assert.equal(store.getSnapshot().pendingRequest, null)
  assert.equal(store.processPendingRequest(), 'no-pending-request')
})

test('Case Insert remains outside Disc provider and uncontrolled', () => {
  assert.doesNotMatch(caseInsertSource, /EditorRoleFocusProvider/)
  assert.doesNotMatch(caseInsertSource, /useEditorRoleFocus/)
  assert.doesNotMatch(caseInsertSource, /DiscEditorNavigationRolePanel/)
  assert.match(
    caseInsertSource,
    /roleSectionItems\.map[\s\S]*<EditorNavigationRolePanel\s+key=\{section\.id\}\s+label=\{section\.label\}\s+smokeId=\{section\.smokeId\}/,
  )
  assert.doesNotMatch(
    caseInsertSource,
    /<EditorNavigationRolePanel[\s\S]{0,200}\b(?:open|onOpenChange|detailsRef|summaryRef)=/,
  )
})

test('Disc adapter has no nested focus, preview, project, renderer, export, or retry dependencies', () => {
  const forbiddenDependencies = [
    'registerFocusTarget',
    'openAncestors',
    'DiscPreview',
    'previewEditableRegistry',
    'previewElementOverlay',
    'useDiscText',
    'contextualTextRibbon',
    'projectSchema',
    'createProjectSnapshot',
    'restoreProject',
    'render/',
    'export/',
    'caseInsert',
    'Steam',
    'querySelector',
    'querySelectorAll',
    'getElementById',
    '.closest(',
    '.click(',
    'setTimeout',
    'setInterval',
    'MutationObserver',
    'requestAnimationFrame',
  ]

  for (const forbiddenDependency of forbiddenDependencies) {
    assert.equal(
      adapterSource.includes(forbiddenDependency),
      false,
      `unexpected dependency: ${forbiddenDependency}`,
    )
  }
})
