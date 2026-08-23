import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  getCaseInsertArtworkViewportPreviewBasisStyle,
  getCaseInsertArtworkViewportPreviewClassNames,
  getCaseInsertArtworkViewportPreviewDestinationStyle,
  getCaseInsertArtworkViewportPreviewOuterStyle,
  getCaseInsertArtworkViewportPreviewSourceStyle,
} from '../components/preview/caseInsertArtworkViewportPreviewGeometry.ts'
import { DEFAULT_ADDITIONAL_ARTWORK_FRAME } from '../project/additionalArtworkFrame.ts'
import { createJewelCasePreviewLayout } from '../layout/caseInsertPreviewLayout.ts'
import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertReservedArtworkViewportCoordinateBasis,
} from '../project/projectTypes.ts'
import { getCanvasImageStoredSourceRect } from '../export/canvasImage.ts'
import {
  withCaseInsertArtworkViewportCanvasBasisClip,
} from '../export/caseInsertArtworkViewportCanvasBasisClip.ts'
import {
  partitionCaseInsertArtworkViewportSlots,
} from '../caseInsert/artworkViewportLayerOrder.ts'
import {
  resolveCaseInsertArtworkViewportRenderArtifact,
  type CaseInsertArtworkViewportRenderOwner,
} from './caseInsertArtworkViewportRenderArtifact.ts'

function createSlot(options: {
  basis?: ProjectCaseInsertReservedArtworkViewportCoordinateBasis
  fit?: ProjectCaseInsertImageFit
  height?: number
  owner?: CaseInsertArtworkViewportRenderOwner
  rotation?: number
  scale?: number
  width?: number
  x?: number
  y?: number
} = {}): ProjectCaseInsertImageSlot {
  const owner = options.owner ?? 'tray'
  const basis = options.basis ?? (
    owner === 'cover' ? 'frontSafe' :
      owner === 'left-spine' ? 'leftSpineSafe' :
        owner === 'right-spine' ? 'rightSpineSafe' : 'backPanelSafe'
  )

  return {
    id: `${owner}-artwork-1`,
    label: 'Screenshot',
    enabled: true,
    imageDataUrl: 'data:image/png;base64,AA==',
    imageSource: null,
    imageSize: {
      width: options.width ?? 1920,
      height: options.height ?? 1080,
    },
    defaultSteamLogo: null,
    fit: options.fit ?? 'cover',
    layout: {
      scale: options.scale ?? 1,
      x: options.x ?? 50,
      y: options.y ?? 50,
      rotation: options.rotation ?? 0,
    },
    frame: { ...DEFAULT_ADDITIONAL_ARTWORK_FRAME },
    reservedArtworkViewport: {
      kind: 'sbls/case-insert-artwork-viewport',
      formatVersion: 1,
      templateId: 'jewelCase',
      templateRevision: null,
      coordinateBasis: basis,
      widthPercent: 26,
      heightPercent: 16,
      focalPosition: { xPercent: 50, yPercent: 50 },
      zoom: 1,
    },
  }
}

function resolve(
  slot: ProjectCaseInsertImageSlot,
  owner: CaseInsertArtworkViewportRenderOwner = 'tray',
) {
  const layout = createJewelCasePreviewLayout(
    'jewelCase',
    owner === 'cover' ? 'front' : 'back',
  )
  const result = resolveCaseInsertArtworkViewportRenderArtifact({
    owner,
    slot,
    layout,
  })
  assert.equal(result.status, 'resolved')
  if (result.status !== 'resolved') throw new Error('Expected resolved viewport')
  return { artifact: result.artifact, layout }
}

function approximately(actual: number, expected: number, tolerance = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  )
}

test('reports legacy only when no reserved viewport is present', () => {
  const slot = createSlot()
  delete slot.reservedArtworkViewport
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')

  assert.deepEqual(
    resolveCaseInsertArtworkViewportRenderArtifact({ owner: 'tray', slot, layout }),
    { status: 'legacy' },
  )
})

