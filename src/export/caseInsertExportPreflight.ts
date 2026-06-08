import {
  createCaseInsertPngExportLayout,
} from '../caseInsert/exportLayout.ts'
import {
  getCaseInsertMarkLayerKind,
  type CaseInsertBrandingSourceCatalog,
} from '../caseInsert/brandingSlotSources.ts'
import {
  isCaseInsertMarkSlotVisible,
} from '../caseInsert/brandingVisibility.ts'
import {
  getCaseInsertLogoSlotRenderInfo,
} from '../caseInsert/brandingLogoSlots.ts'
import {
  getCaseInsertBackTextBlockReadabilityRole,
  getCaseInsertBackTextBlockRole,
  getCaseInsertTextReadabilityWarnings,
  type CaseInsertTextLayout,
  type CaseInsertTextReadabilityRole,
} from '../caseInsert/textReadability.ts'
import {
  getCaseInsertTemplatePaneConfig,
  type CaseInsertTemplatePaneId,
} from '../caseInsert/templateSurfaces.ts'
import {
  getJewelCaseBackBackgroundFit,
  getJewelCaseBackImageSlotPreviewRect,
  getJewelCaseBackTextBlockPreviewLayout,
  getJewelCaseBackTextListPreviewLayout,
} from '../layout/jewelCaseBackLayout.ts'
import {
  getJewelCaseFrontBackgroundFit,
  getJewelCaseFrontImageSlotPreviewRect,
  getJewelCaseFrontTextBlockPreviewLayout,
} from '../layout/jewelCaseFrontLayout.ts'
import {
  getJewelCaseSpineBackgroundFit,
  getJewelCaseSpineImageSlotPreviewLayout,
  getJewelCaseSpineTitlePreviewLayout,
} from '../layout/jewelCaseSpineLayout.ts'
import type {
  CaseInsertPreviewLayout,
} from '../layout/caseInsertPreviewLayout.ts'
import type {
  JewelCaseImageFitResult,
  JewelCasePixelRect,
  JewelCaseSpineSideId,
} from '../layout/jewelCaseLayout.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertSteamBanner,
  ProjectCaseInsertSurfaceState,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import {
  getCaseInsertTemplate,
  type JewelCaseGuideId,
  type JewelCaseRegionId,
} from '../templates/caseInsertTemplates.ts'
import { DEFAULT_TEMPLATE_EXPORT_DPI } from '../templates/templateModel.ts'

type EdgeWarningOptions = {
  regionLabel: string
}

export type CaseInsertExportPreflightSummary = {
  message: string
  hasWarnings: boolean
  warnings: string[]
}

const TEMPLATE_SAFE_REGION_BY_PANE: Record<CaseInsertTemplatePaneId, JewelCaseRegionId> = {
  cover: 'frontSafe',
  tray: 'backPanelSafe',
}

const IMAGE_UPSCALE_WARNING_THRESHOLD = 1.05
const SAFE_EDGE_WARNING_MIN_PX = 8
const SAFE_EDGE_WARNING_RATIO = 0.015

export function buildCaseInsertExportPreflightSummary(params: {
  caseInsert: ProjectJewelCaseState
  activeTemplatePane: CaseInsertTemplatePaneId
  brandingSources: CaseInsertBrandingSourceCatalog
  dpi?: number
}): CaseInsertExportPreflightSummary {
  const dpi = params.dpi ?? DEFAULT_TEMPLATE_EXPORT_DPI
  const paneConfig = getCaseInsertTemplatePaneConfig(params.activeTemplatePane)
  const template = getCaseInsertTemplate(params.caseInsert.templateType)
  const layout = createCaseInsertPngExportLayout(
    params.caseInsert,
    params.activeTemplatePane,
    { dpi },
  )
  const surface = template.surfaces?.find(({ id }) => id === paneConfig.surfaceId)
  const templateState = params.caseInsert.templates[params.activeTemplatePane]
  const enabledGuideNames = getEnabledGuideNames(
    layout,
    params.caseInsert.export.guideIds,
  )
  const warnings = buildCaseInsertExportWarnings({
    caseInsert: params.caseInsert,
    activeTemplatePane: params.activeTemplatePane,
    brandingSources: params.brandingSources,
    layout,
    enabledGuideNames,
  })

  const summaryLines = [
    `Template: ${paneConfig.label}`,
    `Physical size: ${surface
      ? `${formatMm(surface.widthMm)} x ${formatMm(surface.heightMm)} mm`
      : 'Unknown'}`,
    `PNG output: ${layout.width} x ${layout.height} px at ${dpi} DPI`,
    `Spine regions: ${paneConfig.hasSpine ? 'Included' : 'Not applicable'}`,
    `Guide marks: ${enabledGuideNames.length ? enabledGuideNames.join(', ') : 'None'}`,
    `Background image: ${formatImageSlotStatus(templateState.background)}`,
    `Visible elements: ${formatVisibleElementStatus(
      templateState,
      paneConfig.hasSpine ? params.caseInsert.spine : null,
      params.brandingSources,
    )}`,
  ]

  const message = [
    'Review this case insert export before writing the PNG.',
    '',
    ...summaryLines,
    ...(warnings.length ? ['', 'Warnings:', ...warnings.map((warning) => `- ${warning}`)] : []),
    '',
    'Continue with export?',
  ].join('\n')

  return {
    message,
    hasWarnings: warnings.length > 0,
    warnings,
  }
}

