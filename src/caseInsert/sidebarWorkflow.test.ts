import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCaseInsertSidebarStatusLabel,
  getCaseInsertSidebarWorkflow,
} from './sidebarWorkflow.ts'
import {
  CASE_INSERT_ARTWORK_SOURCE_PANEL_LABELS,
  getCaseInsertArtworkPanelSectionLabels,
} from './artworkPanelSections.ts'

test('cover sheet case sidebar mirrors the core editor flow', () => {
  assert.deepEqual(
    getCaseInsertSidebarWorkflow('cover').map((panel) => panel.label),
    [
      'Project File',
      'Export Options',
      'Game',
      'Template',
      'Cover Sheet',
      'Guide Legend',
    ],
  )
})

test('tray card case sidebar gives each editable surface a main panel', () => {
  assert.deepEqual(
    getCaseInsertSidebarWorkflow('tray').map((panel) => panel.label),
    [
      'Project File',
      'Export Options',
      'Game',
      'Template',
      'Tray Card',
      'Spine',
      'Guide Legend',
    ],
  )
})

test('case sidebar panels start closed by default', () => {
  assert.deepEqual(
    getCaseInsertSidebarWorkflow('cover').map((panel) => panel.openByDefault),
    [undefined, undefined, undefined, undefined, undefined, undefined],
  )
  assert.deepEqual(
    getCaseInsertSidebarWorkflow('tray').map((panel) => panel.openByDefault),
    [undefined, undefined, undefined, undefined, undefined, undefined, undefined],
  )
})

test('case sidebar status label makes the active template clear', () => {
  assert.equal(
    getCaseInsertSidebarStatusLabel('cover'),
    'Alpha jewel case editor - Cover Sheet',
  )
  assert.equal(
    getCaseInsertSidebarStatusLabel('tray'),
    'Alpha jewel case editor - Tray Card',
  )
})

test('case insert artwork panels mirror disc artwork section hierarchy', () => {
  assert.deepEqual(
    getCaseInsertArtworkPanelSectionLabels('cover'),
    ['Background', 'Game Logo', 'Additional Artwork'],
  )
  assert.deepEqual(
    getCaseInsertArtworkPanelSectionLabels('tray'),
    ['Background', 'Game Logo', 'Additional Artwork'],
  )
  assert.deepEqual(
    getCaseInsertArtworkPanelSectionLabels('spine'),
    ['Background', 'Game Logo', 'Additional Artwork'],
  )
})

test('case insert artwork source panels keep disc source group labels', () => {
  assert.deepEqual(
    Object.values(CASE_INSERT_ARTWORK_SOURCE_PANEL_LABELS),
    [
      'Imported Steam artwork',
      'Web artwork',
      'Local Steam screenshots',
      'Local file',
    ],
  )
})
