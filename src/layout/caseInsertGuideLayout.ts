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
  ProjectJewelCaseSpineState,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'

function getAdjustedSpineSafeBounds(
  spine: ProjectJewelCaseSpineState,
  side: JewelCaseSpineSideId,
  layout: CaseInsertPreviewLayout,
): JewelCasePixelRect | null {
  return getJewelCaseSteamBannerOpenArtworkRegion(
    spine[side].steamBanner,
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

export function createCaseInsertSpineGuideLayout(
  layout: CaseInsertPreviewLayout,
  spine: ProjectJewelCaseSpineState,
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
        getAdjustedSpineSafeBounds(spine, 'left', layout),
      )]
    }

    if (guide.guideId === 'rightSpineSafeBounds') {
      return [adjustGuideBounds(
        guide,
        getAdjustedSpineSafeBounds(spine, 'right', layout),
      )]
    }

    return [guide]
  })

  return {
    ...layout,
    guides,
  }
}

export function createCaseInsertGuideLayout(
  layout: CaseInsertPreviewLayout,
  caseInsert: ProjectJewelCaseState,
): CaseInsertPreviewLayout {
  return createCaseInsertSpineGuideLayout(layout, caseInsert.spine)
}
