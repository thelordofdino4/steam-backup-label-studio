export const DISC_EDITOR_LAYER_ORDER = [
  'disc-base-fill',
  'background-artwork',
  'additional-artwork',
  'steam-banner',
  'title-artwork',
  'logo-assets',
  'rating-badge',
  'media-mark',
  'platform-marks',
  'technical-marks',
  'disc-text',
  'editor-guide-overlay',
  'export-outline',
  'physical-center-hole-cutout',
  'export-guides',
] as const

export type DiscEditorLayerId = (typeof DISC_EDITOR_LAYER_ORDER)[number]

export const DISC_EDITOR_PREVIEW_LAYER_ORDER = [
  'background-artwork',
  'additional-artwork',
  'steam-banner',
  'title-artwork',
  'logo-assets',
  'rating-badge',
  'media-mark',
  'platform-marks',
  'technical-marks',
  'disc-text',
  'editor-guide-overlay',
] as const satisfies readonly DiscEditorLayerId[]

export type DiscEditorPreviewLayerId =
  (typeof DISC_EDITOR_PREVIEW_LAYER_ORDER)[number]

export const DISC_EDITOR_CLIPPED_EXPORT_LAYER_ORDER = [
  'disc-base-fill',
  'background-artwork',
  'additional-artwork',
  'steam-banner',
  'title-artwork',
  'logo-assets',
  'rating-badge',
  'media-mark',
  'platform-marks',
  'technical-marks',
  'disc-text',
] as const satisfies readonly DiscEditorLayerId[]

export type DiscEditorClippedExportLayerId =
  (typeof DISC_EDITOR_CLIPPED_EXPORT_LAYER_ORDER)[number]

export const DISC_EDITOR_POST_CLIP_EXPORT_LAYER_ORDER = [
  'export-outline',
  'physical-center-hole-cutout',
  'export-guides',
] as const satisfies readonly DiscEditorLayerId[]

export type DiscEditorPostClipExportLayerId =
  (typeof DISC_EDITOR_POST_CLIP_EXPORT_LAYER_ORDER)[number]

export const DISC_EDITOR_LAYER_LABELS: Record<DiscEditorLayerId, string> = {
  'disc-base-fill': 'Disc base fill',
  'background-artwork': 'Background artwork',
  'additional-artwork': 'Additional artwork',
  'steam-banner': 'Steam backup banner',
  'title-artwork': 'Game title artwork',
  'logo-assets': 'Developer and publisher logos',
  'rating-badge': 'Rating badge',
  'media-mark': 'Media format mark',
  'platform-marks': 'Platform marks',
  'technical-marks': 'Technical marks',
  'disc-text': 'Disc text',
  'editor-guide-overlay': 'Editor guide overlay',
  'export-outline': 'Export outer outline',
  'physical-center-hole-cutout': 'Physical center hole cutout',
  'export-guides': 'Optional exported guides',
}
