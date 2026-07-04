import type { JewelCaseSpineSide } from './types.ts'
import {
  getJewelCaseSpineSideScopedId,
  updateProjectJewelCaseSpineSides,
} from './jewelCaseTransitions.ts'
import {
  applyCaseInsertTextBlockPresetLayout,
  applyCaseInsertTextBlockStylePreset,
  resetCaseInsertTextBlockStyle,
  setCaseInsertTextBlockAvoidVisualElements,
  setCaseInsertTextBlockEnabled,
  updateCaseInsertTextBlockLayoutField,
  updateCaseInsertTextBlockStyleField,
  updateCaseInsertTextBlockValue,
} from './textTransitions.ts'
import type {
  CaseInsertTextStyleField,
  CaseInsertTextStyleValue,
} from './textStyles.ts'
import type {
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextSource,
  ProjectJewelCaseState,
  ProjectJewelCaseSpineSideState,
} from '../project/projectTypes.ts'
import {
  DEFAULT_SPINE_TITLE_FONT_SIZE_PT,
} from './textSizing.ts'

type SpineTitleUpdater = (
  title: ProjectCaseInsertTextBlock,
  side: JewelCaseSpineSide,
) => ProjectCaseInsertTextBlock

type SpineTextBlockUpdater = (
  textBlock: ProjectCaseInsertTextBlock,
) => ProjectCaseInsertTextBlock

export const defaultSpineTitleLayouts: Record<JewelCaseSpineSide, ProjectCaseInsertLayout> = {
  left: {
    scale: 1,
    fontSizePt: DEFAULT_SPINE_TITLE_FONT_SIZE_PT,
    width: 90,
    x: 50,
    y: 50,
    rotation: -90,
  },
  right: {
    scale: 1,
    fontSizePt: DEFAULT_SPINE_TITLE_FONT_SIZE_PT,
    width: 90,
    x: 50,
    y: 50,
    rotation: 90,
  },
}

const defaultSpineTextBlockLayouts: Record<
  JewelCaseSpineSide,
  Record<string, ProjectCaseInsertLayout>
> = {
  left: {
    'subtitle-text': { scale: 0.78, width: 74, x: 50, y: 42, rotation: -90 },
    'disc-number': { scale: 0.7, width: 46, x: 50, y: 60, rotation: -90 },
    'backup-date': { scale: 0.68, width: 48, x: 50, y: 68, rotation: -90 },
    'steam-app-id': { scale: 0.66, width: 48, x: 50, y: 76, rotation: -90 },
    'developer-text': { scale: 0.68, width: 48, x: 50, y: 84, rotation: -90 },
    'publisher-text': { scale: 0.68, width: 48, x: 50, y: 88, rotation: -90 },
    'install-notes': { scale: 0.66, width: 58, x: 50, y: 72, rotation: -90 },
    'custom-note': { scale: 0.72, width: 58, x: 50, y: 78, rotation: -90 },
    'copyright-text': { scale: 0.62, width: 68, x: 50, y: 92, rotation: -90 },
  },
  right: {
    'subtitle-text': { scale: 0.78, width: 74, x: 50, y: 42, rotation: 90 },
    'disc-number': { scale: 0.7, width: 46, x: 50, y: 60, rotation: 90 },
    'backup-date': { scale: 0.68, width: 48, x: 50, y: 68, rotation: 90 },
    'steam-app-id': { scale: 0.66, width: 48, x: 50, y: 76, rotation: 90 },
    'developer-text': { scale: 0.68, width: 48, x: 50, y: 84, rotation: 90 },
    'publisher-text': { scale: 0.68, width: 48, x: 50, y: 88, rotation: 90 },
    'install-notes': { scale: 0.66, width: 58, x: 50, y: 72, rotation: 90 },
    'custom-note': { scale: 0.72, width: 58, x: 50, y: 78, rotation: 90 },
    'copyright-text': { scale: 0.62, width: 68, x: 50, y: 92, rotation: 90 },
  },
}

export function getDefaultSpineTextBlockLayout(
  side: JewelCaseSpineSide,
  textBlockId: string,
) {
  const prefix = `${side}-spine-`
  const suffix = textBlockId.startsWith(prefix)
    ? textBlockId.slice(prefix.length)
    : textBlockId

  return defaultSpineTextBlockLayouts[side][suffix]
}

