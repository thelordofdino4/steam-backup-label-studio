import {
  createCaseInsertPngExportLayout,
} from '../caseInsert/exportLayout.ts'
import type {
  CaseInsertBrandingSourceCatalog,
} from '../caseInsert/brandingSlotSources.ts'
import {
  getCaseInsertBackTextBlockReadabilityRole,
  getCaseInsertBackTextBlockRole,
  getCaseInsertTextReadabilityWarnings,
  type CaseInsertTextLayout,
  type CaseInsertTextReadabilityRole,
} from '../caseInsert/textReadability.ts'
import {
  getRenderedCaseInsertTextBlock,
} from '../caseInsert/textContent.ts'
import {
  getCaseInsertTemplatePaneConfig,
  type CaseInsertTemplatePaneId,
} from '../caseInsert/templateSurfaces.ts'
import {
  createCaseInsertSpineTextAvoidanceRegions,
  createCaseInsertTemplateTextAvoidanceRegions,
} from '../layout/caseInsertTextOccupiedRegions.ts'
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
import {
  isOptionalVisualFeatureEnabled,
} from '../editor/optionalVisualFeature.ts'
import {
  getFeatureVisibleRepeatedArtworkItems,
} from '../editor/repeatedArtwork.ts'
import type {
  CaseInsertPreviewLayout,
} from '../layout/caseInsertPreviewLayout.ts'
import type {
  JewelCasePixelRect,
  JewelCaseSpineSideId,
} from '../layout/jewelCaseLayout.ts'
import type {
  ProjectCaseInsertLayout,
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
import {
  buildGuideExportWarnings,
  buildLayoutValueWarnings,
  createMissingBackgroundWarning,
  formatMillimeters,
} from './preflightWarnings.ts'
import {
  getImageFitWarnings,
  getRenderedImageSlotWarnings,
  getRenderedLogoSlotWarnings,
  getSafeEdgeWarnings,
  getSpineImageSlotWarnings,
  getSpineLogoSlotWarnings,
  type EdgeWarningOptions,
} from './caseInsertPreflightImageWarnings.ts'
import {
  formatImageSlotStatus,
  formatVisibleElementStatus,
  getVisibleMarkSlots,
  getVisibleSpineMarkSlots,
  slotWillRender,
  spineSideHasVisibleContent,
  surfaceHasVisibleContent,
} from './caseInsertPreflightVisibility.ts'

export type CaseInsertExportPreflightSummary = {
  message: string
  hasWarnings: boolean
  warnings: string[]
}

const TEMPLATE_SAFE_REGION_BY_PANE: Record<CaseInsertTemplatePaneId, JewelCaseRegionId> = {
  cover: 'frontSafe',
  tray: 'backPanelSafe',
}

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
      ? `${formatMillimeters(surface.widthMm)} x ${formatMillimeters(surface.heightMm)} mm`
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

export function buildCaseInsertExportWarnings(params: {
  caseInsert: ProjectJewelCaseState
  activeTemplatePane: CaseInsertTemplatePaneId
  brandingSources: CaseInsertBrandingSourceCatalog
  layout: CaseInsertPreviewLayout
  enabledGuideNames: string[]
}) {
  const warnings: string[] = []
  const paneConfig = getCaseInsertTemplatePaneConfig(params.activeTemplatePane)
  const templateState = params.caseInsert.templates[params.activeTemplatePane]

  warnings.push(...buildGuideExportWarnings(params.enabledGuideNames.length > 0))

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
    ? getJewelCaseFrontBackgroundFit(
        templateState.background,
        layout,
        templateState.steamBanner,
      )
    : getJewelCaseBackBackgroundFit(templateState.background, layout)

  if (!slotWillRender(templateState.background)) {
    warnings.push(
      createMissingBackgroundWarning(
        paneLabel,
        'uncovered areas will export as blank white',
      ),
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
    warnings.push(
      ...getCoverTextWarnings(
        templateState,
        layout,
        brandingSources,
      ),
    )
  } else {
    warnings.push(...getTraySlotWarnings(templateState, layout, brandingSources))
    warnings.push(
      ...getTrayTextWarnings(
        templateState,
        layout,
        brandingSources,
      ),
    )
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

  for (const slot of getFeatureVisibleRepeatedArtworkItems(
    templateState,
    templateState.artworkSlots,
  )) {
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

  const artworkSlots = getFeatureVisibleRepeatedArtworkItems(
    templateState,
    templateState.artworkSlots,
  )

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
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  const avoidanceRegions = createCaseInsertTemplateTextAvoidanceRegions({
    paneId: 'cover',
    templateState,
    layout,
    brandingSources,
  })

  return templateState.textBlocks.flatMap((textBlock) => {
    const renderedTextBlock = getRenderedCaseInsertTextBlock(
      textBlock,
      brandingSources.projectMetadata,
    )

    return getTextBlockWarnings({
      textBlock: renderedTextBlock,
      label: renderedTextBlock.label,
      textLayout: getJewelCaseFrontTextBlockPreviewLayout(
        renderedTextBlock,
        layout,
        avoidanceRegions,
      ),
      safeBounds: getRegionBounds(layout, TEMPLATE_SAFE_REGION_BY_PANE.cover),
      readabilityRole: 'callout',
      edge: { regionLabel: 'cover safe zone' },
    })
  })
}

function getTrayTextWarnings(
  templateState: ProjectCaseInsertSurfaceState,
  layout: CaseInsertPreviewLayout,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  const safeBounds = getRegionBounds(layout, TEMPLATE_SAFE_REGION_BY_PANE.tray)
  const avoidanceRegions = createCaseInsertTemplateTextAvoidanceRegions({
    paneId: 'tray',
    templateState,
    layout,
    brandingSources,
  })
  const textBlockWarnings = templateState.textBlocks.flatMap((textBlock) => {
    const renderedTextBlock = getRenderedCaseInsertTextBlock(
      textBlock,
      brandingSources.projectMetadata,
    )
    const role = getCaseInsertBackTextBlockRole(renderedTextBlock)

    return getTextBlockWarnings({
      textBlock: renderedTextBlock,
      label: renderedTextBlock.label,
      textLayout: getJewelCaseBackTextBlockPreviewLayout(
        renderedTextBlock,
        layout,
        role,
        avoidanceRegions,
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
      textLayout: getJewelCaseBackTextListPreviewLayout(
        textList,
        layout,
        avoidanceRegions,
      ),
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
    spineSide.steamBanner,
  )
  const renderedTitle = getRenderedCaseInsertTextBlock(
    spineSide.title,
    brandingSources.projectMetadata,
  )
  const avoidanceRegions = createCaseInsertSpineTextAvoidanceRegions({
    side,
    spineSide,
    layout,
    brandingSources,
  })
  const titleLayout = getJewelCaseSpineTitlePreviewLayout(
    side,
    renderedTitle,
    layout,
    avoidanceRegions,
  )
  const titleArtworkLayout = getJewelCaseSpineImageSlotPreviewLayout(
    side,
    spineSide.titleArtwork,
    layout,
    'titleArtwork',
  )
  const artworkSlots = getFeatureVisibleRepeatedArtworkItems(
    spineSide,
    spineSide.artworkSlots,
  )
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
      textBlock: renderedTitle,
      label: `${label} title`,
      textLayout: titleLayout
        ? {
            bounds: titleLayout.boundingRect,
            reservedBounds: titleLayout.reservedBoundingRect,
            fontSizePx: titleLayout.fontSizePx,
            lineHeightPx: titleLayout.lineHeightPx,
          }
        : null,
      safeBounds: null,
      readabilityRole: 'spine',
    }),
    ...spineSide.textBlocks.flatMap((textBlock) => {
      const renderedTextBlock = getRenderedCaseInsertTextBlock(
        textBlock,
        brandingSources.projectMetadata,
      )
      const textLayout = getJewelCaseSpineTitlePreviewLayout(
        side,
        renderedTextBlock,
        layout,
        avoidanceRegions,
      )

      return getTextBlockWarnings({
        textBlock: renderedTextBlock,
        label: `${label} ${renderedTextBlock.label.toLocaleLowerCase()}`,
        textLayout: textLayout
          ? {
              bounds: textLayout.boundingRect,
              reservedBounds: textLayout.reservedBoundingRect,
              fontSizePx: textLayout.fontSizePx,
              lineHeightPx: textLayout.lineHeightPx,
            }
          : null,
        safeBounds: null,
        readabilityRole: 'spine',
      })
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

  if (!isOptionalVisualFeatureEnabled(textBlock)) {
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
      layout: {
        ...params.textLayout,
        bounds: params.textLayout.reservedBounds ?? params.textLayout.bounds,
      },
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

  if (!isOptionalVisualFeatureEnabled(textList)) {
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
      layout: {
        ...params.textLayout,
        bounds: params.textLayout.reservedBounds ?? params.textLayout.bounds,
      },
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
  return buildLayoutValueWarnings(label, layout)
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

function getSpineSideLabel(side: JewelCaseSpineSideId) {
  return side === 'left' ? 'Left spine' : 'Right spine'
}
