import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CASE_INSERT_TEXT_FONT_SIZE_PT_PRESETS,
  caseInsertExportPxToFontSizePt,
  caseInsertFontSizePtToExportPx,
  getCaseInsertLayoutFontSizePt,
  getCaseInsertTextSizeRoleFromId,
  getLegacyCaseInsertScaleFontSizePt,
} from './textSizing.ts'
import {
  applyCaseInsertTextBlockLayoutPreset,
} from './textLayout.ts'
import {
  createDefaultCaseInsertTextStyle,
} from './textStyles.ts'

test('case insert text point sizes convert through the template export dpi', () => {
  assert.equal(caseInsertFontSizePtToExportPx(12), 50)
  assert.equal(caseInsertExportPxToFontSizePt(50), 12)
  assert.equal(caseInsertFontSizePtToExportPx(8), 100 / 3)
  assert.equal(caseInsertFontSizePtToExportPx(72), 300)
})

test('case insert text size presets are explicit typographic point values', () => {
  assert.deepEqual(
    [...CASE_INSERT_TEXT_FONT_SIZE_PT_PRESETS],
    [
      8,
      9,
      10,
      11,
      12,
      14,
      16,
      18,
      20,
      22,
      24,
      26,
      28,
      32,
      36,
      40,
      48,
      54,
      60,
      66,
      72,
    ],
  )
})

test('case insert text roles provide readable tray defaults without affecting legal copy', () => {
  assert.equal(
    getCaseInsertLayoutFontSizePt({}, getCaseInsertTextSizeRoleFromId('tray-title-text')),
    24,
  )
  assert.equal(
    getCaseInsertLayoutFontSizePt(
      {},
      getCaseInsertTextSizeRoleFromId('tray-backup-date'),
    ),
    12,
  )
  assert.equal(
    getCaseInsertLayoutFontSizePt(
      {},
      getCaseInsertTextSizeRoleFromId('tray-minimum-requirements'),
    ),
    10,
  )
  assert.equal(
    getCaseInsertLayoutFontSizePt(
      {},
      getCaseInsertTextSizeRoleFromId('tray-copyright-text'),
    ),
    8,
  )
  assert.equal(
    getCaseInsertLayoutFontSizePt(
      {},
      getCaseInsertTextSizeRoleFromId('left-spine-title-text', 'spineTitle'),
    ),
    16,
  )
  assert.equal(
    getCaseInsertLayoutFontSizePt(
      {},
      getCaseInsertTextSizeRoleFromId('left-spine-copyright-text', 'spineTitle'),
    ),
    8,
  )
})

test('legacy scale-only case insert text migrates to point sizes without using new defaults', () => {
  assert.equal(getLegacyCaseInsertScaleFontSizePt('trayTitle', 1.18), 8.496)
  assert.equal(getLegacyCaseInsertScaleFontSizePt('trayLegal', 0.42), 6)
  assert.equal(getLegacyCaseInsertScaleFontSizePt('spineTitle', 1), 7.7)
})

test('case insert layout presets preserve explicit point size and scale', () => {
  const textBlock = {
    id: 'cover-title-text',
    label: 'Title',
    enabled: true,
    value: 'Title',
    source: 'manual' as const,
    align: 'left' as const,
    avoidVisualElements: false,
    layout: {
      scale: 0.5,
      fontSizePt: 72,
      width: 40,
      x: 12,
      y: 88,
      rotation: 0,
    },
    style: createDefaultCaseInsertTextStyle('title'),
  }

  const updated = applyCaseInsertTextBlockLayoutPreset(
    'cover',
    textBlock,
    'disc-title-top',
  )

  assert.equal(updated.layout.fontSizePt, 72)
  assert.equal(updated.layout.scale, 0.5)
  assert.equal(updated.layout.x, 50)
  assert.equal(updated.layout.y, 19.5)
  assert.equal(updated.layout.width, 62)
})