test('fails closed for active invalid state and the legacy scale fit', () => {
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const scale = createSlot({ fit: 'scale' })
  const hostileFit = createSlot()
  ;(hostileFit as unknown as { fit: string }).fit = 'stretch-to-fill'
  const wrongOwner = createSlot({ basis: 'frontSafe' })

  assert.deepEqual(
    resolveCaseInsertArtworkViewportRenderArtifact({ owner: 'tray', slot: scale, layout }),
    { status: 'unavailable', reason: 'unsupported-fit' },
  )
  assert.deepEqual(
    resolveCaseInsertArtworkViewportRenderArtifact({
      owner: 'tray',
      slot: hostileFit,
      layout,
    }),
    { status: 'unavailable', reason: 'unsupported-fit' },
  )
  assert.deepEqual(
    resolveCaseInsertArtworkViewportRenderArtifact({ owner: 'tray', slot: wrongOwner, layout }),
    { status: 'unavailable', reason: 'invalid-viewport' },
  )
})

test('rejects hostile numeric magnitudes and publishes only operational numbers', () => {
  const hostile = createSlot({
    fit: 'contain',
    width: Number.MAX_VALUE,
    height: 1,
    scale: 0.1,
  })
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')

  assert.deepEqual(
    resolveCaseInsertArtworkViewportRenderArtifact({
      owner: 'tray',
      slot: hostile,
      layout,
    }),
    { status: 'unavailable', reason: 'numeric-result-invalid' },
  )

  const extremeCrop = createSlot({ fit: 'crop' })
  extremeCrop.reservedArtworkViewport = {
    ...extremeCrop.reservedArtworkViewport!,
    zoom: 1e300,
  }
  assert.deepEqual(
    resolveCaseInsertArtworkViewportRenderArtifact({
      owner: 'tray',
      slot: extremeCrop,
      layout,
    }),
    { status: 'unavailable', reason: 'invalid-viewport' },
  )

  const artifact = resolve(createSlot({ fit: 'crop' })).artifact
  const visit = (value: unknown): void => {
    if (typeof value === 'number') {
      assert.equal(Number.isFinite(value), true)
      assert.ok(Math.abs(value) <= 1e6)
      return
    }
    if (value && typeof value === 'object') {
      Object.values(value).forEach(visit)
    }
  }
  visit(artifact)
})

test('rejects non-positive, non-finite, and hostile layout dimensions', () => {
  const slot = createSlot()
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')

  for (const width of [0, Number.POSITIVE_INFINITY, 1_000_001, 1e300]) {
    assert.deepEqual(
      resolveCaseInsertArtworkViewportRenderArtifact({
        owner: 'tray',
        slot,
        layout: { ...layout, width },
      }),
      { status: 'unavailable', reason: 'invalid-layout' },
    )
  }
})

test('rejects incoherent, tiny, or ambiguous selected layout bases', () => {
  const slot = createSlot()
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const selected = layout.regions.find(({ regionId, surfaceId }) =>
    regionId === 'backPanelSafe' && surfaceId === 'back')
  assert.ok(selected)

  const expectInvalid = (
    candidate: typeof layout,
  ) => assert.deepEqual(
    resolveCaseInsertArtworkViewportRenderArtifact({
      owner: 'tray',
      slot,
      layout: candidate,
    }),
    { status: 'unavailable', reason: 'invalid-layout' },
  )
  const replaceSelectedBounds = (
    bounds: typeof selected.bounds,
  ): typeof layout => ({
    ...layout,
    regions: layout.regions.map((region) =>
      region === selected ? { ...region, bounds } : region),
  })

  expectInvalid({ ...layout, width: 1e-9 })
  expectInvalid(replaceSelectedBounds({
    ...selected.bounds,
    width: Number.MIN_VALUE,
  }))
  expectInvalid(replaceSelectedBounds({
    ...selected.bounds,
    x: -1,
  }))
  expectInvalid(replaceSelectedBounds({
    ...selected.bounds,
    x: layout.width - selected.bounds.width / 2,
  }))
  expectInvalid({
    ...layout,
    regions: [...layout.regions, { ...selected, bounds: { ...selected.bounds } }],
  })
})

