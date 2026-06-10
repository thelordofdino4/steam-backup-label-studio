import type {
  CaseInsertPreviewGuideLayout,
  CaseInsertPreviewLayout,
} from './caseInsertPreviewLayout.ts'
import {
  getJewelCaseSteamBannerOpenArtworkRegion,
} from './jewelCaseSteamBannerLayout.ts'
import type {
  JewelCasePixelRect,
  JewelCaseSpineSideId,
} from './jewelCaseLayout.ts'
import type {
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'

function getAdjustedSpineSafeBounds(
  caseInsert: ProjectJewelCaseState,
  side: JewelCaseSpineSideId,
  layout: CaseInsertPreviewLayout,
): JewelCasePixelRect | null {
  return getJewelCaseSteamBannerOpenArtworkRegion(
    caseInsert.spine[side].steamBanner,
    { kind: 'spine', side },
    layout,
  )
}

function adjustGuideBounds(
  guide: CaseInsertPreviewGuideLayout,
  bounds: JewelCasePixelRect | null,
): CaseInsertPreviewGuideLayout {
  return bounds ? { ...guide, bounds } : guide
}

export function createCaseInsertGuideLayout(
  layout: CaseInsertPreviewLayout,
  caseInsert: ProjectJewelCaseState,
): CaseInsertPreviewLayout {
  if (!layout.surfaces.some(({ surfaceId }) => surfaceId === 'back')) {
    return layout
  }

  const guides = layout.guides.flatMap((guide) => {
    if (guide.guideId === 'backSafeBounds') {
      return []
    }

    if (guide.guideId === 'leftSpineSafeBounds') {
      return [adjustGuideBounds(
        guide,
        getAdjustedSpineSafeBounds(caseInsert, 'left', layout),
      )]
    }

    if (guide.guideId === 'rightSpineSafeBounds') {
      return [adjustGuideBounds(
        guide,
        getAdjustedSpineSafeBounds(caseInsert, 'right', layout),
      )]
    }

    return [guide]
  })

  return {
    ...layout,
    guides,
  }
}
