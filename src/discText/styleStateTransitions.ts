import {
  clampStraightDiscTextLayoutToSafeZone,
} from '../layout/discElementSafeZone.ts'
import type { DiscTemplate } from '../types/template.ts'
import type {
  DiscTextKey,
  DiscTextLayoutSettings,
} from './index.ts'
import {
  applyDiscTextStylePreset,
  resetDiscTextStyle,
  updateDiscTextStyleField,
  type DiscTextStyleField,
  type DiscTextStyleSettings,
  type DiscTextStyleValue,
} from './styles.ts'

type DiscTextStyleTransitionInput = {
  currentLayout: DiscTextLayoutSettings
  currentStyles: DiscTextStyleSettings
  key: DiscTextKey
  renderedContent: string
  selectedDiscTemplate: DiscTemplate
}

type DiscTextStyleTransition = {
  layout: DiscTextLayoutSettings
  styles: DiscTextStyleSettings
}

function clampLayoutForDiscTextStyleTransition({
  currentLayout,
  key,
  renderedContent,
  selectedDiscTemplate,
  styles,
}: {
  currentLayout: DiscTextLayoutSettings
  key: DiscTextKey
  renderedContent: string
  selectedDiscTemplate: DiscTemplate
  styles: DiscTextStyleSettings
}): DiscTextLayoutSettings {
  return {
    ...currentLayout,
    [key]: clampStraightDiscTextLayoutToSafeZone(
      key,
      currentLayout[key],
      selectedDiscTemplate,
      renderedContent,
      undefined,
      styles,
    ),
  }
}

function createDiscTextStyleTransition(
  input: DiscTextStyleTransitionInput,
  styles: DiscTextStyleSettings,
): DiscTextStyleTransition {
  return {
    layout: clampLayoutForDiscTextStyleTransition({
      currentLayout: input.currentLayout,
      key: input.key,
      renderedContent: input.renderedContent,
      selectedDiscTemplate: input.selectedDiscTemplate,
      styles,
    }),
    styles,
  }
}

export function updateDiscTextStyleFieldTransition({
  field,
  value,
  ...input
}: DiscTextStyleTransitionInput & {
  field: DiscTextStyleField
  value: DiscTextStyleValue
}): DiscTextStyleTransition {
  return createDiscTextStyleTransition(
    input,
    updateDiscTextStyleField(
      input.currentStyles,
      input.key,
      field,
      value,
    ),
  )
}

export function resetDiscTextStyleTransition(
  input: DiscTextStyleTransitionInput,
): DiscTextStyleTransition {
  return createDiscTextStyleTransition(
    input,
    resetDiscTextStyle(input.currentStyles, input.key),
  )
}

export function applyDiscTextStylePresetTransition({
  presetId,
  ...input
}: DiscTextStyleTransitionInput & {
  presetId: string
}): DiscTextStyleTransition {
  return createDiscTextStyleTransition(
    input,
    applyDiscTextStylePreset(input.currentStyles, input.key, presetId),
  )
}
