import {
  createCaseInsertPngExportLayout,
} from '../caseInsert/exportLayout.ts'
import type {
  CaseInsertBrandingSourceCatalog,
} from '../caseInsert/brandingSlotSources.ts'
import {
  getCaseInsertMarkLayerKind,
} from '../caseInsert/brandingSlotSources.ts'
import {
  getCaseInsertLogoSlotRenderInfo,
} from '../caseInsert/brandingLogoSlots.ts'
import {
  isCaseInsertMarkSlotVisible,
} from '../caseInsert/brandingVisibility.ts'
import {
  getCaseInsertTemplatePaneConfig,
  type CaseInsertTemplatePaneId,
} from '../caseInsert/templateSurfaces.ts'
import {
  getRenderedCaseInsertTextBlock,
} from '../caseInsert/textContent.ts'
import {
  isOptionalVisualFeatureEnabled,
} from '../editor/optionalVisualFeature.ts'
import {
  getFeatureVisibleRepeatedArtworkItems,
} from '../editor/repeatedArtwork.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertSurfaceState,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseState,
  ProjectMetadata,
} from '../project/projectTypes.ts'
import { buildCaseInsertExportWarnings } from './caseInsertExportPreflight.ts'
import { slotWillRender } from './caseInsertPreflightVisibility.ts'
import {
  createDesignCheckItem,
  getDesignCheckItemNotes,
  getDesignCheckItemWarnings,
  mergeUniqueWarnings,
  type DesignCheckItem,
  type DesignCheckSummary,
} from './designChecklist.ts'

export type CaseInsertDesignCheckSummary = DesignCheckSummary

export function buildCaseInsertDesignCheckSummary(params: {
  caseInsert: ProjectJewelCaseState
  activeTemplatePane: CaseInsertTemplatePaneId
  brandingSources: CaseInsertBrandingSourceCatalog
}): CaseInsertDesignCheckSummary {
  const paneConfig = getCaseInsertTemplatePaneConfig(params.activeTemplatePane)
  const layout = createCaseInsertPngExportLayout(
    params.caseInsert,
    params.activeTemplatePane,
  )
  const exportWarnings = buildCaseInsertExportWarnings({
    caseInsert: params.caseInsert,
    activeTemplatePane: params.activeTemplatePane,
    brandingSources: params.brandingSources,
    layout,
    enabledGuideNames: [],
  })
  const checklistItems = getCaseInsertGuideChecklistItems(params, layout)
  const warnings = getDesignCheckItemWarnings(checklistItems)
  const notes = mergeUniqueWarnings(
    getDesignCheckItemNotes(checklistItems),
    exportWarnings,
  )
  const message = [
    warnings.length
      ? `Review these ${paneConfig.label.toLocaleLowerCase()} design warnings before export.`
      : `No ${paneConfig.label.toLocaleLowerCase()} design warnings found.`,
    ...(warnings.length
      ? ['', 'Warnings:', ...warnings.map((warning) => `- ${warning}`)]
      : []),
    ...(notes.length ? ['', 'Notes:', ...notes.map((note) => `- ${note}`)] : []),
  ].join('\n')

  return {
    message,
    hasWarnings: warnings.length > 0,
    warnings,
    notes,
    items: checklistItems,
  }
}

function getCaseInsertGuideChecklistItems(
  params: {
    caseInsert: ProjectJewelCaseState
    activeTemplatePane: CaseInsertTemplatePaneId
    brandingSources: CaseInsertBrandingSourceCatalog
  },
  layout: ReturnType<typeof createCaseInsertPngExportLayout>,
): DesignCheckItem[] {
  const surface = params.caseInsert.templates[params.activeTemplatePane]

  return params.activeTemplatePane === 'cover'
    ? getCoverGuideChecklistItems(surface, params.brandingSources)
    : getTrayGuideChecklistItems(
        surface,
        params.caseInsert,
        params.brandingSources,
        layout,
      )
}

