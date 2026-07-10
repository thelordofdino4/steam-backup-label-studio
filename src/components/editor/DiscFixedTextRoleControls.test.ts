import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type {
  DiscRoleFocusDestination,
  EditorRoleFocusBehavior,
} from '../../editor/editorRoleFocus.ts'
import {
  createEditorRoleFocusControllerStore,
  type EditorRoleFocusControllerStore,
} from '../../editor/editorRoleFocusController.ts'
import {
  registerDiscAdditionalTextFocusTarget,
  registerDiscLegalInfoFocusTarget,
} from './discFixedTextRoleFocusRegistration.ts'

const legalAdapterSource = readFileSync(
  new URL('./DiscLegalInfoRoleControls.tsx', import.meta.url),
  'utf8',
)
const additionalAdapterSource = readFileSync(
  new URL('./DiscAdditionalTextRoleControls.tsx', import.meta.url),
  'utf8',
)
const registrationSource = readFileSync(
  new URL('./discFixedTextRoleFocusRegistration.ts', import.meta.url),
  'utf8',
)
const legalControlsSource = readFileSync(
  new URL('../sidebar/text/DiscLegalTextControls.tsx', import.meta.url),
  'utf8',
)
const additionalControlsSource = readFileSync(
  new URL('../sidebar/text/DiscAdditionalTextControls.tsx', import.meta.url),
  'utf8',
)
const discTextControlSource = readFileSync(
  new URL('../sidebar/DiscTextControl.tsx', import.meta.url),
  'utf8',
)
const appSource = readFileSync('src/app/App.tsx', 'utf8')
const caseInsertSource = readFileSync(
  'src/components/caseInsert/CaseInsertEditorShell.tsx',
  'utf8',
)

function createElement(label: string, calls: string[]) {
  return {
    focus(options?: FocusOptions) {
      calls.push(`${label}:focus:${String(options?.preventScroll)}`)
    },
    scrollIntoView(options?: ScrollIntoViewOptions) {
      calls.push(
        `${label}:scroll:${String(options?.block)}:${String(options?.behavior)}`,
      )
    },
  } as unknown as HTMLElement
}

function requestDestination(
  store: EditorRoleFocusControllerStore,
  destination: DiscRoleFocusDestination,
  behavior: EditorRoleFocusBehavior = 'focus',
) {
  return store.requestRoleFocus({
    surfaceId: 'disc-label',
    behavior,
    destination,
  })
}

function registerTargets({
  copyright,
  customNote,
  store,
}: {
  copyright: HTMLElement | null
  customNote: HTMLElement | null
  store: EditorRoleFocusControllerStore
}) {
  const unregisterCopyright = registerDiscLegalInfoFocusTarget({
    copyrightElement: () => copyright,
    registerFocusTarget: store.registerFocusTarget,
  })
  const unregisterCustomNote = registerDiscAdditionalTextFocusTarget({
    customNoteElement: () => customNote,
    registerFocusTarget: store.registerFocusTarget,
  })

  return () => {
    unregisterCustomNote()
    unregisterCopyright()
  }
}

test('copyright focus opens Legal Info and preserves all text state', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const copyright = createElement('copyright', calls)
  const customNote = createElement('custom-note', calls)
  const textState = {
    copyright: {
      enabled: false,
      text: '<p>Copyright text</p>',
      valueSource: 'metadata',
      htmlSource: '<p>Copyright text</p>',
    },
    selectedDiscTextKey: 'title',
    contextualRibbonActive: true,
    dirty: false,
    undoEntries: 4,
    serializedProject: 'unchanged',
  }
  const initialState = structuredClone(textState)
  registerTargets({ copyright, customNote, store })
  store.setRoleOpen('background-artwork', true)

  const first = requestDestination(store, {
    roleId: 'legal-info',
    focusTarget: 'disc:legal-text:copyright',
  })
  assert.equal(store.isRoleOpen('legal-info'), true)
  assert.equal(store.isRoleOpen('background-artwork'), true)
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  const second = requestDestination(store, {
    roleId: 'legal-info',
    focusTarget: 'disc:legal-text:copyright',
  })
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.equal(second.requestId, first.requestId + 1)
  assert.deepEqual(calls, [
    'copyright:focus:true',
    'copyright:scroll:nearest:auto',
    'copyright:focus:true',
    'copyright:scroll:nearest:auto',
  ])
  assert.deepEqual(textState, initialState)
})

