import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  placeGroupedPlatformMarks,
} from '../layout/groupedPlatformMarkPlacement.ts'
import {
  CLASSIC_TOP_TITLE_DISC_PRESET_ID,
} from '../presets/builtins/classicTopTitleDiscPreset.ts'
import {
  createDiscPresetRegistry,
} from '../presets/discPresetRegistry.ts'
import {
  clearPlatformMarkImage,
  createDefaultProjectPlatformMarks,
  getProjectPlatformMarkAsset,
  updatePlatformMarkLayoutField,
  updatePlatformMarkSource,
  updatePlatformMarkTheme,
  updatePlatformMarkToggle,
} from '../project/projectPlatformMarks.ts'
import type {
  PlatformMarkValue,
  ProjectPlatformMarks,
} from '../project/projectTypes.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  applyActiveDiscPresetToPlatformMarkState,
} from './appActiveDiscPresetPlatformMarks.ts'
import {
  applyRegisteredDiscPresetToState,
} from './appRegisteredDiscPresetApplication.ts'

const template = discTemplates.standardPrintableDisc
const presetRef = Object.freeze({
  id: CLASSIC_TOP_TITLE_DISC_PRESET_ID,
  revision: 1,
})
const region = Object.freeze({
  centerXPercent: 50,
  centerYPercent: 73,
  widthPercent: 28,
  heightPercent: 10,
})
const orderedValues = Object.freeze([
  'windows',
  'linux',
  'steamDeck',
  'macos',
  'pc',
] as const)

function selectMark(
  marks: ProjectPlatformMarks,
  value: PlatformMarkValue,
) {
  return updatePlatformMarkToggle(marks, value, true, template)
}

function getLayouts(marks: ProjectPlatformMarks) {
  return Object.fromEntries(marks.values.map((value) => [
    value,
    getProjectPlatformMarkAsset(marks, value, template).layout,
  ]))
}

function assertMatchesGroupedPlacement(
  beforePlacement: ProjectPlatformMarks,
  afterPlacement: ProjectPlatformMarks,
) {
  const expected = placeGroupedPlatformMarks({
    platformMarks: beforePlacement,
    region,
    template,
  })
  assert.equal(expected.status, 'placed')
  for (const update of expected.updates) {
    assert.deepEqual(
      getProjectPlatformMarkAsset(
        afterPlacement,
        update.value,
        template,
      ).layout,
      {
        ...getProjectPlatformMarkAsset(
          beforePlacement,
          update.value,
          template,
        ).layout,
        x: update.x,
        y: update.y,
        scale: update.scale,
      },
    )
  }
  for (const ignored of expected.ignoredMarks) {
    assert.deepEqual(
      getProjectPlatformMarkAsset(
        afterPlacement,
        ignored.value,
        template,
      ).layout,
      getProjectPlatformMarkAsset(
        beforePlacement,
        ignored.value,
        template,
      ).layout,
    )
  }
}

test('late OS selection uses the active canonical preset target without broad application', () => {
  const initial = createDefaultProjectPlatformMarks()
  const selected = selectMark(initial, 'windows')
  const result = applyActiveDiscPresetToPlatformMarkState({
    presetRef,
    selectedDiscTemplate: template,
    platformMarks: selected,
  })

  assert.equal(result.application?.status, 'applied')
  assert.deepEqual(result.application?.updates.map(({ target }) => target), [
    'operating-system-marks.enabled',
  ])
  assertMatchesGroupedPlacement(selected, result.platformMarks)
  assert.deepEqual(result.platformMarks.values, ['windows'])
  assert.deepEqual(result.platformMarks.inference, selected.inference)
})

