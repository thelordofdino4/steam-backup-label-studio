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
  'platform-marks': 'Operating system marks',
  'technical-marks': 'Technical marks',
  'disc-text': 'Disc text',
  'editor-guide-overlay': 'Editor guide overlay',
  'export-outline': 'Export outer outline',
  'physical-center-hole-cutout': 'Physical center hole cutout',
  'export-guides': 'Optional exported guides',
}

export const CASE_INSERT_EDITOR_LAYER_ORDER = [
  'case-surface-base',
  'case-background-artwork',
  'case-screenshot-artwork',
  'case-callout-artwork',
  'case-title-artwork',
  'case-logo-assets',
  'case-rating-badges',
  'case-media-marks',
  'case-platform-marks',
  'case-technical-marks',
  'case-text',
  'case-spine-content',
  'case-editor-guide-overlay',
  'case-export-guides',
] as const

export type CaseInsertEditorLayerId =
  (typeof CASE_INSERT_EDITOR_LAYER_ORDER)[number]

export const CASE_INSERT_EDITOR_PREVIEW_LAYER_ORDER = [
  'case-surface-base',
  'case-background-artwork',
  'case-screenshot-artwork',
  'case-callout-artwork',
  'case-title-artwork',
  'case-logo-assets',
  'case-rating-badges',
  'case-media-marks',
  'case-platform-marks',
  'case-technical-marks',
  'case-text',
  'case-spine-content',
  'case-editor-guide-overlay',
] as const satisfies readonly CaseInsertEditorLayerId[]

export type CaseInsertEditorPreviewLayerId =
  (typeof CASE_INSERT_EDITOR_PREVIEW_LAYER_ORDER)[number]

export const CASE_INSERT_EDITOR_EXPORT_LAYER_ORDER = [
  'case-surface-base',
  'case-background-artwork',
  'case-screenshot-artwork',
  'case-callout-artwork',
  'case-title-artwork',
  'case-logo-assets',
  'case-rating-badges',
  'case-media-marks',
  'case-platform-marks',
  'case-technical-marks',
  'case-text',
  'case-spine-content',
  'case-export-guides',
] as const satisfies readonly CaseInsertEditorLayerId[]

export type CaseInsertEditorExportLayerId =
  (typeof CASE_INSERT_EDITOR_EXPORT_LAYER_ORDER)[number]

export const CASE_INSERT_EDITOR_LAYER_LABELS: Record<
  CaseInsertEditorLayerId,
  string
> = {
  'case-surface-base': 'Case insert surface base',
  'case-background-artwork': 'Case background artwork',
  'case-screenshot-artwork': 'Back cover screenshots',
  'case-callout-artwork': 'Case callout artwork',
  'case-title-artwork': 'Case title artwork',
  'case-logo-assets': 'Case logos',
  'case-rating-badges': 'Case rating badges',
  'case-media-marks': 'Case media marks',
  'case-platform-marks': 'Case operating system marks',
  'case-technical-marks': 'Case technical marks',
  'case-text': 'Case text',
  'case-spine-content': 'Spine content',
  'case-editor-guide-overlay': 'Case editor guide overlay',
  'case-export-guides': 'Optional case export guides',
}
