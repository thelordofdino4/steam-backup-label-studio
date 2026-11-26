import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampMediaMarkLayoutToSafeZone,
  clampProjectLogoAssetsToSafeZone,
  clampProjectPlatformMarksToSafeZone,
  clampProjectRatingBadgeToSafeZone,
  clampProjectTechnicalMarksToSafeZone,
  clampProjectTitleArtworkToSafeZone,
} from '../layout/discElementSafeZone.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { restoreSavedProjectState } from '../project/restoreProjectState.ts'
import type { DiscRolePresetCurrentState } from './appDiscRolePresetApplication.ts'
import { planDiscPresetDocument } from './appDiscPresetDocumentPlan.ts'

async function fixture() {
  const r = await restoreSavedProjectState(createBlankDiscSavedProject())
  const currentState: DiscRolePresetCurrentState = {
    ...r,
    background: {
      enabled: false,
      scale: 1.7,
      offset: { x: 12, y: -8 },
      imageDataUrl: 'data:image/png;base64,fixture',
      imageSource: null,
      imageSize: { width: 1920, height: 1080 },
    },
    metadata: r.projectMetadata,
    titleArtwork: r.projectTitleArtwork,
    // Match the complete React owner values, not optional persisted payloads.
    logoAssets: r.projectLogoAssets,
    ratingBadge: r.projectRatingBadge,
    mediaMark: r.projectMediaMark,
    platformMarks: r.projectPlatformMarks,
    technicalMarks: r.projectTechnicalMarks,
    additionalArtwork: r.projectAdditionalArtwork,
  }
  return { currentState, selectedDiscTemplate: r.template.selectedDiscTemplate }
}

test('registered preset plans the direct owner values and leaves live values untouched', async () => {
  const { currentState, selectedDiscTemplate } = await fixture()
  const before = structuredClone(currentState)
  const plan = planDiscPresetDocument({
    presetId: 'classic-top-title', currentState, selectedDiscTemplate,
    clampDiscTextLayout() { assert.fail('Registered preset must not enter legacy clamp') },
  })
  assert.equal(plan.result.applied, true)
  assert.equal(plan.result.canonicalPresetId, 'builtin:disc-preset:classic-top-title')
  assert.ok(plan.result.dispatchedOwners.includes('backgroundImage'))
  assert.equal(plan.owners.titleArtwork, plan.result.state.titleArtwork)
  assert.equal(plan.owners.discTextLayout, plan.result.state.discTextLayout)
  assert.equal(plan.owners.discTextSettings, currentState.discTextSettings)
  assert.equal(plan.owners.technicalMarks, currentState.technicalMarks)
  assert.equal(plan.owners.additionalArtwork, currentState.additionalArtwork)
  assert.equal(plan.background?.backgroundImageUrl, currentState.background.imageDataUrl)
  assert.equal(plan.owners.background.scale, plan.background?.backgroundScale)
  assert.deepEqual(currentState, before)
})

for (const presetId of ['centered-logo-archive', 'clean-metadata-footer']) {
  test(`legacy ${presetId} plans exact ordered owner clamp values`, async () => {
    const { currentState, selectedDiscTemplate } = await fixture()
    const before = structuredClone(currentState)
    let textInput: DiscRolePresetCurrentState['discTextLayout'] | undefined
    const textOutput = { ...currentState.discTextLayout }
    const plan = planDiscPresetDocument({
      presetId, currentState, selectedDiscTemplate,
      clampDiscTextLayout(layout, template) {
        assert.equal(textInput, undefined)
        assert.equal(template, selectedDiscTemplate)
        textInput = layout
        return textOutput
      },
    })
    const { result, owners } = plan
    assert.equal(result.applied, true)
    assert.equal(result.canonicalPresetId, null)
    assert.ok(plan.background)
    assert.equal(textInput, result.state.discTextLayout)
    assert.equal(owners.discTextLayout, textOutput)
    assert.equal(owners.discTextSettings, result.state.discTextSettings)
    assert.equal(owners.discTextValues, currentState.discTextValues)
    assert.equal(owners.discTextHtmlSources, currentState.discTextHtmlSources)
    assert.equal(owners.discTextStyles, currentState.discTextStyles)
    assert.deepEqual(owners.titleArtwork, clampProjectTitleArtworkToSafeZone(result.state.titleArtwork, selectedDiscTemplate))
    assert.deepEqual(owners.logoAssets, clampProjectLogoAssetsToSafeZone(result.state.logoAssets, selectedDiscTemplate))
    if (presetId === 'centered-logo-archive') {
      assert.deepEqual(owners.ratingBadge, clampProjectRatingBadgeToSafeZone(result.state.ratingBadge, selectedDiscTemplate, currentState.metadata))
      assert.deepEqual(owners.mediaMark, { ...result.state.mediaMark,
        layout: clampMediaMarkLayoutToSafeZone(result.state.mediaMark, selectedDiscTemplate) })
      assert.equal(owners.platformMarks, currentState.platformMarks)
    } else {
      assert.deepEqual(owners.platformMarks, clampProjectPlatformMarksToSafeZone(result.state.platformMarks, selectedDiscTemplate))
      assert.deepEqual(owners.technicalMarks, clampProjectTechnicalMarksToSafeZone(result.state.technicalMarks, selectedDiscTemplate))
      assert.equal(owners.ratingBadge, currentState.ratingBadge)
    }
    assert.deepEqual(currentState, before)
  })
}

test('rejected preset has no background or planned writes', async () => {
  const { currentState, selectedDiscTemplate } = await fixture()
  const plan = planDiscPresetDocument({
    presetId: 'unknown', currentState, selectedDiscTemplate,
    clampDiscTextLayout() { assert.fail('Rejected preset must not clamp') },
  })
  assert.equal(plan.result.applied, false)
  assert.deepEqual(plan.result.dispatchedOwners, [])
  assert.equal(plan.background, null)
  assert.deepEqual(plan.owners, currentState)
})
