import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
} from '../discText/index.ts'
import { createDefaultDiscTextStyles } from '../discText/styles.ts'
import {
  placeGroupedPlatformMarks,
} from '../layout/groupedPlatformMarkPlacement.ts'
import {
  CLASSIC_TOP_TITLE_DISC_PRESET_ID,
} from '../presets/builtins/classicTopTitleDiscPreset.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import {
  createDefaultDiscTextValueSources,
} from '../project/metadataDiscText.ts'
import { createDefaultProjectMediaMark } from '../project/projectMediaMark.ts'
import {
  createDefaultProjectPlatformMarkAsset,
  createDefaultProjectPlatformMarks,
  getProjectPlatformMarkAsset,
} from '../project/projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import { createDefaultProjectTitleArtwork } from '../project/projectTitleArtwork.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import type { DiscTemplate } from '../types/template.ts'
import {
  applyRegisteredDiscPresetToState,
  createRegisteredDiscPresetOwnerStateSnapshot,
  type RegisteredDiscPresetApplicationState,
} from './appRegisteredDiscPresetApplication.ts'

type TestState = RegisteredDiscPresetApplicationState & Readonly<{
  unrelated: Readonly<{
    technicalMarkLayout: Readonly<{
      enabled: boolean
      x: number
      y: number
      scale: number
    }>
  }>
}>

const wrapperSource = readFileSync(
  'src/app/appRegisteredDiscPresetApplication.ts',
  'utf8',
)
const legacySource = readFileSync('src/layout/discRolePresets.ts', 'utf8')
const appSource = readFileSync('src/app/App.tsx', 'utf8')

function createState(): TestState {
  const template = discTemplates.standardPrintableDisc
  const textLayout = createDefaultDiscTextLayout('top', template)
  const logos = createDefaultProjectLogoAssets(template)

  return {
    background: {
      enabled: false,
      scale: 1.8,
      offset: { x: 11, y: -9 },
      imageDataUrl: 'data:image/png;base64,background',
      imageSource: {
        source: 'uploaded',
        sourceId: 'background-id',
        sourceLabel: 'background.png',
      },
      imageSize: { width: 1920, height: 1080 },
      note: 'Preserve background note.',
    },
    titleArtwork: {
      ...createDefaultProjectTitleArtwork(template, 'top'),
      source: 'custom',
      sourceLabel: 'title.png',
      imageDataUrl: 'data:image/png;base64,title',
      imageSize: { width: 900, height: 300 },
      layout: { enabled: false, x: 17, y: 23, scale: 1.8 },
    },
    discTextSettings: {
      ...DEFAULT_DISC_TEXT_SETTINGS,
      title: false,
      copyright: false,
    },
    discTextValues: createDefaultDiscTextValues(),
    discTextValueSources: createDefaultDiscTextValueSources(),
    discTextTitleValue: 'Preserve title.',
    discTextHtmlSources: {},
    discTextLayout: {
      ...textLayout,
      title: {
        ...textLayout.title,
        x: 12,
        y: 31,
        width: 44,
        scale: 1.17,
        fontSizePt: 17,
        align: 'left',
        mode: 'curved',
      },
      copyright: {
        ...textLayout.copyright,
        x: -14,
        y: 68,
        width: 42,
        scale: 0.91,
        fontSizePt: 7,
        align: 'right',
        mode: 'curved',
      },
      customNote: {
        ...textLayout.customNote,
        x: 19,
        y: 51,
        width: 37,
      },
    },
    discTextStyles: createDefaultDiscTextStyles(),
    logoAssets: {
      ...logos,
      developerLogoDataUrl: 'data:image/png;base64,developer',
      developerLogoSource: {
        source: 'uploaded',
        sourceId: 'developer-id',
        sourceLabel: 'developer.png',
      },
      developerLogoSize: { width: 400, height: 100 },
      developerLogoLayout: {
        enabled: false,
        x: 14,
        y: 44,
        scale: 1.2,
      },
      publisherLogoDataUrl: 'data:image/png;base64,publisher',
      publisherLogoSource: {
        source: 'official-logo-candidate',
        sourceId: 'publisher-id',
        sourceLabel: 'publisher.png',
      },
      publisherLogoSize: { width: 360, height: 90 },
      publisherLogoLayout: {
        enabled: false,
        x: 86,
        y: 43,
        scale: 1.1,
      },
      additionalDeveloperLogos: [
        {
          id: 'additional-developer',
          label: 'Additional developer',
          imageDataUrl: 'data:image/png;base64,additional-developer',
          imageSource: {
            source: 'uploaded',
            sourceId: 'additional-developer-id',
            sourceLabel: 'additional-developer.png',
          },
          imageSize: { width: 200, height: 80 },
          layout: { enabled: true, x: 10, y: 82, scale: 0.6 },
        },
      ],
      additionalPublisherLogos: [
        {
          id: 'additional-publisher',
          label: 'Additional publisher',
          imageDataUrl: 'data:image/png;base64,additional-publisher',
          imageSource: {
            source: 'uploaded',
            sourceId: 'additional-publisher-id',
            sourceLabel: 'additional-publisher.png',
          },
          imageSize: { width: 200, height: 80 },
          layout: { enabled: true, x: 90, y: 82, scale: 0.6 },
        },
      ],
    },
    ratingBadge: {
      ...createDefaultProjectRatingBadge(template),
      source: 'custom',
      customImageDataUrl: 'data:image/png;base64,rating',
      customImageSize: { width: 180, height: 260 },
      layout: { enabled: false, x: 9, y: 9, scale: 1.6 },
    },
    mediaMark: {
      ...createDefaultProjectMediaMark(template),
      source: 'custom',
      theme: 'dark',
      customImageDataUrl: 'data:image/png;base64,media',
      customImageSize: { width: 220, height: 120 },
      layout: { enabled: false, x: 8, y: 8, scale: 1.7 },
    },
    platformMarks: createDefaultProjectPlatformMarks(),
    metadata: createDefaultProjectMetadata(),
    unrelated: {
      technicalMarkLayout: {
        enabled: true,
        x: 63,
        y: 81,
        scale: 0.77,
      },
    },
  }
}

