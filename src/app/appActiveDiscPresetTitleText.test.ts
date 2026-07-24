import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { createDefaultDiscTextLayout } from '../discText/index.ts'
import { getDefaultDiscTextPointSize } from '../discText/pointSize.ts'
import {
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
} from '../discText/renderLayout.ts'
import { createDefaultDiscTextStyles } from '../discText/styles.ts'
import { measureDiscTextWithBrowserCanvas } from '../discText/svgLayer.ts'
import {
  CLASSIC_TOP_TITLE_DISC_PRESET,
} from '../presets/builtins/classicTopTitleDiscPreset.ts'
import {
  createDiscPresetTemplateResolutionInput,
  resolveDiscPresetDefinition,
} from '../presets/discPresetResolution.ts'
import type {
  ActiveDiscPresetState,
} from '../presets/discPresetTargetedApplication.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  ACTIVE_DISC_PRESET_TITLE_FIT_IMPOSSIBLE_MESSAGE,
  applyActiveDiscPresetToTitleTextState,
  hasDiscPresetTitleFitImpossibleWarning,
  isActiveDiscPresetTitleFitImpossible,
} from './appActiveDiscPresetTitleText.ts'

const template = discTemplates.standardPrintableDisc
const resolution = resolveDiscPresetDefinition({
  definition: CLASSIC_TOP_TITLE_DISC_PRESET,
  template: createDiscPresetTemplateResolutionInput(template),
})

if (resolution.status === 'rejected') {
  throw new Error('Classic fixture must resolve.')
}

const activePresetState: ActiveDiscPresetState = Object.freeze({
  ref: Object.freeze({
    id: CLASSIC_TOP_TITLE_DISC_PRESET.id,
    revision: CLASSIC_TOP_TITLE_DISC_PRESET.revision,
  }),
  resolvedDefinition: resolution.preset,
})
const defaultLayout = createDefaultDiscTextLayout('top', template).title
const defaultStyle = createDefaultDiscTextStyles().title

function createTitleText(
  plainText: string,
  overrides: Partial<{
    enabled: boolean
    layout: typeof defaultLayout
  }> = {},
) {
  return Object.freeze({
    key: 'title' as const,
    enabled: overrides.enabled ?? true,
    content: Object.freeze({ plainText }),
    layout: overrides.layout ?? defaultLayout,
    style: defaultStyle,
    template,
  })
}

test('no active preset preserves Title text owner state exactly', () => {
  const titleText = createTitleText('Portal 2')
  const result = applyActiveDiscPresetToTitleTextState({
    presetState: null,
    selectedDiscTemplate: template,
    titleText,
  })

  assert.equal(result.titleText, titleText)
  assert.equal(result.application, null)
})

test('late Title content restores only measured active-preset placement', () => {
  const manuallyEditedLayout = {
    ...defaultLayout,
    x: 17,
    y: 52,
    width: 31,
    fontSizePt: 30,
  }
  const titleText = createTitleText(
    'The Unreasonably Elaborate Adventures of a Very Determined Archivist Through Time and Space',
    { layout: manuallyEditedLayout },
  )
  const result = applyActiveDiscPresetToTitleTextState({
    presetState: activePresetState,
    selectedDiscTemplate: template,
    titleText,
  })

  assert.equal(result.application?.status, 'applied')
  assert.equal(result.titleText.layout.x, 0)
  assert.ok(result.titleText.layout.y < 19.5)
  assert.ok(result.titleText.layout.width < 62)
  const paintedBounds = getStraightDiscTextVisualBounds(
    getStraightDiscTextRenderLayout(
      'title',
      titleText.content.plainText,
      result.titleText.layout,
      measureDiscTextWithBrowserCanvas,
      { title: result.titleText.style },
      { template },
    ),
    measureDiscTextWithBrowserCanvas,
    { includeRenderedBox: true, includeRenderedPaint: true },
  )
  assert.ok(Math.abs(paintedBounds.centerX - 50) <= 0.000001)
  assert.ok(Math.abs(paintedBounds.centerY - 19.5) <= 0.000001)
  assert.ok(
    result.titleText.layout.fontSizePt < getDefaultDiscTextPointSize(
      'title',
      1,
      template,
      'straight',
    ),
  )
  assert.ok(result.titleText.layout.fontSizePt >= 8)
  assert.equal(result.titleText.content, titleText.content)
  assert.equal(result.titleText.style, titleText.style)
  assert.deepEqual(
    result.application?.updates.map(({ target }) => target),
    ['game-title.text'],
  )
  assert.equal(
    result.application && 'resolvedPreset' in result.application
      ? result.application.resolvedPreset.slots.find(
          ({ id }) => id === 'disc:guided:game-title:primary',
        )?.status
      : null,
    'resolved',
  )
})

test('impossible late Title content preserves layout without patching its shared slot', () => {
  const titleText = createTitleText(
    Array.from({ length: 20 }, (_, index) => `Title line ${index + 1}`)
      .join('\n'),
  )
  const result = applyActiveDiscPresetToTitleTextState({
    presetState: activePresetState,
    selectedDiscTemplate: template,
    titleText,
  })

  assert.equal(result.application?.status, 'partial')
  assert.equal(result.titleText, titleText)
  assert.equal(
    isActiveDiscPresetTitleFitImpossible(result.application),
    true,
  )
  assert.equal(
    hasDiscPresetTitleFitImpossibleWarning(
      result.application?.warnings ?? [],
    ),
    true,
  )
  assert.equal(
    hasDiscPresetTitleFitImpossibleWarning([{
      kind: 'text-fit-impossible',
      target: 'legal.copyright',
    }]),
    false,
  )
  assert.match(
    ACTIVE_DISC_PRESET_TITLE_FIT_IMPOSSIBLE_MESSAGE,
    /Could not fit the game title/,
  )
  assert.equal(
    result.application && 'resolvedPreset' in result.application
      ? result.application.resolvedPreset.slots.find(
          ({ id }) => id === 'disc:guided:game-title:primary',
        )?.status
      : null,
    'resolved',
  )
})

test('late Title integration uses targeted planning with no effects or broad apply', () => {
  const source = readFileSync(
    new URL('./appActiveDiscPresetTitleText.ts', import.meta.url),
    'utf8',
  )

  assert.match(source, /resolveDiscPresetPlacementForTarget\(\{/)
  assert.match(source, /target:\s*'game-title\.text'/)
  assert.doesNotMatch(
    source,
    /applyDiscRolePresetToOwners|useEffect|setTimeout|querySelector/,
  )
})
