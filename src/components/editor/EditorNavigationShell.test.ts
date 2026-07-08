import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  getCaseInsertNavigationSurfaceTabItems,
} from './editorNavigationShellViewModel.ts'

const shellSource = readFileSync(
  'src/components/editor/EditorNavigationShell.tsx',
  'utf8',
)

test('case insert surface tabs hide one-tab tablists', () => {
  const oneSurfaceItem = getCaseInsertNavigationSurfaceTabItems('front', [
    'front',
  ])

  assert.equal(oneSurfaceItem.length, 1)
  assert.match(
    shellSource,
    /supportedSurfaceIds\?: readonly CaseInsertNavigationSurfaceId\[\]/,
  )
  assert.match(
    shellSource,
    /getCaseInsertNavigationSurfaceTabItems\(\s*activeSurfaceId,\s*supportedSurfaceIds,\s*\)/,
  )
  assert.match(
    shellSource,
    /if \(surfaceItems\.length <= 1\) \{\s*return null\s*\}/,
  )
})

test('case insert surface tabs render only supplied multi-tab view model items', () => {
  const surfaceItems = getCaseInsertNavigationSurfaceTabItems('spine', [
    'back',
    'spine',
  ])

  assert.deepEqual(
    surfaceItems.map(({ id, label, active }) => ({ id, label, active })),
    [
      { id: 'back', label: 'Back', active: false },
      { id: 'spine', label: 'Spine', active: true },
    ],
  )
  assert.match(shellSource, /role="tablist"/)
  assert.match(shellSource, /surfaceItems\.map\(\(surface\) =>/)
  assert.match(shellSource, /role="tab"/)
  assert.match(shellSource, /onClick=\{\(\) => onSurfaceChange\(surface\.id\)\}/)
  assert.doesNotMatch(shellSource, /disabled/)
})

test('case insert surface tabs omit unsupported tabs through supported surface ids', () => {
  const surfaceItems = getCaseInsertNavigationSurfaceTabItems('back', [
    'back',
    'spine',
  ])

  assert.deepEqual(
    surfaceItems.map(({ id, label }) => ({ id, label })),
    [
      { id: 'back', label: 'Back' },
      { id: 'spine', label: 'Spine' },
    ],
  )
  assert.equal(
    surfaceItems.some(({ id }) => id === 'front'),
    false,
  )
})
