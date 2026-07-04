import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultProjectJewelCaseState,
} from '../caseInsert/defaults.ts'
import {
  createJewelCasePreviewLayout,
} from './caseInsertPreviewLayout.ts'
import {
  getJewelCaseFrontBackgroundFit,
} from './jewelCaseFrontLayout.ts'
import {
  getJewelCaseSpineBackgroundFit,
} from './jewelCaseSpineLayout.ts'
import {
  getJewelCaseSteamBannerOpenArtworkRegion,
  getJewelCaseSteamBannerVisualLayout,
} from './jewelCaseSteamBannerLayout.ts'

function roundedRect(rect: {
  x: number
  y: number
  width: number
  height: number
}) {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}

test('cover sheet Steam banner uses the requested SGC pixel geometry', () => {
  const caseInsert = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')
  const bannerLayout = getJewelCaseSteamBannerVisualLayout(
    caseInsert.templates.cover.steamBanner,
    { kind: 'cover' },
    layout,
  )

  assert.ok(bannerLayout)
  assert.deepEqual(roundedRect(bannerLayout.mainBand), {
    x: 0,
    y: 0,
    width: 1414,
    height: 155,
  })
  assert.deepEqual(roundedRect(bannerLayout.accentBand), {
    x: 0,
    y: 155,
    width: 1414,
    height: 21,
  })
  assert.deepEqual(roundedRect(bannerLayout.lockupRect), {
    x: 54,
    y: 20,
    width: 378,
    height: 116,
  })
})

test('Steam banner lockup layout falls back for invalid numeric values', () => {
  const caseInsert = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')
  const bannerLayout = getJewelCaseSteamBannerVisualLayout(
    {
      ...caseInsert.templates.cover.steamBanner,
      lockupLayout: {
        ...caseInsert.templates.cover.steamBanner.lockupLayout,
        scale: Number.NaN,
        x: Number.POSITIVE_INFINITY,
        y: Number.NEGATIVE_INFINITY,
      },
    },
    { kind: 'cover' },
    layout,
  )

  assert.ok(bannerLayout)
  assert.deepEqual(roundedRect(bannerLayout.lockupRect), {
    x: 54,
    y: 20,
    width: 378,
    height: 116,
  })
})

test('tray-card spine Steam banners use independent left and right spine geometry', () => {
  const caseInsert = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const leftBannerLayout = getJewelCaseSteamBannerVisualLayout(
    caseInsert.spine.left.steamBanner,
    { kind: 'spine', side: 'left' },
    layout,
  )
  const rightBannerLayout = getJewelCaseSteamBannerVisualLayout(
    caseInsert.spine.right.steamBanner,
    { kind: 'spine', side: 'right' },
    layout,
  )

  assert.ok(leftBannerLayout)
  assert.ok(rightBannerLayout)
  assert.deepEqual(roundedRect(leftBannerLayout.mainBand), {
    x: 0,
    y: 0,
    width: 75,
    height: 156,
  })
  assert.deepEqual(roundedRect(leftBannerLayout.accentBand), {
    x: 0,
    y: 156,
    width: 75,
    height: 20,
  })
  assert.deepEqual(roundedRect(leftBannerLayout.lockupRect), {
    x: 9,
    y: 49,
    width: 57,
    height: 57,
  })
  assert.equal(leftBannerLayout.lockupRotationDegrees, 90)
  assert.deepEqual(roundedRect(rightBannerLayout.mainBand), {
    x: 1705,
    y: 0,
    width: 75,
    height: 156,
  })
  assert.deepEqual(roundedRect(rightBannerLayout.lockupRect), {
    x: 1714,
    y: 49,
    width: 57,
    height: 57,
  })
  assert.equal(rightBannerLayout.lockupRotationDegrees, 90)
})

test('disabled case insert Steam banners do not produce visual layout', () => {
  const caseInsert = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')

  assert.equal(
    getJewelCaseSteamBannerVisualLayout(
      {
        ...caseInsert.templates.cover.steamBanner,
        enabled: false,
      },
      { kind: 'cover' },
      layout,
    ),
    null,
  )
})

test('cover sheet open artwork region starts below enabled Steam banner', () => {
  const caseInsert = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')
  const openRegion = getJewelCaseSteamBannerOpenArtworkRegion(
    caseInsert.templates.cover.steamBanner,
    { kind: 'cover' },
    layout,
  )

  assert.deepEqual(openRegion && roundedRect(openRegion), {
    x: 0,
    y: 176,
    width: 1414,
    height: 1238,
  })
})

test('spine open artwork regions start below each enabled Steam banner', () => {
  const caseInsert = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const leftOpenRegion = getJewelCaseSteamBannerOpenArtworkRegion(
    caseInsert.spine.left.steamBanner,
    { kind: 'spine', side: 'left' },
    layout,
  )
  const rightOpenRegion = getJewelCaseSteamBannerOpenArtworkRegion(
    caseInsert.spine.right.steamBanner,
    { kind: 'spine', side: 'right' },
    layout,
  )

  assert.deepEqual(leftOpenRegion && roundedRect(leftOpenRegion), {
    x: 0,
    y: 176,
    width: 75,
    height: 1214,
  })
  assert.deepEqual(rightOpenRegion && roundedRect(rightOpenRegion), {
    x: 1705,
    y: 176,
    width: 75,
    height: 1214,
  })
})

test('disabled Steam banner open artwork region falls back to full target', () => {
  const caseInsert = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')
  const openRegion = getJewelCaseSteamBannerOpenArtworkRegion(
    {
      ...caseInsert.templates.cover.steamBanner,
      enabled: false,
    },
    { kind: 'cover' },
    layout,
  )

  assert.deepEqual(openRegion && roundedRect(openRegion), {
    x: 0,
    y: 0,
    width: 1414,
    height: 1414,
  })
})

test('cover background fit can target the Steam-banner open artwork region', () => {
  const caseInsert = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')
  const fit = getJewelCaseFrontBackgroundFit(
    {
      ...caseInsert.templates.cover.background,
      enabled: true,
      imageDataUrl: 'data:image/png;base64,cover',
      imageSize: { width: 1414, height: 1414 },
      fit: 'cover',
    },
    layout,
    caseInsert.templates.cover.steamBanner,
  )

  assert.ok(fit)
  assert.deepEqual(roundedRect(fit.region), {
    x: 0,
    y: 176,
    width: 1414,
    height: 1238,
  })
})

test('spine background fit can target the Steam-banner open artwork region', () => {
  const caseInsert = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const fit = getJewelCaseSpineBackgroundFit(
    'right',
    {
      ...caseInsert.spine.right.background,
      enabled: true,
      imageDataUrl: 'data:image/png;base64,spine',
      imageSize: { width: 75, height: 1390 },
      fit: 'cover',
    },
    layout,
    caseInsert.spine.right.steamBanner,
  )

  assert.ok(fit)
  assert.deepEqual(roundedRect(fit.region), {
    x: 1705,
    y: 176,
    width: 75,
    height: 1214,
  })
})
