import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCaseInsertTextBackgroundColor,
  getCaseInsertTextBorderCss,
} from '../caseInsert/textRenderStyles.ts'
import { createDefaultCaseInsertTextStyle } from '../caseInsert/textStyles.ts'
import {
  drawComputedTextLayout,
  getCaseInsertTextCanvasOptions,
} from './caseInsertPngText.ts'

const layout = {
  bounds: { x: 10, y: 15, width: 40, height: 20 },
  fontSizePx: 20,
  lineHeightPx: 24,
  lines: [],
}
const box = [10, 15, 40, 20]

test('Case text uses independent background and border paint in preview and PNG', () => {
  for (const target of ['title', 'features', 'spine'] as const) {
    for (const backgroundEnabled of [false, true]) {
      for (const borderEnabled of [false, true]) {
        const style = {
          ...createDefaultCaseInsertTextStyle(target),
          backgroundEnabled,
          backgroundColor: '#123456',
          backgroundOpacity: 0.25,
          borderEnabled,
          borderColor: '#fedcba',
          contrast: 'none' as const,
        }

        const description = `${target}: background=${backgroundEnabled}, border=${borderEnabled}`
        const fill = 'rgba(18, 52, 86, 0.25)'
        const border = 'rgba(254, 220, 186, 0.86)'
        assert.equal(getCaseInsertTextBackgroundColor(style), backgroundEnabled ? fill : 'transparent', description)
        assert.equal(getCaseInsertTextBorderCss(style), borderEnabled ? `1px solid ${border}` : '0', description)

        const paint: Array<[string, string | CanvasGradient | CanvasPattern, number[]]> = []
        const recorder = {
          save() {},
          restore() {},
          fillStyle: '',
          strokeStyle: '',
          fillRect(...bounds: number[]) {
            paint.push(['fill', this.fillStyle, bounds])
          },
          strokeRect(...bounds: number[]) {
            paint.push(['stroke', this.strokeStyle, bounds])
          },
        }
        drawComputedTextLayout(recorder as unknown as CanvasRenderingContext2D, layout, {
          align: 'center',
          ...getCaseInsertTextCanvasOptions(style),
        })
        const expected = []
        if (backgroundEnabled) expected.push(['fill', fill, box])
        if (borderEnabled) expected.push(['stroke', border, box])
        assert.deepEqual(paint, expected, description)
      }
    }
  }
})
