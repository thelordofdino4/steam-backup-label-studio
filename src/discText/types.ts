export type SteamLogoPlacement = 'top' | 'bottom' | 'none'

export type DiscTextKey =
  | 'title'
  | 'subtitle'
  | 'discNumber'
  | 'backupDate'
  | 'appId'
  | 'developer'
  | 'publisher'
  | 'installNotes'
  | 'customNote'
  | 'copyright'

export type DiscTextSettings = Record<DiscTextKey, boolean>
export type DiscTextMarkdownSources = Partial<Record<DiscTextKey, string>>

export type DiscTextValues = {
  subtitle: string
  discNumber: string
  backupDate: string
  appId: string
  developer: string
  publisher: string
  installNotes: string
  customNote: string
  copyright: string
}

export type DiscTextAlignment = 'left' | 'center' | 'right'
export type DiscTextMode = 'straight' | 'curved'
export type DiscTextArcSide = 'top' | 'bottom'

export type DiscTextLayout = {
  x: number
  y: number
  width: number
  scale: number
  align: DiscTextAlignment
  mode: DiscTextMode
  arcDegrees: number
  arcSide: DiscTextArcSide
  avoidVisualElements: boolean
}

export type DiscTextLayoutSettings = Record<DiscTextKey, DiscTextLayout>
export type DiscTextLayoutNumericField = 'x' | 'y' | 'width' | 'scale' | 'arcDegrees'
