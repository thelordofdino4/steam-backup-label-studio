import assert from 'node:assert/strict'
import test from 'node:test'
import { getArtworkFrameMaterialMacroLightingFactors } from './artworkFrameMaterialMacroLighting.ts'
import { createArtworkFrameMaterialHemisphereLightVector } from './artworkFrameMaterialLighting.ts'

function getFactors({
  aspectRatio,
  lightPosition,
  position,
}: {
  aspectRatio?: number
  lightPosition: { x: number, y: number }
  position: { x: number, y: number }
}) {
  return getArtworkFrameMaterialMacroLightingFactors({
    aspectRatio,
    lightVector: createArtworkFrameMaterialHemisphereLightVector(
      lightPosition,
    ),
    position,
  })
}

function assertBoundedFactors(
  factors: ReturnType<typeof getArtworkFrameMaterialMacroLightingFactors>,
) {
  assert.equal(Number.isFinite(factors.macroDiffuse), true)
  assert.equal(Number.isFinite(factors.macroShadow), true)
  assert.equal(Number.isFinite(factors.nearLightRamp), true)
  assert.equal(Number.isFinite(factors.farShadowRamp), true)
  assert.equal(Number.isFinite(factors.grazingStrength), true)
  assert.equal(factors.macroDiffuse >= 0.72, true)
  assert.equal(factors.macroDiffuse <= 1.28, true)
  assert.equal(factors.macroShadow >= 0, true)
  assert.equal(factors.macroShadow <= 0.52, true)
  assert.equal(factors.nearLightRamp >= 0, true)
  assert.equal(factors.nearLightRamp <= 1, true)
  assert.equal(factors.farShadowRamp >= 0, true)
  assert.equal(factors.farShadowRamp <= 1, true)
  assert.equal(factors.grazingStrength >= 0, true)
  assert.equal(factors.grazingStrength <= 1, true)
}

test('macro lighting is neutral under overhead light', () => {
  const positions = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: 1, y: 1 },
  ]

  for (const position of positions) {
    const factors = getFactors({
      lightPosition: { x: 0, y: 0 },
      position,
    })

    assert.deepEqual(factors, {
      farShadowRamp: 0,
      grazingStrength: 0,
      macroDiffuse: 1,
      macroShadow: 0,
      nearLightRamp: 0,
    })
    assertBoundedFactors(factors)
  }
})

test('macro lighting treats the handle side as shadow and the opposite side as lit', () => {
  const rightLightLit = getFactors({
    lightPosition: { x: 1, y: 0 },
    position: { x: -1, y: 0 },
  })
  const rightLightShadow = getFactors({
    lightPosition: { x: 1, y: 0 },
    position: { x: 1, y: 0 },
  })
  const leftLightLit = getFactors({
    lightPosition: { x: -1, y: 0 },
    position: { x: 1, y: 0 },
  })
  const leftLightShadow = getFactors({
    lightPosition: { x: -1, y: 0 },
    position: { x: -1, y: 0 },
  })
  const topLightLit = getFactors({
    lightPosition: { x: 0, y: 1 },
    position: { x: 0, y: -1 },
  })
  const topLightShadow = getFactors({
    lightPosition: { x: 0, y: 1 },
    position: { x: 0, y: 1 },
  })
  const bottomLightLit = getFactors({
    lightPosition: { x: 0, y: -1 },
    position: { x: 0, y: 1 },
  })
  const bottomLightShadow = getFactors({
    lightPosition: { x: 0, y: -1 },
    position: { x: 0, y: -1 },
  })
  const factorPairs = [
    [rightLightLit, rightLightShadow],
    [leftLightLit, leftLightShadow],
    [topLightLit, topLightShadow],
    [bottomLightLit, bottomLightShadow],
  ] as const

  for (const [lit, shadow] of factorPairs) {
    assertBoundedFactors(lit)
    assertBoundedFactors(shadow)
    assert.equal(lit.macroDiffuse > shadow.macroDiffuse, true)
    assert.equal(lit.nearLightRamp > shadow.nearLightRamp, true)
    assert.equal(shadow.macroShadow > lit.macroShadow, true)
    assert.equal(shadow.farShadowRamp > lit.farShadowRamp, true)
  }
})

