import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultCaseInsertSteamBanner } from '../caseInsert/steamBanner.ts'
import { createJewelCasePreviewLayout } from '../layout/caseInsertPreviewLayout.ts'
import { drawCaseInsertSteamBanner } from './drawCaseInsertSteamBanner.ts'

type FillTextCall = [
  text: string,
  x: number,
  y: number,
  maxWidth?: number,
]

function createCaseInsertSteamBannerContext() {
  const fillRectCalls: Array<[number, number, number, number]> = []
  const fillTextCalls: FillTextCall[] = []

  return {
    fillRectCalls,
    fillTextCalls,
    context: {
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
      drawImage: () => {},
      fillRect: (...args: [number, number, number, number]) => {
        fillRectCalls.push(args)
      },
      fillText: (...args: FillTextCall) => {
        fillTextCalls.push(args)
      },
      measureText: (text: string) => ({ width: text.length * 8 }),
      rotate: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
    } as unknown as CanvasRenderingContext2D,
  }
}

test('disabled case insert Steam banner is omitted from PNG export', async () => {
  const { context, fillRectCalls, fillTextCalls } =
    createCaseInsertSteamBannerContext()
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')

  await drawCaseInsertSteamBanner(
    context,
    {
      ...createDefaultCaseInsertSteamBanner('cover'),
      enabled: false,
      useTextFallback: true,
    },
    { kind: 'cover' },
    layout,
  )

  assert.equal(fillRectCalls.length, 0)
  assert.equal(fillTextCalls.length, 0)
})

test('enabled case insert Steam banner participates in PNG export', async () => {
  const { context, fillRectCalls, fillTextCalls } =
    createCaseInsertSteamBannerContext()
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')

  await drawCaseInsertSteamBanner(
    context,
    {
      ...createDefaultCaseInsertSteamBanner('cover'),
      useTextFallback: true,
      fallbackText: 'Archive Build',
    },
    { kind: 'cover' },
    layout,
  )

  assert.equal(fillRectCalls.length, 2)
  assert.equal(fillTextCalls.length, 1)
  assert.equal(fillTextCalls[0]?.[0], 'Archive Build')
})
