import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCustomDiscTemplate } from '../discGeometry.ts'
import {
  createDefaultDiscTextLayoutForTemplate,
  getDefaultAdditionalLogoAssetLayoutForTemplate,
  getDefaultLogoAssetLayoutForTemplate,
  getDefaultMediaMarkLayoutForTemplate,
  getDefaultPlatformMarkLayoutForTemplate,
  getDefaultRatingBadgeLayoutForTemplate,
  getDefaultTechnicalMarkLayoutForTemplate,
  getDiscTemplateLayoutMetrics,
} from './discTemplateLayoutDefaults.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  addAdditionalLogoAsset,
  createDefaultProjectLogoAssets,
  resetProjectLogoAssetLayout,
} from '../project/projectLogoAssets.ts'
import {
  createDefaultProjectMediaMark,
  createDefaultProjectPlatformMarks,
  resetProjectMediaMarkLayout,
  resetProjectPlatformMarkLayout,
  updatePlatformMarkToggle,
} from '../project/projectMediaMark.ts'
import {
  createDefaultProjectRatingBadge,
  resetProjectRatingBadgeLayout,
} from '../project/projectRatingBadge.ts'
import {
  createDefaultProjectTechnicalMarks,
  resetProjectTechnicalMarkLayout,
  updateTechnicalMarkToggle,
} from '../project/projectTechnicalMarks.ts'

function assertApproximatelyEqual(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 0.000001,
    `Expected ${actual} to approximately equal ${expected}`,
  )
}

function distanceFromDiscCenter(point: { x: number; y: number }) {
  return Math.hypot(point.x - 50, point.y - 50)
}

function assertPointInsideSafeRing(
  point: { x: number; y: number },
  template = largeHubTemplate(),
) {
  const metrics = getDiscTemplateLayoutMetrics(template)
  const distance = distanceFromDiscCenter(point)

  assert.ok(
    distance >= metrics.innerPrintRadiusPercent,
    `Expected ${JSON.stringify(point)} to avoid inner radius ${metrics.innerPrintRadiusPercent}`,
  )
  assert.ok(
    distance <= metrics.safeRadiusPercent,
    `Expected ${JSON.stringify(point)} to stay inside safe radius ${metrics.safeRadiusPercent}`,
  )
}

function assertTextLayoutInsideSafeRing(
  layout: { x: number; y: number },
  template = largeHubTemplate(),
) {
  assertPointInsideSafeRing({ x: 50 + layout.x, y: layout.y }, template)
}

function largeHubTemplate() {
  return buildCustomDiscTemplate(discTemplates.standardPrintableDisc, {
    innerHoleDiameterMm: 60,
    physicalCenterHoleDiameterMm: 15,
    printableDiameterMm: 118,
    safeDiameterMm: 112,
  })
}

test('standard printable disc defaults preserve the current baseline anchors', () => {
  const template = discTemplates.standardPrintableDisc
  const textLayout = createDefaultDiscTextLayoutForTemplate(template, 'top')
  const developerLogoLayout = getDefaultLogoAssetLayoutForTemplate(template, 'developer')
  const publisherLogoLayout = getDefaultLogoAssetLayoutForTemplate(template, 'publisher')
  const additionalDeveloperLogoLayout =
    getDefaultAdditionalLogoAssetLayoutForTemplate(template, 'developer', 0)
  const ratingBadgeLayout = getDefaultRatingBadgeLayoutForTemplate(template)
  const mediaMarkLayout = getDefaultMediaMarkLayoutForTemplate(template)
  const windowsPlatformLayout = getDefaultPlatformMarkLayoutForTemplate(template, 'windows')
  const audioTechnicalLayout = getDefaultTechnicalMarkLayoutForTemplate(template, 'audio')

  assertApproximatelyEqual(textLayout.title.x, 0)
  assertApproximatelyEqual(textLayout.title.y, 19.5)
  assertApproximatelyEqual(textLayout.subtitle.y, 24)
  assertApproximatelyEqual(textLayout.customNote.y, 78)
  assertApproximatelyEqual(developerLogoLayout.x, 22)
  assertApproximatelyEqual(developerLogoLayout.y, 62)
  assertApproximatelyEqual(publisherLogoLayout.x, 22)
  assertApproximatelyEqual(publisherLogoLayout.y, 72)
  assert.ok(additionalDeveloperLogoLayout.x > developerLogoLayout.x)
  assertPointInsideSafeRing(additionalDeveloperLogoLayout, template)
  assertApproximatelyEqual(ratingBadgeLayout.x, 78)
  assertApproximatelyEqual(ratingBadgeLayout.y, 50)
  assertApproximatelyEqual(mediaMarkLayout.x, 74)
  assertApproximatelyEqual(mediaMarkLayout.y, 72)
  assertApproximatelyEqual(windowsPlatformLayout.x, 37)
  assertApproximatelyEqual(windowsPlatformLayout.y, 70)
  assertApproximatelyEqual(audioTechnicalLayout.x, 63)
  assertApproximatelyEqual(audioTechnicalLayout.y, 70)
})