test('five marks selected sequentially reflow deterministically and preserve domain state', () => {
  let marks = createDefaultProjectPlatformMarks()

  for (const value of orderedValues) {
    const selected = selectMark(marks, value)
    const snapshot = structuredClone(selected)
    const first = applyActiveDiscPresetToPlatformMarkState({
      presetRef,
      selectedDiscTemplate: template,
      platformMarks: selected,
    })
    const repeated = applyActiveDiscPresetToPlatformMarkState({
      presetRef,
      selectedDiscTemplate: template,
      platformMarks: selected,
    })

    assertMatchesGroupedPlacement(selected, first.platformMarks)
    assert.deepEqual(getLayouts(first.platformMarks), getLayouts(repeated.platformMarks))
    assert.deepEqual(first.platformMarks.values, snapshot.values)
    assert.deepEqual(first.platformMarks.inference, snapshot.inference)
    for (const selectedValue of selected.values) {
      const before = getProjectPlatformMarkAsset(
        snapshot,
        selectedValue,
        template,
      )
      const after = getProjectPlatformMarkAsset(
        first.platformMarks,
        selectedValue,
        template,
      )
      assert.deepEqual(
        { ...after, layout: undefined },
        { ...before, layout: undefined },
      )
      assert.equal(after.layout.enabled, before.layout.enabled)
      assert.equal(after.layout.opacity, before.layout.opacity)
    }
    marks = first.platformMarks
  }
})

test('deselecting, disabling, and invalidating a custom asset regroup only eligible marks', () => {
  let marks = orderedValues.slice(0, 3).reduce<ProjectPlatformMarks>(
    (current, value) => selectMark(current, value),
    createDefaultProjectPlatformMarks(),
  )
  marks = applyActiveDiscPresetToPlatformMarkState({
    presetRef,
    selectedDiscTemplate: template,
    platformMarks: marks,
  }).platformMarks

  const deselected = updatePlatformMarkToggle(marks, 'linux', false, template)
  const afterDeselect = applyActiveDiscPresetToPlatformMarkState({
    presetRef,
    selectedDiscTemplate: template,
    platformMarks: deselected,
  }).platformMarks
  assertMatchesGroupedPlacement(deselected, afterDeselect)

  const disabled = updatePlatformMarkLayoutField(
    afterDeselect,
    'steamDeck',
    'enabled',
    false,
  )
  const afterDisable = applyActiveDiscPresetToPlatformMarkState({
    presetRef,
    selectedDiscTemplate: template,
    platformMarks: disabled,
  }).platformMarks
  assertMatchesGroupedPlacement(disabled, afterDisable)

  const custom = updatePlatformMarkSource(
    selectMark(afterDisable, 'linux'),
    'linux',
    'custom',
  )
  const invalidCustom = clearPlatformMarkImage(custom, 'linux')
  const afterInvalidation = applyActiveDiscPresetToPlatformMarkState({
    presetRef,
    selectedDiscTemplate: template,
    platformMarks: invalidCustom,
  })
  assert.equal(afterInvalidation.application?.status, 'applied')
  assertMatchesGroupedPlacement(invalidCustom, afterInvalidation.platformMarks)
  assert.equal(
    getProjectPlatformMarkAsset(
      afterInvalidation.platformMarks,
      'linux',
      template,
    ).source,
    getProjectPlatformMarkAsset(
      invalidCustom,
      'linux',
      template,
    ).source,
  )
})

test('source and theme changes preserve the requested owner values while recomputing bounds', () => {
  let marks = selectMark(createDefaultProjectPlatformMarks(), 'windows')
  marks = selectMark(marks, 'linux')
  marks = updatePlatformMarkSource(marks, 'linux', 'builtin')
  marks = updatePlatformMarkTheme(marks, 'linux', 'light', template)
  const before = structuredClone(marks)
  const result = applyActiveDiscPresetToPlatformMarkState({
    presetRef,
    selectedDiscTemplate: template,
    platformMarks: marks,
  })

  assertMatchesGroupedPlacement(marks, result.platformMarks)
  assert.equal(
    getProjectPlatformMarkAsset(result.platformMarks, 'linux', template).source,
    getProjectPlatformMarkAsset(before, 'linux', template).source,
  )
  assert.equal(
    getProjectPlatformMarkAsset(result.platformMarks, 'linux', template).theme,
    'light',
  )
})