function buildCaseInsertExportWarnings(params: {
  caseInsert: ProjectJewelCaseState
  activeTemplatePane: CaseInsertTemplatePaneId
  brandingSources: CaseInsertBrandingSourceCatalog
  layout: CaseInsertPreviewLayout
  enabledGuideNames: string[]
}) {
  const warnings: string[] = []
  const paneConfig = getCaseInsertTemplatePaneConfig(params.activeTemplatePane)
  const templateState = params.caseInsert.templates[params.activeTemplatePane]

  if (params.enabledGuideNames.length > 0) {
    warnings.push('Guide marks are enabled and will appear in the exported PNG.')
  }

  warnings.push(
    ...getTemplateSurfaceWarnings(
      paneConfig.label,
      params.activeTemplatePane,
      templateState,
      params.layout,
      params.brandingSources,
    ),
  )

  if (paneConfig.hasSpine) {
    warnings.push(
      ...getSpineWarnings(
        params.caseInsert,
        params.layout,
        params.brandingSources,
        slotWillRender(templateState.background),
      ),
    )
  }

  return warnings
}

function getTemplateSurfaceWarnings(
  paneLabel: string,
  paneId: CaseInsertTemplatePaneId,
  templateState: ProjectCaseInsertSurfaceState,
  layout: CaseInsertPreviewLayout,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  const warnings: string[] = []
  const backgroundFit = paneId === 'cover'
    ? getJewelCaseFrontBackgroundFit(templateState.background, layout)
    : getJewelCaseBackBackgroundFit(templateState.background, layout)

  if (!slotWillRender(templateState.background)) {
    warnings.push(
      `${paneLabel} has no background image; uncovered areas will export as blank white.`,
    )
  }

  if (!surfaceHasVisibleContent(templateState, brandingSources)) {
    warnings.push(
      `${paneLabel} has no visible artwork, logos, marks, or text; this export may be blank white.`,
    )
  }

  warnings.push(
    ...getImageFitWarnings(
      `${paneLabel} background`,
      templateState.background,
      backgroundFit,
      { allowEmptySpaceWarning: true, warnMissingImage: false },
    ),
  )

  if (paneId === 'cover') {
    warnings.push(...getCoverSlotWarnings(templateState, layout, brandingSources))
    warnings.push(...getCoverTextWarnings(templateState, layout))
  } else {
    warnings.push(...getTraySlotWarnings(templateState, layout, brandingSources))
    warnings.push(...getTrayTextWarnings(templateState, layout))
  }

  return warnings
}

