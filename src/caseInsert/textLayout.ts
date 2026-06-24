import type { DiscTextKey } from '../discText/types.ts'
import {
  DISC_TEXT_LAYOUT_PRESETS,
} from '../layout/presets.ts'
import type {
  CaseInsertTemplatePaneId,
} from './templateSurfaces.ts'
import type {
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
} from '../project/projectTypes.ts'
import {
  getCaseInsertTextBlockDiscKey,
} from './textContent.ts'
import {
  getLegacyCaseInsertScaleFontSizePt,
  DEFAULT_SPINE_TITLE_FONT_SIZE_PT,
  type CaseInsertTextSizeRole,
} from './textSizing.ts'

export const CASE_INSERT_TEXT_WIDTH_MIN = 20
export const CASE_INSERT_TEXT_WIDTH_MAX = 100
export const DEFAULT_CASE_INSERT_TEXT_WIDTH = 80
export const CASE_INSERT_TEXT_BLOCK_MAX_LINES = 12
export const CASE_INSERT_TEXT_LIST_MAX_LINES = 14

export type CaseInsertTextLayoutPreset = {
  id: string
  label: string
  layout: Partial<Pick<
    ProjectCaseInsertLayout,
    'fontSizePt' | 'scale' | 'width' | 'x' | 'y'
  >>
  align?: ProjectCaseInsertTextAlign
}

export type CaseInsertTextLayoutSurface = CaseInsertTemplatePaneId | 'spine'

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeCaseInsertTextWidth(
  value: unknown,
  fallback = DEFAULT_CASE_INSERT_TEXT_WIDTH,
) {
  const normalizedFallback = clampNumber(
    fallback,
    CASE_INSERT_TEXT_WIDTH_MIN,
    CASE_INSERT_TEXT_WIDTH_MAX,
  )

  return typeof value === 'number' && Number.isFinite(value)
    ? clampNumber(value, CASE_INSERT_TEXT_WIDTH_MIN, CASE_INSERT_TEXT_WIDTH_MAX)
    : normalizedFallback
}

export function getCaseInsertTextLayoutWidth(
  layout: Pick<ProjectCaseInsertLayout, 'width'>,
  fallback = DEFAULT_CASE_INSERT_TEXT_WIDTH,
) {
  return normalizeCaseInsertTextWidth(layout.width, fallback)
}

function mapDiscXToCaseInsertPercent(x: number | undefined) {
  return clampNumber(50 + (x ?? 0), 0, 100)
}

function mapDiscYToCaseInsertPercent(y: number | undefined) {
  return clampNumber(y ?? 50, 0, 100)
}

function getDiscTextLayoutPresetsForKey(
  key: DiscTextKey | null,
  surface: CaseInsertTextLayoutSurface,
): CaseInsertTextLayoutPreset[] {
  if (!key) {
    return []
  }

  return DISC_TEXT_LAYOUT_PRESETS
    .filter((preset) =>
      preset.targetKeys.includes(key) && preset.layout.mode !== 'curved')
    .map((preset) => ({
      id: `disc-${preset.id}`,
      label: preset.label,
      layout: {
        ...(typeof preset.layout.scale === 'number'
          ? {
              fontSizePt: getLegacyCaseInsertScaleFontSizePt(
                getDiscTextCaseInsertSizeRole(key, surface),
                preset.layout.scale,
              ),
            }
          : {}),
        ...(typeof preset.layout.width === 'number'
          ? { width: preset.layout.width }
          : {}),
        x: mapDiscXToCaseInsertPercent(preset.layout.x),
        y: mapDiscYToCaseInsertPercent(preset.layout.y),
      },
      align: preset.layout.align,
    }))
}

function getDiscTextCaseInsertSizeRole(
  key: DiscTextKey,
  surface: CaseInsertTextLayoutSurface,
): CaseInsertTextSizeRole {
  if (surface === 'spine') {
    if (key === 'title') return 'spineTitle'
    if (key === 'copyright') return 'spineLegal'
    return 'spineSecondary'
  }

  if (surface === 'tray') {
    if (key === 'title') return 'trayTitle'
    if (key === 'subtitle') return 'traySubtitle'
    if (key === 'copyright') return 'trayLegal'
    return 'trayMetadata'
  }

  if (key === 'title') return 'coverTitle'
  if (key === 'subtitle') return 'coverSubtitle'
  if (key === 'copyright') return 'coverLegal'
  return 'coverCallout'
}

