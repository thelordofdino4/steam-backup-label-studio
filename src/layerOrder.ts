export type DiscEditorLayerScope = 'preview' | 'export'

export const DISC_EDITOR_LAYER_ORDER = [
  {
    id: 'disc-base-fill',
    label: 'Disc base fill',
    scopes: ['export'],
    description: 'The neutral disc-face fill rendered inside the outer disc clip before any user artwork.',
  },
  {
    id: 'background-artwork',
    label: 'Background artwork',
    scopes: ['preview', 'export'],
    description: 'The selected Steam, local screenshot, or uploaded background image.',
  },
  {
    id: 'steam-banner',
    label: 'Steam backup banner',
    scopes: ['preview', 'export'],
    description: 'The optional Steam Backup banner strip and lockup image.',
  },
  {
    id: 'logo-assets',
    label: 'Developer and publisher logos',
    scopes: ['preview', 'export'],
    description: 'Project-owned developer and publisher logo images.',
  },
  {
    id: 'rating-badge',
    label: 'Rating badge',
    scopes: ['preview', 'export'],
    description: 'The optional rating badge placeholder or custom image.',
  },
  {
    id: 'media-mark',
    label: 'Media format mark',
    scopes: ['preview', 'export'],
    description: 'The optional CD/DVD/data/install disc mark.',
  },
  {
    id: 'platform-marks',
    label: 'Platform marks',
    scopes: ['preview', 'export'],
    description: 'Optional platform/store/device marks such as PC, Windows, Linux, or Steam Deck.',
  },
  {
    id: 'disc-text',
    label: 'Disc text',
    scopes: ['preview', 'export'],
    description: 'Enabled straight and curved disc text elements.',
  },
  {
    id: 'editor-guide-overlay',
    label: 'Editor guide overlay',
    scopes: ['preview'],
    description: 'Preview-only geometry guides shown above artwork and editable elements.',
  },
  {
    id: 'export-outline',
    label: 'Export outer outline',
    scopes: ['export'],
    description: 'The exported outer disc outline, drawn after clipped disc content.',
  },
  {
    id: 'physical-center-hole-cutout',
    label: 'Physical center hole cutout',
    scopes: ['export'],
    description: 'The transparent physical center hole mask applied after artwork rendering.',
  },
  {
    id: 'export-guides',
    label: 'Optional exported guides',
    scopes: ['export'],
    description: 'User-enabled print/geometry guide marks drawn last for proof exports.',
  },
] as const

export type DiscEditorLayer = (typeof DISC_EDITOR_LAYER_ORDER)[number]
export type DiscEditorLayerId = DiscEditorLayer['id']

export function getDiscEditorLayerOrderIndex(layerId: DiscEditorLayerId) {
  return DISC_EDITOR_LAYER_ORDER.findIndex((layer) => layer.id === layerId)
}

export function compareDiscEditorLayerIds(
  firstLayerId: DiscEditorLayerId,
  secondLayerId: DiscEditorLayerId,
) {
  return (
    getDiscEditorLayerOrderIndex(firstLayerId) -
    getDiscEditorLayerOrderIndex(secondLayerId)
  )
}

export function getDiscEditorLayerPolicy(scope?: DiscEditorLayerScope) {
  if (!scope) {
    return DISC_EDITOR_LAYER_ORDER
  }

  return DISC_EDITOR_LAYER_ORDER.filter((layer) =>
    (layer.scopes as readonly DiscEditorLayerScope[]).includes(scope),
  )
}