test('rejects source projection ratios and absolute DOM demand above bounds', () => {
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const thinContent = createSlot({ fit: 'contain', width: 20_000, height: 1000 })
  thinContent.imageSize = {
    width: 20_000,
    height: 1000,
    contentBounds: { x: 0, y: 0, width: 1, height: 1000 },
  }
  assert.deepEqual(
    resolveCaseInsertArtworkViewportRenderArtifact({
      owner: 'tray',
      slot: thinContent,
      layout,
    }),
    { status: 'unavailable', reason: 'numeric-result-invalid' },
  )

  const highDemand = createSlot({ fit: 'cover', width: 1000, height: 1000 })
  highDemand.imageSize = {
    width: 1000,
    height: 1000,
    contentBounds: { x: 0, y: 0, width: 100, height: 1000 },
  }
  assert.deepEqual(
    resolveCaseInsertArtworkViewportRenderArtifact({
      owner: 'tray',
      slot: highDemand,
      layout: {
        templateId: 'jewelCase',
        width: 1_000_000,
        height: 1_000_000,
        regions: [{
          regionId: 'backPanelSafe',
          surfaceId: 'back',
          bounds: { x: 0, y: 0, width: 1_000_000, height: 1_000_000 },
        }],
      },
    }),
    { status: 'unavailable', reason: 'numeric-result-invalid' },
  )
})

test('renders the adopted maximum zoom for an ordinary Tray source', () => {
  const slot = createSlot({ fit: 'crop', width: 1920, height: 1080 })
  slot.reservedArtworkViewport = {
    ...slot.reservedArtworkViewport!,
    zoom: 1000,
  }
  const artifact = resolve(slot).artifact
  const horizontalRatio = artifact.imageSize!.width /
    artifact.visibleSourceRect.width
  const verticalRatio = artifact.imageSize!.height /
    artifact.visibleSourceRect.height

  assert.ok(horizontalRatio <= 10_000)
  assert.ok(verticalRatio > 1000)
  assert.ok(verticalRatio <= 10_000)
  assert.ok(
    artifact.destinationRect.width * horizontalRatio <= 1_000_000,
  )
  assert.ok(
    artifact.destinationRect.height * verticalRatio <= 1_000_000,
  )
})

test('keeps one physical Back Panel viewport for 16:9 and 4:3 replacement sources', () => {
  const wide = resolve(createSlot({ width: 1920, height: 1080 })).artifact
  const standard = resolve(createSlot({ width: 1200, height: 900 })).artifact

  assert.deepEqual(wide.outerRect, standard.outerRect)
  assert.notDeepEqual(wide.visibleSourceRect, standard.visibleSourceRect)
  approximately(wide.outerRect.width / wide.outerRect.height, 1.92639, 0.00002)
  assert.ok(wide.boundingRect.x >= wide.basisRect.x)
  assert.ok(
    wide.boundingRect.x + wide.boundingRect.width <=
      wide.basisRect.x + wide.basisRect.width,
  )
})

test('contain preserves complete semantic content and reports letterboxing', () => {
  const artifact = resolve(createSlot({ fit: 'contain', width: 1200, height: 900 }))
    .artifact

  assert.deepEqual(artifact.visibleSourceRect, artifact.contentSourceRect)
  assert.equal(artifact.hasVisibleClipping, false)
  assert.equal(artifact.hasEmptySpace, true)
  assert.ok(artifact.destinationRect.width <= artifact.localFrameRect.width)
  assert.ok(artifact.destinationRect.height <= artifact.localFrameRect.height)
})

test('cover and explicit crop use distinct source windows with focal zoom', () => {
  const cover = resolve(createSlot({ fit: 'cover', width: 1200, height: 900 }))
    .artifact
  const cropSlot = createSlot({ fit: 'crop', width: 1200, height: 900 })
  cropSlot.reservedArtworkViewport = {
    ...cropSlot.reservedArtworkViewport!,
    focalPosition: { xPercent: 75, yPercent: 25 },
    zoom: 2,
  }
  const crop = resolve(cropSlot).artifact

  approximately(crop.visibleSourceRect.width, cover.visibleSourceRect.width / 2)
  approximately(crop.visibleSourceRect.height, cover.visibleSourceRect.height / 2)
  assert.ok(crop.visibleSourceRect.x > cover.visibleSourceRect.x)
  assert.equal(crop.hasVisibleClipping, true)
  assert.deepEqual(crop.destinationRect, crop.localFrameRect)
})

