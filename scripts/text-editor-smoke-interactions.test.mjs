import assert from 'node:assert/strict'
import test from 'node:test'
import {
  expectAttached,
  expectVisible,
  smoke,
  visibleSmoke,
} from './text-editor-smoke-interactions.mjs'

function createMockPage(count = 1) {
  const selectors = []
  const waits = []
  const locator = {
    count: async () => count,
    first: () => locator,
    waitFor: async (options) => {
      waits.push(options)
    },
  }

  return {
    locator,
    page: {
      locator: (selector) => {
        selectors.push(selector)
        return locator
      },
    },
    selectors,
    waits,
  }
}

test('text editor smoke interaction helpers build smoke selectors', () => {
  const { page, selectors } = createMockPage()

  smoke(page, 'inline-text-tabs')
  visibleSmoke(page, 'inline-text-tabs')

  assert.deepEqual(selectors, [
    '[data-smoke-id="inline-text-tabs"]',
    '[data-smoke-id="inline-text-tabs"]:visible',
  ])
})

test('text editor smoke attached assertion preserves failure wording', async () => {
  const { page } = createMockPage(0)

  await assert.rejects(
    expectAttached(page, 'inline-text-menu', 'inline text menu'),
    /inline text menu was not attached\./,
  )
})

test('text editor smoke visible assertion preserves wait state and failure wording', async () => {
  const { page, waits } = createMockPage(0)

  await assert.rejects(
    expectVisible(page, 'inline-text-menu', 'inline text menu'),
    /inline text menu was not visible\./,
  )
  assert.deepEqual(waits[0], { state: 'visible', timeout: 5_000 })
})