function getCoverGuideChecklistItems(
  surface: ProjectCaseInsertSurfaceState,
  brandingSources: CaseInsertBrandingSourceCatalog,
): DesignCheckItem[] {
  const hasTitleArtwork = slotWillRender(surface.titleArtwork)
  const hasTitleText = hasVisibleTextBlock(
    surface.textBlocks,
    brandingSources.projectMetadata,
    (textBlock) => textBlock.id.includes('title'),
  )

  return [
    createDesignCheckItem({
      id: 'cover-background',
      label: 'Background artwork',
      passes: slotWillRender(surface.background),
      passDetail: 'Front background artwork is in place.',
      warningDetail:
        'Add front background artwork so the cover does not export as mostly blank space.',
    }),
    createDesignCheckItem({
      id: 'cover-title',
      label: 'Game title',
      passes: hasTitleArtwork || hasTitleText,
      passDetail: hasTitleArtwork
        ? 'Title/logo artwork is visible.'
        : 'Game title text is visible.',
      warningDetail:
        'Add a visible game title or title/logo artwork so the front cover is identifiable at a glance.',
    }),
    createDesignCheckItem({
      id: 'cover-game-info-marks',
      label: 'Info marks',
      passes: hasVisibleMarkSlot(surface, brandingSources),
      passDetail: 'A rating, media, platform, or technical mark is visible.',
      warningDetail:
        'Add at least one front-cover rating badge, media format mark, platform mark, or technical logo.',
    }),
    createDesignCheckItem({
      id: 'cover-company-logos',
      label: 'Company logos',
      passes: surface.logoSlots.some(logoSlotWillRender),
      passDetail: 'A developer, publisher, or related company logo is visible.',
      warningDetail:
        "Add a developer, publisher, or related company logo to anchor the front cover's branding.",
    }),
    createDesignCheckItem({
      id: 'cover-title-overlap-risk',
      label: 'Title overlap',
      passes: !(hasTitleArtwork && hasTitleText),
      passDetail: 'Only one main title treatment is visible.',
      warningDetail:
        'Title/logo artwork and game title text are both visible; make sure they are not competing for the same space.',
      warningStatus: 'note',
    }),
  ]
}

