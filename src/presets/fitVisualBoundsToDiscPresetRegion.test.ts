import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { doesRectFitSafeAnnulus } from '../disc/geometry.ts'
import {
  DISC_PRESET_OWNER_SCALE_MAX,
  type DiscContainRegionSizePolicyV1,
} from './discPresetDefinition.ts'
import {
  DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE,
  fitVisualBoundsToDiscPresetRectangle,
  fitVisualBoundsToDiscPresetRegion,
  type DiscPresetContainFitTemplateGeometry,
  type FitVisualBoundsToDiscPresetRegionInput,
  type FitVisualBoundsToDiscPresetRegionResult,
} from './fitVisualBoundsToDiscPresetRegion.ts'

const ROOMY_TEMPLATE = Object.freeze({
  safeDiameterPercent: 100,
  innerNoPrintDiameterPercent: 0,
}) satisfies DiscPresetContainFitTemplateGeometry

const CONTAIN_POLICY = Object.freeze({
  mode: 'contain-region',
  allowUpscale: true,
  insetPercent: 0,
}) satisfies DiscContainRegionSizePolicyV1

const WIDE_REGION = Object.freeze({
  centerXPercent: 50,
  centerYPercent: 20,
  widthPercent: 40,
  heightPercent: 20,
})

function fit(
  overrides: Partial<FitVisualBoundsToDiscPresetRegionInput> &
    Pick<FitVisualBoundsToDiscPresetRegionInput, 'boundsAtScaleOne'>,
) {
  return fitVisualBoundsToDiscPresetRegion({
    region: WIDE_REGION,
    policy: CONTAIN_POLICY,
    template: ROOMY_TEMPLATE,
    ...overrides,
  })
}

function requireFit(result: FitVisualBoundsToDiscPresetRegionResult) {
  assert.equal(result.status, 'fit')
  if (result.status !== 'fit') throw new Error('Expected contain fit')
  return result
}

function assertNear(actual: number, expected: number, tolerance = 0.00001) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  )
}

function assertCenterParity(
  result: ReturnType<typeof requireFit>,
  inputRegion = WIDE_REGION,
) {
  assertNear(
    result.x + result.fittedBounds.centerOffsetXPercent,
    inputRegion.centerXPercent,
    DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE,
  )
  assertNear(
    result.y + result.fittedBounds.centerOffsetYPercent,
    inputRegion.centerYPercent,
    DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE,
  )
}

function assertRegionContainment(
  result: ReturnType<typeof requireFit>,
  inputRegion = WIDE_REGION,
) {
  const fittedCenterX = result.x + result.fittedBounds.centerOffsetXPercent
  const fittedCenterY = result.y + result.fittedBounds.centerOffsetYPercent
  const fittedLeft = fittedCenterX - result.fittedBounds.widthPercent / 2
  const fittedRight = fittedCenterX + result.fittedBounds.widthPercent / 2
  const fittedTop = fittedCenterY - result.fittedBounds.heightPercent / 2
  const fittedBottom = fittedCenterY + result.fittedBounds.heightPercent / 2
  const regionLeft = inputRegion.centerXPercent - inputRegion.widthPercent / 2
  const regionRight = inputRegion.centerXPercent + inputRegion.widthPercent / 2
  const regionTop = inputRegion.centerYPercent - inputRegion.heightPercent / 2
  const regionBottom = inputRegion.centerYPercent + inputRegion.heightPercent / 2

  assert.ok(fittedLeft >= regionLeft - DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE)
  assert.ok(fittedRight <= regionRight + DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE)
  assert.ok(fittedTop >= regionTop - DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE)
  assert.ok(fittedBottom <= regionBottom + DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE)
}

test('fits 4:1 wide bounds to the horizontal boundary without stretching', () => {
  const result = requireFit(fit({
    boundsAtScaleOne: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 20,
      heightPercent: 5,
    },
  }))

  assert.equal(result.scale, 2)
  assert.deepEqual(result.fittedBounds, {
    centerOffsetXPercent: 0,
    centerOffsetYPercent: 0,
    widthPercent: 40,
    heightPercent: 10,
  })
  assert.equal(result.limitingAxis, 'horizontal')
  assert.equal(result.fittedBounds.widthPercent / result.fittedBounds.heightPercent, 4)
  assertCenterParity(result)
  assertRegionContainment(result)
})