function getCoverSlotWarnings(
  templateState: ProjectCaseInsertSurfaceState,
  layout: CaseInsertPreviewLayout,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  const warnings: string[] = []
  const safeBounds = getRegionBounds(layout, TEMPLATE_SAFE_REGION_BY_PANE.cover)

  warnings.push(
    ...getRenderedImageSlotWarnings({
      slot: templateState.titleArtwork,
      label: 'Title/logo artwork',
      rect: getJewelCaseFrontImageSlotPreviewRect(
        templateState.titleArtwork,
        layout,
        'titleArtwork',
      ),
      safeBounds,
      edge: { regionLabel: 'cover safe zone' },
    }),
  )

  if (templateState.additionalArtworkEnabled) {
    for (const slot of templateState.artworkSlots) {
      warnings.push(
        ...getRenderedImageSlotWarnings({
          slot,
          label: slot.label,
          rect: getJewelCaseFrontImageSlotPreviewRect(
            slot,
            layout,
            'calloutArtwork',
          ),
          safeBounds,
          edge: { regionLabel: 'cover safe zone' },
        }),
      )
    }
  }

  for (const slot of templateState.logoSlots) {
    warnings.push(
      ...getRenderedLogoSlotWarnings({
        slot,
        label: slot.label,
        rect: getJewelCaseFrontImageSlotPreviewRect(slot, layout, 'logo'),
        safeBounds,
        edge: { regionLabel: 'cover safe zone' },
      }),
    )
  }

  for (const slot of getVisibleMarkSlots(templateState, brandingSources)) {
    warnings.push(
      ...getRenderedImageSlotWarnings({
        slot,
        label: slot.label,
        rect: getJewelCaseFrontImageSlotPreviewRect(slot, layout, 'mark'),
        safeBounds,
        edge: { regionLabel: 'cover safe zone' },
      }),
    )
  }

  return warnings
}

function getTraySlotWarnings(
  templateState: ProjectCaseInsertSurfaceState,
  layout: CaseInsertPreviewLayout,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  const warnings: string[] = []
  const safeBounds = getRegionBounds(layout, TEMPLATE_SAFE_REGION_BY_PANE.tray)

  warnings.push(
    ...getRenderedImageSlotWarnings({
      slot: templateState.titleArtwork,
      label: 'Game logo',
      rect: getJewelCaseBackImageSlotPreviewRect(
        templateState.titleArtwork,
        layout,
        'logo',
      ),
      safeBounds,
      edge: { regionLabel: 'back panel safe zone' },
    }),
  )

  const artworkSlots = templateState.additionalArtworkEnabled
    ? templateState.artworkSlots
    : []

  for (const slot of artworkSlots) {
    warnings.push(
      ...getRenderedImageSlotWarnings({
        slot,
        label: slot.label,
        rect: getJewelCaseBackImageSlotPreviewRect(
          slot,
          layout,
          'artwork',
        ),
        safeBounds,
        edge: { regionLabel: 'back panel safe zone' },
      }),
    )
  }

  for (const slot of templateState.logoSlots) {
    warnings.push(
      ...getRenderedLogoSlotWarnings({
        slot,
        label: slot.label,
        rect: getJewelCaseBackImageSlotPreviewRect(slot, layout, 'logo'),
        safeBounds,
        edge: { regionLabel: 'back panel safe zone' },
      }),
    )
  }

  for (const slot of getVisibleMarkSlots(templateState, brandingSources)) {
    warnings.push(
      ...getRenderedImageSlotWarnings({
        slot,
        label: slot.label,
        rect: getJewelCaseBackImageSlotPreviewRect(slot, layout, 'mark'),
        safeBounds,
        edge: { regionLabel: 'back panel safe zone' },
      }),
    )
  }

  return warnings
}

function getCoverTextWarnings(
  templateState: ProjectCaseInsertSurfaceState,
  layout: CaseInsertPreviewLayout,
) {
  return templateState.textBlocks.flatMap((textBlock) =>
    getTextBlockWarnings({
      textBlock,
      label: textBlock.label,
      textLayout: getJewelCaseFrontTextBlockPreviewLayout(textBlock, layout),
      safeBounds: getRegionBounds(layout, TEMPLATE_SAFE_REGION_BY_PANE.cover),
      readabilityRole: 'callout',
      edge: { regionLabel: 'cover safe zone' },
    }))
}

function getTrayTextWarnings(
  templateState: ProjectCaseInsertSurfaceState,
  layout: CaseInsertPreviewLayout,
) {
  const safeBounds = getRegionBounds(layout, TEMPLATE_SAFE_REGION_BY_PANE.tray)
  const textBlockWarnings = templateState.textBlocks.flatMap((textBlock) => {
    const role = getCaseInsertBackTextBlockRole(textBlock)

    return getTextBlockWarnings({
      textBlock,
      label: textBlock.label,
      textLayout: getJewelCaseBackTextBlockPreviewLayout(
        textBlock,
        layout,
        role,
      ),
      safeBounds,
      readabilityRole: getCaseInsertBackTextBlockReadabilityRole(role),
      edge: { regionLabel: 'back panel safe zone' },
    })
  })
  const textListWarnings = templateState.textLists.flatMap((textList) =>
    getTextListWarnings({
      textList,
      label: textList.label,
      textLayout: getJewelCaseBackTextListPreviewLayout(textList, layout),
      safeBounds,
      readabilityRole: 'features',
      edge: { regionLabel: 'back panel safe zone' },
    }))

  return [...textBlockWarnings, ...textListWarnings]
}

