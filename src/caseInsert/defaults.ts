import {
  DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
} from '../editor/editorTypes.ts'
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
  ProjectJewelCaseBackState,
  ProjectJewelCaseFrontState,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseSpineState,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'

export const DEFAULT_CASE_INSERT_PROJECT_TITLE = 'Untitled Jewel Case Insert'

export const DEFAULT_CASE_INSERT_SURFACES: JewelCaseSurfaceId[] = ['front', 'back']
export const DEFAULT_JEWEL_CASE_SCREENSHOT_SLOT_COUNT = 3
export const JEWEL_CASE_GUIDE_IDS = jewelCaseInsertTemplate.guides.map(
  ({ id }) => id as JewelCaseGuideId,
)
export const DEFAULT_JEWEL_CASE_GUIDE_IDS = jewelCaseInsertTemplate.guides
  .filter(({ visibleByDefault }) => visibleByDefault)
  .map(({ id }) => id as JewelCaseGuideId)

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
    fit: options.fit ?? 'contain',
    layout: createDefaultCaseInsertLayout(options.layout),
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
  surfaceId: JewelCaseSurfaceId,
  label: string,
): ProjectCaseInsertSurfaceState {
  return {
    background: createDefaultCaseInsertImageSlot(
      `${surfaceId}-background`,
      `${label} background`,
      { enabled: true, fit: 'cover' },
    ),
    titleArtwork: createDefaultCaseInsertImageSlot(
      `${surfaceId}-title-artwork`,
      `${label} title artwork`,
    ),
    artworkSlots: [],
    logoSlots: [],
    markSlots: [],
    textBlocks: [],
  }
}

export function createDefaultJewelCaseFrontState(): ProjectJewelCaseFrontState {
  const surfaceState = createDefaultCaseInsertSurfaceState('front', 'Front')

  return {
    ...surfaceState,
    titleArtwork: createDefaultCaseInsertImageSlot(
      'front-title-artwork',
      'Front title artwork',
      {
        fit: 'contain',
        layout: { scale: 1, x: 50, y: 24 },
      },
    ),
    calloutArtwork: createDefaultCaseInsertImageSlot(
      'front-callout-artwork',
      'Front callout artwork',
      {
        fit: 'contain',
        layout: { scale: 1, x: 50, y: 62 },
      },
    ),
    calloutText: createDefaultCaseInsertTextBlock(
      'front-callout-text',
      'Front callout text',
      { align: 'center', layout: { scale: 1, x: 50, y: 82 } },
    ),
  }
}

export function createDefaultJewelCaseScreenshotSlots() {
  return Array.from({ length: DEFAULT_JEWEL_CASE_SCREENSHOT_SLOT_COUNT }, (_, index) =>
    createDefaultCaseInsertImageSlot(
      `back-screenshot-${index + 1}`,
      `Back screenshot ${index + 1}`,
      { fit: 'cover' },
    ),
  )
}

export function createDefaultJewelCaseBackState(): ProjectJewelCaseBackState {
  return {
    ...createDefaultCaseInsertSurfaceState('back', 'Back'),
    screenshotSlots: createDefaultJewelCaseScreenshotSlots(),
    description: createDefaultCaseInsertTextBlock(
      'back-description',
      'Back description',
    ),
    featureBullets: createDefaultCaseInsertTextList(
      'back-feature-bullets',
      'Back feature bullets',
    ),
    minimumRequirements: createDefaultCaseInsertTextBlock(
      'back-minimum-requirements',
      'Minimum requirements',
    ),
    recommendedRequirements: createDefaultCaseInsertTextBlock(
      'back-recommended-requirements',
      'Recommended requirements',
    ),
    legalText: createDefaultCaseInsertTextBlock('back-legal-text', 'Legal text'),
  }
}

export function createDefaultJewelCaseSpineSideState(
  side: 'left' | 'right',
  title: string,
): ProjectJewelCaseSpineSideState {
  const label = side === 'left' ? 'Left spine' : 'Right spine'

  return {
    background: createDefaultCaseInsertImageSlot(
      `${side}-spine-background`,
      `${label} background`,
      { fit: 'cover' },
    ),
    title: createDefaultCaseInsertTextBlock(
      `${side}-spine-title`,
      `${label} title`,
      { align: 'center', value: title },
    ),
    steamBackupBranding: createDefaultCaseInsertImageSlot(
      `${side}-spine-steam-backup-branding`,
      `${label} Steam Backup branding`,
    ),
    logo: createDefaultCaseInsertImageSlot(`${side}-spine-logo`, `${label} logo`),
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
    front: createDefaultJewelCaseFrontState(),
    back: createDefaultJewelCaseBackState(),
    spine: createDefaultJewelCaseSpineState(title),
    export: {
      surfaces: [...DEFAULT_CASE_INSERT_SURFACES],
      guideIds: [...DEFAULT_JEWEL_CASE_GUIDE_IDS],
    },
  }
}
