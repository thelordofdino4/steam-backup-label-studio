import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { discTemplates } from '../../templates/discTemplates.ts'
import {
  getBackgroundDrawSize,
  getBackgroundPreviewSize,
} from '../../image/backgroundImage.ts'
import { CLASSIC_TOP_TITLE_DISC_PRESET } from '../builtins/classicTopTitleDiscPreset.ts'
import type {
  DiscPresetOwnerPlacementContext,
} from '../discPresetPlacementAdapters.ts'
import {
  createDiscPresetTemplateResolutionInput,
  resolveDiscPresetDefinition,
} from '../discPresetResolution.ts'
import {
  DISC_BACKGROUND_PRESET_ADAPTER,
} from './discBackgroundPresetAdapter.ts'

const WIDE_BACKGROUND_CONTAIN_SCALE = 92 / ((1920 / 1080) * 100)

const backgroundPreviewSource = readFileSync(
  new URL('../../components/preview/BackgroundLayer.tsx', import.meta.url),
  'utf8',
)
const backgroundPreviewStyles = readFileSync(
  new URL('../../styles/app-disc-visual-layers.css', import.meta.url),
  'utf8',
)
const backgroundExportSource = readFileSync(
  new URL('../../export/exportPng.ts', import.meta.url),
  'utf8',
)

const template = createDiscPresetTemplateResolutionInput(
  discTemplates.standardPrintableDisc,
)
const resolution = resolveDiscPresetDefinition({
  definition: CLASSIC_TOP_TITLE_DISC_PRESET,
  template,
})

if (resolution.status === 'rejected') {
  throw new Error('Classic fixture must resolve.')
}

function getContext(): DiscPresetOwnerPlacementContext<'background.primary'> {
  const slot = resolution.preset.slots.find((candidate) =>
    candidate.id === 'disc:guided:background-image:primary')
  const placement = slot?.placements.find(
    (candidate) => candidate.target === 'background.primary',
  )
  if (!slot || !placement) throw new Error('Missing Background fixture.')

  return {
    slot,
    placement: placement as
      DiscPresetOwnerPlacementContext<'background.primary'>['placement'],
    ownerState: {
      enabled: false,
      imageDataUrl: null,
      imageSource: null,
      imageSize: null,
      scale: 1.6,
      offset: { x: 19, y: -7 },
    },
    template,
  }
}

test('centers dimensionless Classic Background while preserving dormant scale', () => {
  const context = getContext()
  const before = JSON.stringify(context.ownerState)
  const result = DISC_BACKGROUND_PRESET_ADAPTER.buildUpdate(context)

  assert.equal(result.status, 'applied')
  assert.deepEqual(result.updates, [{
    kind: 'background-layout',
    slotId: 'disc:guided:background-image:primary',
    target: 'background.primary',
    layout: {
      scale: 1.6,
      offset: { x: 0, y: 0 },
    },
  }])
  assert.equal('enabled' in (result.updates[0]?.layout ?? {}), false)
  assert.equal(JSON.stringify(context.ownerState), before)
  assert.ok(Object.isFrozen(result.updates[0]?.layout))
  assert.ok(Object.isFrozen(
    result.updates[0]?.kind === 'background-layout'
      ? result.updates[0].layout.offset
      : null,
  ))
})

test('wide Classic Background reaches the horizontal region boundary first', () => {
  const context = getContext()
  const ownerState = {
    ...context.ownerState!,
    enabled: true,
    imageDataUrl: 'data:image/png;base64,background',
    imageSource: {
      source: 'uploaded' as const,
      sourceId: 'file-1',
      sourceLabel: 'Uploaded background',
    },
    imageSize: { width: 1920, height: 1080 },
  }
  const before = JSON.stringify(ownerState)
  const result = DISC_BACKGROUND_PRESET_ADAPTER.buildUpdate({
    ...context,
    ownerState,
  })

  assert.equal(result.status, 'applied')
  assert.deepEqual(result.updates, [{
    kind: 'background-layout',
    slotId: 'disc:guided:background-image:primary',
    target: 'background.primary',
    layout: {
      scale: WIDE_BACKGROUND_CONTAIN_SCALE,
      offset: { x: 0, y: 0 },
    },
  }])
  assert.deepEqual(Object.keys(result.updates[0]?.layout ?? {}).sort(), [
    'offset',
    'scale',
  ])
  assert.equal(JSON.stringify(ownerState), before)
})