function getSpineWarnings(
  caseInsert: ProjectJewelCaseState,
  layout: CaseInsertPreviewLayout,
  brandingSources: CaseInsertBrandingSourceCatalog,
  trayBackgroundRenders: boolean,
) {
  return (['left', 'right'] as const).flatMap((side) =>
    getSpineSideWarnings(
      getSpineSideLabel(side),
      side,
      caseInsert.spine[side],
      layout,
      brandingSources,
      trayBackgroundRenders,
    ))
}

function getSpineSideWarnings(
  label: string,
  side: JewelCaseSpineSideId,
  spineSide: ProjectJewelCaseSpineSideState,
  layout: CaseInsertPreviewLayout,
  brandingSources: CaseInsertBrandingSourceCatalog,
  trayBackgroundRenders: boolean,
) {
  const warnings: string[] = []
  const backgroundFit = getJewelCaseSpineBackgroundFit(
    side,
    spineSide.background,
    layout,
  )
  const titleLayout = getJewelCaseSpineTitlePreviewLayout(
    side,
    spineSide.title,
    layout,
  )
  const titleArtworkLayout = getJewelCaseSpineImageSlotPreviewLayout(
    side,
    spineSide.titleArtwork,
    layout,
    'titleArtwork',
  )
  const artworkSlots = spineSide.additionalArtworkEnabled
    ? spineSide.artworkSlots
    : []
  const visibleMarkSlots = getVisibleSpineMarkSlots(
    spineSide,
    brandingSources,
  )

  if (
    !trayBackgroundRenders &&
    !slotWillRender(spineSide.background) &&
    !spineSideHasVisibleContent(spineSide, brandingSources)
  ) {
    warnings.push(`${label} has no visible spine content and may export blank white.`)
  }

  warnings.push(
    ...getImageFitWarnings(
      `${label} background`,
      spineSide.background,
      backgroundFit,
      { allowEmptySpaceWarning: true },
    ),
    ...getTextBlockWarnings({
      textBlock: spineSide.title,
      label: `${label} title`,
      textLayout: titleLayout
        ? {
            bounds: titleLayout.boundingRect,
            fontSizePx: titleLayout.fontSizePx,
            lineHeightPx: titleLayout.lineHeightPx,
          }
        : null,
      safeBounds: null,
      readabilityRole: 'spine',
    }),
    ...getSpineImageSlotWarnings({
      slot: spineSide.titleArtwork,
      label: `${label} game logo`,
      layout: titleArtworkLayout,
      hasTextFallback: false,
    }),
    ...artworkSlots.flatMap((slot) =>
      getSpineImageSlotWarnings({
        slot,
        label: `${label} ${slot.label}`,
        layout: getJewelCaseSpineImageSlotPreviewLayout(
          side,
          slot,
          layout,
          'artwork',
        ),
        hasTextFallback: false,
      })),
    ...spineSide.logoSlots.flatMap((slot) =>
      getSpineLogoSlotWarnings({
        slot,
        label: `${label} ${slot.label}`,
        layout: getJewelCaseSpineImageSlotPreviewLayout(
          side,
          slot,
          layout,
          'logo',
        ),
      })),
    ...visibleMarkSlots.flatMap((slot) =>
      getSpineImageSlotWarnings({
        slot,
        label: `${label} ${slot.label}`,
        layout: getJewelCaseSpineImageSlotPreviewLayout(
          side,
          slot,
          layout,
          'mark',
        ),
        hasTextFallback: false,
      })),
  )

  return warnings
}