function applyClassic(state: TestState, template = discTemplates.standardPrintableDisc) {
  const result = applyRegisteredDiscPresetToState({
    presetId: 'classic-top-title',
    currentState: state,
    selectedDiscTemplate: template,
  })

  assert.ok(result)
  return result
}

test('legacy Classic alias resolves and plans every canonical target', () => {
  const result = applyClassic(createState())

  assert.equal(result.canonicalPresetId, CLASSIC_TOP_TITLE_DISC_PRESET_ID)
  assert.equal(result.status, 'applied')
  assert.deepEqual(
    result.updates.map(({ target }) => target),
    [
      'game-title.artwork',
      'game-title.text',
      'background.primary',
      'rating.primary',
      'media-format.primary',
      'developer-logo.primary',
      'publisher-logo.primary',
      'legal.copyright',
    ],
  )
  assert.deepEqual(result.updatedOwners, [
    'titleArtwork',
    'discText',
    'backgroundImage',
    'ratingBadge',
    'mediaMark',
    'logoAssets',
  ])
  assert.equal(result.warnings.some((warning) =>
    warning.kind === 'text-fit-impossible'), false)
  assert.equal(result.warnings.some((warning) =>
    warning.kind === 'missing-placement-adapter'), false)
})

test('focused owner snapshot contains only the nine Classic semantic targets', () => {
  const snapshot = createRegisteredDiscPresetOwnerStateSnapshot(
    createState(),
    discTemplates.standardPrintableDisc,
  )

  assert.deepEqual(Object.keys(snapshot), [
    'game-title.artwork',
    'game-title.text',
    'background.primary',
    'rating.primary',
    'media-format.primary',
    'operating-system-marks.enabled',
    'developer-logo.primary',
    'publisher-logo.primary',
    'legal.copyright',
  ])
  assert.equal(Object.isFrozen(snapshot), true)
  assert.equal(Object.isFrozen(snapshot['game-title.artwork']!), true)
  assert.equal(Object.isFrozen(snapshot['game-title.artwork']!.layout), true)
})

