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
import {
  createDefaultCaseInsertTextStyle,
  getCaseInsertTextBlockStyleRole,
  getCaseInsertTextListStyleRole,
  type CaseInsertTextStyle,
} from './textStyles.ts'
import {
  getCaseInsertDiscTextBlockId,
  getCaseInsertDiscTextBlockLabel,
  getCaseInsertDiscTextKeys,
  type CaseInsertTextSurfaceId,
} from './textContent.ts'
import type { DiscTextKey } from '../discText/types.ts'

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
    ...(typeof layout.width === 'number' && Number.isFinite(layout.width)
      ? { width: layout.width }
      : {}),
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
    style?: Partial<CaseInsertTextStyle>
  } = {},
): ProjectCaseInsertTextBlock {
  const role = getCaseInsertTextBlockStyleRole({ id })

  return {
    id,
    label,
    enabled: options.enabled ?? false,
    value: options.value ?? '',
    source: options.source ?? 'manual',
    avoidVisualElements: false,
    align: options.align ?? 'left',
    layout: createDefaultCaseInsertLayout(options.layout),
    style: {
      ...createDefaultCaseInsertTextStyle(role),
      ...(options.style ?? {}),
    },
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
    style?: Partial<CaseInsertTextStyle>
  } = {},
): ProjectCaseInsertTextList {
  const role = getCaseInsertTextListStyleRole({ id })

  return {
    id,
    label,
    enabled: options.enabled ?? false,
    items: options.items ?? [],
    source: options.source ?? 'manual',
    avoidVisualElements: false,
    layout: createDefaultCaseInsertLayout(options.layout),
    style: {
      ...createDefaultCaseInsertTextStyle(role),
      ...(options.style ?? {}),
    },
  }
}

type DefaultCaseInsertTextBlockConfig = {
  enabled?: boolean
  value?: string
  align?: ProjectCaseInsertTextAlign
  layout: Partial<ProjectCaseInsertLayout>
}

const COVER_DISC_TEXT_LAYOUTS: Record<
  DiscTextKey,
  DefaultCaseInsertTextBlockConfig
> = {
  title: {
    value: '',
    align: 'center',
    layout: { scale: 1, width: 80, x: 50, y: 34 },
  },
  subtitle: {
    align: 'center',
    layout: { scale: 1, width: 72, x: 50, y: 45 },
  },
  discNumber: {
    align: 'center',
    layout: { scale: 0.9, width: 42, x: 18, y: 82 },
  },
  backupDate: {
    align: 'center',
    layout: { scale: 0.86, width: 48, x: 50, y: 86 },
  },
  appId: {
    align: 'center',
    layout: { scale: 0.82, width: 48, x: 82, y: 82 },
  },
  developer: {
    align: 'left',
    layout: { scale: 0.84, width: 48, x: 22, y: 88 },
  },
  publisher: {
    align: 'right',
    layout: { scale: 0.84, width: 48, x: 78, y: 88 },
  },
  installNotes: {
    align: 'center',
    layout: { scale: 0.9, width: 58, x: 50, y: 74 },
  },
  customNote: {
    align: 'center',
    layout: { scale: 1, width: 74, x: 50, y: 82 },
  },
  copyright: {
    align: 'center',
    layout: { scale: 1, width: 86, x: 50, y: 93 },
  },
}

const TRAY_DISC_TEXT_LAYOUTS: Record<
  DiscTextKey,
  DefaultCaseInsertTextBlockConfig
> = {
  title: {
    align: 'center',
    layout: { scale: 1, width: 80, x: 50, y: 15 },
  },
  subtitle: {
    align: 'center',
    layout: { scale: 0.9, width: 72, x: 50, y: 22 },
  },
  discNumber: {
    align: 'left',
    layout: { scale: 0.78, width: 42, x: 18, y: 88 },
  },
  backupDate: {
    align: 'center',
    layout: { scale: 0.78, width: 48, x: 50, y: 88 },
  },
  appId: {
    align: 'right',
    layout: { scale: 0.78, width: 48, x: 82, y: 88 },
  },
  developer: {
    align: 'left',
    layout: { scale: 0.78, width: 48, x: 22, y: 76 },
  },
  publisher: {
    align: 'right',
    layout: { scale: 0.78, width: 48, x: 78, y: 76 },
  },
  installNotes: {
    align: 'center',
    layout: { scale: 0.86, width: 58, x: 50, y: 70 },
  },
  customNote: {
    align: 'center',
    layout: { scale: 0.9, width: 74, x: 50, y: 64 },
  },
  copyright: {
    align: 'center',
    layout: { scale: 1, width: 88, x: 50, y: 93 },
  },
}

const SPINE_DISC_TEXT_LAYOUTS: Record<
  DiscTextKey,
  DefaultCaseInsertTextBlockConfig
