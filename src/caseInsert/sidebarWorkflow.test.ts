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
import {
  CASE_INSERT_MARK_BRANDING_SECTIONS,
} from './brandingPanelSections.ts'

test('cover sheet case sidebar mirrors the core editor flow', () => {
  assert.deepEqual(
    getCaseInsertSidebarWorkflow('cover').map((panel) => panel.label),
    [
      'Project File',
      'Export Options',
      'Game',
      'Template',
      'Cover Sheet',
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
    ],
  )
})

test('case sidebar panels start closed by default', () => {
  assert.deepEqual(
    getCaseInsertSidebarWorkflow('cover').map((panel) => panel.openByDefault),
    [undefined, undefined, undefined, undefined, undefined],
  )
  assert.deepEqual(
    getCaseInsertSidebarWorkflow('tray').map((panel) => panel.openByDefault),
    [undefined, undefined, undefined, undefined, undefined, undefined],
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

test('case insert mark branding panels do not expose artwork slot controls', () => {
  assert.deepEqual(
    CASE_INSERT_MARK_BRANDING_SECTIONS.map(({ title, markKind }) => ({
      title,
      markKind,
    })),
    [
      { title: 'Rating badge', markKind: 'rating' },
      { title: 'Media format mark', markKind: 'media' },
      { title: 'Operating system marks', markKind: 'platform' },
      { title: 'Technical marks', markKind: 'technical' },
    ],
  )

  for (const section of CASE_INSERT_MARK_BRANDING_SECTIONS) {
    assert.equal('addLabel' in section, false)
    assert.equal('emptyHint' in section, false)
    assert.equal('sourceSectionIds' in section, false)
  }
})