function getRenderedLogoSlotWarnings(params: {
  slot: ProjectCaseInsertImageSlot
  label: string
  rect: JewelCasePixelRect | null
  safeBounds: JewelCasePixelRect | null
  edge?: EdgeWarningOptions
}) {
  const { slot, label, rect } = params
  const renderInfo = getCaseInsertLogoSlotRenderInfo(slot)
  const warnings = getLogoSlotDataWarnings(label, slot, renderInfo)

  warnings.push(...getLayoutValueWarnings(label, slot.layout))

  if (!slot.enabled || !renderInfo) {
    return warnings
  }

  if (!rect) {
    warnings.push(`${label} is enabled, but export could not resolve its print placement.`)
    return warnings
  }

  warnings.push(...getUpscaleWarnings(label, renderInfo.imageSize, rect))

  if (params.safeBounds && params.edge) {
    warnings.push(
      ...getSafeEdgeWarnings(label, rect, params.safeBounds, params.edge),
    )
  }

  return warnings
}

function getRenderedImageSlotWarnings(params: {
  slot: ProjectCaseInsertImageSlot
  label: string
  rect: JewelCasePixelRect | null
  safeBounds: JewelCasePixelRect | null
  edge?: EdgeWarningOptions
}) {
  const { slot, label, rect } = params
  const warnings = getImageSlotDataWarnings(label, slot)

  warnings.push(...getLayoutValueWarnings(label, slot.layout))

  if (!slot.enabled || !slot.imageDataUrl || !slot.imageSize) {
    return warnings
  }

  if (!rect) {
    warnings.push(`${label} is enabled, but export could not resolve its print placement.`)
    return warnings
  }

  warnings.push(...getUpscaleWarnings(label, slot.imageSize, rect))

  if (params.safeBounds && params.edge) {
    warnings.push(
      ...getSafeEdgeWarnings(label, rect, params.safeBounds, params.edge),
    )
  }

  return warnings
}

function getSpineLogoSlotWarnings(params: {
  slot: ProjectCaseInsertImageSlot
  label: string
  layout: { width: number; height: number } | null
}) {
  const renderInfo = getCaseInsertLogoSlotRenderInfo(params.slot)
  const warnings = getLogoSlotDataWarnings(
    params.label,
    params.slot,
    renderInfo,
  )

  warnings.push(...getLayoutValueWarnings(params.label, params.slot.layout))

  if (!params.slot.enabled || !renderInfo || !params.layout) {
    return warnings
  }

  warnings.push(
    ...getUpscaleWarnings(params.label, renderInfo.imageSize, {
      width: params.layout.width,
      height: params.layout.height,
    }),
  )

  return warnings
}

function getSpineImageSlotWarnings(params: {
  slot: ProjectCaseInsertImageSlot
  label: string
  layout: { width: number; height: number } | null
  hasTextFallback: boolean
}) {
  const warnings = getImageSlotDataWarnings(
    params.label,
    params.slot,
    params.hasTextFallback,
  )

  warnings.push(...getLayoutValueWarnings(params.label, params.slot.layout))

  if (
    !params.slot.enabled ||
    !params.slot.imageDataUrl ||
    !params.slot.imageSize ||
    !params.layout
  ) {
    return warnings
  }

  warnings.push(
    ...getUpscaleWarnings(params.label, params.slot.imageSize, {
      width: params.layout.width,
      height: params.layout.height,
    }),
  )

  return warnings
}

function getLogoSlotDataWarnings(
  label: string,
  slot: ProjectCaseInsertImageSlot,
  renderInfo: ReturnType<typeof getCaseInsertLogoSlotRenderInfo>,
) {
  if (!slot.enabled) {
    return []
  }

  if (!renderInfo) {
    return [`${label} is enabled, but no image is selected; it will not render.`]
  }

  if (renderInfo.isBundledFallback) {
    return [
      `${ensureLabelDescriptor(label, 'logo')} uses bundled generic logo artwork.`,
    ]
  }

  if (!slot.imageSize) {
    return [
      `${label} has image data but no size metadata; export may skip placement or resolution checks.`,
    ]
  }

  return getBundledAssetWarnings(label, slot)
}

function getImageSlotDataWarnings(
  label: string,
  slot: ProjectCaseInsertImageSlot,
  hasTextFallback = false,
  options: {
    warnMissingImage?: boolean
  } = {},
) {
  if (!slot.enabled) {
    return []
  }

  if (!slot.imageDataUrl) {
    if (options.warnMissingImage === false) {
      return []
    }

    return hasTextFallback
      ? [`${label} has no image selected; text fallback will export instead.`]
      : [`${label} is enabled, but no image is selected; it will not render.`]
  }

  if (!slot.imageSize) {
    return [
      `${label} has image data but no size metadata; export may skip placement or resolution checks.`,
    ]
  }

  return getBundledAssetWarnings(label, slot)
}