test('uses semantic content bounds and treats the transparent sentinel as empty', () => {
  const bounded = createSlot({ width: 1000, height: 500 })
  bounded.imageSize = {
    width: 1000,
    height: 500,
    contentBounds: { x: 100, y: 50, width: 800, height: 400 },
  }
  assert.deepEqual(resolve(bounded).artifact.contentSourceRect, {
    x: 100,
    y: 50,
    width: 800,
    height: 400,
  })

  const empty = createSlot()
  empty.imageSize = {
    width: 1000,
    height: 500,
    contentBounds: { x: 0, y: 0, width: 0, height: 0 },
  }
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  assert.deepEqual(
    resolveCaseInsertArtworkViewportRenderArtifact({ owner: 'tray', slot: empty, layout }),
    { status: 'empty', reason: 'empty-content' },
  )
  assert.ok(empty.reservedArtworkViewport)
})

test('keeps rotated left and right Spine boxes side-owned and basis-contained', () => {
  const left = resolve(
    createSlot({ owner: 'left-spine', rotation: 90 }),
    'left-spine',
  ).artifact
  const right = resolve(
    createSlot({ owner: 'right-spine', rotation: -90 }),
    'right-spine',
  ).artifact

  assert.notEqual(left.coordinateBasis, right.coordinateBasis)
  assert.notEqual(left.box.center.x, right.box.center.x)
  approximately(left.boundingRect.width, left.box.height)
  approximately(left.boundingRect.height, left.box.width)
  for (const artifact of [left, right]) {
    assert.ok(artifact.boundingRect.x >= artifact.basisRect.x - 1e-9)
    assert.ok(artifact.boundingRect.y >= artifact.basisRect.y - 1e-9)
    assert.ok(
      artifact.boundingRect.x + artifact.boundingRect.width <=
        artifact.basisRect.x + artifact.basisRect.width + 1e-9,
    )
    assert.ok(
      artifact.boundingRect.y + artifact.boundingRect.height <=
        artifact.basisRect.y + artifact.basisRect.height + 1e-9,
    )
  }
})

test('clamps transformed outer geometry and deeply freezes the artifact', () => {
  const artifact = resolve(createSlot({ x: 100, y: 100, rotation: 31, scale: 4 }))
    .artifact

  assert.ok(
    artifact.boundingRect.x + artifact.boundingRect.width <=
      artifact.basisRect.x + artifact.basisRect.width + 1e-9,
  )
  assert.ok(
    artifact.boundingRect.y + artifact.boundingRect.height <=
      artifact.basisRect.y + artifact.basisRect.height + 1e-9,
  )
  assert.equal(Object.isFrozen(artifact), true)
  assert.equal(Object.isFrozen(artifact.box), true)
  assert.equal(Object.isFrozen(artifact.visibleSourceRect), true)
})

test('preview style adapter projects only shared artifact geometry', () => {
  const { artifact, layout } = resolve(createSlot({ fit: 'crop', rotation: 12 }))
  const basis = getCaseInsertArtworkViewportPreviewBasisStyle(artifact, layout)
  const outer = getCaseInsertArtworkViewportPreviewOuterStyle(artifact)
  const destination = getCaseInsertArtworkViewportPreviewDestinationStyle(
    artifact,
  )

  assert.equal(
    outer.left,
    `${(artifact.box.center.x - artifact.basisRect.x) /
      artifact.basisRect.width * 100}%`,
  )
  assert.equal(outer.transform, 'translate(-50%, -50%) rotate(12deg)')
  assert.equal(basis.overflow, 'hidden')
  assert.equal(
    destination.width,
    `${artifact.destinationRect.width / artifact.localFrameRect.width * 100}%`,
  )
})