test('custom-note focus opens Additional Text and preserves all text state', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const copyright = createElement('copyright', calls)
  const customNote = createElement('custom-note', calls)
  const textState = {
    customNote: {
      enabled: true,
      text: '<p>Keep this note</p>',
      valueSource: 'manual',
      htmlSource: '<p>Keep this note</p>',
    },
    selectedDiscTextKey: 'copyright',
    contextualRibbonActive: false,
    dirty: false,
    undoEntries: 2,
    serializedProject: 'unchanged',
  }
  const initialState = structuredClone(textState)
  registerTargets({ copyright, customNote, store })
  store.setRoleOpen('game-title', true)

  const first = requestDestination(store, {
    roleId: 'additional-text',
    focusTarget: 'disc:additional-text:custom-note',
  })
  assert.equal(store.isRoleOpen('additional-text'), true)
  assert.equal(store.isRoleOpen('game-title'), true)
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.equal(store.processPendingRequest(), 'no-pending-request')
  const second = requestDestination(store, {
    roleId: 'additional-text',
    focusTarget: 'disc:additional-text:custom-note',
  })
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.equal(second.requestId, first.requestId + 1)
  assert.deepEqual(calls, [
    'custom-note:focus:true',
    'custom-note:scroll:nearest:auto',
    'custom-note:focus:true',
    'custom-note:scroll:nearest:auto',
  ])
  assert.deepEqual(textState, initialState)
})

test('reveal stays on each role summary while focus resolves its checkbox', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const copyright = createElement('copyright', calls)
  const customNote = createElement('custom-note', calls)
  const legalSummary = createElement('legal-summary', calls)
  const additionalSummary = createElement('additional-summary', calls)
  registerTargets({ copyright, customNote, store })
  store.registerRolePanel('legal-info', {
    detailsElement: () => null,
    summaryElement: () => legalSummary,
  })
  store.registerRolePanel('additional-text', {
    detailsElement: () => null,
    summaryElement: () => additionalSummary,
  })

  requestDestination(store, {
    roleId: 'legal-info',
    focusTarget: 'disc:legal-text:copyright',
  }, 'reveal')
  assert.equal(store.processPendingRequest(), 'role-revealed')
  requestDestination(store, {
    roleId: 'legal-info',
    focusTarget: 'disc:legal-text:copyright',
  })
  assert.equal(store.processPendingRequest(), 'target-focused')
  requestDestination(store, {
    roleId: 'additional-text',
    focusTarget: 'disc:additional-text:custom-note',
  }, 'reveal')
  assert.equal(store.processPendingRequest(), 'role-revealed')
  requestDestination(store, {
    roleId: 'additional-text',
    focusTarget: 'disc:additional-text:custom-note',
  })
  assert.equal(store.processPendingRequest(), 'target-focused')

  assert.deepEqual(calls, [
    'legal-summary:scroll:nearest:auto',
    'copyright:focus:true',
    'copyright:scroll:nearest:auto',
    'additional-summary:scroll:nearest:auto',
    'custom-note:focus:true',
    'custom-note:scroll:nearest:auto',
  ])
})

test('manual multi-panel state remains independent and navigation reopens roles', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  registerTargets({
    copyright: createElement('copyright', calls),
    customNote: createElement('custom-note', calls),
    store,
  })
  store.setRoleOpen('legal-info', true)
  store.setRoleOpen('additional-text', true)
  store.setRoleOpen('game-title', true)

  store.setRoleOpen('legal-info', false)
  assert.equal(store.isRoleOpen('legal-info'), false)
  assert.equal(store.isRoleOpen('additional-text'), true)
  assert.equal(store.isRoleOpen('game-title'), true)

  requestDestination(store, {
    roleId: 'legal-info',
    focusTarget: 'disc:legal-text:copyright',
  })
  assert.equal(store.isRoleOpen('legal-info'), true)
  assert.equal(store.processPendingRequest(), 'target-focused')
  store.setRoleOpen('additional-text', false)
  requestDestination(store, {
    roleId: 'additional-text',
    focusTarget: 'disc:additional-text:custom-note',
  })
  assert.equal(store.isRoleOpen('additional-text'), true)
  assert.equal(store.isRoleOpen('legal-info'), true)
  assert.equal(store.isRoleOpen('game-title'), true)
})

test('replacement registrations survive stale cleanup and unregister cleanly', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const unregisterOld = registerTargets({
    copyright: createElement('old-copyright', calls),
    customNote: createElement('old-custom-note', calls),
    store,
  })
  const unregisterNew = registerTargets({
    copyright: createElement('new-copyright', calls),
    customNote: createElement('new-custom-note', calls),
    store,
  })
  unregisterOld()

  requestDestination(store, {
    roleId: 'legal-info',
    focusTarget: 'disc:legal-text:copyright',
  })
  assert.equal(store.processPendingRequest(), 'target-focused')
  requestDestination(store, {
    roleId: 'additional-text',
    focusTarget: 'disc:additional-text:custom-note',
  })
  assert.equal(store.processPendingRequest(), 'target-focused')
  assert.deepEqual(calls, [
    'new-copyright:focus:true',
    'new-copyright:scroll:nearest:auto',
    'new-custom-note:focus:true',
    'new-custom-note:scroll:nearest:auto',
  ])

  unregisterNew()
  requestDestination(store, {
    roleId: 'legal-info',
    focusTarget: 'disc:legal-text:copyright',
  })
  assert.equal(store.processPendingRequest(), 'unavailable')
  requestDestination(store, {
    roleId: 'additional-text',
    focusTarget: 'disc:additional-text:custom-note',
  })
  assert.equal(store.processPendingRequest(), 'unavailable')
})

