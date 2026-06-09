import { DISC_TEXT_KEYS } from '../discText/constants.ts'
import {
  getDiscTextContent,
  getDiscTextLabel,
} from '../discText/index.ts'
import type {
  DiscTextLayout,
  DiscTextLayoutSettings,
  DiscTextSettings,
  DiscTextValues,
} from '../discText/types'
import {
  canClampRectToTemplateSafeAnnulus,
  canClampShapeToTemplateSafeAnnulus,
  getImageContentShapeFootprintPercent,
  getLogoAssetBoundsPercent,
  getRatingBadgeBoundsPercent,
  type LayoutPoint,
  type RenderBoundsPercent,
  type RenderShapeFootprintPercent,
} from '../disc/geometry.ts'
import {
  getRatingBadgePlaceholderImageSize,
} from '../assets/assetManifest.ts'
import {
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
  type TextMeasureFunction,
} from '../discText/renderLayout.ts'
import { measureDiscTextWithBrowserCanvas } from '../discText/svgLayer.ts'
import {
  createMediaMarkRenderModel,
} from '../render/mediaMarkRenderModel.ts'
import {
  createPlatformMarkRenderModels,
} from '../render/platformMarkRenderModel.ts'
import {
  createTechnicalMarkRenderModels,
} from '../render/technicalMarkRenderModel.ts'
import { shouldRenderSupplementalUskRatingBadge } from '../project/projectRatingBadge.ts'
import type {
  BackgroundImageSize,
  LogoAssetLayout,
  ProjectMetadata,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTechnicalMarks,
} from '../project/projectTypes.ts'
import type { DiscTemplate } from '../types/template.ts'

type MovableElementGeometry = {
  label: string
  point: LayoutPoint
  bounds: RenderBoundsPercent
  shapeFootprint?: RenderShapeFootprintPercent | null
}

export type DiscTemplateGeometryGuardrailState = {
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextTitle: string
  discTextLayout: DiscTextLayoutSettings
  projectLogoAssets: ProjectLogoAssets
  projectMetadata: ProjectMetadata
  projectRatingBadge: ProjectRatingBadge
  projectMediaMark: ProjectMediaMark
  projectPlatformMarks: ProjectPlatformMarks
  projectTechnicalMarks: ProjectTechnicalMarks
}

export type DiscTemplateGeometryGuardrailResult = {
  allowed: boolean
  blockingElementLabels: string[]
}

function createElementGeometry(
  label: string,
  point: LayoutPoint,
  bounds: RenderBoundsPercent,
  shapeFootprint?: RenderShapeFootprintPercent | null,
): MovableElementGeometry {
  return { label, point, bounds, shapeFootprint }
}

function createImageElementGeometry(
  label: string,
  point: LayoutPoint,
  bounds: RenderBoundsPercent,
  imageSize: BackgroundImageSize | null | undefined,
): MovableElementGeometry {
  return createElementGeometry(
    label,
    point,
    bounds,
    getImageContentShapeFootprintPercent(imageSize ?? null, bounds),
  )
}

function maybeCreateLogoGeometry(
  label: string,
  layout: LogoAssetLayout,
  imageSize: ProjectLogoAssets['developerLogoSize'],
): MovableElementGeometry | null {
  if (!layout.enabled) {
    return null
  }

  const bounds = getLogoAssetBoundsPercent(imageSize, layout.scale)

  return createImageElementGeometry(label, layout, bounds, imageSize)
}

function maybeCreateStraightTextGeometry(
  key: keyof DiscTextLayoutSettings,
  text: string,
  layout: DiscTextLayout,
  measureText: TextMeasureFunction,
): MovableElementGeometry | null {
  const trimmedText = text.trim()

  if (!trimmedText || layout.mode !== 'straight') {
    return null
  }

  const renderLayout = getStraightDiscTextRenderLayout(
    key,
    trimmedText,
    layout,
    measureText,
  )
  const visualBounds = getStraightDiscTextVisualBounds(renderLayout, measureText)

  if (visualBounds.halfWidth <= 0 && visualBounds.halfHeight <= 0) {
    return null
  }

  return createElementGeometry(
    getDiscTextLabel(key),
    { x: visualBounds.centerX, y: visualBounds.centerY },
    {
      halfWidth: visualBounds.halfWidth,
      halfHeight: visualBounds.halfHeight,
    },
  )
}