test('preview and canvas sample the exact same visible source rectangle', () => {
  for (const fit of ['contain', 'cover', 'crop'] as const) {
    const slot = createSlot({ fit, width: 1200, height: 900 })
    if (fit === 'crop') {
      slot.reservedArtworkViewport = {
        ...slot.reservedArtworkViewport!,
        focalPosition: { xPercent: 70, yPercent: 30 },
        zoom: 1.75,
      }
    }
    const artifact = resolve(slot).artifact
    const sourceStyle = getCaseInsertArtworkViewportPreviewSourceStyle(artifact)
    const destinationStyle =
      getCaseInsertArtworkViewportPreviewDestinationStyle(artifact)

    assert.equal(
      sourceStyle.left,
      `${-artifact.visibleSourceRect.x /
        artifact.visibleSourceRect.width * 100}%`,
    )
    assert.equal(
      sourceStyle.width,
      `${artifact.imageSize!.width /
        artifact.visibleSourceRect.width * 100}%`,
    )
    assert.equal(
      destinationStyle.left,
      `${(artifact.destinationRect.x - artifact.localFrameRect.x) /
        artifact.localFrameRect.width * 100}%`,
    )
    assert.deepEqual(artifact.clipRect, artifact.localFrameRect)
  }
})

test('DOM sampling excludes transparent padding instead of bleeding raw pixels', () => {
  const bounded = createSlot({ fit: 'contain', width: 1000, height: 500 })
  bounded.imageSize = {
    width: 1000,
    height: 500,
    contentBounds: { x: 100, y: 50, width: 800, height: 400 },
  }
  const artifact = resolve(bounded).artifact
  const sourceStyle = getCaseInsertArtworkViewportPreviewSourceStyle(artifact)

  assert.deepEqual(artifact.visibleSourceRect, {
    x: 100,
    y: 50,
    width: 800,
    height: 400,
  })
  assert.equal(sourceStyle.left, '-12.5%')
  assert.equal(sourceStyle.top, '-12.5%')
  assert.equal(sourceStyle.width, '125%')
  assert.equal(sourceStyle.height, '125%')
})

test('Spine viewport keeps its role class and legacy-equivalent layer index', () => {
  const { artifact, layout } = resolve(
    createSlot({ owner: 'left-spine' }),
    'left-spine',
  )
  const classes = getCaseInsertArtworkViewportPreviewClassNames(artifact)
  const basis = getCaseInsertArtworkViewportPreviewBasisStyle(artifact, layout)

  assert.match(classes.viewport, /case-insert-spine-overlay-artwork/)
  assert.match(classes.viewport, /case-insert-artwork-viewport--left-spine/)
  assert.match(classes.basis, /case-insert-artwork-viewport-basis--spine/)
  assert.equal(basis.zIndex, 2)
})

