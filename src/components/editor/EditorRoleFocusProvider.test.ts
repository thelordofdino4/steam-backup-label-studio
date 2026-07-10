import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const providerSource = readFileSync(
  new URL('./EditorRoleFocusProvider.tsx', import.meta.url),
  'utf8',
)
const contextSource = readFileSync(
  new URL('./editorRoleFocusContext.ts', import.meta.url),
  'utf8',
)

test('provider creates one transient store per mount and observes immutable state', () => {
  assert.match(
    providerSource,
    /useState\(\(\) => createEditorRoleFocusControllerStore\(\)\)/,
  )
  assert.match(providerSource, /useSyncExternalStore\(/)
  assert.match(providerSource, /store\.subscribe/)
  assert.match(providerSource, /store\.getSnapshot/)
})

test('provider uses one bounded layout-effect processing phase', () => {
  assert.match(providerSource, /useLayoutEffect\(\(\) => \{/)
  assert.match(providerSource, /store\.processPendingRequest\(\)/)
  assert.match(providerSource, /\[state\.pendingRequest, store\]/)
  assert.doesNotMatch(providerSource, /useEffect\(|useReducer\(/)
})

test('provider exposes controller actions without registration maps', () => {
  assert.match(providerSource, /requestRoleFocus: store\.requestRoleFocus/)
  assert.match(providerSource, /setRoleOpen: store\.setRoleOpen/)
  assert.match(providerSource, /isRoleOpen: store\.isRoleOpen/)
  assert.match(providerSource, /registerRolePanel: store\.registerRolePanel/)
  assert.match(providerSource, /registerFocusTarget: store\.registerFocusTarget/)
  assert.doesNotMatch(providerSource, /roleRegistrations|focusTargetRegistrations/)
})

test('strict and optional consumer hooks follow context safety conventions', () => {
  assert.match(
    contextSource,
    /createContext<EditorRoleFocusController \| null>\(null\)/,
  )
  assert.match(
    contextSource,
    /useEditorRoleFocus must be used inside EditorRoleFocusProvider/,
  )
  assert.match(contextSource, /export function useOptionalEditorRoleFocus\(\)/)
})

test('provider remains isolated from app, production panels, previews, persistence, and retries', () => {
  const combinedSource = `${providerSource}\n${contextSource}`
  const forbiddenDependencies = [
    'App.tsx',
    'EditorPanel',
    'EditorNavigationRolePanel',
    'guidedPresets',
    'DiscPreview',
    'previewEditableRegistry',
    'useDiscText',
    'contextualTextRibbon',
    'projectSchema',
    'createProjectSnapshot',
    'restoreProject',
    'render/',
    'export/',
    'caseInsert',
    'querySelector',
    '.closest(',
    '.click(',
    'setTimeout',
    'MutationObserver',
    'requestAnimationFrame',
  ]

  for (const forbiddenDependency of forbiddenDependencies) {
    assert.equal(
      combinedSource.includes(forbiddenDependency),
      false,
      `unexpected dependency: ${forbiddenDependency}`,
    )
  }
})