test('Legal owner snapshot resolves manual metadata and HTML content canonically', () => {
  const manualState = createState()
  manualState.discTextValues.copyright = 'Manual copyright'
  manualState.discTextValueSources.copyright = 'manual'
  let legal = createRegisteredDiscPresetOwnerStateSnapshot(
    manualState,
    discTemplates.standardPrintableDisc,
  )['legal.copyright']!
  assert.equal(legal.content.plainText, 'Manual copyright')
  assert.equal(legal.content.richText, undefined)

  const metadataState = createState()
  metadataState.metadata.copyrightText = 'Metadata copyright'
  metadataState.discTextValueSources.copyright = 'metadata'
  legal = createRegisteredDiscPresetOwnerStateSnapshot(
    metadataState,
    discTemplates.standardPrintableDisc,
  )['legal.copyright']!
  assert.equal(legal.content.plainText, 'Metadata copyright')

  const htmlState = createState()
  htmlState.discTextValues.copyright = 'Fallback copyright'
  htmlState.discTextValueSources.copyright = 'manual'
  htmlState.discTextHtmlSources.copyright =
    '<strong>Rich</strong><br><em>copyright</em>'
  legal = createRegisteredDiscPresetOwnerStateSnapshot(
    htmlState,
    discTemplates.standardPrintableDisc,
  )['legal.copyright']!
  assert.equal(legal.content.plainText, 'Rich\ncopyright')
  assert.equal(
    legal.content.richText?.source,
    '<p><strong>Rich</strong></p><p><em>copyright</em></p>',
  )
})

test('normal Legal content is applied while genuinely impossible content stays partial', () => {
  const shortState = createState()
  shortState.discTextSettings.copyright = true
  shortState.discTextValues.copyright = 'Copyright 2026 Example Studios.'
  shortState.discTextValueSources.copyright = 'manual'
  const shortResult = applyClassic(shortState)

  assert.equal(shortResult.status, 'applied')
  assert.equal(shortResult.state.discTextLayout.copyright.fontSizePt, 7)
  assert.equal(shortResult.warnings.some(
    ({ kind }) => kind === 'text-fit-impossible',
  ), false)

  const adjustedState = createState()
  adjustedState.discTextSettings.copyright = true
  adjustedState.discTextValues.copyright = Array.from(
    { length: 12 },
    (_, index) => `Clause ${index + 1}: reserved legal terms`,
  ).join(' ')
  adjustedState.discTextValueSources.copyright = 'manual'
  const adjustedResult = applyClassic(adjustedState)

  assert.equal(adjustedResult.status, 'applied')
  assert.ok(adjustedResult.warnings.some(
    ({ kind }) => kind === 'text-fit-adjusted',
  ))
  assert.ok(adjustedResult.state.discTextLayout.copyright.fontSizePt < 7)

  const impossibleState = createState()
  impossibleState.discTextSettings.copyright = true
  impossibleState.discTextValues.copyright = Array.from(
    { length: 24 },
    (_, index) => `Legal line ${index + 1}`,
  ).join('\n')
  impossibleState.discTextValueSources.copyright = 'manual'
  const impossibleResult = applyClassic(impossibleState)

  assert.equal(impossibleResult.status, 'partial')
  assert.ok(impossibleResult.warnings.some(
    ({ kind }) => kind === 'text-fit-impossible',
  ))
  assert.equal(
    impossibleResult.resolvedPreset?.slots.find(
      ({ id }) => id === 'disc:guided:legal-text:copyright',
    )?.status,
    'unsupported',
  )
})

test('registered application injects its text measurement service', () => {
  const state = createState()
  state.discTextSettings.copyright = true
  state.discTextValues.copyright = 'Copyright 2026 Example Studios.'
  state.discTextValueSources.copyright = 'manual'
  const measuredFonts: string[] = []
  const result = applyRegisteredDiscPresetToState({
    presetId: 'classic-top-title',
    currentState: state,
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
    services: {
      textMeasurement: {
        measureText(text, font) {
          measuredFonts.push(font)
          const fontSize = Number(
            font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 1,
          )
          return Array.from(text).length * fontSize * 0.55
        },
      },
    },
  })

  assert.equal(result?.status, 'applied')
  assert.ok(measuredFonts.length > 0)
})