test('fits 1:4 tall bounds to the vertical boundary without stretching', () => {
  const region = Object.freeze({
    centerXPercent: 20,
    centerYPercent: 50,
    widthPercent: 20,
    heightPercent: 40,
  })
  const result = requireFit(fit({
    region,
    boundsAtScaleOne: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 5,
      heightPercent: 20,
    },
  }))

  assert.equal(result.scale, 2)
  assert.equal(result.fittedBounds.widthPercent, 10)
  assert.equal(result.fittedBounds.heightPercent, 40)
  assert.equal(result.limitingAxis, 'vertical')
  assert.equal(result.fittedBounds.heightPercent / result.fittedBounds.widthPercent, 4)
  assertCenterParity(result, region)
  assertRegionContainment(result, region)
})

test('fits square bounds to both equal region boundaries', () => {
  const region = Object.freeze({
    centerXPercent: 50,
    centerYPercent: 20,
    widthPercent: 20,
    heightPercent: 20,
  })
  const result = requireFit(fit({
    region,
    boundsAtScaleOne: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 10,
      heightPercent: 10,
    },
  }))

  assert.equal(result.scale, 2)
  assert.equal(result.fittedBounds.widthPercent, 20)
  assert.equal(result.fittedBounds.heightPercent, 20)
  assert.equal(result.limitingAxis, 'both')
  assertCenterParity(result, region)
  assertRegionContainment(result, region)
})

test('rectangular contain reaches the declared box without annulus shrinkage', () => {
  const region = Object.freeze({
    centerXPercent: 50,
    centerYPercent: 50,
    widthPercent: 92,
    heightPercent: 92,
  })
  const rectangleFit = requireFit(fitVisualBoundsToDiscPresetRectangle({
    region,
    boundsAtScaleOne: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 100,
      heightPercent: 100,
    },
    policy: CONTAIN_POLICY,
  }))
  const annulusFit = fitVisualBoundsToDiscPresetRegion({
    region,
    boundsAtScaleOne: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 100,
      heightPercent: 100,
    },
    policy: CONTAIN_POLICY,
    template: ROOMY_TEMPLATE,
  })

  assert.equal(rectangleFit.scale, 0.92)
  assert.deepEqual(rectangleFit.fittedBounds, {
    centerOffsetXPercent: 0,
    centerOffsetYPercent: 0,
    widthPercent: 92,
    heightPercent: 92,
  })
  assert.equal(rectangleFit.limitingAxis, 'both')
  assert.equal(rectangleFit.warnings.length, 0)
  assert.equal(annulusFit.status, 'fit')
  if (annulusFit.status === 'fit') {
    assert.ok(annulusFit.scale < rectangleFit.scale)
  }
})

test('uniformly downscales bounds when the region is smaller', () => {
  const region = Object.freeze({
    centerXPercent: 50,
    centerYPercent: 20,
    widthPercent: 20,
    heightPercent: 10,
  })
  const result = requireFit(fit({
    region,
    boundsAtScaleOne: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 40,
      heightPercent: 10,
    },
  }))

  assert.equal(result.scale, 0.5)
  assert.equal(result.fittedBounds.widthPercent, 20)
  assert.equal(result.fittedBounds.heightPercent, 5)
  assert.equal(result.limitingAxis, 'horizontal')
})

test('allowUpscale false keeps canonical scale one and reports a cap', () => {
  const result = requireFit(fit({
    boundsAtScaleOne: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 10,
      heightPercent: 5,
    },
    policy: {
      mode: 'contain-region',
      allowUpscale: false,
    },
  }))

  assert.equal(result.scale, 1)
  assert.equal(result.limitingAxis, 'capped')
  assert.deepEqual(result.warnings, [])
})

