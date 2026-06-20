import type { DiscTextKey } from '../discText/types.ts'
import type {
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextAlign,
} from '../project/projectTypes.ts'

export type CaseInsertDefaultTextLayoutConfig = {
  enabled?: boolean
  value?: string
  align?: ProjectCaseInsertTextAlign
  layout: ProjectCaseInsertLayout
}

export const CASE_INSERT_TRAY_DEFAULT_DISC_TEXT_LAYOUTS = {
  title: {
    align: 'center',
    layout: {
      scale: 1.18,
      fontSizePt: 24,
      width: 74,
      x: 50,
      y: 11,
      rotation: 0,
    },
  },
  subtitle: {
    align: 'center',
    layout: {
      scale: 0.95,
      fontSizePt: 16,
      width: 66,
      x: 50,
      y: 17,
      rotation: 0,
    },
  },
  discNumber: {
    align: 'left',
    layout: {
      scale: 0.72,
      fontSizePt: 10,
      width: 28,
      x: 18,
      y: 91,
      rotation: 0,
    },
  },
  backupDate: {
    align: 'center',
    layout: {
      scale: 0.72,
      fontSizePt: 10,
      width: 32,
      x: 50,
      y: 91,
      rotation: 0,
    },
  },
  appId: {
    align: 'right',
    layout: {
      scale: 0.72,
      fontSizePt: 10,
      width: 32,
      x: 82,
      y: 91,
      rotation: 0,
    },
  },
  developer: {
    align: 'left',
    layout: {
      scale: 0.76,
      fontSizePt: 11,
      width: 36,
      x: 22,
      y: 86,
      rotation: 0,
    },
  },
  publisher: {
    align: 'right',
    layout: {
      scale: 0.76,
      fontSizePt: 11,
      width: 36,
      x: 78,
      y: 86,
      rotation: 0,
    },
  },
  installNotes: {
    align: 'center',
    layout: {
      scale: 0.82,
      fontSizePt: 12,
      width: 62,
      x: 50,
      y: 62,
      rotation: 0,
    },
  },
  customNote: {
    align: 'center',
    layout: {
      scale: 0.82,
      fontSizePt: 12,
      width: 66,
      x: 50,
      y: 67,
      rotation: 0,
    },
  },
  copyright: {
    align: 'center',
    layout: {
      scale: 0.54,
      fontSizePt: 8,
      width: 88,
      x: 50,
      y: 96,
      rotation: 0,
    },
  },
} satisfies Record<DiscTextKey, CaseInsertDefaultTextLayoutConfig>

export const CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS: Record<
  string,
  CaseInsertDefaultTextLayoutConfig
> = {
  'tray-description': {
    align: 'left',
    layout: {
      scale: 0.68,
      fontSizePt: 12,
      width: 52,
      x: 66,
      y: 36,
      rotation: 0,
    },
  },
  'tray-minimum-requirements': {
    align: 'left',
    layout: {
      scale: 0.52,
      fontSizePt: 8,
      width: 38,
      x: 29,
      y: 74,
      rotation: 0,
    },
  },
  'tray-recommended-requirements': {
    align: 'left',
    layout: {
      scale: 0.52,
      fontSizePt: 8,
      width: 38,
      x: 71,
      y: 74,
      rotation: 0,
    },
  },
  'tray-copyright-text': {
    align: 'center',
    layout: {
      scale: 0.42,
      fontSizePt: 8,
      width: 88,
      x: 50,
      y: 96,
      rotation: 0,
    },
  },
  'tray-legal-text': {
    align: 'center',
    layout: {
      scale: 0.42,
      fontSizePt: 8,
      width: 88,
      x: 50,
      y: 96,
      rotation: 0,
    },
  },
}

export const CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_LIST_LAYOUTS: Record<
  string,
  CaseInsertDefaultTextLayoutConfig
> = {
  'tray-feature-bullets': {
    layout: {
      scale: 0.68,
      fontSizePt: 12,
      width: 36,
      x: 25,
      y: 34,
      rotation: 0,
    },
  },
}

export const CASE_INSERT_DEFAULT_IMPORTED_SPINE_TITLE_ARTWORK_LAYOUT =
  { scale: 0.78, x: 50, y: 58, rotation: 90 } satisfies ProjectCaseInsertLayout
