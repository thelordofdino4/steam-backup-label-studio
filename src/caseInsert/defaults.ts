import {
  DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
} from '../editor/editorTypes.ts'
import {
  DEFAULT_CASE_INSERT_TEMPLATE_PANE_ID,
  type CaseInsertTemplatePaneId,
} from './templateSurfaces.ts'
import {
  jewelCaseInsertTemplate,
  type JewelCaseGuideId,
  type JewelCaseSurfaceId,
} from '../templates/caseInsertTemplates.ts'
import type {
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertSurfaceState,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectCaseInsertTextSource,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseSpineState,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import {
  DEFAULT_ADDITIONAL_ARTWORK_FRAME,
} from '../project/additionalArtworkFrame.ts'
import {
  createDefaultCaseInsertSteamBanner,
} from './steamBanner.ts'

export const DEFAULT_CASE_INSERT_PROJECT_TITLE = 'Untitled Jewel Case Insert'

export const DEFAULT_CASE_INSERT_SURFACES: JewelCaseSurfaceId[] = ['front', 'back']
export const DEFAULT_CASE_INSERT_TEMPLATE_PANES: CaseInsertTemplatePaneId[] = [
  DEFAULT_CASE_INSERT_TEMPLATE_PANE_ID,
  'tray',
]
export const JEWEL_CASE_GUIDE_IDS = jewelCaseInsertTemplate.guides.map(
  ({ id }) => id as JewelCaseGuideId,
)
export const DEFAULT_JEWEL_CASE_GUIDE_IDS = jewelCaseInsertTemplate.guides
  .filter(({ visibleByDefault }) => visibleByDefault)
  .map(({ id }) => id as JewelCaseGuideId)
export const DEFAULT_JEWEL_CASE_EXPORT_GUIDE_IDS: JewelCaseGuideId[] = []

export function createDefaultCaseInsertLayout(
  layout: Partial<ProjectCaseInsertLayout> = {},
): ProjectCaseInsertLayout {
  return {
    scale: layout.scale ?? 1,
    x: layout.x ?? 0,
    y: layout.y ?? 0,
    rotation: layout.rotation ?? 0,
  }
}

export function createDefaultCaseInsertImageSlot(
  id: string,
  label: string,
  options: {
    enabled?: boolean
    fit?: ProjectCaseInsertImageFit
    layout?: Partial<ProjectCaseInsertLayout>
  } = {},
): ProjectCaseInsertImageSlot {
  return {
    id,
    label,
    enabled: options.enabled ?? false,
    imageDataUrl: null,
    imageSource: null,
    imageSize: null,
    defaultSteamLogo: null,
    fit: options.fit ?? 'contain',
    layout: createDefaultCaseInsertLayout(options.layout),
    frame: DEFAULT_ADDITIONAL_ARTWORK_FRAME,
  }
}

export function createDefaultCaseInsertTextBlock(
  id: string,
  label: string,
  options: {
    enabled?: boolean
    value?: string
    source?: ProjectCaseInsertTextSource
    align?: ProjectCaseInsertTextAlign
    layout?: Partial<ProjectCaseInsertLayout>
  } = {},
): ProjectCaseInsertTextBlock {
  return {
    id,
    label,
    enabled: options.enabled ?? false,
    value: options.value ?? '',
    source: options.source ?? 'manual',
    align: options.align ?? 'left',
    layout: createDefaultCaseInsertLayout(options.layout),
  }
}

export function createDefaultCaseInsertTextList(
  id: string,
  label: string,
  options: {
    enabled?: boolean
    items?: string[]
    source?: ProjectCaseInsertTextSource
    layout?: Partial<ProjectCaseInsertLayout>
  } = {},
): ProjectCaseInsertTextList {
  return {
    id,
    label,
    enabled: options.enabled ?? false,
    items: options.items ?? [],
    source: options.source ?? 'manual',
    layout: createDefaultCaseInsertLayout(options.layout),
  }
}

export function createDefaultCaseInsertSurfaceState(
  paneId: CaseInsertTemplatePaneId,
  label: string,
): ProjectCaseInsertSurfaceState {
  return {
    steamBanner: createDefaultCaseInsertSteamBanner('cover', {
      enabled: paneId === 'cover',
    }),
    background: createDefaultCaseInsertImageSlot(
      `${paneId}-background`,
      `${label} background`,
      { enabled: true, fit: 'cover' },
    ),
    titleArtwork: createDefaultCaseInsertImageSlot(
      `${paneId}-title-artwork`,
      `${label} title artwork`,
    ),
    additionalArtworkEnabled: false,
    artworkSlots: [],
    logoSlots: [],
    markSlots: [],
    textBlocks: [],
    textLists: [],
  }
}

export function createDefaultCaseInsertCoverTemplateState():
ProjectCaseInsertSurfaceState {
  const surfaceState = createDefaultCaseInsertSurfaceState('cover', 'Cover sheet')

  return {
    ...surfaceState,
    titleArtwork: createDefaultCaseInsertImageSlot(
      'cover-title-artwork',
      'Title/logo artwork',
      {
        fit: 'contain',
        layout: { scale: 1, x: 50, y: 24 },
      },
    ),
    textBlocks: [
      createDefaultCaseInsertTextBlock(
        'cover-callout-text',
        'Callout text',
        { align: 'center', layout: { scale: 1, x: 50, y: 82 } },
      ),
    ],
  }
}

export function createDefaultCaseInsertTrayTemplateState():
ProjectCaseInsertSurfaceState {
  return {
    ...createDefaultCaseInsertSurfaceState('tray', 'Tray card'),
    textBlocks: [
      createDefaultCaseInsertTextBlock(
        'tray-description',
        'Description',
        { layout: { scale: 1, x: 50, y: 50 } },
      ),
      createDefaultCaseInsertTextBlock(
        'tray-minimum-requirements',
        'Minimum requirements',
        { layout: { scale: 1, x: 28, y: 81 } },
      ),
      createDefaultCaseInsertTextBlock(
        'tray-recommended-requirements',
        'Recommended requirements',
        { layout: { scale: 1, x: 72, y: 81 } },
      ),
      createDefaultCaseInsertTextBlock(
        'tray-legal-text',
        'Legal text',
        { align: 'center', layout: { scale: 1, x: 50, y: 93 } },
      ),
    ],
    textLists: [
      createDefaultCaseInsertTextList(
        'tray-feature-bullets',
        'Feature bullets',
        { layout: { scale: 1, x: 28, y: 31 } },
      ),
    ],
  }
}

export function createDefaultJewelCaseSpineArtworkSlot(
  side: 'left' | 'right',
  index: number,
): ProjectCaseInsertImageSlot {
  return createDefaultCaseInsertImageSlot(
    `${side}-spine-artwork-${index}`,
    `Artwork ${index}`,
    {
      enabled: true,
      fit: 'contain',
      layout: { scale: 1, x: 50, y: 72, rotation: 0 },
    },
  )
}

export function createDefaultJewelCaseSpineMarkSlot(
  side: 'left' | 'right',
  index: number,
): ProjectCaseInsertImageSlot {
  return createDefaultCaseInsertImageSlot(
    `${side}-spine-mark-${index}`,
    `Mark ${index}`,
    {
      enabled: true,
      fit: 'contain',
      layout: { scale: 1, x: 50, y: 82, rotation: 0 },
    },
  )
}

export function createDefaultCaseInsertTemplateStates():
Record<CaseInsertTemplatePaneId, ProjectCaseInsertSurfaceState> {
  return {
    cover: createDefaultCaseInsertCoverTemplateState(),
    tray: createDefaultCaseInsertTrayTemplateState(),
  }
}

export function createDefaultJewelCaseSpineSideState(
  side: 'left' | 'right',
  title: string,
): ProjectJewelCaseSpineSideState {
  const label = side === 'left' ? 'Left spine' : 'Right spine'

  return {
    steamBanner: createDefaultCaseInsertSteamBanner('spine'),
    background: createDefaultCaseInsertImageSlot(
      `${side}-spine-background`,
      `${label} background`,
      { enabled: true, fit: 'cover' },
    ),
    titleArtwork: createDefaultCaseInsertImageSlot(
      `${side}-spine-title-artwork`,
      `${label} game logo`,
      {
        fit: 'contain',
        layout: {
          scale: 1,
          x: 50,
          y: 28,
          rotation: side === 'left' ? -90 : 90,
        },
      },
    ),
    additionalArtworkEnabled: false,
    artworkSlots: [],
    logoSlots: [],
    markSlots: [],
    title: createDefaultCaseInsertTextBlock(
      `${side}-spine-title`,
      `${label} title`,
      {
        align: 'center',
        enabled: true,
        value: title,
        layout: {
          scale: 1,
          x: 50,
          y: 50,
          rotation: side === 'left' ? -90 : 90,
        },
      },
    ),
  }
}

export function createDefaultJewelCaseSpineState(
  title: string,
): ProjectJewelCaseSpineState {
  return {
    left: createDefaultJewelCaseSpineSideState('left', title),
    right: createDefaultJewelCaseSpineSideState('right', title),
  }
}

export function createDefaultProjectJewelCaseState(
  title = '',
): ProjectJewelCaseState {
  return {
    templateType: DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
    templates: createDefaultCaseInsertTemplateStates(),
    spine: createDefaultJewelCaseSpineState(title),
    export: {
      surfaces: [...DEFAULT_CASE_INSERT_SURFACES],
      guideIds: [...DEFAULT_JEWEL_CASE_EXPORT_GUIDE_IDS],
    },
  }
}