test('custom large-hub templates push default text and marks into the safe printable ring', () => {
  const template = largeHubTemplate()
  const textLayout = createDefaultDiscTextLayoutForTemplate(template, 'top')
  const markLayouts = [
    getDefaultLogoAssetLayoutForTemplate(template, 'developer'),
    getDefaultLogoAssetLayoutForTemplate(template, 'publisher'),
    getDefaultRatingBadgeLayoutForTemplate(template),
    getDefaultMediaMarkLayoutForTemplate(template),
    getDefaultPlatformMarkLayoutForTemplate(template, 'pc'),
    getDefaultPlatformMarkLayoutForTemplate(template, 'windows'),
    getDefaultPlatformMarkLayoutForTemplate(template, 'linux'),
    getDefaultPlatformMarkLayoutForTemplate(template, 'steamDeck'),
    getDefaultPlatformMarkLayoutForTemplate(template, 'macos'),
    getDefaultTechnicalMarkLayoutForTemplate(template, 'audio'),
    getDefaultTechnicalMarkLayoutForTemplate(template, 'surround'),
    getDefaultTechnicalMarkLayoutForTemplate(template, 'codec'),
    getDefaultTechnicalMarkLayoutForTemplate(template, 'middleware'),
    getDefaultTechnicalMarkLayoutForTemplate(template, 'technology'),
  ]

  for (const key of [
    'title',
    'subtitle',
    'discNumber',
    'backupDate',
    'appId',
    'developer',
    'publisher',
    'installNotes',
    'customNote',
  ] as const) {
    assertTextLayoutInsideSafeRing(textLayout[key], template)
  }

  for (const layout of markLayouts) {
    assertPointInsideSafeRing(layout, template)
  }
})

test('template-aware reset helpers preserve enabled state while resetting to template defaults', () => {
  const template = largeHubTemplate()
  const logoAssets = createDefaultProjectLogoAssets()
  const resetLogoAssets = resetProjectLogoAssetLayout(
    addAdditionalLogoAsset({
      ...logoAssets,
      developerLogoLayout: {
        enabled: true,
        scale: 1.4,
        x: 95,
        y: 95,
      },
    }, 'developer', template),
    'developer',
    template,
  )
  const additionalDeveloperLogo = resetProjectLogoAssetLayout(
    resetLogoAssets,
    'developer',
    template,
    resetLogoAssets.additionalDeveloperLogos[0]?.id,
  ).additionalDeveloperLogos[0]!
  const resetRatingBadge = resetProjectRatingBadgeLayout(
    {
      ...createDefaultProjectRatingBadge(),
      layout: {
        enabled: true,
        scale: 1.3,
        x: 5,
        y: 5,
      },
    },
    template,
  )
  const resetMediaMark = resetProjectMediaMarkLayout(
    {
      ...createDefaultProjectMediaMark(),
      layout: {
        enabled: true,
        scale: 1.2,
        x: 50,
        y: 50,
      },
    },
    template,
  )
  const platformMarks = updatePlatformMarkToggle(
    createDefaultProjectPlatformMarks(),
    'windows',
    true,
  )
  const resetPlatformMarks = resetProjectPlatformMarkLayout(
    platformMarks,
    'windows',
    template,
  )
  const technicalMarks = updateTechnicalMarkToggle(
    createDefaultProjectTechnicalMarks(),
    'audio',
    true,
  )
  const resetTechnicalMarks = resetProjectTechnicalMarkLayout(
    technicalMarks,
    'audio',
    template,
  )

  assert.equal(resetLogoAssets.developerLogoLayout.enabled, true)
  assertPointInsideSafeRing(resetLogoAssets.developerLogoLayout, template)
  assert.equal(additionalDeveloperLogo.layout.enabled, true)
  assertPointInsideSafeRing(additionalDeveloperLogo.layout, template)
  assert.equal(resetRatingBadge.layout.enabled, true)
  assertPointInsideSafeRing(resetRatingBadge.layout, template)
  assert.equal(resetMediaMark.layout.enabled, true)
  assertPointInsideSafeRing(resetMediaMark.layout, template)
  assert.equal(resetPlatformMarks.assets.windows?.layout.enabled, true)
  assertPointInsideSafeRing(resetPlatformMarks.assets.windows!.layout, template)
  assert.equal(resetTechnicalMarks.assets.audio?.layout.enabled, true)
  assertPointInsideSafeRing(resetTechnicalMarks.assets.audio!.layout, template)
})
