import assert from 'node:assert/strict'
import test from 'node:test'
import { discTemplates } from '../templates/discTemplates.ts'
import { createProjectImageAssetProvenance } from './projectAssetStatus.ts'
import {
  addAdditionalLogoAsset,
  clearLogoAsset,
  createDefaultProjectLogoAssets,
  createLogoAssetRenderItems,
  getAdditionalLogoAssets,
  getLogoAssetLayout,
  getLogoAssetRenderDataUrl,
  getLogoAssetRenderSize,
  getLogoAssetSource,
  getPrimaryLogoAssetCanonicalVisualBounds,
  normalizeProjectLogoAssets,
  removeAdditionalLogoAsset,
  setLogoAssetImage,
  updateLogoAssetLayoutField,
} from './projectLogoAssets.ts'

const imageSize = { width: 512, height: 128 }

test('primary logo canonical bounds use the rendered fallback when no image is selected', () => {
  const defaults = createDefaultProjectLogoAssets()
  const withAdditional = addAdditionalLogoAsset(defaults, 'developer')

  assert.deepEqual(
    getPrimaryLogoAssetCanonicalVisualBounds(withAdditional, 'developer'),
    { halfWidth: 9, halfHeight: 3.375 },
  )
  assert.deepEqual(
    getPrimaryLogoAssetCanonicalVisualBounds(defaults, 'publisher'),
    { halfWidth: 9, halfHeight: 3.375 },
  )
})

test('restored primary logo images without valid dimensions fit from the preview/export fallback size', () => {
  for (const savedSizes of [
    {},
    {
      developerLogoSize: { width: 0, height: 180 },
      publisherLogoSize: { width: 480, height: 0 },
    },
  ]) {
    const restored = normalizeProjectLogoAssets({
      developerLogoDataUrl: 'data:image/png;base64,developer',
      developerLogoLayout: {
        enabled: true,
        scale: 1,
        x: 20,
        y: 60,
      },
      publisherLogoDataUrl: 'data:image/png;base64,publisher',
      publisherLogoLayout: {
        enabled: true,
        scale: 1,
        x: 20,
        y: 70,
      },
      ...savedSizes,
    })
    const renderItems = createLogoAssetRenderItems(restored)

    assert.equal(restored.developerLogoSize, null)
    assert.equal(restored.publisherLogoSize, null)

    for (const logoKey of ['developer', 'publisher'] as const) {
      const renderItem = renderItems.find((item) =>
        item.logoKey === logoKey && !item.additionalLogoId)

      assert.ok(renderItem)
      assert.deepEqual(getLogoAssetRenderSize(renderItem.imageSize), {
        width: 480,
        height: 180,
      })
      assert.deepEqual(
        getPrimaryLogoAssetCanonicalVisualBounds(restored, logoKey),
        { halfWidth: 9, halfHeight: 3.375 },
      )
    }
  }
})

test('primary logo canonical bounds preserve wide, tall, and square transparent content for both owners', () => {
  const variants = [
    {
      contentBounds: { x: 100, y: 100, width: 800, height: 200 },
      expected: { halfWidth: 9, halfHeight: 2.25 },
    },
    {
      contentBounds: { x: 400, y: 50, width: 200, height: 800 },
      expected: { halfWidth: 1.25, halfHeight: 5 },
    },
    {
      contentBounds: { x: 250, y: 250, width: 500, height: 500 },
      expected: { halfWidth: 5, halfHeight: 5 },
    },
  ]

  for (const logoKey of ['developer', 'publisher'] as const) {
    for (const [index, variant] of variants.entries()) {
      const logoAssets = setLogoAssetImage(
        createDefaultProjectLogoAssets(),
        logoKey,
        `data:image/png;base64,${logoKey}-${index}`,
        {
          width: 1000,
          height: 1000,
          contentBounds: variant.contentBounds,
        },
        createProjectImageAssetProvenance({
          source: logoKey === 'developer'
            ? 'uploaded'
            : 'official-logo-candidate',
          sourceLabel: `${logoKey}-${index}.png`,
        }),
      )
      const disabledAssets = updateLogoAssetLayoutField(
        logoAssets,
        logoKey,
        'enabled',
        false,
      )
      const bounds = getPrimaryLogoAssetCanonicalVisualBounds(
        disabledAssets,
        logoKey,
      )

      assert.deepEqual(bounds, variant.expected)
      assert.equal(
        bounds && bounds.halfWidth / bounds.halfHeight,
        variant.contentBounds.width / variant.contentBounds.height,
      )
    }
  }
})

test('disc logo assets preserve source data when disabled and restore on re-enable', () => {
  let logoAssets = setLogoAssetImage(
    createDefaultProjectLogoAssets(discTemplates.standardPrintableDisc),
    'developer',
    'data:image/png;base64,developer-logo',
    imageSize,
    createProjectImageAssetProvenance({
      source: 'uploaded',
      sourceLabel: 'developer-logo.png',
    }),
  )

  logoAssets = updateLogoAssetLayoutField(
    logoAssets,
    'developer',
    'enabled',
    false,
  )

  assert.equal(logoAssets.developerLogoDataUrl, 'data:image/png;base64,developer-logo')
  assert.equal(getLogoAssetSource(logoAssets, 'developer')?.sourceLabel, 'developer-logo.png')
  assert.deepEqual(createLogoAssetRenderItems(logoAssets), [])

  logoAssets = updateLogoAssetLayoutField(
    logoAssets,
    'developer',
    'enabled',
    true,
  )

  const [renderItem] = createLogoAssetRenderItems(logoAssets)
  assert.equal(renderItem?.label, 'Developer')
  assert.equal(renderItem?.imageDataUrl, 'data:image/png;base64,developer-logo')
})