function getImageFitWarnings(
  label: string,
  slot: ProjectCaseInsertImageSlot,
  fit: JewelCaseImageFitResult | null,
  options: {
    allowEmptySpaceWarning?: boolean
    warnMissingImage?: boolean
  } = {},
) {
  const warnings = getImageSlotDataWarnings(
    label,
    slot,
    false,
    { warnMissingImage: options.warnMissingImage },
  )

  warnings.push(...getLayoutValueWarnings(label, slot.layout))

  if (!slot.enabled || !slot.imageDataUrl || !slot.imageSize) {
    return warnings
  }

  if (!fit) {
    warnings.push(`${label} is enabled, but export could not resolve its print fit.`)
    return warnings
  }

  if (fit.scale > IMAGE_UPSCALE_WARNING_THRESHOLD) {
    warnings.push(
      `${label} is ${slot.imageSize.width} x ${slot.imageSize.height}px, but exports around ${formatPixels(fit.visibleRect.width)} x ${formatPixels(fit.visibleRect.height)}px; it may look soft in print.`,
    )
  }

  if (options.allowEmptySpaceWarning && fit.hasEmptySpace) {
    warnings.push(
      `${label} does not cover its print region; blank paper will remain visible.`,
    )
  }

  return warnings
}

function getUpscaleWarnings(
  label: string,
  imageSize: { width: number; height: number },
  rect: Pick<JewelCasePixelRect, 'width' | 'height'>,
) {
  const scale = Math.max(rect.width / imageSize.width, rect.height / imageSize.height)

  if (scale <= IMAGE_UPSCALE_WARNING_THRESHOLD) {
    return []
  }

  return [
    `${label} is ${imageSize.width} x ${imageSize.height}px, but exports around ${formatPixels(rect.width)} x ${formatPixels(rect.height)}px; it may look soft in print.`,
  ]
}

function getBundledAssetWarnings(
  label: string,
  slot: ProjectCaseInsertImageSlot,
) {
  const source = slot.imageSource?.source

  if (source !== 'placeholder' && source !== 'built-in') {
    return []
  }

  const sourceId = slot.imageSource?.sourceId

  if (sourceId?.startsWith('case-logo:') || /\blogo\b/i.test(label)) {
    return [
      `${ensureLabelDescriptor(label, 'logo')} uses bundled generic logo artwork.`,
    ]
  }

  if (sourceId?.startsWith('case-rating:')) {
    return [
      `${ensureLabelDescriptor(label, 'rating badge')} uses bundled rating artwork.`,
    ]
  }

  const markKind = getCaseInsertMarkLayerKind(sourceId)

  if (markKind === 'media') {
    return [
      `${ensureLabelDescriptor(label, 'media mark')} uses bundled generic artwork.`,
    ]
  }

  if (markKind === 'platform') {
    return [
      `${ensureLabelDescriptor(label, 'operating-system mark')} uses bundled generic artwork.`,
    ]
  }

  if (markKind === 'technical') {
    return [
      `${ensureLabelDescriptor(label, 'technical mark')} uses bundled generic artwork.`,
    ]
  }

  return [`${label} uses bundled generic artwork.`]
}