test('tall and square Classic Backgrounds stop on the limiting region axis', () => {
  const context = getContext()

  for (const [imageSize, expectedScale] of [
    [{ width: 1080, height: 1920 }, WIDE_BACKGROUND_CONTAIN_SCALE],
    [{ width: 1000, height: 1000 }, 0.92],
  ] as const) {
    const result = DISC_BACKGROUND_PRESET_ADAPTER.buildUpdate({
      ...context,
      ownerState: {
        ...context.ownerState!,
        enabled: true,
        imageDataUrl: 'data:image/png;base64,background',
        imageSize,
      },
    })

    assert.equal(result.status, 'applied')
    assert.equal(result.updates[0]?.kind, 'background-layout')
    if (result.updates[0]?.kind === 'background-layout') {
      assert.equal(result.updates[0].layout.scale, expectedScale)
      assert.deepEqual(result.updates[0].layout.offset, { x: 0, y: 0 })
    }
  }
})

test('Classic Background preview and export share centered contain-fit geometry', () => {
  const context = getContext()
  const cases = [
    { label: 'wide', imageSize: { width: 1920, height: 1080 } },
    { label: 'tall', imageSize: { width: 1080, height: 1920 } },
    { label: 'square', imageSize: { width: 1000, height: 1000 } },
  ] as const

  for (const { label, imageSize } of cases) {
    const result = DISC_BACKGROUND_PRESET_ADAPTER.buildUpdate({
      ...context,
      ownerState: {
        ...context.ownerState!,
        enabled: true,
        imageDataUrl: `data:image/png;base64,${label}`,
        imageSize,
      },
    })

    assert.equal(result.status, 'applied')
    assert.equal(result.updates[0]?.kind, 'background-layout')
    if (result.updates[0]?.kind !== 'background-layout') {
      assert.fail(`Expected ${label} Background layout update.`)
    }

    const { scale, offset } = result.updates[0].layout
    const previewSize = getBackgroundPreviewSize(imageSize)
    const previewDrawSize = {
      width: Number.parseFloat(previewSize.width) * scale,
      height: Number.parseFloat(previewSize.height) * scale,
    }
    const exportDrawSize = getBackgroundDrawSize(imageSize, scale, 100)
    const previewCenter = {
      x: 50 + offset.x,
      y: 50 + offset.y,
    }
    const exportRect = {
      x: 50 - exportDrawSize.width / 2 + offset.x,
      y: 50 - exportDrawSize.height / 2 + offset.y,
      width: exportDrawSize.width,
      height: exportDrawSize.height,
    }

    assert.deepEqual(offset, { x: 0, y: 0 })
    assert.ok(Math.abs(previewDrawSize.width - exportDrawSize.width) <= 1e-10)
    assert.ok(Math.abs(previewDrawSize.height - exportDrawSize.height) <= 1e-10)
    assert.ok(exportRect.width <= 92 + 1e-10)
    assert.ok(exportRect.height <= 92 + 1e-10)
    assert.ok(
      Math.abs(exportRect.width - 92) <= 1e-10 ||
        Math.abs(exportRect.height - 92) <= 1e-10,
      `${label} Background must touch its first limiting 92% boundary.`,
    )
    assert.equal(previewCenter.x, 50)
    assert.equal(previewCenter.y, 50)
    assert.ok(Math.abs(exportRect.x + exportRect.width / 2 - 50) <= 1e-10)
    assert.ok(Math.abs(exportRect.y + exportRect.height / 2 - 50) <= 1e-10)
  }

  assert.match(
    backgroundPreviewSource,
    /width: backgroundPreviewSize\.width,[\s\S]*height: backgroundPreviewSize\.height,[\s\S]*translate\(-50%, -50%\)[\s\S]*scale\(\$\{backgroundScale\}\)/,
  )
  assert.match(
    backgroundPreviewStyles,
    /\.background-image-layer \.content-bounded-image\s*\{[\s\S]*top:\s*50%;[\s\S]*left:\s*50%;/,
  )
  assert.match(
    backgroundExportSource,
    /const drawSize = getBackgroundDrawSize\([\s\S]*params\.backgroundScale,[\s\S]*discContentSize,[\s\S]*const drawX = center - drawWidth \/ 2 \+ params\.backgroundOffset\.x \* offsetScale[\s\S]*const drawY = center - drawHeight \/ 2 \+ params\.backgroundOffset\.y \* offsetScale/,
  )
})

test('Classic Background fitting uses alpha-content dimensions', () => {
  const context = getContext()
  const result = DISC_BACKGROUND_PRESET_ADAPTER.buildUpdate({
    ...context,
    ownerState: {
      ...context.ownerState!,
      enabled: true,
      imageDataUrl: 'data:image/png;base64,background',
      imageSize: {
        width: 2000,
        height: 1000,
        contentBounds: { x: 750, y: 0, width: 500, height: 1000 },
      },
    },
  })

  assert.equal(result.status, 'applied')
  assert.equal(result.updates[0]?.kind, 'background-layout')
  if (result.updates[0]?.kind === 'background-layout') {
    assert.equal(result.updates[0].layout.scale, 0.46)
  }
})

test('legacy centered cover intent remains supported for other presets', () => {
  const context = getContext()
  const result = DISC_BACKGROUND_PRESET_ADAPTER.buildUpdate({
    ...context,
    placement: {
      kind: 'background',
      target: 'background.primary',
      fit: 'cover',
      scale: 1.25,
    },
  })

  assert.equal(result.status, 'applied')
  assert.equal(result.updates[0]?.kind, 'background-layout')
  if (result.updates[0]?.kind === 'background-layout') {
    assert.equal(result.updates[0].layout.scale, 1.25)
    assert.deepEqual(result.updates[0].layout.offset, { x: 0, y: 0 })
  }
})

test('rejects non-centered regions instead of claiming arbitrary crop support', () => {
  const context = getContext()
  const result = DISC_BACKGROUND_PRESET_ADAPTER.buildUpdate({
    ...context,
    slot: {
      ...context.slot,
      resolvedContentRegion: {
        ...context.slot.resolvedContentRegion,
        centerXPercent: 45,
      },
    },
  })

  assert.equal(result.status, 'unsupported')
  assert.deepEqual(result.updates, [])
  assert.equal(
    'reason' in result.warnings[0]! && result.warnings[0].reason,
    'non-centered-background-region',
  )
})

test('rejects missing owner state and invalid scale structurally', () => {
  const context = getContext()
  const missing = DISC_BACKGROUND_PRESET_ADAPTER.buildUpdate({
    ...context,
    ownerState: undefined,
  })
  const invalidScale = DISC_BACKGROUND_PRESET_ADAPTER.buildUpdate({
    ...context,
    placement: {
      kind: 'background',
      target: 'background.primary',
      fit: 'cover',
      scale: Number.NaN,
    },
  })

  assert.equal(missing.status, 'unsupported')
  assert.equal(
    'reason' in missing.warnings[0]! && missing.warnings[0].reason,
    'owner-state-unavailable',
  )
  assert.equal(
    'reason' in invalidScale.warnings[0]! && invalidScale.warnings[0].reason,
    'invalid-scale',
  )
})
