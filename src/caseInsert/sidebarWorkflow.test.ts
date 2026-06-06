import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCaseInsertSidebarStatusLabel,
  getCaseInsertSidebarWorkflow,
} from './sidebarWorkflow.ts'

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