> = {
  title: {
    enabled: true,
    align: 'center',
    layout: { scale: 1, width: 90, x: 50, y: 50 },
  },
  subtitle: {
    align: 'center',
    layout: { scale: 0.78, width: 74, x: 50, y: 42 },
  },
  discNumber: {
    align: 'center',
    layout: { scale: 0.7, width: 46, x: 50, y: 60 },
  },
  backupDate: {
    align: 'center',
    layout: { scale: 0.68, width: 48, x: 50, y: 68 },
  },
  appId: {
    align: 'center',
    layout: { scale: 0.66, width: 48, x: 50, y: 76 },
  },
  developer: {
    align: 'center',
    layout: { scale: 0.68, width: 48, x: 50, y: 84 },
  },
  publisher: {
    align: 'center',
    layout: { scale: 0.68, width: 48, x: 50, y: 88 },
  },
  installNotes: {
    align: 'center',
    layout: { scale: 0.66, width: 58, x: 50, y: 72 },
  },
  customNote: {
    align: 'center',
    layout: { scale: 0.72, width: 58, x: 50, y: 78 },
  },
  copyright: {
    align: 'center',
    layout: { scale: 0.62, width: 68, x: 50, y: 92 },
  },
}

function getDefaultDiscTextLayouts(
  surface: CaseInsertTextSurfaceId,
) {
  if (surface === 'cover') return COVER_DISC_TEXT_LAYOUTS
  if (surface === 'tray') return TRAY_DISC_TEXT_LAYOUTS

  return SPINE_DISC_TEXT_LAYOUTS
}

export function createDefaultCaseInsertDiscTextBlocks(
  idPrefix: string,
  surface: CaseInsertTextSurfaceId,
  title = '',
  options: {
    excludeKeys?: readonly DiscTextKey[]
    rotation?: number
  } = {},
) {
  const excludedKeys = new Set(options.excludeKeys ?? [])
  const layouts = getDefaultDiscTextLayouts(surface)

  return getCaseInsertDiscTextKeys()
    .filter((key) => !excludedKeys.has(key))
    .map((key) => {
      const config = layouts[key]

      return createDefaultCaseInsertTextBlock(
        getCaseInsertDiscTextBlockId(idPrefix, key),
        getCaseInsertDiscTextBlockLabel(key),
        {
          enabled: config.enabled,
          value: key === 'title' ? title : config.value,
          source: key === 'customNote' ? 'manual' : 'metadata',
          align: config.align,
          layout: {
            ...config.layout,
            rotation: options.rotation ?? config.layout.rotation,
          },
        },
      )
    })
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

export function createDefaultCaseInsertCoverTemplateState(
  title = '',
):
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
    textBlocks: createDefaultCaseInsertDiscTextBlocks('cover', 'cover', title),
  }
}

export function createDefaultCaseInsertTrayTemplateState():
ProjectCaseInsertSurfaceState {
  return {
    ...createDefaultCaseInsertSurfaceState('tray', 'Tray card'),
    textBlocks: [
      ...createDefaultCaseInsertDiscTextBlocks('tray', 'tray'),
      createDefaultCaseInsertTextBlock(
        'tray-description',
        'Description',
        { layout: { scale: 1, width: 82, x: 50, y: 50 } },
      ),
      createDefaultCaseInsertTextBlock(
        'tray-minimum-requirements',
        'Minimum requirements',
        { layout: { scale: 1, width: 40, x: 28, y: 81 } },
      ),
      createDefaultCaseInsertTextBlock(
        'tray-recommended-requirements',
        'Recommended requirements',
        { layout: { scale: 1, width: 40, x: 72, y: 81 } },
      ),
    ],
    textLists: [
      createDefaultCaseInsertTextList(
        'tray-feature-bullets',
        'Feature bullets',
        { layout: { scale: 1, width: 42, x: 28, y: 31 } },
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

export function createDefaultCaseInsertTemplateStates(
  title = '',
):
Record<CaseInsertTemplatePaneId, ProjectCaseInsertSurfaceState> {
  return {
    cover: createDefaultCaseInsertCoverTemplateState(title),
    tray: createDefaultCaseInsertTrayTemplateState(),
  }
}

export function createDefaultJewelCaseSpineSideState(
  side: 'left' | 'right',
  title: string,
): ProjectJewelCaseSpineSideState {
  const label = side === 'left' ? 'Left spine' : 'Right spine'
  const titleTextBlock = createDefaultCaseInsertDiscTextBlocks(
    `${side}-spine`,
    'spine',
    title,
    {
      excludeKeys: [
        'subtitle',
        'discNumber',
        'backupDate',
        'appId',
        'developer',
        'publisher',
        'installNotes',
        'customNote',
        'copyright',
      ],
      rotation: side === 'left' ? -90 : 90,
    },
  )[0] ?? createDefaultCaseInsertTextBlock(
    `${side}-spine-title-text`,
    'Game title',
    {
      enabled: true,
      value: title,
      source: 'metadata',
      align: 'center',
      layout: {
        scale: 1,
        width: 90,
        x: 50,
        y: 50,
        rotation: side === 'left' ? -90 : 90,
      },
    },
  )

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
    title: titleTextBlock,
    textBlocks: createDefaultCaseInsertDiscTextBlocks(
      `${side}-spine`,
      'spine',
      title,
      {
        excludeKeys: ['title'],
        rotation: side === 'left' ? -90 : 90,
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
    templates: createDefaultCaseInsertTemplateStates(title),
    spine: createDefaultJewelCaseSpineState(title),
    export: {
      surfaces: [...DEFAULT_CASE_INSERT_SURFACES],
      guideIds: [...DEFAULT_JEWEL_CASE_EXPORT_GUIDE_IDS],
    },
  }
}
