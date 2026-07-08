import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCaseInsertSidebarLegacyPanels,
  getCaseInsertSidebarSetupPanels,
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
      'Template',
      'Game',
    ],
  )
})

test('tray card case sidebar gives each editable surface a main panel', () => {
  assert.deepEqual(
    getCaseInsertSidebarWorkflow('tray').map((panel) => panel.label),
    [
      'Project File',
      'Export Options',
      'Template',
      'Game',
      'Spine — Migrating Soon',
    ],
  )
})

test('case sidebar exposes setup panels separately from legacy migration panels', () => {
  assert.deepEqual(
    getCaseInsertSidebarSetupPanels('tray').map((panel) => panel.label),
    [
      'Project File',
      'Export Options',
      'Template',
      'Game',
    ],
  )
  assert.deepEqual(
    getCaseInsertSidebarLegacyPanels('tray').map((panel) => panel.label),
    [
      'Spine — Migrating Soon',
    ],
  )
  assert.deepEqual(
    getCaseInsertSidebarLegacyPanels('cover').map((panel) => panel.label),
    [],
  )
})

test('case sidebar panels start closed by default', () => {
  assert.deepEqual(
    getCaseInsertSidebarWorkflow('cover').map((panel) => panel.openByDefault),
    [undefined, undefined, undefined, undefined],
  )
  assert.deepEqual(
    getCaseInsertSidebarWorkflow('tray').map((panel) => panel.openByDefault),
    [undefined, undefined, undefined, undefined, undefined],
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

test('case insert legacy artwork panels expose only unmigrated sections', () => {
  assert.deepEqual(
    getCaseInsertArtworkPanelSectionLabels('cover'),
    [],
  )
  assert.deepEqual(
    getCaseInsertArtworkPanelSectionLabels('tray'),
    [],
  )
  assert.deepEqual(
    getCaseInsertArtworkPanelSectionLabels('spine'),
    [],
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