test('Classic seeds every dormant fixed owner without changing enablement', () => {
  const before = createState()
  const result = applyClassic(before)
  const after = result.state

  assert.equal(after.background.enabled, false)
  assert.deepEqual(after.background.offset, { x: 0, y: 0 })
  assert.equal(after.background.scale, 1)
  assert.deepEqual(after.titleArtwork.layout, {
    enabled: false,
    x: 50,
    y: 19.5,
    scale: 1,
  })
  assert.equal(after.discTextSettings.title, false)
  assert.equal(after.discTextLayout.title.x, 0)
  assert.equal(after.discTextLayout.title.y, 19.5)
  assert.equal(after.discTextLayout.title.width, 62)
  assert.equal(after.discTextLayout.title.scale, 1.17)
  assert.equal(after.discTextLayout.title.fontSizePt, 17)
  assert.equal(after.discTextLayout.title.align, 'center')
  assert.equal(after.discTextLayout.title.mode, 'straight')
  assert.deepEqual(after.ratingBadge.layout, {
    enabled: false,
    x: 79,
    y: 62,
    scale: 0.75,
  })
  assert.deepEqual(after.mediaMark.layout, {
    enabled: false,
    x: 80,
    y: 76,
    scale: 0.7,
  })
  assert.deepEqual(after.logoAssets.developerLogoLayout, {
    enabled: false,
    x: 21,
    y: 62,
    scale: 0.7,
  })
  assert.deepEqual(after.logoAssets.publisherLogoLayout, {
    enabled: false,
    x: 21,
    y: 74,
    scale: 0.7,
  })
  assert.equal(after.discTextSettings.copyright, false)
  assert.equal(after.discTextLayout.copyright.x, 0)
  assert.equal(after.discTextLayout.copyright.y, 85)
  assert.equal(after.discTextLayout.copyright.width, 46)
  assert.equal(after.discTextLayout.copyright.scale, 0.91)
  assert.equal(after.discTextLayout.copyright.fontSizePt, 7)
  assert.equal(after.discTextLayout.copyright.align, 'center')
  assert.equal(after.discTextLayout.copyright.mode, 'straight')
  assert.equal(after.discTextLayout.copyright.avoidVisualElements, false)

  const enabledAfterward = {
    ...after,
    ratingBadge: {
      ...after.ratingBadge,
      layout: { ...after.ratingBadge.layout, enabled: true },
    },
  }
  assert.equal(enabledAfterward.ratingBadge.layout.x, 79)
  assert.equal(enabledAfterward.ratingBadge.layout.y, 62)
})

test('completed fixed-owner centers match their resolved Classic slots', () => {
  const result = applyClassic(createState())
  assert.ok(result.resolvedPreset)
  const slots = new Map(result.resolvedPreset.slots.map((slot) => [
    slot.id,
    slot.resolvedContentRegion,
  ]))
  const title = slots.get('disc:guided:game-title:primary')!
  const rating = slots.get('disc:guided:rating-badge:primary')!
  const media = slots.get('disc:guided:media-format-mark:primary')!
  const developer = slots.get('disc:guided:developer-logo:primary')!
  const publisher = slots.get('disc:guided:publisher-logo:primary')!
  const legal = slots.get('disc:guided:legal-text:copyright')!

  assert.equal(result.state.titleArtwork.layout.x, title.centerXPercent)
  assert.equal(result.state.titleArtwork.layout.y, title.centerYPercent)
  assert.equal(
    result.state.discTextLayout.title.x + 50,
    title.centerXPercent,
  )
  assert.equal(result.state.discTextLayout.title.y, title.centerYPercent)
  assert.equal(result.state.ratingBadge.layout.x, rating.centerXPercent)
  assert.equal(result.state.ratingBadge.layout.y, rating.centerYPercent)
  assert.equal(result.state.mediaMark.layout.x, media.centerXPercent)
  assert.equal(result.state.mediaMark.layout.y, media.centerYPercent)
  assert.equal(
    result.state.logoAssets.developerLogoLayout.x,
    developer.centerXPercent,
  )
  assert.equal(
    result.state.logoAssets.developerLogoLayout.y,
    developer.centerYPercent,
  )
  assert.equal(
    result.state.logoAssets.publisherLogoLayout.x,
    publisher.centerXPercent,
  )
  assert.equal(
    result.state.logoAssets.publisherLogoLayout.y,
    publisher.centerYPercent,
  )
  assert.equal(
    result.state.discTextLayout.copyright.x + 50,
    legal.centerXPercent,
  )
  assert.equal(
    result.state.discTextLayout.copyright.y,
    legal.centerYPercent,
  )
})

