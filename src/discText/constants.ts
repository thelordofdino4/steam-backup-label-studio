import type { DiscTextKey, DiscTextSettings } from './types'

export const CURVED_COPYRIGHT_LAYOUT_X_MIN = -60
export const CURVED_COPYRIGHT_LAYOUT_X_MAX = 60
export const CURVED_COPYRIGHT_LAYOUT_Y_MIN = -8
export const CURVED_COPYRIGHT_LAYOUT_Y_MAX = 20

export const DISC_TEXT_KEYS: DiscTextKey[] = [
  'title',
  'subtitle',
  'discNumber',
  'backupDate',
  'appId',
  'developer',
  'publisher',
  'installNotes',
  'customNote',
  'copyright',
]

export const DEFAULT_DISC_TEXT_SETTINGS: DiscTextSettings = {
  title: false,
  subtitle: false,
  discNumber: false,
  backupDate: false,
  appId: false,
  developer: false,
  publisher: false,
  installNotes: false,
  customNote: false,
  copyright: false,
}

export const DISC_TEXT_WIDTH_MIN = 20
export const DISC_TEXT_WIDTH_MAX = 90

export const DEFAULT_DISC_TEXT_WIDTHS: Record<DiscTextKey, number> = {
  title: 58,
  subtitle: 54,
  discNumber: 42,
  backupDate: 48,
  appId: 48,
  developer: 48,
  publisher: 48,
  installNotes: 58,
  customNote: 58,
  copyright: 68,
}