test('maximumScale caps an otherwise larger contain fit', () => {
  const result = requireFit(fit({
    boundsAtScaleOne: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 10,
      heightPercent: 5,
    },
    policy: {
      mode: 'contain-region',
      allowUpscale: true,
      maximumScale: 1.5,
    },
  }))

  assert.equal(result.scale, 1.5)
  assert.equal(result.limitingAxis, 'capped')
  assert.equal(result.fittedBounds.widthPercent, 15)
})

test('insetPercent uses the inset fit boundary', () => {
  const result = requireFit(fit({
    boundsAtScaleOne: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 20,
      heightPercent: 5,
    },
    policy: {
      mode: 'contain-region',
      allowUpscale: true,
      insetPercent: 10,
    },
  }))

  assert.equal(result.scale, 1.6)
  assert.equal(result.fittedBounds.widthPercent, 32)
  assert.equal(result.fittedBounds.heightPercent, 8)
  assert.equal(result.limitingAxis, 'horizontal')
  assertRegionContainment(result)
})

test('nonzero canonical center offsets compensate the owner anchor exactly', () => {
  const result = requireFit(fit({
    boundsAtScaleOne: {
      centerOffsetXPercent: 5,
      centerOffsetYPercent: -3,
      widthPercent: 20,
      heightPercent: 10,
    },
  }))

  assert.equal(result.scale, 2)
  assert.equal(result.x, 40)
  assert.equal(result.y, 26)
  assert.deepEqual(result.fittedBounds, {
    centerOffsetXPercent: 10,
    centerOffsetYPercent: -6,
    widthPercent: 40,
    heightPercent: 20,
  })
  assertCenterParity(result)
})

test('shrinks at the same center when the outer safe circle is restrictive', () => {
  const region = Object.freeze({
    centerXPercent: 75,
    centerYPercent: 75,
    widthPercent: 20,
    heightPercent: 20,
  })
  const template = Object.freeze({
    safeDiameterPercent: 90,
    innerNoPrintDiameterPercent: 0,
  })
  const result = requireFit(fit({
    region,
    template,
    boundsAtScaleOne: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 10,
      heightPercent: 10,
    },
  }))

  const exactOuterSafeScale = (45 / Math.SQRT2 - 25) / 5
  assertNear(result.scale, exactOuterSafeScale, 0.00001)
  assert.equal(result.x, region.centerXPercent)
  assert.equal(result.y, region.centerYPercent)
  assert.equal(result.limitingAxis, 'capped')
  assert.equal(result.warnings[0]?.kind, 'contain-fit-adjusted')
  assertCenterParity(result, region)
  assert.ok(doesRectFitSafeAnnulus(
    { x: region.centerXPercent, y: region.centerYPercent },
    0,
    45,
    {
      halfWidth: result.fittedBounds.widthPercent / 2,
      halfHeight: result.fittedBounds.heightPercent / 2,
    },
  ))
})

test('shrinks centered bounds against the outer circle when there is no inner hole', () => {
  const region = Object.freeze({
    centerXPercent: 50,
    centerYPercent: 50,
    widthPercent: 100,
    heightPercent: 1,
  })
  const result = requireFit(fit({
    region,
    boundsAtScaleOne: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 100,
      heightPercent: 0.0253,
    },
  }))

  assert.ok(result.scale > 0)
  assert.ok(result.scale < 1)
  assert.equal(result.limitingAxis, 'capped')
  assert.equal(result.warnings[0]?.kind, 'contain-fit-adjusted')
  assertCenterParity(result, region)
  assertRegionContainment(result, region)
  assert.ok(doesRectFitSafeAnnulus(
    { x: region.centerXPercent, y: region.centerYPercent },
    0,
    50,
    {
      halfWidth: result.fittedBounds.widthPercent / 2,
      halfHeight: result.fittedBounds.heightPercent / 2,
    },
  ))
})