function getSurfaceGenericTextLayoutPresets(
  surface: CaseInsertTextLayoutSurface,
): CaseInsertTextLayoutPreset[] {
  if (surface === 'spine') {
    return [
      {
        id: 'spine-centered',
        label: 'Spine centered',
        layout: {
          x: 50,
          y: 50,
          width: 90,
          fontSizePt: DEFAULT_SPINE_TITLE_FONT_SIZE_PT,
        },
        align: 'center',
      },
      {
        id: 'spine-upper',
        label: 'Spine upper',
        layout: { x: 50, y: 32, width: 74, fontSizePt: 16 },
        align: 'center',
      },
      {
        id: 'spine-lower',
        label: 'Spine lower',
        layout: { x: 50, y: 72, width: 74, fontSizePt: 14 },
        align: 'center',
      },
      {
        id: 'spine-narrow',
        label: 'Narrow centered',
        layout: { x: 50, y: 50, width: 46, fontSizePt: 14 },
        align: 'center',
      },
    ]
  }

  const y = surface === 'cover'
    ? { top: 18, middle: 50, bottom: 84 }
    : { top: 16, middle: 50, bottom: 88 }

  return [
    {
      id: `${surface}-wide-center`,
      label: 'Wide centered',
      layout: { x: 50, width: 90 },
      align: 'center',
    },
    {
      id: `${surface}-top-center`,
      label: 'Top center',
      layout: { x: 50, y: y.top, width: 74 },
      align: 'center',
    },
    {
      id: `${surface}-center`,
      label: 'Center',
      layout: { x: 50, y: y.middle, width: 74 },
      align: 'center',
    },
    {
      id: `${surface}-bottom-center`,
      label: 'Bottom center',
      layout: { x: 50, y: y.bottom, width: 74 },
      align: 'center',
    },
    {
      id: `${surface}-left-block`,
      label: 'Left block',
      layout: { x: surface === 'cover' ? 22 : 18, width: 42 },
      align: 'left',
    },
    {
      id: `${surface}-right-block`,
      label: 'Right block',
      layout: { x: surface === 'cover' ? 78 : 82, width: 42 },
      align: 'right',
    },
  ]
}

function uniquePresets(
  presets: CaseInsertTextLayoutPreset[],
): CaseInsertTextLayoutPreset[] {
  const seen = new Set<string>()

  return presets.filter((preset) => {
    if (seen.has(preset.id)) {
      return false
    }

    seen.add(preset.id)
    return true
  })
}

export function getCaseInsertTextBlockLayoutPresets(
  surface: CaseInsertTextLayoutSurface,
  textBlock: ProjectCaseInsertTextBlock,
) {
  return uniquePresets([
    ...getDiscTextLayoutPresetsForKey(
      getCaseInsertTextBlockDiscKey(textBlock),
      surface,
    ),
    ...getSurfaceGenericTextLayoutPresets(surface),
  ])
}

export function getCaseInsertTextListLayoutPresets(
  surface: CaseInsertTemplatePaneId,
) {
  return getSurfaceGenericTextLayoutPresets(surface)
}

function applyLayoutPreset(
  layout: ProjectCaseInsertLayout,
  preset: CaseInsertTextLayoutPreset,
): ProjectCaseInsertLayout {
  const nextLayout = {
    ...layout,
    ...(typeof preset.layout.x === 'number' ? { x: preset.layout.x } : {}),
    ...(typeof preset.layout.y === 'number' ? { y: preset.layout.y } : {}),
    ...(typeof preset.layout.width === 'number'
      ? { width: normalizeCaseInsertTextWidth(preset.layout.width) }
      : {}),
  }

  return {
    ...nextLayout,
    fontSizePt: layout.fontSizePt,
    scale: layout.scale,
  }
}

export function applyCaseInsertTextBlockLayoutPreset(
  surface: CaseInsertTextLayoutSurface,
  textBlock: ProjectCaseInsertTextBlock,
  presetId: string,
): ProjectCaseInsertTextBlock {
  const preset = getCaseInsertTextBlockLayoutPresets(surface, textBlock)
    .find((candidate) => candidate.id === presetId)

  if (!preset) {
    return textBlock
  }

  return {
    ...textBlock,
    align: preset.align ?? textBlock.align,
    layout: applyLayoutPreset(textBlock.layout, preset),
  }
}

export function applyCaseInsertTextListLayoutPreset(
  surface: CaseInsertTemplatePaneId,
  textList: ProjectCaseInsertTextList,
  presetId: string,
): ProjectCaseInsertTextList {
  const preset = getCaseInsertTextListLayoutPresets(surface)
    .find((candidate) => candidate.id === presetId)

  if (!preset) {
    return textList
  }

  return {
    ...textList,
    layout: applyLayoutPreset(textList.layout, preset),
  }
}
