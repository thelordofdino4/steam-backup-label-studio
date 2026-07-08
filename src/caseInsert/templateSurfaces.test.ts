import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CASE_INSERT_TEMPLATE_PANE_IDS,
  getCaseInsertSupportedNavigationSurfacesForPane,
  isCaseInsertTemplatePaneId,
  isCaseInsertNavigationSurfaceSupportedForPane,
  normalizeCaseInsertNavigationSurfaceForPane,
} from './templateSurfaces.ts'

test('cover pane supports only the front navigation surface', () => {
  assert.deepEqual(
    getCaseInsertSupportedNavigationSurfacesForPane('cover'),
    ['front'],
  )
})

test('tray pane supports back and shell-local spine navigation surfaces', () => {
  assert.deepEqual(
    getCaseInsertSupportedNavigationSurfacesForPane('tray'),
    ['back', 'spine'],
  )
})

test('spine navigation does not create a persisted template pane', () => {
  assert.deepEqual(CASE_INSERT_TEMPLATE_PANE_IDS, ['cover', 'tray'])
  assert.equal(isCaseInsertTemplatePaneId('spine'), false)
})

test('template pane navigation support checks stay pane-owned', () => {
  assert.equal(
    isCaseInsertNavigationSurfaceSupportedForPane('cover', 'front'),
    true,
  )
  assert.equal(
    isCaseInsertNavigationSurfaceSupportedForPane('cover', 'spine'),
    false,
  )
  assert.equal(
    isCaseInsertNavigationSurfaceSupportedForPane('tray', 'back'),
    true,
  )
  assert.equal(
    isCaseInsertNavigationSurfaceSupportedForPane('tray', 'spine'),
    true,
  )
  assert.equal(
    isCaseInsertNavigationSurfaceSupportedForPane('tray', 'front'),
    false,
  )
})

test('template pane navigation normalizes unsupported active surfaces safely', () => {
  assert.equal(
    normalizeCaseInsertNavigationSurfaceForPane('cover', 'spine'),
    'front',
  )
  assert.equal(
    normalizeCaseInsertNavigationSurfaceForPane('tray', 'front'),
    'back',
  )
  assert.equal(
    normalizeCaseInsertNavigationSurfaceForPane('tray', 'spine'),
    'spine',
  )
  assert.equal(
    normalizeCaseInsertNavigationSurfaceForPane('tray', 'back'),
    'back',
  )
})