test('reports a sub-tolerance safe-annulus scale reduction as capped', () => {
  const region = Object.freeze({
    centerXPercent: 75,
    centerYPercent: 50,
    widthPercent: 50,
    heightPercent: 1,
  })
  const result = requireFit(fit({
    region,
    boundsAtScaleOne: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 50,
      heightPercent: 0.0253,
    },
  }))

  assert.ok(result.scale < 1)
  assert.ok(1 - result.scale < DISC_PRESET_CONTAIN_FIT_NORMALIZED_TOLERANCE)
  assert.equal(result.limitingAxis, 'capped')
  assert.deepEqual(result.warnings, [{
    kind: 'contain-fit-adjusted',
    reason: 'safe-annulus',
    requestedScale: 1,
    appliedScale: result.scale,
  }])
  assertCenterParity(result, region)
  assertRegionContainment(result, region)
})

test('uses the complete inner no-print diameter and only shrinks scale', () => {
  const region = Object.freeze({
    centerXPercent: 65,
    centerYPercent: 50,
    widthPercent: 20,
    heightPercent: 20,
  })
  const template = Object.freeze({
    safeDiameterPercent: 100,
    innerNoPrintDiameterPercent: 20,
  })
  const result = requireFit(fit({
    region,
    template,
    boundsAtScaleOne: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 10,
      heightPercent: 10,
    },
  }))

  assertNear(result.scale, 1, 0.00001)
  assert.equal(result.x, region.centerXPercent)
  assert.equal(result.y, region.centerYPercent)
  assert.equal(result.limitingAxis, 'capped')
  assert.ok(doesRectFitSafeAnnulus(
    { x: region.centerXPercent, y: region.centerYPercent },
    template.innerNoPrintDiameterPercent / 2,
    template.safeDiameterPercent / 2,
    {
      halfWidth: result.fittedBounds.widthPercent / 2,
      halfHeight: result.fittedBounds.heightPercent / 2,
    },
  ))
})

test('returns structured unsupported when the region center is inside the hole', () => {
  const result = fit({
    region: {
      centerXPercent: 50,
      centerYPercent: 50,
      widthPercent: 10,
      heightPercent: 10,
    },
    template: {
      safeDiameterPercent: 90,
      innerNoPrintDiameterPercent: 20,
    },
    boundsAtScaleOne: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 5,
      heightPercent: 5,
    },
  })

  assert.deepEqual(result, {
    status: 'unsupported',
    warnings: [{
      kind: 'contain-fit-unsupported',
      reason: 'center-cannot-fit-safe-annulus',
    }],
  })
})

test('rejects zero, negative, and non-finite canonical dimensions', () => {
  for (const [widthPercent, heightPercent] of [
    [0, 10],
    [-1, 10],
    [10, 0],
    [10, -1],
    [Number.NaN, 10],
    [10, Number.POSITIVE_INFINITY],
  ]) {
    const result = fit({
      boundsAtScaleOne: {
        centerOffsetXPercent: 0,
        centerOffsetYPercent: 0,
        widthPercent,
        heightPercent,
      },
    })

    assert.equal(result.status, 'unsupported')
    assert.equal(result.warnings[0]?.kind, 'contain-fit-unsupported')
    assert.equal(result.warnings[0]?.reason, 'invalid-canonical-bounds')
  }

  const invalidOffsetResult = fit({
    boundsAtScaleOne: {
      centerOffsetXPercent: Number.NaN,
      centerOffsetYPercent: 0,
      widthPercent: 10,
      heightPercent: 10,
    },
  })
  assert.equal(invalidOffsetResult.status, 'unsupported')
  assert.equal(
    invalidOffsetResult.warnings[0]?.reason,
    'invalid-canonical-bounds',
  )
})

test('rejects invalid and unresolved regions', () => {
  for (const region of [
    { centerXPercent: 50, centerYPercent: 50, widthPercent: 0, heightPercent: 10 },
    { centerXPercent: 50, centerYPercent: 50, widthPercent: 10, heightPercent: -1 },
    { centerXPercent: 98, centerYPercent: 50, widthPercent: 10, heightPercent: 10 },
    { centerXPercent: Number.NaN, centerYPercent: 50, widthPercent: 10, heightPercent: 10 },
  ]) {
    const result = fit({
      region,
      boundsAtScaleOne: {
        centerOffsetXPercent: 0,
        centerOffsetYPercent: 0,
        widthPercent: 5,
        heightPercent: 5,
      },
    })

    assert.equal(result.status, 'unsupported')
    assert.equal(result.warnings[0]?.reason, 'invalid-region')
  }
})