test('disc primary logo assets preserve layout for developer and publisher while disabled', () => {
  let logoAssets = createDefaultProjectLogoAssets(discTemplates.standardPrintableDisc)

  ;(['developer', 'publisher'] as const).forEach((logoKey, index) => {
    logoAssets = setLogoAssetImage(
      logoAssets,
      logoKey,
      `data:image/png;base64,${logoKey}-logo`,
      imageSize,
      createProjectImageAssetProvenance({
        source: 'uploaded',
        sourceLabel: `${logoKey}.png`,
      }),
    )
    logoAssets = updateLogoAssetLayoutField(
      logoAssets,
      logoKey,
      'scale',
      1.2 + index,
    )
    logoAssets = updateLogoAssetLayoutField(
      logoAssets,
      logoKey,
      'x',
      31 + index,
    )
    logoAssets = updateLogoAssetLayoutField(
      logoAssets,
      logoKey,
      'y',
      71 + index,
    )
    logoAssets = updateLogoAssetLayoutField(
      logoAssets,
      logoKey,
      'enabled',
      false,
    )
  })

  assert.deepEqual(createLogoAssetRenderItems(logoAssets), [])

  ;(['developer', 'publisher'] as const).forEach((logoKey, index) => {
    const layout = getLogoAssetLayout(logoAssets, logoKey)
    const visibleWithLogo = updateLogoAssetLayoutField(
      logoAssets,
      logoKey,
      'enabled',
      true,
    )

    assert.equal(
      createLogoAssetRenderItems(visibleWithLogo).some((item) =>
        item.imageDataUrl === `data:image/png;base64,${logoKey}-logo`),
      true,
    )
    assert.equal(getLogoAssetSource(logoAssets, logoKey)?.sourceLabel, `${logoKey}.png`)
    assert.equal(layout.enabled, false)
    assert.equal(layout.scale, 1.2 + index)
    assert.equal(layout.x, 31 + index)
    assert.equal(layout.y, 71 + index)

    logoAssets = updateLogoAssetLayoutField(
      logoAssets,
      logoKey,
      'enabled',
      true,
    )
  })

  assert.deepEqual(
    createLogoAssetRenderItems(logoAssets).map((item) => item.label),
    ['Developer', 'Publisher'],
  )
})

test('disc additional logo add remove and fallback rendering use shared logo contract', () => {
  let logoAssets = addAdditionalLogoAsset(
    createDefaultProjectLogoAssets(discTemplates.standardPrintableDisc),
    'publisher',
    discTemplates.standardPrintableDisc,
  )
  const [additionalLogo] = getAdditionalLogoAssets(logoAssets, 'publisher')

  assert.ok(additionalLogo)
  assert.equal(additionalLogo.label, 'Additional publisher 1')
  assert.equal(additionalLogo.layout.enabled, true)
  assert.notEqual(
    getLogoAssetRenderDataUrl('publisher', additionalLogo.imageDataUrl),
    additionalLogo.imageDataUrl,
  )

  logoAssets = removeAdditionalLogoAsset(
    logoAssets,
    'publisher',
    additionalLogo.id,
  )

  assert.equal(getAdditionalLogoAssets(logoAssets, 'publisher').length, 0)
})

test('disc logo normalization keeps legacy saved project image data and provenance', () => {
  const logoAssets = normalizeProjectLogoAssets({
    developerLogoDataUrl: 'data:image/png;base64,developer',
    developerLogoLayout: {
      enabled: true,
      scale: 1.4,
      x: 40,
      y: 60,
    },
    additionalDeveloperLogos: [
      {
        id: 'legacy-dev-1',
        label: '',
        imageDataUrl: 'data:image/png;base64,additional',
        layout: {
          enabled: true,
          scale: 0.75,
          x: 25,
          y: 70,
        },
      },
    ],
  }, discTemplates.standardPrintableDisc)

  assert.equal(logoAssets.developerLogoSource?.source, 'embedded')
  assert.equal(logoAssets.developerLogoSource?.sourceLabel, 'Developer logo image')
  assert.equal(logoAssets.developerLogoLayout.scale, 1.4)
  assert.equal(logoAssets.additionalDeveloperLogos[0]?.label, 'Additional developer 1')
  assert.equal(
    logoAssets.additionalDeveloperLogos[0]?.imageSource?.sourceLabel,
    'Additional developer 1 image',
  )
})

test('clearing a disc logo removes only the image source and preserves placement', () => {
  let logoAssets = setLogoAssetImage(
    createDefaultProjectLogoAssets(),
    'publisher',
    'data:image/png;base64,publisher-logo',
    imageSize,
  )
  logoAssets = updateLogoAssetLayoutField(logoAssets, 'publisher', 'x', 77)
  logoAssets = clearLogoAsset(logoAssets, 'publisher')

  assert.equal(logoAssets.publisherLogoDataUrl, null)
  assert.equal(logoAssets.publisherLogoSource, null)
  assert.equal(logoAssets.publisherLogoLayout.enabled, true)
  assert.equal(logoAssets.publisherLogoLayout.x, 77)
})
