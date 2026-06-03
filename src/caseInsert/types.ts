import type { SupportedCaseInsertTemplateType } from '../editor/editorTypes.ts'
import type {
  BackgroundImageSize,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertSurfaceState,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectImageAssetProvenance,
  ProjectJewelCaseSpineState,
  ProjectJewelCaseState,
  ProjectMetadata,
} from '../project/projectTypes.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'
import type {
  JewelCaseGuideId,
  JewelCaseSurfaceId,
} from '../templates/caseInsertTemplates.ts'
import type { RectangularPrintTemplate } from '../types/template.ts'

export type ProjectCaseInsertLayoutInput = Partial<ProjectCaseInsertLayout>

export type ProjectCaseInsertImageSlotInput =
  Partial<Omit<ProjectCaseInsertImageSlot, 'imageSource' | 'layout'>> & {
    imageSource?: Partial<ProjectImageAssetProvenance> | null
    layout?: ProjectCaseInsertLayoutInput
  }

export type ProjectCaseInsertTextBlockInput =
  Partial<Omit<ProjectCaseInsertTextBlock, 'layout'>> & {
    layout?: ProjectCaseInsertLayoutInput
  }

export type ProjectCaseInsertTextListInput =
  Partial<Omit<ProjectCaseInsertTextList, 'layout'>> & {
    layout?: ProjectCaseInsertLayoutInput
  }

export type ProjectCaseInsertSurfaceStateInput =
  Partial<
    Omit<
      ProjectCaseInsertSurfaceState,
      | 'background'
      | 'titleArtwork'
      | 'artworkSlots'
      | 'logoSlots'
      | 'markSlots'
      | 'textBlocks'
    >
  > & {
    background?: ProjectCaseInsertImageSlotInput
    titleArtwork?: ProjectCaseInsertImageSlotInput
    artworkSlots?: ProjectCaseInsertImageSlotInput[]
    artwork?: ProjectCaseInsertImageSlotInput[]
    logoSlots?: ProjectCaseInsertImageSlotInput[]
    logos?: ProjectCaseInsertImageSlotInput[]
    markSlots?: ProjectCaseInsertImageSlotInput[]
    marks?: ProjectCaseInsertImageSlotInput[]
    textBlocks?: ProjectCaseInsertTextBlockInput[]
    text?: ProjectCaseInsertTextBlockInput[]
  }

export type ProjectJewelCaseFrontStateInput =
  ProjectCaseInsertSurfaceStateInput & {
    calloutArtwork?: ProjectCaseInsertImageSlotInput
    calloutText?: ProjectCaseInsertTextBlockInput
    callout?: ProjectCaseInsertTextBlockInput
  }

export type ProjectJewelCaseBackStateInput =
  ProjectCaseInsertSurfaceStateInput & {
    screenshotSlots?: ProjectCaseInsertImageSlotInput[]
    screenshots?: ProjectCaseInsertImageSlotInput[]
    description?: ProjectCaseInsertTextBlockInput
    featureBullets?: ProjectCaseInsertTextListInput
    features?: ProjectCaseInsertTextListInput
    minimumRequirements?: ProjectCaseInsertTextBlockInput
    minimumSystemRequirements?: ProjectCaseInsertTextBlockInput
    recommendedRequirements?: ProjectCaseInsertTextBlockInput
    recommendedSystemRequirements?: ProjectCaseInsertTextBlockInput
    legalText?: ProjectCaseInsertTextBlockInput
    legal?: ProjectCaseInsertTextBlockInput
  }

export type ProjectJewelCaseSpineSideStateInput = {
  background?: ProjectCaseInsertImageSlotInput
  title?: ProjectCaseInsertTextBlockInput
  titleText?: ProjectCaseInsertTextBlockInput
  steamBackupBranding?: ProjectCaseInsertImageSlotInput
  steamBackupLogo?: ProjectCaseInsertImageSlotInput
  logo?: ProjectCaseInsertImageSlotInput
}

export type ProjectJewelCaseSpineStateInput = {
  left?: ProjectJewelCaseSpineSideStateInput
  right?: ProjectJewelCaseSpineSideStateInput
}

export type ProjectJewelCaseExportSettingsInput = {
  surfaces?: JewelCaseSurfaceId[]
  guideIds?: JewelCaseGuideId[]
  guides?: JewelCaseGuideId[] | Partial<Record<JewelCaseGuideId, boolean>>
}

export type ProjectJewelCaseStateInput = {
  templateType?: SupportedCaseInsertTemplateType
  front?: ProjectJewelCaseFrontStateInput
  back?: ProjectJewelCaseBackStateInput
  spine?: ProjectJewelCaseSpineStateInput
  export?: ProjectJewelCaseExportSettingsInput
}

export type CreateCaseInsertProjectSnapshotParams = {
  manualGameTitle?: string
  selectedSteamGame?: SteamImportedGame | null
  projectMetadata?: Partial<ProjectMetadata>
  caseInsert?: ProjectJewelCaseStateInput
  savedAt?: string
}

export type RestoredCaseInsertTemplateState = {
  selectedCaseInsertTemplateId: SupportedCaseInsertTemplateType
  selectedCaseInsertTemplate: RectangularPrintTemplate
}

export type RestoredCaseInsertProjectState = {
  manualGameTitle: string
  projectMetadata: ProjectMetadata
  selectedSteamGame: SteamImportedGame | null
  template: RestoredCaseInsertTemplateState
  caseInsert: ProjectJewelCaseState
}

export type CaseInsertImageSlotImageInput = {
  imageDataUrl: string
  imageSize: BackgroundImageSize
  imageSource?: Partial<ProjectImageAssetProvenance> | null
}

export type CaseInsertLayoutField = keyof ProjectCaseInsertLayout

export type CaseInsertLayoutPoint = {
  x: number
  y: number
}

export type JewelCaseSpineSide = keyof ProjectJewelCaseSpineState