test('active artwork exports before title while null legacy slots retain their order', () => {
  const legacyOne = { id: 'legacy-1', reservedArtworkViewport: null }
  const activeOne = { id: 'active-1', reservedArtworkViewport: {} }
  const legacyTwo = { id: 'legacy-2' }
  const activeTwo = { id: 'active-2', reservedArtworkViewport: {} }
  const partitioned = partitionCaseInsertArtworkViewportSlots([
    legacyOne,
    activeOne,
    legacyTwo,
    activeTwo,
  ])

  assert.deepEqual(
    partitioned.activeViewportSlots.map(({ id }) => id),
    ['active-1', 'active-2'],
  )
  assert.deepEqual(
    partitioned.legacySlots.map(({ id }) => id),
    ['legacy-1', 'legacy-2'],
  )
  assert.deepEqual([
    ...partitioned.activeViewportSlots.map(({ id }) => id),
    'title',
    ...partitioned.legacySlots.map(({ id }) => id),
  ], [
    'active-1',
    'active-2',
    'title',
    'legacy-1',
    'legacy-2',
  ])

  const legacyOnly = partitionCaseInsertArtworkViewportSlots([
    legacyOne,
    legacyTwo,
  ])
  assert.deepEqual([
    ...legacyOnly.activeViewportSlots.map(({ id }) => id),
    'title',
    ...legacyOnly.legacySlots.map(({ id }) => id),
  ], ['title', 'legacy-1', 'legacy-2'])

  for (const orderedSlots of [
    [legacyOne, activeOne],
    [activeOne, legacyOne],
  ]) {
    const mixed = partitionCaseInsertArtworkViewportSlots(orderedSlots)
    assert.deepEqual([
      ...mixed.activeViewportSlots.map(({ id }) => id),
      'title',
      ...mixed.legacySlots.map(({ id }) => id),
    ], ['active-1', 'title', 'legacy-1'])
  }

  const previewSource = readFileSync(
    new URL(
      '../components/preview/CaseInsertTemplatePreviewLayers.tsx',
      import.meta.url,
    ),
    'utf8',
  )
  const css = readFileSync(
    new URL('../styles/app-case-insert.css', import.meta.url),
    'utf8',
  )
  assert.match(previewSource, /partitionCaseInsertArtworkViewportSlots/)
  assert.match(previewSource, /mixedLegacyAboveTitle/)
  assert.match(
    css,
    /\.case-insert-template-framed-artwork--mixed-legacy\s*\{\s*z-index:\s*2;/,
  )
})

test('edge rocky frame drawing stays inside the Back Panel basis in preview and export', async () => {
  const slot = createSlot({ x: 0, y: 0 })
  slot.frame = {
    ...slot.frame,
    enabled: true,
    style: 'rocky',
  }
  const { artifact, layout } = resolve(slot)
  const previewBasis = getCaseInsertArtworkViewportPreviewBasisStyle(
    artifact,
    layout,
  )

  assert.equal(previewBasis.overflow, 'hidden')
  approximately(artifact.boundingRect.x, artifact.basisRect.x)
  approximately(artifact.boundingRect.y, artifact.basisRect.y)

  const calls: (string | readonly number[])[] = []
  const context = {
    save: () => calls.push('save'),
    beginPath: () => calls.push('beginPath'),
    rect: (x: number, y: number, width: number, height: number) =>
      calls.push([x, y, width, height]),
    clip: () => calls.push('clip'),
    restore: () => calls.push('restore'),
  } as unknown as CanvasRenderingContext2D

  await withCaseInsertArtworkViewportCanvasBasisClip(
    context,
    artifact.basisRect,
    () => calls.push('draw-rocky-frame'),
  )

  assert.deepEqual(calls, [
    'save',
    'beginPath',
    [
      artifact.basisRect.x,
      artifact.basisRect.y,
      artifact.basisRect.width,
      artifact.basisRect.height,
    ],
    'clip',
    'draw-rocky-frame',
    'restore',
  ])

  const css = readFileSync(
    new URL('../styles/app-case-insert.css', import.meta.url),
    'utf8',
  )
  const viewportRule = css.match(/\.case-insert-artwork-viewport \{([^}]*)\}/)?.[1]
  assert.ok(viewportRule)
  assert.doesNotMatch(viewportRule, /drop-shadow/)
})

test('maps canonical visible-source evidence into loaded canvas pixels', () => {
  const image = {
    naturalWidth: 2400,
    naturalHeight: 1800,
    width: 2400,
    height: 1800,
  } as HTMLImageElement

  assert.deepEqual(
    getCanvasImageStoredSourceRect(
      image,
      { width: 1200, height: 900 },
      { x: 300, y: 200, width: 600, height: 400 },
    ),
    { x: 600, y: 400, width: 1200, height: 800 },
  )
})

test('maps an exact full stored source to exact loaded dimensions', () => {
  const image = {
    naturalWidth: 300,
    naturalHeight: 158,
    width: 300,
    height: 158,
  } as HTMLImageElement

  assert.deepEqual(
    getCanvasImageStoredSourceRect(
      image,
      { width: 284, height: 150 },
      { x: 0, y: 0, width: 284, height: 150 },
    ),
    { x: 0, y: 0, width: 300, height: 158 },
  )
})