function getTrayGuideChecklistItems(
  surface: ProjectCaseInsertSurfaceState,
  caseInsert: ProjectJewelCaseState,
  brandingSources: CaseInsertBrandingSourceCatalog,
  layout: ReturnType<typeof createCaseInsertPngExportLayout>,
): DesignCheckItem[] {
  return [
    createDesignCheckItem({
      id: 'tray-background',
      label: 'Background artwork',
      passes: slotWillRender(surface.background),
      passDetail: 'Back background artwork is in place.',
      warningDetail:
        'Add back background artwork so the tray card does not export as mostly blank space.',
    }),
    createDesignCheckItem({
      id: 'tray-description',
      label: 'Game description',
      passes: hasVisibleTextBlock(
        surface.textBlocks,
        brandingSources.projectMetadata,
        (textBlock) => textBlock.id.includes('description'),
      ),
      passDetail: 'Game description text is visible.',
      warningDetail:
        'Add a short game description so the back cover explains what the game is.',
    }),
    createDesignCheckItem({
      id: 'tray-feature-bullets',
      label: 'Feature bullets',
      passes: hasVisibleTextList(surface.textLists),
      passDetail: 'Feature bullets are visible.',
      warningDetail:
        'Add feature bullets or short callouts so the back cover has quick scannable information.',
    }),
    createDesignCheckItem({
      id: 'tray-screenshots',
      label: 'Screenshots or supporting art',
      passes: getFeatureVisibleRepeatedArtworkItems(
        surface,
        surface.artworkSlots,
      ).some((slot) => slotWillRender(
        slot,
        { owner: 'tray', layout },
      )),
      passDetail: 'Screenshot or supporting artwork is visible.',
      warningDetail:
        'Add at least one screenshot or supporting artwork slot so the back cover is not only text.',
    }),
    createDesignCheckItem({
      id: 'tray-game-info-marks',
      label: 'Info marks',
      passes: hasVisibleMarkSlot(surface, brandingSources),
      passDetail: 'A rating, media, platform, or technical mark is visible.',
      warningDetail:
        'Add at least one back-cover rating badge, media format mark, platform mark, or technical logo.',
    }),
    createDesignCheckItem({
      id: 'tray-company-logos',
      label: 'Company and technology logos',
      passes: surface.logoSlots.some(logoSlotWillRender),
      passDetail: 'A developer, publisher, or technology/company logo is visible.',
      warningDetail:
        "Add developer, publisher, or technology/company logos to anchor the back cover's branding.",
    }),
    createDesignCheckItem({
      id: 'tray-requirements',
      label: 'System requirements',
      passes: hasVisibleTextBlock(
        surface.textBlocks,
        brandingSources.projectMetadata,
        (textBlock) => textBlock.id.includes('requirements'),
      ),
      passDetail: 'System requirements text is visible.',
      warningDetail:
        'Add system requirements so the back cover explains compatibility.',
    }),
    createDesignCheckItem({
      id: 'tray-legal-text',
      label: 'Legal text',
      passes: hasVisibleTextBlock(
        surface.textBlocks,
        brandingSources.projectMetadata,
        (textBlock) =>
          textBlock.id.includes('copyright') || textBlock.id.includes('legal'),
      ),
      passDetail: 'Copyright/legal text is visible.',
      warningDetail:
        'Add copyright/legal text for attribution and usage context.',
    }),
    createDesignCheckItem({
      id: 'tray-spine-title',
      label: 'Spine title',
      passes: everySpineSideHas(caseInsert, (spineSide) =>
        slotWillRender(spineSide.titleArtwork) ||
        textBlockWillRender(spineSide.title, brandingSources.projectMetadata)),
      passDetail: 'Both spines have a visible title or logo.',
      warningDetail:
        'Add a visible game title or logo to both spines so the case can be identified on a shelf.',
    }),
    createDesignCheckItem({
      id: 'tray-spine-company-logo',
      label: 'Spine company logo',
      passes: everySpineSideHas(caseInsert, (spineSide) =>
        spineSide.logoSlots.some(logoSlotWillRender)),
      passDetail: 'Both spines have a visible company logo.',
      warningDetail:
        'Add a company logo to both spines so shelf-facing edges carry the case branding.',
    }),
  ]
}

function logoSlotWillRender(slot: ProjectCaseInsertImageSlot) {
  return Boolean(getCaseInsertLogoSlotRenderInfo(slot))
}

function hasVisibleMarkSlot(
  surface: ProjectCaseInsertSurfaceState,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  return surface.markSlots.some((slot) => {
    const kind = getCaseInsertMarkLayerKind(slot.imageSource?.sourceId)

    return slotWillRender(slot) &&
      isCaseInsertMarkSlotVisible(slot, kind, brandingSources)
  })
}

function textBlockWillRender(
  textBlock: ProjectCaseInsertTextBlock,
  metadata: ProjectMetadata,
) {
  return Boolean(
    isOptionalVisualFeatureEnabled(textBlock) &&
      getRenderedCaseInsertTextBlock(textBlock, metadata).value.trim(),
  )
}

function hasVisibleTextBlock(
  textBlocks: readonly ProjectCaseInsertTextBlock[],
  metadata: ProjectMetadata,
  predicate: (textBlock: ProjectCaseInsertTextBlock) => boolean,
) {
  return textBlocks.some((textBlock) =>
    predicate(textBlock) && textBlockWillRender(textBlock, metadata))
}

function hasVisibleTextList(textLists: readonly ProjectCaseInsertTextList[]) {
  return textLists.some((textList) =>
    isOptionalVisualFeatureEnabled(textList) &&
    textList.items.some((item) => item.trim()))
}

function everySpineSideHas(
  caseInsert: ProjectJewelCaseState,
  predicate: (spineSide: ProjectJewelCaseSpineSideState) => boolean,
) {
  return (['left', 'right'] as const).every((side) =>
    predicate(caseInsert.spine[side]))
}