export function setJewelCaseSpineTextBlockAlign(
  textBlock: ProjectCaseInsertTextBlock,
  align: ProjectCaseInsertTextAlign,
): ProjectCaseInsertTextBlock {
  return {
    ...textBlock,
    align,
  }
}

function updateJewelCaseSpineTitleForEditedSides(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  updater: SpineTitleUpdater,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSides(
    state,
    side,
    (spineSide, targetSide) => ({
      ...spineSide,
      title: updater(spineSide.title, targetSide),
    }),
  )
}

function updateJewelCaseSpineTextBlockForEditedSides(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  textBlockId: string,
  updater: SpineTextBlockUpdater,
): ProjectJewelCaseState {
  return updateProjectJewelCaseSpineSides(state, side, (spineSide, targetSide) => {
    const targetTextBlockId = getJewelCaseSpineSideScopedId(
      targetSide,
      textBlockId,
    )

    return {
      ...spineSide,
      textBlocks: spineSide.textBlocks.map((textBlock) =>
        textBlock.id === targetTextBlockId
          ? updater(textBlock)
          : textBlock),
    }
  })
}

export function setJewelCaseSpineTitleEnabled(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  enabled: boolean,
) {
  return updateJewelCaseSpineTitleForEditedSides(
    state,
    side,
    (title) => setCaseInsertTextBlockEnabled(title, enabled),
  )
}

export function updateJewelCaseSpineTitleValue(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  value: string,
  source?: ProjectCaseInsertTextSource,
) {
  return updateJewelCaseSpineTitleForEditedSides(
    state,
    side,
    (title) => updateCaseInsertTextBlockValue(title, value, source),
  )
}

export function setJewelCaseSpineTitleAlign(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  align: ProjectCaseInsertTextAlign,
) {
  return updateJewelCaseSpineTitleForEditedSides(
    state,
    side,
    (title) => setJewelCaseSpineTextBlockAlign(title, align),
  )
}

export function setJewelCaseSpineTitleAvoidVisualElements(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  avoidVisualElements: boolean,
) {
  return updateJewelCaseSpineTitleForEditedSides(
    state,
    side,
    (title) => setCaseInsertTextBlockAvoidVisualElements(
      title,
      avoidVisualElements,
    ),
  )
}

export function updateJewelCaseSpineTitleLayoutValue(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  field: keyof ProjectCaseInsertLayout,
  value: number,
) {
  return updateJewelCaseSpineTitleForEditedSides(
    state,
    side,
    (title) => updateCaseInsertTextBlockLayoutField(title, field, value),
  )
}

export function applyJewelCaseSpineTitleLayoutPreset(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  presetId: string,
) {
  return updateJewelCaseSpineTitleForEditedSides(
    state,
    side,
    (title) => applyCaseInsertTextBlockPresetLayout('spine', title, presetId),
  )
}

export function resetJewelCaseSpineTitleDefaultLayout(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
) {
  return updateJewelCaseSpineTitleForEditedSides(
    state,
    side,
    resetJewelCaseSpineTitleLayout,
  )
}

export function updateJewelCaseSpineTitleStyleValue(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  field: CaseInsertTextStyleField,
  value: CaseInsertTextStyleValue,
) {
  return updateJewelCaseSpineTitleForEditedSides(
    state,
    side,
    (title) => updateCaseInsertTextBlockStyleField(title, field, value),
  )
}

export function applyJewelCaseSpineTitleStylePreset(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  presetId: string,
) {
  return updateJewelCaseSpineTitleForEditedSides(
    state,
    side,
    (title) => applyCaseInsertTextBlockStylePreset(title, presetId),
  )
}

export function resetJewelCaseSpineTitleDefaultStyle(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
) {
  return updateJewelCaseSpineTitleForEditedSides(
    state,
    side,
    (title) => resetCaseInsertTextBlockStyle(title),
  )
}

export function setJewelCaseSpineTextBlockEnabled(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  textBlockId: string,
  enabled: boolean,
) {
  return updateJewelCaseSpineTextBlockForEditedSides(
    state,
    side,
    textBlockId,
    (textBlock) => setCaseInsertTextBlockEnabled(textBlock, enabled),
  )
}

