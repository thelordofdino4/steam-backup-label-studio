import assert from 'node:assert/strict'
import test from 'node:test'
import { getBackgroundFitToSteamBannerOpenArea } from './backgroundArtworkFit.ts'

test('fits background into the open area below a top Steam banner', () => {
  const fit = getBackgroundFitToSteamBannerOpenArea({
    imageSize: { width: 600, height: 600 },
    previewSize: 600,
    steamLogoPlacement: 'top',
  })

  assert.ok(fit)
  assert.equal(fit.offset.x, 0)
  assert.equal(fit.scale < 1, true)
  assert.equal(fit.offset.y > 0, true)
})

test('fits background into the open area above a bottom Steam banner', () => {
  const fit = getBackgroundFitToSteamBannerOpenArea({
    imageSize: { width: 600, height: 600 },
    previewSize: 600,
    steamLogoPlacement: 'bottom',
  })

  assert.ok(fit)
  assert.equal(fit.offset.x, 0)
  assert.equal(fit.scale < 1, true)
  assert.equal(fit.offset.y < 0, true)
})

test('fits background edge-to-edge when the Steam banner is hidden', () => {
  const fit = getBackgroundFitToSteamBannerOpenArea({
    imageSize: { width: 600, height: 600 },
    previewSize: 600,
    steamLogoPlacement: 'none',
  })

  assert.deepEqual(fit, {
    scale: 1,
    offset: {
      x: 0,
      y: 0,
    },
  })
})