test('missing fixed-row elements fall back to summaries once without retry', () => {
  const store = createEditorRoleFocusControllerStore()
  const calls: string[] = []
  const legalSummary = createElement('legal-summary', calls)
  const additionalSummary = createElement('additional-summary', calls)
  registerTargets({ copyright: null, customNote: null, store })
  store.registerRolePanel('legal-info', {
    detailsElement: () => null,
    summaryElement: () => legalSummary,
  })
  store.registerRolePanel('additional-text', {
    detailsElement: () => null,
    summaryElement: () => additionalSummary,
  })

  assert.doesNotThrow(() => {
    requestDestination(store, {
      roleId: 'legal-info',
      focusTarget: 'disc:legal-text:copyright',
    })
    assert.equal(store.processPendingRequest(), 'role-summary-fallback')
    assert.equal(store.processPendingRequest(), 'no-pending-request')
    requestDestination(store, {
      roleId: 'additional-text',
      focusTarget: 'disc:additional-text:custom-note',
    })
    assert.equal(store.processPendingRequest(), 'role-summary-fallback')
    assert.equal(store.processPendingRequest(), 'no-pending-request')
  })
  assert.deepEqual(calls, [
    'legal-summary:focus:true',
    'legal-summary:scroll:nearest:auto',
    'additional-summary:focus:true',
    'additional-summary:scroll:nearest:auto',
  ])
})

test('fixed-row adapters reuse the existing direct checkbox ref contract', () => {
  assert.match(legalAdapterSource, /useRef<HTMLInputElement \| null>\(null\)/)
  assert.match(legalAdapterSource, /registerDiscLegalInfoFocusTarget/)
  assert.match(legalAdapterSource, /enableControlRef=\{copyrightRef\}/)
  assert.match(
    additionalAdapterSource,
    /useRef<HTMLInputElement \| null>\(null\)/,
  )
  assert.match(
    additionalAdapterSource,
    /registerDiscAdditionalTextFocusTarget/,
  )
  assert.match(
    additionalAdapterSource,
    /customNoteEnableControlRef=\{customNoteRef\}/,
  )
  assert.match(legalControlsSource, /enableControlRef\?: Ref<HTMLInputElement>/)
  assert.match(legalControlsSource, /enableControlRef=\{enableControlRef\}/)
  assert.match(
    additionalControlsSource,
    /customNoteEnableControlRef\?: Ref<HTMLInputElement>/,
  )
  assert.match(
    additionalControlsSource,
    /textKey === 'customNote' \? customNoteEnableControlRef : undefined/,
  )
  assert.match(discTextControlSource, /ref=\{enableControlRef\}/)
  assert.doesNotMatch(registrationSource, /openAncestors|fallbackFocusTarget/)
})

test('production integration stays fixed-row-only and dependency-safe', () => {
  assert.match(
    appSource,
    /section\.id === 'legal-info'[\s\S]*<DiscLegalInfoRoleControls textControls=\{textPanelProps\} \/>/,
  )
  assert.match(
    appSource,
    /section\.id === 'additional-text'[\s\S]*<DiscAdditionalTextRoleControls textControls=\{textPanelProps\} \/>/,
  )
  assert.match(
    appSource,
    /section\.id === 'game-info-logos'[\s\S]*<DiscGameInfoRatingControls[\s\S]*brandingControls=\{brandingPanelProps\}/,
  )
  assert.match(
    appSource,
    /section\.id === 'company-logos'[\s\S]*<CompanyLogoControls \{\.\.\.brandingPanelProps\} \/>/,
  )
  assert.match(
    appSource,
    /section\.id === 'additional-artwork'[\s\S]*<AdditionalArtworkControls \{\.\.\.artworkPanelProps\} \/>/,
  )
  assert.doesNotMatch(caseInsertSource, /DiscLegalInfoRoleControls/)
  assert.doesNotMatch(caseInsertSource, /DiscAdditionalTextRoleControls/)

  const combinedSource = [
    legalAdapterSource,
    additionalAdapterSource,
    registrationSource,
  ].join('\n')
  const forbiddenDependencies = [
    'document.',
    'querySelector',
    'querySelectorAll',
    'getElementById',
    '.closest(',
    '.click(',
    'setTimeout',
    'setInterval',
    'MutationObserver',
    'requestAnimationFrame',
    'registerFocusTargetFallback',
    'openAncestors',
    'projectSchema',
    'createProjectSnapshot',
    'restoreProject',
    'render/',
    'export/',
    'DiscPreview',
    'previewEditableRegistry',
    'selectedDiscTextKey',
    'contextualTextRibbon',
    'handleDiscTextPreviewEditStart',
    'caseInsert',
    'autoFill',
    'fetch(',
  ]

  for (const forbiddenDependency of forbiddenDependencies) {
    assert.equal(
      combinedSource.includes(forbiddenDependency),
      false,
      `unexpected dependency: ${forbiddenDependency}`,
    )
  }
})
