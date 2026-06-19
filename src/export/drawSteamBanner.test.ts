import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_STEAM_BANNER_COLORS,
  DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
} from '../branding/steamBannerDefaults.ts'
import { drawSteamBrandBanner } from './drawSteamBanner.ts'

type FillTextCall = [
  text: string,
  x: number,
  y: number,
  maxWidth?: number,
]

function createSteamBannerContext() {
  const drawImageCalls: unknown[][] = []
  const fillRectCalls: Array<[number, number, number, number]> = []
  const fillTextCalls: FillTextCall[] = []

  return {
    drawImageCalls,
    fillRectCalls,
    fillTextCalls,
    context: {
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
      fillRect: (...args: [number, number, number, number]) => {
        fillRectCalls.push(args)
      },
      drawImage: (...args: unknown[]) => {
        drawImageCalls.push(args)
      },
      measureText: (text: string) => ({ width: text.length * 8 }),
      save: () => {},
      restore: () => {},
      fillText: (...args: FillTextCall) => {
        fillTextCalls.push(args)
      },
    } as unknown as CanvasRenderingContext2D,
  }
}

test('disabled Steam banner is omitted from disc PNG export', async () => {
  const { context, drawImageCalls, fillRectCalls, fillTextCalls } =
    createSteamBannerContext()

  await drawSteamBrandBanner(
    context,
    1000,
    0,
    'none',
    DEFAULT_STEAM_BANNER_COLORS,
    'default-lockup.png',
    null,
    DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
    false,
    'STEAM',
  )

  assert.equal(fillRectCalls.length, 0)
  assert.equal(drawImageCalls.length, 0)
  assert.equal(fillTextCalls.length, 0)
})

test('Steam banner export falls back to text when the lockup image fails', async () => {
  const { context, fillTextCalls } = createSteamBannerContext()

  await drawSteamBrandBanner(
    context,
    1000,
    0,
    'top',
    DEFAULT_STEAM_BANNER_COLORS,
    'stale-lockup.png',
    null,
    DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
    false,
    'Taihazu Archive',
    async () => {
      throw new Error('Stale lockup asset')
    },
  )

  assert.equal(fillTextCalls.length, 1)
  assert.equal(fillTextCalls[0][0], 'Taihazu Archive')
})