export function updateJewelCaseSpineTextBlockValue(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  textBlockId: string,
  value: string,
  source?: ProjectCaseInsertTextSource,
) {
  return updateJewelCaseSpineTextBlockForEditedSides(
    state,
    side,
    textBlockId,
    (textBlock) => updateCaseInsertTextBlockValue(textBlock, value, source),
  )
}

export function setJewelCaseSpineTextBlockAlignValue(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  textBlockId: string,
  align: ProjectCaseInsertTextAlign,
) {
  return updateJewelCaseSpineTextBlockForEditedSides(
    state,
    side,
    textBlockId,
    (textBlock) => setJewelCaseSpineTextBlockAlign(textBlock, align),
  )
}

export function setJewelCaseSpineTextBlockAvoidVisualElements(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  textBlockId: string,
  avoidVisualElements: boolean,
) {
  return updateJewelCaseSpineTextBlockForEditedSides(
    state,
    side,
    textBlockId,
    (textBlock) => setCaseInsertTextBlockAvoidVisualElements(
      textBlock,
      avoidVisualElements,
    ),
  )
}

export function updateJewelCaseSpineTextBlockLayoutValue(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  textBlockId: string,
  field: keyof ProjectCaseInsertLayout,
  value: number,
) {
  return updateJewelCaseSpineTextBlockForEditedSides(
    state,
    side,
    textBlockId,
    (textBlock) => updateCaseInsertTextBlockLayoutField(textBlock, field, value),
  )
}

export function applyJewelCaseSpineTextBlockLayoutPreset(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  textBlockId: string,
  presetId: string,
) {
  return updateJewelCaseSpineTextBlockForEditedSides(
    state,
    side,
    textBlockId,
    (textBlock) =>
      applyCaseInsertTextBlockPresetLayout('spine', textBlock, presetId),
  )
}

export function resetJewelCaseSpineTextBlockDefaultLayout(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  textBlockId: string,
) {
  return updateProjectJewelCaseSpineSides(state, side, (spineSide, targetSide) =>
    resetJewelCaseSpineTextBlockLayout(spineSide, targetSide, textBlockId),
  )
}

export function updateJewelCaseSpineTextBlockStyleValue(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  textBlockId: string,
  field: CaseInsertTextStyleField,
  value: CaseInsertTextStyleValue,
) {
  return updateJewelCaseSpineTextBlockForEditedSides(
    state,
    side,
    textBlockId,
    (textBlock) =>
      updateCaseInsertTextBlockStyleField(textBlock, field, value),
  )
}

export function applyJewelCaseSpineTextBlockStylePreset(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  textBlockId: string,
  presetId: string,
) {
  return updateJewelCaseSpineTextBlockForEditedSides(
    state,
    side,
    textBlockId,
    (textBlock) => applyCaseInsertTextBlockStylePreset(textBlock, presetId),
  )
}

export function resetJewelCaseSpineTextBlockDefaultStyle(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  textBlockId: string,
) {
  return updateJewelCaseSpineTextBlockForEditedSides(
    state,
    side,
    textBlockId,
    resetCaseInsertTextBlockStyle,
  )
}

export function resetJewelCaseSpineTitleLayout(
  title: ProjectCaseInsertTextBlock,
  side: JewelCaseSpineSide,
): ProjectCaseInsertTextBlock {
  return {
    ...title,
    layout: defaultSpineTitleLayouts[side],
  }
}

export function resetJewelCaseSpineTextBlockLayout(
  spineSide: ProjectJewelCaseSpineSideState,
  side: JewelCaseSpineSide,
  textBlockId: string,
): ProjectJewelCaseSpineSideState {
  const targetTextBlockId = getJewelCaseSpineSideScopedId(side, textBlockId)
  const layout = getDefaultSpineTextBlockLayout(side, targetTextBlockId)

  if (!layout) {
    return spineSide
  }

  return {
    ...spineSide,
    textBlocks: spineSide.textBlocks.map((textBlock) =>
      textBlock.id === targetTextBlockId
        ? { ...textBlock, layout }
        : textBlock),
  }
}