test('Classic preserves all non-placement content and unrelated owner state', () => {
  const before = createState()
  const beforeSnapshot = structuredClone(before)
  const result = applyClassic(before)
  const after = result.state

  assert.equal(after.background.imageDataUrl, before.background.imageDataUrl)
  assert.equal(after.background.imageSource, before.background.imageSource)
  assert.equal(after.background.imageSize, before.background.imageSize)
  assert.equal(after.background.note, before.background.note)
  assert.equal(after.titleArtwork.imageDataUrl, before.titleArtwork.imageDataUrl)
  assert.equal(after.titleArtwork.source, before.titleArtwork.source)
  assert.equal(after.titleArtwork.sourceLabel, before.titleArtwork.sourceLabel)
  assert.equal(after.ratingBadge.source, before.ratingBadge.source)
  assert.equal(
    after.ratingBadge.customImageDataUrl,
    before.ratingBadge.customImageDataUrl,
  )
  assert.equal(after.mediaMark.source, before.mediaMark.source)
  assert.equal(after.mediaMark.theme, before.mediaMark.theme)
  assert.equal(
    after.mediaMark.customImageDataUrl,
    before.mediaMark.customImageDataUrl,
  )
  assert.equal(
    after.logoAssets.additionalDeveloperLogos,
    before.logoAssets.additionalDeveloperLogos,
  )
  assert.equal(
    after.logoAssets.additionalPublisherLogos,
    before.logoAssets.additionalPublisherLogos,
  )
  assert.equal(after.discTextLayout.customNote, before.discTextLayout.customNote)
  assert.equal(after.unrelated, before.unrelated)
  assert.deepEqual(before, beforeSnapshot)
})

test('enabled owners and selected OS marks receive canonical placement only', () => {
  const template = discTemplates.standardPrintableDisc
  const before = createState()
  const windows = createDefaultProjectPlatformMarkAsset('windows', template)
  const linux = createDefaultProjectPlatformMarkAsset('linux', template)
  const state: TestState = {
    ...before,
    titleArtwork: {
      ...before.titleArtwork,
      layout: { ...before.titleArtwork.layout, enabled: true },
    },
    discTextSettings: {
      ...before.discTextSettings,
      title: true,
      copyright: true,
    },
    ratingBadge: {
      ...before.ratingBadge,
      layout: { ...before.ratingBadge.layout, enabled: true },
    },
    mediaMark: {
      ...before.mediaMark,
      layout: { ...before.mediaMark.layout, enabled: true },
    },
    logoAssets: {
      ...before.logoAssets,
      developerLogoLayout: {
        ...before.logoAssets.developerLogoLayout,
        enabled: true,
      },
      publisherLogoLayout: {
        ...before.logoAssets.publisherLogoLayout,
        enabled: true,
      },
    },
    platformMarks: {
      ...before.platformMarks,
      values: ['linux', 'windows'],
      assets: {
        windows: {
          ...windows,
          layout: { ...windows.layout, enabled: true },
        },
        linux: {
          ...linux,
          layout: { ...linux.layout, enabled: true },
        },
      },
    },
  }
  const expected = placeGroupedPlatformMarks({
    platformMarks: state.platformMarks,
    region: {
      centerXPercent: 50,
      centerYPercent: 73,
      widthPercent: 28,
      heightPercent: 10,
    },
    template,
  })
  assert.equal(expected.status, 'placed')

  const result = applyClassic(state, template)

  assert.equal(result.state.titleArtwork.layout.enabled, true)
  assert.equal(result.state.discTextSettings.title, true)
  assert.equal(result.state.discTextSettings.copyright, true)
  assert.equal(result.state.ratingBadge.layout.enabled, true)
  assert.equal(result.state.mediaMark.layout.enabled, true)
  assert.equal(result.state.logoAssets.developerLogoLayout.enabled, true)
  assert.equal(result.state.logoAssets.publisherLogoLayout.enabled, true)
  assert.deepEqual(result.state.platformMarks.values, state.platformMarks.values)
  assert.equal(
    result.state.platformMarks.inference,
    state.platformMarks.inference,
  )

  for (const update of expected.updates) {
    const beforeAsset = getProjectPlatformMarkAsset(
      state.platformMarks,
      update.value,
      template,
    )
    const afterAsset = getProjectPlatformMarkAsset(
      result.state.platformMarks,
      update.value,
      template,
    )
    assert.deepEqual(afterAsset, {
      ...beforeAsset,
      layout: {
        ...beforeAsset.layout,
        x: update.x,
        y: update.y,
        scale: update.scale,
      },
    })
  }
})