function ensureLabelDescriptor(label: string, descriptor: string) {
  const descriptorPattern = new RegExp(`\\b${escapeRegExp(descriptor)}\\b`, 'i')

  return descriptorPattern.test(label) ? label : `${label} ${descriptor}`
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getTextBlockWarnings(params: {
  textBlock: ProjectCaseInsertTextBlock
  label: string
  textLayout: CaseInsertTextLayout | null
  safeBounds: JewelCasePixelRect | null
  readabilityRole: CaseInsertTextReadabilityRole
  edge?: EdgeWarningOptions
}) {
  const { textBlock, label } = params
  const warnings: string[] = []

  if (!textBlock.enabled) {
    return warnings
  }

  warnings.push(...getLayoutValueWarnings(label, textBlock.layout))

  if (!textBlock.value.trim()) {
    warnings.push(`${label} is enabled, but empty; it will not render.`)
    return warnings
  }

  if (!params.textLayout) {
    warnings.push(`${label} is enabled, but export could not resolve its text box.`)
    return warnings
  }

  warnings.push(
    ...getCaseInsertTextReadabilityWarnings({
      label,
      text: textBlock.value,
      layout: params.textLayout,
      role: params.readabilityRole,
    }),
  )

  if (params.safeBounds && params.edge) {
    warnings.push(
      ...getSafeEdgeWarnings(
        label,
        params.textLayout.bounds,
        params.safeBounds,
        params.edge,
      ),
    )
  }

  return warnings
}

function getTextListWarnings(params: {
  textList: ProjectCaseInsertTextList
  label: string
  textLayout: (CaseInsertTextLayout & { items: string[] }) | null
  safeBounds: JewelCasePixelRect | null
  readabilityRole: CaseInsertTextReadabilityRole
  edge?: EdgeWarningOptions
}) {
  const { textList, label } = params
  const warnings: string[] = []
  const items = textList.items.map((item) => item.trim()).filter(Boolean)

  if (!textList.enabled) {
    return warnings
  }

  warnings.push(...getLayoutValueWarnings(label, textList.layout))

  if (items.length === 0) {
    warnings.push(`${label} is enabled, but has no text items; it will not render.`)
    return warnings
  }

  if (!params.textLayout) {
    warnings.push(`${label} is enabled, but export could not resolve its text box.`)
    return warnings
  }

  warnings.push(
    ...getCaseInsertTextReadabilityWarnings({
      label,
      text: items.map((item) => `- ${item}`).join('\n'),
      layout: params.textLayout,
      role: params.readabilityRole,
    }),
  )

  if (params.safeBounds && params.edge) {
    warnings.push(
      ...getSafeEdgeWarnings(
        label,
        params.textLayout.bounds,
        params.safeBounds,
        params.edge,
      ),
    )
  }

  return warnings
}

function getLayoutValueWarnings(label: string, layout: ProjectCaseInsertLayout) {
  const warnings: string[] = []

  if (layout.x < 0 || layout.x > 100 || layout.y < 0 || layout.y > 100) {
    warnings.push(
      `${label} placement is outside the safe control range and will be clamped during export.`,
    )
  }

  if (!Number.isFinite(layout.scale) || layout.scale <= 0) {
    warnings.push(`${label} scale is invalid and will use a fallback size.`)
  }

  return warnings
}

function getSafeEdgeWarnings(
  label: string,
  rect: JewelCasePixelRect,
  safeBounds: JewelCasePixelRect,
  options: EdgeWarningOptions,
) {
  const threshold = Math.max(
    SAFE_EDGE_WARNING_MIN_PX,
    Math.min(safeBounds.width, safeBounds.height) * SAFE_EDGE_WARNING_RATIO,
  )
  const closeEdges = [
    safeBounds.x + threshold >= rect.x ? 'left' : '',
    safeBounds.y + threshold >= rect.y ? 'top' : '',
    safeBounds.x + safeBounds.width - threshold <= rect.x + rect.width
      ? 'right'
      : '',
    safeBounds.y + safeBounds.height - threshold <= rect.y + rect.height
      ? 'bottom'
      : '',
  ].filter(Boolean)

  if (closeEdges.length === 0) {
    return []
  }

  return [
    `${label} is very close to the ${closeEdges.join('/')} edge of the ${options.regionLabel}; inspect trim and fold clearance before printing.`,
  ]
}

function getRegionBounds(
  layout: CaseInsertPreviewLayout,
  regionId: JewelCaseRegionId,
) {
  return layout.regions.find((region) => region.regionId === regionId)?.bounds ?? null
}

function getEnabledGuideNames(
  layout: CaseInsertPreviewLayout,
  selectedGuideIds: readonly JewelCaseGuideId[],
) {
  const selectedGuideIdSet = new Set(selectedGuideIds)

  return layout.guides
    .filter((guide) => selectedGuideIdSet.has(guide.guideId))
    .map((guide) => guide.name)
}

function slotWillRender(slot: ProjectCaseInsertImageSlot) {
  return Boolean(slot.enabled && slot.imageDataUrl && slot.imageSize)
}

function logoSlotWillRender(slot: ProjectCaseInsertImageSlot) {
  return Boolean(getCaseInsertLogoSlotRenderInfo(slot))
}

function steamBannerWillRender(banner: ProjectCaseInsertSteamBanner) {
  return Boolean(
    banner.enabled &&
      (banner.useTextFallback || banner.lockupImageDataUrl),
  )
}

function getVisibleMarkSlots(
  surface: ProjectCaseInsertSurfaceState,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  return surface.markSlots.filter((slot) => {
    const kind = getCaseInsertMarkLayerKind(slot.imageSource?.sourceId)

    return isCaseInsertMarkSlotVisible(slot, kind, brandingSources)
  })
}

function markSlotWillRender(
  slot: ProjectCaseInsertImageSlot,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  const kind = getCaseInsertMarkLayerKind(slot.imageSource?.sourceId)

  return slotWillRender(slot) &&
    isCaseInsertMarkSlotVisible(slot, kind, brandingSources)
}

function textBlockWillRender(textBlock: ProjectCaseInsertTextBlock) {
  return Boolean(textBlock.enabled && textBlock.value.trim())
}

function textListWillRender(textList: ProjectCaseInsertTextList) {
  return Boolean(
    textList.enabled &&
    textList.items.some((item) => item.trim()),
  )
}

function surfaceHasVisibleContent(
  surface: ProjectCaseInsertSurfaceState,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  return (
    slotWillRender(surface.background) ||
    steamBannerWillRender(surface.steamBanner) ||
    slotWillRender(surface.titleArtwork) ||
    (
      surface.additionalArtworkEnabled &&
      surface.artworkSlots.some(slotWillRender)
    ) ||
    surface.logoSlots.some(logoSlotWillRender) ||
    surface.markSlots.some((slot) => markSlotWillRender(slot, brandingSources)) ||
    surface.textBlocks.some(textBlockWillRender) ||
    surface.textLists.some(textListWillRender)
  )
}

function getVisibleSpineMarkSlots(
  spineSide: ProjectJewelCaseSpineSideState,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  return spineSide.markSlots.filter((slot) => {
    const kind = getCaseInsertMarkLayerKind(slot.imageSource?.sourceId)

    return isCaseInsertMarkSlotVisible(slot, kind, brandingSources)
  })
}

function spineSideHasVisibleContent(
  spineSide: ProjectJewelCaseSpineSideState,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  return (
    slotWillRender(spineSide.background) ||
    steamBannerWillRender(spineSide.steamBanner) ||
    slotWillRender(spineSide.titleArtwork) ||
    (
      spineSide.additionalArtworkEnabled &&
      spineSide.artworkSlots.some(slotWillRender)
    ) ||
    textBlockWillRender(spineSide.title) ||
    spineSide.logoSlots.some(logoSlotWillRender) ||
    getVisibleSpineMarkSlots(
      spineSide,
      brandingSources,
    ).some(slotWillRender)
  )
}

function formatVisibleElementStatus(
  surface: ProjectCaseInsertSurfaceState,
  spine: ProjectJewelCaseState['spine'] | null,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  const visibleCount =
    Number(slotWillRender(surface.background)) +
    Number(steamBannerWillRender(surface.steamBanner)) +
    Number(slotWillRender(surface.titleArtwork)) +
    (surface.additionalArtworkEnabled
      ? surface.artworkSlots.filter(slotWillRender).length
      : 0) +
    surface.logoSlots.filter(logoSlotWillRender).length +
    surface.markSlots.filter((slot) =>
      markSlotWillRender(slot, brandingSources)).length +
    surface.textBlocks.filter(textBlockWillRender).length +
    surface.textLists.filter(textListWillRender).length +
    (spine
      ? (['left', 'right'] as const).reduce(
          (count, side) =>
            count + (
              spineSideHasVisibleContent(spine[side], brandingSources)
                ? 1
                : 0
            ),
          0,
        )
      : 0)

  return visibleCount > 0 ? String(visibleCount) : 'None'
}

function formatImageSlotStatus(slot: ProjectCaseInsertImageSlot) {
  if (!slot.enabled) return 'Disabled'
  if (!slot.imageDataUrl) return 'None'
  if (!slot.imageSize) return 'Present'

  return `Present (${slot.imageSize.width} x ${slot.imageSize.height}px)`
}

function getSpineSideLabel(side: JewelCaseSpineSideId) {
  return side === 'left' ? 'Left spine' : 'Right spine'
}

function formatMm(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatPixels(value: number) {
  return String(Math.round(value))
}
