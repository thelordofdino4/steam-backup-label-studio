import type { DiscTextAlignment, DiscTextArcSide, DiscTextKey, DiscTextLayout, DiscTextMode } from './discText'

export type RatingBadgeLayoutPreset = {
  id: string
  label: string
  x: number
  y: number
  scale: number
}

export const RATING_BADGE_LAYOUT_PRESETS = [
  { id: 'right-middle', label: 'Right middle', x: 78, y: 50, scale: 1 },
  { id: 'lower-right', label: 'Lower right', x: 78, y: 76, scale: 1 },
  { id: 'lower-left', label: 'Lower left', x: 22, y: 76, scale: 1 },
  { id: 'top-right', label: 'Top right', x: 78, y: 24, scale: 1 },
  { id: 'stacked-right-upper', label: 'Stacked right upper', x: 78, y: 62, scale: 0.86 },
  { id: 'stacked-right-lower', label: 'Stacked right lower', x: 78, y: 74, scale: 0.86 },
] satisfies readonly RatingBadgeLayoutPreset[]

export type DiscTextLayoutPreset = {
  id: string
  label: string
  targetKeys: readonly DiscTextKey[]
  layout: Partial<Pick<DiscTextLayout, 'x' | 'y' | 'width' | 'scale' | 'arcDegrees'>> & {
    align?: DiscTextAlignment
    mode?: DiscTextMode
    arcSide?: DiscTextArcSide
  }
}

export const DISC_TEXT_LAYOUT_PRESETS: readonly DiscTextLayoutPreset[] = [
  {
    id: 'title-top',
    label: 'Title top',
    targetKeys: ['title'],
    layout: { x: 0, y: 19.5, width: 62, scale: 1.05, align: 'center', mode: 'straight' },
  },
  {
    id: 'title-bottom',
    label: 'Title bottom',
    targetKeys: ['title'],
    layout: { x: 0, y: 81.5, width: 62, scale: 1.05, align: 'center', mode: 'straight' },
  },
  {
    id: 'left-block',
    label: 'Left block',
    targetKeys: ['customNote', 'discNumber', 'backupDate', 'appId'],
    layout: { x: -20, y: 52, width: 36, scale: 0.88, align: 'left', mode: 'straight' },
  },
  {
    id: 'right-block',
    label: 'Right block',
    targetKeys: ['customNote', 'discNumber', 'backupDate', 'appId'],
    layout: { x: 20, y: 52, width: 36, scale: 0.88, align: 'right', mode: 'straight' },
  },
  {
    id: 'small-lower-app-id',
    label: 'Small lower App ID',
    targetKeys: ['appId'],
    layout: { x: 0, y: 72, width: 44, scale: 0.82, align: 'center', mode: 'straight' },
  },
  {
    id: 'lower-legal-line',
    label: 'Lower legal line',
    targetKeys: ['copyright'],
    layout: { x: 0, y: 86, width: 74, scale: 0.84, align: 'center', mode: 'straight' },
  },
  {
    id: 'top-arc',
    label: 'Top arc',
    targetKeys: ['copyright'],
    layout: { x: 0, y: 8, scale: 1, align: 'center', mode: 'curved', arcDegrees: 210, arcSide: 'top' },
  },
  {
    id: 'bottom-arc',
    label: 'Bottom arc',
    targetKeys: ['copyright'],
    layout: { x: 0, y: 8, scale: 1, align: 'center', mode: 'curved', arcDegrees: 210, arcSide: 'bottom' },
  },
]

export function getDiscTextLayoutPresetsForKey(key: DiscTextKey) {
  return DISC_TEXT_LAYOUT_PRESETS.filter((preset) => preset.targetKeys.includes(key))
}
