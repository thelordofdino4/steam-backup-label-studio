import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { createDefaultDiscTextLayout } from '../discText/index.ts'
import { createDefaultDiscTextStyles } from '../discText/styles.ts'
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
import { createDefaultProjectPlatformMarks } from '../project/projectPlatformMarks.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  ACTIVE_DISC_PRESET_LEGAL_FIT_IMPOSSIBLE_MESSAGE,
  applyActiveDiscPresetToLegalTextState,
  hasDiscPresetLegalFitImpossibleWarning,
  isActiveDiscPresetLegalFitImpossible,
} from './appActiveDiscPresetLegalText.ts'
import {
  applyActiveDiscPresetToPlatformMarkState,
} from './appActiveDiscPresetPlatformMarks.ts'

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
const defaultLayout = createDefaultDiscTextLayout('top', template).copyright
const defaultStyle = createDefaultDiscTextStyles().copyright

function createLegalText(
  plainText: string,
  overrides: Partial<{
    enabled: boolean
    layout: typeof defaultLayout
  }> = {},
) {
  return Object.freeze({
    key: 'copyright' as const,
    enabled: overrides.enabled ?? true,
    content: Object.freeze({ plainText }),
    layout: overrides.layout ?? defaultLayout,
    style: defaultStyle,
    template,
  })
}

test('no active preset preserves Legal owner state exactly', () => {
  const legalText = createLegalText('Copyright 2026 Example Studios.')
  const result = applyActiveDiscPresetToLegalTextState({
    presetState: null,
    selectedDiscTemplate: template,
    legalText,
  })

  assert.equal(result.legalText, legalText)
  assert.equal(result.application, null)
})

test('late Legal content restores only the active preset placement', () => {
  const manuallyEditedLayout = {
    ...defaultLayout,
    x: 17,
    y: 52,
    width: 31,
    fontSizePt: 19,
  }
  const legalText = createLegalText(
    'Copyright 2026 Example Studios. All rights reserved.',
    { layout: manuallyEditedLayout },
  )
  const result = applyActiveDiscPresetToLegalTextState({
    presetState: activePresetState,
    selectedDiscTemplate: template,
    legalText,
  })

  assert.equal(result.application?.status, 'applied')
  assert.equal(result.legalText.layout.x, 0)
  assert.equal(result.legalText.layout.y, 84.68)
  assert.equal(result.legalText.layout.width, 42)
  assert.ok(result.legalText.layout.fontSizePt <= 7)
  assert.equal(result.legalText.content, legalText.content)
  assert.equal(result.legalText.style, legalText.style)
  assert.deepEqual(
    result.application?.updates.map(({ target }) => target),
    ['legal.copyright'],
  )
})

test('impossible late Legal content preserves owner layout and hides its resolved slot', () => {
  const legalText = createLegalText(
    Array.from({ length: 24 }, (_, index) => `Legal line ${index + 1}`)
      .join('\n'),
  )
  const result = applyActiveDiscPresetToLegalTextState({
    presetState: activePresetState,
    selectedDiscTemplate: template,
    legalText,
  })

  assert.equal(result.application?.status, 'partial')
  assert.equal(result.legalText, legalText)
  assert.ok(result.application?.warnings.some(
    ({ kind }) => kind === 'text-fit-impossible',
  ))
  assert.equal(
    result.application && 'resolvedPreset' in result.application
      ? result.application.resolvedPreset.slots.find(
          ({ id }) => id === 'disc:guided:legal-text:copyright',
        )?.status
      : null,
    'unsupported',
  )
  assert.equal(
    isActiveDiscPresetLegalFitImpossible(result.application),
    true,
  )
  assert.equal(
    hasDiscPresetLegalFitImpossibleWarning(
      result.application?.warnings ?? [],
    ),
    true,
  )
  assert.equal(
    hasDiscPresetLegalFitImpossibleWarning([]),
    false,
  )
  assert.equal(
    hasDiscPresetLegalFitImpossibleWarning([{
      kind: 'text-fit-impossible',
      target: 'game-title.text',
    }]),
    false,
  )
  assert.match(
    ACTIVE_DISC_PRESET_LEGAL_FIT_IMPOSSIBLE_MESSAGE,
    /Could not fit copyright text/,
  )
})