export function getMovableDiscElementGeometry(
  state: DiscTemplateGeometryGuardrailState,
  measureText: TextMeasureFunction = measureDiscTextWithBrowserCanvas,
): MovableElementGeometry[] {
  const elements: MovableElementGeometry[] = []

  for (const key of DISC_TEXT_KEYS) {
    if (!state.discTextSettings[key]) {
      continue
    }

    const textGeometry = maybeCreateStraightTextGeometry(
      key,
      getDiscTextContent(key, state.discTextValues, state.discTextTitle),
      state.discTextLayout[key],
      measureText,
    )

    if (textGeometry) {
      elements.push(textGeometry)
    }
  }

  const developerLogo = maybeCreateLogoGeometry(
    'developer logo',
    state.projectLogoAssets.developerLogoLayout,
    state.projectLogoAssets.developerLogoSize,
  )
  const publisherLogo = maybeCreateLogoGeometry(
    'publisher logo',
    state.projectLogoAssets.publisherLogoLayout,
    state.projectLogoAssets.publisherLogoSize,
  )

  if (developerLogo) {
    elements.push(developerLogo)
  }

  if (publisherLogo) {
    elements.push(publisherLogo)
  }

  if (state.projectRatingBadge.layout.enabled) {
    const layout = state.projectRatingBadge.layout
    const imageSize =
      state.projectRatingBadge.source === 'custom' &&
      state.projectRatingBadge.customImageSize
        ? state.projectRatingBadge.customImageSize
        : getRatingBadgePlaceholderImageSize(state.projectMetadata)
    const bounds = getRatingBadgeBoundsPercent(imageSize, layout.scale)

    elements.push(createImageElementGeometry('rating badge', layout, bounds, imageSize))
  }

  if (shouldRenderSupplementalUskRatingBadge(state.projectMetadata, state.projectRatingBadge)) {
    const layout = state.projectRatingBadge.uskBadge.layout
    const imageSize = getRatingBadgePlaceholderImageSize({
      ratingSystem: 'USK',
      ratingValue: state.projectRatingBadge.uskBadge.ratingValue,
    })
    const bounds = getRatingBadgeBoundsPercent(imageSize, layout.scale)

    elements.push(
      createImageElementGeometry(
        'additional USK rating badge',
        layout,
        bounds,
        imageSize,
      ),
    )
  }

  const mediaMark = createMediaMarkRenderModel(state.projectMediaMark)

  if (mediaMark) {
    elements.push(
      createImageElementGeometry(
        mediaMark.label,
        mediaMark.layout,
        mediaMark.scaledBounds,
        mediaMark.imageSize,
      ),
    )
  }

  for (const platformMark of createPlatformMarkRenderModels(state.projectPlatformMarks)) {
    elements.push(
      createImageElementGeometry(
        `${platformMark.label} operating system mark`,
        platformMark.layout,
        platformMark.scaledBounds,
        platformMark.imageSize,
      ),
    )
  }

  for (const technicalMark of createTechnicalMarkRenderModels(state.projectTechnicalMarks)) {
    elements.push(
      createImageElementGeometry(
        `${technicalMark.label} technical mark`,
        technicalMark.layout,
        technicalMark.scaledBounds,
        technicalMark.imageSize,
      ),
    )
  }

  return elements
}

export function validateDiscTemplateGeometryGuardrail(
  template: DiscTemplate,
  state: DiscTemplateGeometryGuardrailState,
  measureText: TextMeasureFunction = measureDiscTextWithBrowserCanvas,
): DiscTemplateGeometryGuardrailResult {
  const blockingElementLabels = getMovableDiscElementGeometry(
    state,
    measureText,
  )
    .filter(
      (element) =>
        element.shapeFootprint?.loops.length
          ? !canClampShapeToTemplateSafeAnnulus(
              element.point,
              template,
              element.shapeFootprint,
            )
          : !canClampRectToTemplateSafeAnnulus(
              element.point,
              template,
              element.bounds,
            ),
    )
    .map((element) => element.label)

  return {
    allowed: blockingElementLabels.length === 0,
    blockingElementLabels,
  }
}
