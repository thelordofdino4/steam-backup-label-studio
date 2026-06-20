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
      getCaseInsertTextSizeRoleFromId('tray-copyright-text'),
    ),
    8,
  )
  assert.equal(
    getCaseInsertLayoutFontSizePt(
      {},
      getCaseInsertTextSizeRoleFromId('left-spine-title-text', 'spineTitle'),
    ),
    18,
  )
})

test('legacy scale-only case insert text migrates to point sizes without using new defaults', () => {
  assert.equal(getLegacyCaseInsertScaleFontSizePt('trayTitle', 1.18), 8.496)
  assert.equal(getLegacyCaseInsertScaleFontSizePt('trayLegal', 0.42), 6)
})