test('macro lighting maps every corner handle to opposite highlight and same-side shadow', () => {
  const cases = [
    {
      lightPosition: { x: -1, y: -1 },
      litPosition: { x: 1, y: 1 },
      name: 'bottom-left',
      shadowPosition: { x: -1, y: -1 },
    },
    {
      lightPosition: { x: 1, y: -1 },
      litPosition: { x: -1, y: 1 },
      name: 'bottom-right',
      shadowPosition: { x: 1, y: -1 },
    },
    {
      lightPosition: { x: -1, y: 1 },
      litPosition: { x: 1, y: -1 },
      name: 'top-left',
      shadowPosition: { x: -1, y: 1 },
    },
    {
      lightPosition: { x: 1, y: 1 },
      litPosition: { x: -1, y: -1 },
      name: 'top-right',
      shadowPosition: { x: 1, y: 1 },
    },
  ]

  for (const { lightPosition, litPosition, name, shadowPosition } of cases) {
    const lit = getFactors({ lightPosition, position: litPosition })
    const litAgain = getFactors({ lightPosition, position: litPosition })
    const shadow = getFactors({ lightPosition, position: shadowPosition })
    const shadowAgain = getFactors({
      lightPosition,
      position: shadowPosition,
    })

    assert.deepEqual(litAgain, lit, `${name} lit factors are deterministic`)
    assert.deepEqual(
      shadowAgain,
      shadow,
      `${name} shadow factors are deterministic`,
    )
    assertBoundedFactors(lit)
    assertBoundedFactors(shadow)
    assert.equal(
      lit.macroDiffuse > shadow.macroDiffuse,
      true,
      `${name} handle should brighten the opposite corner`,
    )
    assert.equal(
      shadow.macroShadow > lit.macroShadow,
      true,
      `${name} handle should shadow the same corner`,
    )
  }
})

test('macro lighting strengthens from 45-degree to grazing light', () => {
  const angledLit = getFactors({
    lightPosition: { x: 0.5, y: 0 },
    position: { x: -1, y: 0 },
  })
  const angledShadow = getFactors({
    lightPosition: { x: 0.5, y: 0 },
    position: { x: 1, y: 0 },
  })
  const grazingLit = getFactors({
    lightPosition: { x: 1, y: 0 },
    position: { x: -1, y: 0 },
  })
  const grazingShadow = getFactors({
    lightPosition: { x: 1, y: 0 },
    position: { x: 1, y: 0 },
  })
  const angledDiffuseDelta =
    angledLit.macroDiffuse - angledShadow.macroDiffuse
  const grazingDiffuseDelta =
    grazingLit.macroDiffuse - grazingShadow.macroDiffuse
  const angledShadowDelta =
    angledShadow.macroShadow - angledLit.macroShadow
  const grazingShadowDelta =
    grazingShadow.macroShadow - grazingLit.macroShadow

  assert.equal(grazingLit.grazingStrength > angledLit.grazingStrength, true)
  assert.equal(grazingDiffuseDelta > angledDiffuseDelta, true)
  assert.equal(grazingShadowDelta > angledShadowDelta, true)
})

test('macro lighting factors are bounded and deterministic', () => {
  const first = getArtworkFrameMaterialMacroLightingFactors({
    aspectRatio: 2,
    lightVector: createArtworkFrameMaterialHemisphereLightVector({
      x: 0.75,
      y: -0.35,
    }),
    position: { x: 0.4, y: -0.9 },
  })
  const second = getArtworkFrameMaterialMacroLightingFactors({
    aspectRatio: 2,
    lightVector: createArtworkFrameMaterialHemisphereLightVector({
      x: 0.75,
      y: -0.35,
    }),
    position: { x: 0.4, y: -0.9 },
  })

  assert.deepEqual(second, first)
  assertBoundedFactors(first)
})

test('macro lighting clamps positions before calculating ramps', () => {
  const clamped = getArtworkFrameMaterialMacroLightingFactors({
    lightVector: createArtworkFrameMaterialHemisphereLightVector({
      x: 1,
      y: 0,
    }),
    position: { x: 100, y: Number.POSITIVE_INFINITY },
  })
  const edge = getArtworkFrameMaterialMacroLightingFactors({
    lightVector: createArtworkFrameMaterialHemisphereLightVector({
      x: 1,
      y: 0,
    }),
    position: { x: 1, y: 0 },
  })

  assert.deepEqual(clamped, edge)
  assertBoundedFactors(clamped)
})
