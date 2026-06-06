import assert from 'node:assert/strict'
import test from 'node:test'
import {
  countSelectedCaseInsertExportGuideOptions,
  getCaseInsertExportGuideOptions,
  isCaseInsertExportGuideOptionSelected,
} from './exportGuideOptions.ts'

test('case insert export guide options keep spine choices off cover sheets', () => {
  const coverOptions = getCaseInsertExportGuideOptions('jewelCase', 'cover')

  assert.deepEqual(
    coverOptions.map(({ label }) => label),
    ['Show trim bounds', 'Show safe zone'],
  )
  assert.equal(
    coverOptions.some((option) =>
      option.guideIds.some((guideId) => guideId.includes('Spine'))),
    false,
  )
})

test('case insert export guide options group tray spine guides simply', () => {
  const trayOptions = getCaseInsertExportGuideOptions('jewelCase', 'tray')

  assert.deepEqual(
    trayOptions.map(({ label }) => label),
    [
      'Show trim bounds',
      'Show safe zones',
      'Show spine bounds',
      'Show spine safe zones',
    ],
  )
  assert.deepEqual(
    trayOptions.find(({ id }) => id === 'tray-spine-bounds')?.guideIds,
    ['leftSpineBounds', 'rightSpineBounds'],
  )
  assert.deepEqual(
    trayOptions.find(({ id }) => id === 'tray-spine-safe')?.guideIds,
    ['leftSpineSafeBounds', 'rightSpineSafeBounds'],
  )
})

test('case insert export guide option selected state requires the full group', () => {
  const trayOptions = getCaseInsertExportGuideOptions('jewelCase', 'tray')
  const spineBounds = trayOptions.find(({ id }) => id === 'tray-spine-bounds')

  assert.ok(spineBounds)
  assert.equal(
    isCaseInsertExportGuideOptionSelected(
      spineBounds,
      new Set(['leftSpineBounds']),
    ),
    false,
  )
  assert.equal(
    countSelectedCaseInsertExportGuideOptions(trayOptions, [
      'leftSpineBounds',
      'rightSpineBounds',
      'leftSpineSafeBounds',
      'rightSpineSafeBounds',
    ]),
    2,
  )
})