test('impossible OS grouping stays partial while other owner updates apply', () => {
  const template = {
    ...discTemplates.standardPrintableDisc,
    id: 'large-center-hole',
    physicalCenterHoleDiameterMm: 65,
    safeDiameterMm: 110,
  }
  const before = createState()
  const windows = createDefaultProjectPlatformMarkAsset('windows', template)
  const state: TestState = {
    ...before,
    platformMarks: {
      ...before.platformMarks,
      values: ['windows'],
      assets: {
        windows: {
          ...windows,
          layout: { ...windows.layout, enabled: true },
        },
      },
    },
  }
  const result = applyClassic(state, template)

  assert.equal(result.status, 'partial')
  assert.ok(result.warnings.some((warning) =>
    warning.kind === 'grouped-placement-impossible'))
  assert.equal(result.state.platformMarks, state.platformMarks)
  assert.equal(result.state.ratingBadge.layout.x, 79)
  assert.equal(result.state.mediaMark.layout.y, 76)
})

test('unregistered presets remain on the legacy path and invalid templates reject', () => {
  const state = createState()

  assert.equal(applyRegisteredDiscPresetToState({
    presetId: 'centered-logo-archive',
    currentState: state,
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
  }), null)
  assert.equal(applyRegisteredDiscPresetToState({
    presetId: 'clean-metadata-footer',
    currentState: state,
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
  }), null)
  assert.equal(applyRegisteredDiscPresetToState({
    presetId: 'missing-preset',
    currentState: state,
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
  }), null)

  const invalidTemplate = {
    ...discTemplates.standardPrintableDisc,
    safeDiameterMm: 0,
  } as DiscTemplate
  const rejected = applyClassic(state, invalidTemplate)

  assert.equal(rejected.status, 'rejected')
  assert.equal(rejected.state, state)
  assert.deepEqual(rejected.updates, [])
  assert.deepEqual(rejected.updatedOwners, [])
  assert.ok(rejected.warnings.some((warning) =>
    warning.kind === 'invalid-template-geometry'))
})

test('Classic production routing has no legacy coordinates or App target switch', () => {
  assert.doesNotMatch(
    legacySource,
    /centerYPercent:\s*73|layout\.y', value:\s*19\.5/,
  )
  assert.match(legacySource, /updatePlan:\s*\[\]/)
  assert.match(wrapperSource, /DISC_PRESET_REGISTRY\.get\(presetId\)/)
  assert.match(wrapperSource, /resolveDiscPresetDefinition\(\{/)
  assert.match(wrapperSource, /buildDiscPresetApplicationPlan\(\{/)
  assert.match(
    wrapperSource,
    /DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY/,
  )
  assert.doesNotMatch(wrapperSource, /from ['"]react['"]/)
  assert.doesNotMatch(appSource, /game-title\.artwork|legal\.copyright/)
  assert.doesNotMatch(appSource, /switch\s*\(\s*(?:slot|target)/)
  assert.doesNotMatch(wrapperSource, /content-measurement-required/)
})