test('Legal resolution recovers when previously impossible content becomes fit-able', () => {
  const impossibleResult = applyActiveDiscPresetToLegalTextState({
    presetState: activePresetState,
    selectedDiscTemplate: template,
    legalText: createLegalText(
      Array.from({ length: 24 }, (_, index) => `Legal line ${index + 1}`)
        .join('\n'),
    ),
  })
  assert.ok(
    impossibleResult.application &&
      'resolvedPreset' in impossibleResult.application,
  )
  if (
    !impossibleResult.application ||
    !('resolvedPreset' in impossibleResult.application)
  ) {
    return
  }

  const recoveredResult = applyActiveDiscPresetToLegalTextState({
    presetState: Object.freeze({
      ref: activePresetState.ref,
      resolvedDefinition: impossibleResult.application.resolvedPreset,
    }),
    selectedDiscTemplate: template,
    legalText: createLegalText('Copyright 2026 Example Studios.'),
  })

  assert.equal(recoveredResult.application?.status, 'applied')
  assert.equal(
    isActiveDiscPresetLegalFitImpossible(recoveredResult.application),
    false,
  )
  assert.equal(recoveredResult.legalText.layout.y, 84.68)
  assert.equal(recoveredResult.legalText.layout.width, 42)
  assert.notEqual(recoveredResult.legalText.layout, defaultLayout)
  assert.equal(
    recoveredResult.application && 'resolvedPreset' in recoveredResult.application
      ? recoveredResult.application.resolvedPreset.slots.find(
          ({ id }) => id === 'disc:guided:legal-text:copyright',
        )?.status
      : null,
    'resolved',
  )
})

test('targeted Legal and OS resolution preserve each other in one active definition', () => {
  const legalResult = applyActiveDiscPresetToLegalTextState({
    presetState: activePresetState,
    selectedDiscTemplate: template,
    legalText: createLegalText(
      'Copyright 2026 Example Studios. All rights reserved.',
    ),
  })
  assert.ok(
    legalResult.application &&
      'resolvedPreset' in legalResult.application,
  )
  if (
    !legalResult.application ||
    !('resolvedPreset' in legalResult.application)
  ) {
    return
  }

  const afterLegal: ActiveDiscPresetState = Object.freeze({
    ref: activePresetState.ref,
    resolvedDefinition: legalResult.application.resolvedPreset,
  })
  const legalSlotBefore = afterLegal.resolvedDefinition.slots.find(
    ({ id }) => id === 'disc:guided:legal-text:copyright',
  )
  const osResult = applyActiveDiscPresetToPlatformMarkState({
    presetState: afterLegal,
    selectedDiscTemplate: template,
    platformMarks: createDefaultProjectPlatformMarks(),
  })

  assert.equal(osResult.application?.status, 'applied')
  assert.ok(
    osResult.application &&
      'resolvedPreset' in osResult.application,
  )
  assert.equal(
    osResult.application && 'resolvedPreset' in osResult.application
      ? osResult.application.resolvedPreset.slots.find(
          ({ id }) => id === 'disc:guided:legal-text:copyright',
        )
      : null,
    legalSlotBefore,
  )
})

test('late Legal integration uses targeted planning and no effects or broad preset apply', () => {
  const source = readFileSync(
    new URL('./appActiveDiscPresetLegalText.ts', import.meta.url),
    'utf8',
  )
  const hookSource = readFileSync(
    new URL('../hooks/useDiscTextState.ts', import.meta.url),
    'utf8',
  )

  assert.match(source, /resolveDiscPresetPlacementForTarget\(\{/)
  assert.match(source, /target:\s*'legal\.copyright'/)
  assert.doesNotMatch(source, /applyDiscRolePresetToOwners|setTimeout|querySelector/)
  assert.doesNotMatch(hookSource, /useEffect|setTimeout|querySelector/)

  const directLayoutHandler = hookSource.slice(
    hookSource.indexOf('function handleDiscTextLayoutChange'),
    hookSource.indexOf('function handleDiscTextAlignmentChange'),
  )
  assert.doesNotMatch(
    directLayoutHandler,
    /applyActivePresetCopyrightLayout|applyActivePresetLegalPlacement/,
  )
  assert.match(
    hookSource,
    /function handleDiscTextToggle[\s\S]*?applyActivePresetCopyrightLayout/,
  )
  assert.match(
    hookSource,
    /function handleDiscTextStyleChange[\s\S]*?didDiscTextPresetFitStyleChange/,
  )
  assert.match(
    hookSource,
    /function enableCurvedCopyrightDiscText[\s\S]*?applyActivePresetCopyrightLayout/,
  )

  const appSource = readFileSync(
    new URL('./App.tsx', import.meta.url),
    'utf8',
  )
  const applyPresetHandler = appSource.slice(
    appSource.indexOf('function handleApplyDiscRolePreset'),
    appSource.indexOf('function handleRatingBadgeEnabledChange'),
  )
  assert.match(
    applyPresetHandler,
    /hasDiscPresetLegalFitImpossibleWarning\(result\.warnings\)/,
  )
  assert.ok(
    applyPresetHandler.indexOf(
      'hasDiscPresetLegalFitImpossibleWarning(result.warnings)',
    ) < applyPresetHandler.indexOf(
      'announceStatus(`Applied ${result.preset.label} layout preset.`)',
    ),
  )
})
