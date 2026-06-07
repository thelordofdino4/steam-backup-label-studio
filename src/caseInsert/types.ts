import type { SupportedCaseInsertTemplateType } from '../editor/editorTypes.ts'
import type {
  BackgroundImageSize,
  AdditionalArtworkFrame,
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
import type { CaseInsertTemplatePaneId } from './templateSurfaces.ts'

export type ProjectCaseInsertLayoutInput = Partial<ProjectCaseInsertLayout>

export type ProjectCaseInsertImageSlotInput =
  Partial<Omit<ProjectCaseInsertImageSlot, 'imageSource' | 'layout' | 'frame'>> & {
    imageSource?: Partial<ProjectImageAssetProvenance> | null
    layout?: ProjectCaseInsertLayoutInput
    frame?: Partial<AdditionalArtworkFrame>
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
      | 'textLists'
    >
  > & {
    background?: ProjectCaseInsertImageSlotInput
    titleArtwork?: ProjectCaseInsertImageSlotInput
    artworkSlots?: ProjectCaseInsertImageSlotInput[]
    artwork?: ProjectCaseInsertImageSlotInput[]
    additionalArtworkEnabled?: boolean
    artworkEnabled?: boolean
    logoSlots?: ProjectCaseInsertImageSlotInput[]
    logos?: ProjectCaseInsertImageSlotInput[]
    markSlots?: ProjectCaseInsertImageSlotInput[]
    marks?: ProjectCaseInsertImageSlotInput[]
    textBlocks?: ProjectCaseInsertTextBlockInput[]
    text?: ProjectCaseInsertTextBlockInput[]
    textLists?: ProjectCaseInsertTextListInput[]
    lists?: ProjectCaseInsertTextListInput[]
  }

export type ProjectJewelCaseSpineSideStateInput = {
  background?: ProjectCaseInsertImageSlotInput
  titleArtwork?: ProjectCaseInsertImageSlotInput
  additionalArtworkEnabled?: boolean
  artworkEnabled?: boolean
  artworkSlots?: ProjectCaseInsertImageSlotInput[]
  artwork?: ProjectCaseInsertImageSlotInput[]
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
  templates?: Partial<Record<CaseInsertTemplatePaneId, ProjectCaseInsertSurfaceStateInput>>
  front?: ProjectCaseInsertSurfaceStateInput
  back?: ProjectCaseInsertSurfaceStateInput
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