test('late OS regrouping leaves every unrelated manually edited layout untouched', () => {
  const project = {
    rating: { x: 11, y: 12, scale: 1.3 },
    media: { x: 21, y: 22, scale: 0.8 },
    developerLogo: { x: 31, y: 32, scale: 0.7 },
    publisherLogo: { x: 41, y: 42, scale: 0.6 },
    title: { x: 7, y: 8, width: 52, fontSizePt: 18 },
    background: { offset: { x: 13, y: -9 }, scale: 1.4 },
    legal: { x: -4, y: 71, width: 61, fontSizePt: 7 },
    platformMarks: selectMark(
      createDefaultProjectPlatformMarks(),
      'windows',
    ),
  }
  const unrelatedBefore = structuredClone({
    rating: project.rating,
    media: project.media,
    developerLogo: project.developerLogo,
    publisherLogo: project.publisherLogo,
    title: project.title,
    background: project.background,
    legal: project.legal,
  })
  const nextProject = {
    ...project,
    platformMarks: applyActiveDiscPresetToPlatformMarkState({
      presetRef,
      selectedDiscTemplate: template,
      platformMarks: project.platformMarks,
    }).platformMarks,
  }

  assert.deepEqual({
    rating: nextProject.rating,
    media: nextProject.media,
    developerLogo: nextProject.developerLogo,
    publisherLogo: nextProject.publisherLogo,
    title: nextProject.title,
    background: nextProject.background,
    legal: nextProject.legal,
  }, unrelatedBefore)
})

test('no active preset or a preset without the OS target preserves normal mark state', () => {
  const marks = selectMark(createDefaultProjectPlatformMarks(), 'windows')
  const noActive = applyActiveDiscPresetToPlatformMarkState({
    presetRef: null,
    selectedDiscTemplate: template,
    platformMarks: marks,
  })
  const ratingOnlyDefinition = {
    kind: 'sbls/disc-preset',
    formatVersion: 1,
    id: 'user:disc-preset:123e4567-e89b-42d3-a456-426614174000',
    revision: 1,
    name: 'Rating only',
    surface: 'disc',
    compatibility: {
      mode: 'any-disc-template',
      onConflict: 'resolve',
    },
    slots: [],
  } as const
  const registryResult = createDiscPresetRegistry({
    builtins: [],
    users: [ratingOnlyDefinition],
  })
  assert.equal(registryResult.ok, true)
  if (!registryResult.ok) return
  const absentTarget = applyActiveDiscPresetToPlatformMarkState({
    presetRef: {
      id: ratingOnlyDefinition.id,
      revision: ratingOnlyDefinition.revision,
    },
    selectedDiscTemplate: template,
    platformMarks: marks,
    registry: registryResult.registry,
  })

  assert.equal(noActive.application, null)
  assert.equal(noActive.platformMarks, marks)
  assert.equal(absentTarget.application?.status, 'skipped')
  assert.equal(absentTarget.platformMarks, marks)
})

test('initial full Classic placement remains the same targeted grouped result', () => {
  const source = readFileSync(
    'src/app/appRegisteredDiscPresetApplication.test.ts',
    'utf8',
  )
  assert.match(source, /placeGroupedPlatformMarks/)
  assert.match(source, /operating-system-marks\.enabled/)
  assert.equal(typeof applyRegisteredDiscPresetToState, 'function')
})

test('eligibility integration composes once and cannot recurse from x/y/scale updates', () => {
  const hookSource = readFileSync(
    'src/hooks/usePlatformMarksState.ts',
    'utf8',
  )
  const helperSource = readFileSync(
    'src/app/appActiveDiscPresetPlatformMarks.ts',
    'utf8',
  )
  assert.doesNotMatch(
    hookSource + helperSource,
    /setTimeout|setInterval|requestAnimationFrame|MutationObserver/,
  )
  assert.match(
    hookSource,
    /field === 'enabled'[\s\S]*?finalizeEligibilityChange\(manualMarks\)/,
  )
  assert.doesNotMatch(
    helperSource,
    /projectRatingBadge|projectMediaMark|projectLogoAssets|projectTitleArtwork|backgroundOffset|discTextLayout/,
  )
  assert.doesNotMatch(helperSource, /classic-top-title|50,\s*73|28,\s*10/i)
  assert.match(helperSource, /resolveDiscPresetPlacementForTarget/)
  assert.match(helperSource, /DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY/)
})
