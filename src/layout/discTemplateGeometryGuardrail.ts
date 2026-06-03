import {
  DISC_TEXT_KEYS,
  getDiscTextContent,
  getDiscTextLabel,
  type DiscTextLayout,
  type DiscTextLayoutSettings,
  type DiscTextSettings,
  type DiscTextValues,
} from '../discText/index.ts'
import {
  canClampRectToTemplateSafeAnnulus,
  getLogoAssetBoundsPercent,
  getMediaMarkBoundsPercent,
  getMediaMarkPlaceholderBoundsPercent,
  getPlatformMarkBoundsPercent,
  getPlatformMarkPlaceholderBoundsPercent,
  getRatingBadgeBoundsPercent,
  getRatingBadgePlaceholderBoundsPercent,
  type LayoutPoint,
  type RenderBoundsPercent,
} from '../disc/geometry.ts'
import {
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
  type TextMeasureFunction,
} from '../discText/renderLayout.ts'
import { measureDiscTextWithBrowserCanvas } from '../discText/svgLayer.ts'
import {
  getPlatformMarkLabel,
  getProjectPlatformMarkAsset,
} from '../project/projectMediaMark.ts'
import { shouldRenderSupplementalUskRatingBadge } from '../project/projectRatingBadge.ts'
import type {
  LogoAssetLayout,
  ProjectMetadata,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectPlatformMarks,
  ProjectRatingBadge,
} from '../project/projectTypes.ts'
import type { DiscTemplate } from '../types/template.ts'

type MovableElementGeometry = {
  label: string
  point: LayoutPoint
  bounds: RenderBoundsPercent
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
}

export type DiscTemplateGeometryGuardrailResult = {
  allowed: boolean
  blockingElementLabels: string[]
}

function createElementGeometry(
  label: string,
  point: LayoutPoint,
  bounds: RenderBoundsPercent,
): MovableElementGeometry {
  return { label, point, bounds }
}

function maybeCreateLogoGeometry(
  label: string,
  layout: LogoAssetLayout,
  imageSize: ProjectLogoAssets['developerLogoSize'],
): MovableElementGeometry | null {
  if (!layout.enabled) {
    return null
  }

  return createElementGeometry(
    label,
    layout,
    getLogoAssetBoundsPercent(imageSize, layout.scale),
  )
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
    const bounds =
      state.projectRatingBadge.source === 'custom' &&
      state.projectRatingBadge.customImageSize
        ? getRatingBadgeBoundsPercent(
            state.projectRatingBadge.customImageSize,
            layout.scale,
          )
        : getRatingBadgePlaceholderBoundsPercent(layout.scale)

    elements.push(createElementGeometry('rating badge', layout, bounds))
  }

  if (shouldRenderSupplementalUskRatingBadge(state.projectMetadata, state.projectRatingBadge)) {
    const layout = state.projectRatingBadge.uskBadge.layout

    elements.push(
      createElementGeometry(
        'additional USK rating badge',
        layout,
        getRatingBadgePlaceholderBoundsPercent(layout.scale),
      ),
    )
  }

  if (state.projectMediaMark.layout.enabled) {
    const layout = state.projectMediaMark.layout
    const bounds =
      state.projectMediaMark.source === 'custom' &&
      state.projectMediaMark.customImageSize
        ? getMediaMarkBoundsPercent(
            state.projectMediaMark.customImageSize,
            layout.scale,
          )
        : getMediaMarkPlaceholderBoundsPercent(layout.scale)

    elements.push(createElementGeometry('media mark', layout, bounds))
  }

  for (const value of state.projectPlatformMarks.values) {
    const asset = getProjectPlatformMarkAsset(state.projectPlatformMarks, value)

    if (!asset.layout.enabled) {
      continue
    }

    const bounds =
      asset.source === 'custom' && asset.customImageSize
        ? getPlatformMarkBoundsPercent(asset.customImageSize, asset.layout.scale)
        : getPlatformMarkPlaceholderBoundsPercent(asset.layout.scale)

    elements.push(
      createElementGeometry(
        `${getPlatformMarkLabel(value)} operating system mark`,
        asset.layout,
        bounds,
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
        !canClampRectToTemplateSafeAnnulus(
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