test('rejects invalid contain policies defensively', () => {
  const invalidPolicies = [
    { mode: 'contain-region', allowUpscale: 'yes' },
    { mode: 'contain-region', allowUpscale: true, maximumScale: 0 },
    { mode: 'contain-region', allowUpscale: true, maximumScale: Number.NaN },
    {
      mode: 'contain-region',
      allowUpscale: true,
      maximumScale: DISC_PRESET_OWNER_SCALE_MAX + 1,
    },
    { mode: 'contain-region', allowUpscale: true, insetPercent: -1 },
    { mode: 'contain-region', allowUpscale: true, insetPercent: 50 },
    { mode: 'future-fit', allowUpscale: true },
  ]

  for (const policy of invalidPolicies) {
    const result = fit({
      policy: policy as DiscContainRegionSizePolicyV1,
      boundsAtScaleOne: {
        centerOffsetXPercent: 0,
        centerOffsetYPercent: 0,
        widthPercent: 5,
        heightPercent: 5,
      },
    })

    assert.equal(result.status, 'unsupported')
    assert.equal(result.warnings[0]?.reason, 'invalid-size-policy')
  }
})

test('rejects invalid normalized template geometry', () => {
  for (const template of [
    { safeDiameterPercent: 0, innerNoPrintDiameterPercent: 0 },
    { safeDiameterPercent: 101, innerNoPrintDiameterPercent: 0 },
    { safeDiameterPercent: 90, innerNoPrintDiameterPercent: -1 },
    { safeDiameterPercent: 90, innerNoPrintDiameterPercent: 90 },
    { safeDiameterPercent: Number.NaN, innerNoPrintDiameterPercent: 10 },
  ]) {
    const result = fit({
      template,
      boundsAtScaleOne: {
        centerOffsetXPercent: 0,
        centerOffsetYPercent: 0,
        widthPercent: 5,
        heightPercent: 5,
      },
    })

    assert.equal(result.status, 'unsupported')
    assert.equal(result.warnings[0]?.reason, 'invalid-template-geometry')
  }
})

test('is deterministic, immutable, and does not mutate its input', () => {
  const input: FitVisualBoundsToDiscPresetRegionInput = {
    region: { ...WIDE_REGION },
    boundsAtScaleOne: {
      centerOffsetXPercent: 1.5,
      centerOffsetYPercent: -0.75,
      widthPercent: 20,
      heightPercent: 5,
    },
    policy: { ...CONTAIN_POLICY },
    template: { ...ROOMY_TEMPLATE },
  }
  const before = JSON.stringify(input)
  const first = fitVisualBoundsToDiscPresetRegion(input)
  const second = fitVisualBoundsToDiscPresetRegion(input)

  assert.deepEqual(first, second)
  assert.equal(JSON.stringify(input), before)
  assert.ok(Object.isFrozen(first))
  assert.ok(Object.isFrozen(first.warnings))
  if (first.status === 'fit') {
    assert.ok(Object.isFrozen(first.fittedBounds))
    for (const warning of first.warnings) assert.ok(Object.isFrozen(warning))
  }
})

test('contain-fit engine stays pure generic geometry', () => {
  const source = readFileSync(
    new URL('./fitVisualBoundsToDiscPresetRegion.ts', import.meta.url),
    'utf8',
  )

  assert.doesNotMatch(
    source,
    /React|useEffect|document\.|window\.|getBoundingClientRect|querySelector|App\.tsx|projectSchema|localStorage|sessionStorage|@tauri-apps|fetch\(/i,
  )
  assert.doesNotMatch(
    source,
    /classic-top-title|CLASSIC_TOP_TITLE|game-title|rating\.primary|media-format|developer-logo|publisher-logo/i,
  )
  assert.doesNotMatch(
    source,
    /clampLayoutPointToSafeZone|clampProject|clamp.*Layout/i,
  )
})
