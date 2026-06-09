import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertSurfaceState,
  ProjectImageAssetProvenance,
  ProjectImageAssetSource,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import {
  createCaseInsertTemplateImageSlot,
  getCaseInsertImageSlotGroupConfig,
} from './templateSurfaceTransitions.ts'
import {
  createDefaultJewelCaseSpineMarkSlot,
} from './defaults.ts'
import {
  setCaseInsertImageSlotImage,
} from './imageSlotTransitions.ts'
import {
  createCaseInsertBrandingSourceSections,
  getCaseInsertMarkLayerKind,
  type CaseInsertMarkLayerKind,
  type CaseInsertBrandingSlotSourceItem,
  type CaseInsertBrandingSourceCatalog,
} from './brandingSlotSources.ts'
import {
  isCaseInsertMarkSlotVisible,
} from './brandingVisibility.ts'
import type { CaseInsertTemplatePaneId } from './templateSurfaces.ts'
import type { JewelCaseSpineSide } from './types.ts'

const CASE_INSERT_TEMPLATE_MARK_PANES: CaseInsertTemplatePaneId[] = [
  'cover',
  'tray',
]
const JEWEL_CASE_SPINE_SIDES: JewelCaseSpineSide[] = ['left', 'right']
const USER_OVERRIDE_IMAGE_SOURCES = new Set<ProjectImageAssetSource>([
  'uploaded',
  'steam-artwork',
  'web-artwork',
  'local-steam-screenshot',
  'steam-logo-candidate',
  'official-logo-candidate',
])
const SUPPLEMENTAL_USK_MARK_SCALE_MULTIPLIER = 1.2
const SUPPLEMENTAL_USK_TEMPLATE_X_OFFSET = 12
const SUPPLEMENTAL_USK_SPINE_Y_OFFSET = -12

export type CaseInsertBrandingMarkTarget =
  | {
      type: 'template'
      paneId: CaseInsertTemplatePaneId
    }
  | {
      type: 'spine'
      side: JewelCaseSpineSide
    }

export type CaseInsertBrandingMarkTargetState = {
  markSlots: ProjectCaseInsertImageSlot[]
}

function sanitizeAutoIdPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'mark'
}

function getSourceIdPart(
  sourceId: string | null | undefined,
  fallback = 'default',
) {
  return sourceId?.split(':')[1]?.trim() || fallback
}

function getTechnicalSourceIdentity(sourceId: string | null | undefined) {
  const [, value, assetId = 'primary'] = sourceId?.split(':') ?? []

  return value ? `technical-${value}-${assetId || 'primary'}` : null
}

function getMarkSourceIdentity(sourceId: string | null | undefined) {
  if (!sourceId?.startsWith('case-') || sourceId.includes(':manual:')) {
    return null
  }

  const kind = getCaseInsertMarkLayerKind(sourceId)

  switch (kind) {
    case 'rating':
      return sourceId?.endsWith(':supplemental')
        ? 'rating-supplemental-usk'
        : 'rating-primary'
    case 'media':
      return 'media'
    case 'platform':
      return `platform-${getSourceIdPart(sourceId)}`
    case 'technical':
      return getTechnicalSourceIdentity(sourceId)
  }
}

function getAutoMarkSlotId(prefix: string, source: CaseInsertBrandingSlotSourceItem) {
  return `${prefix}-auto-${sanitizeAutoIdPart(
    getMarkSourceIdentity(source.sourceId) ?? source.sourceId,
  )}`
}

function isSupplementalUskRatingSource(sourceId: string | null | undefined) {
  return Boolean(
    sourceId?.startsWith('case-rating:USK:') &&
      sourceId.endsWith(':supplemental'),
  )
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value))
}

function layoutsMatch(
  left: ProjectCaseInsertImageSlot['layout'],
  right: Partial<ProjectCaseInsertImageSlot['layout']>,
) {
  return left.scale === right.scale &&
    left.x === right.x &&
    left.y === right.y &&
    left.rotation === (right.rotation ?? 0)
}

function getSupplementalUskMarkLayout(
  layout: ProjectCaseInsertImageSlot['layout'],
  targetKind: 'template' | 'spine',
): ProjectCaseInsertImageSlot['layout'] {
  return {
    ...layout,
    scale: layout.scale * SUPPLEMENTAL_USK_MARK_SCALE_MULTIPLIER,
    x: targetKind === 'template'
      ? clampPercent(layout.x + SUPPLEMENTAL_USK_TEMPLATE_X_OFFSET)
      : layout.x,
    y: targetKind === 'spine'
      ? clampPercent(layout.y + SUPPLEMENTAL_USK_SPINE_Y_OFFSET)
      : layout.y,
  }
}

function applySourceDefaultMarkLayout(
  slot: ProjectCaseInsertImageSlot,
  source: CaseInsertBrandingSlotSourceItem,
  targetKind: 'template' | 'spine',
): ProjectCaseInsertImageSlot {
  if (!isSupplementalUskRatingSource(source.sourceId)) {
    return slot
  }

  return {
    ...slot,
    layout: getSupplementalUskMarkLayout(slot.layout, targetKind),
  }
}

function migrateLegacySupplementalUskLayout(
  slot: ProjectCaseInsertImageSlot,
  source: CaseInsertBrandingSlotSourceItem,
  autoSlot: ProjectCaseInsertImageSlot,
  legacyDefaultLayout: Partial<ProjectCaseInsertImageSlot['layout']>,
) {
  if (
    !isSupplementalUskRatingSource(source.sourceId) ||
    !layoutsMatch(slot.layout, legacyDefaultLayout)
  ) {
    return slot
  }

  return {
    ...slot,
    layout: autoSlot.layout,
  }
}

function createSourceImageProvenance(
  source: CaseInsertBrandingSlotSourceItem,
): Partial<ProjectImageAssetProvenance> {
  return {
    ...source.imageSource,
    sourceId: source.sourceId,
    sourceLabel: source.imageSource.sourceLabel ?? source.label,
  }
}

function getFallbackMarkImageSize(sourceId: string) {
  const kind = getCaseInsertMarkLayerKind(sourceId)

  switch (kind) {
    case 'rating':
      return sourceId.startsWith('case-rating:ESRB:')
        ? { width: 60.418, height: 90.628 }
        : { width: 100, height: 100 }
    case 'media':
      return { width: 1058.34, height: 465.85 }
    case 'platform':
      return { width: 130, height: 80 }
    case 'technical':
      return { width: 130, height: 80 }
  }
}

function shouldPreserveSlotImage(slot: ProjectCaseInsertImageSlot) {
  return Boolean(
    slot.imageDataUrl &&
      slot.imageSource?.source &&
      USER_OVERRIDE_IMAGE_SOURCES.has(slot.imageSource.source),
  )
}

function preserveUserSlotImageForSource(
  slot: ProjectCaseInsertImageSlot,
  source: CaseInsertBrandingSlotSourceItem,
): ProjectCaseInsertImageSlot {
  if (!slot.imageSource) {
    return slot
  }

  return {
    ...slot,
    imageSource: {
      ...slot.imageSource,
      sourceId: source.sourceId,
      sourceLabel: slot.imageSource.sourceLabel || source.label,
    },
  }
}

function setSlotSharedMarkSource(
  slot: ProjectCaseInsertImageSlot,
  source: CaseInsertBrandingSlotSourceItem,
) {
  const baseSlot = {
    ...slot,
    label: source.label,
    fit: 'contain' as const,
  }

  if (shouldPreserveSlotImage(baseSlot)) {
    return preserveUserSlotImageForSource(baseSlot, source)
  }

  return setCaseInsertImageSlotImage(baseSlot, {
    imageDataUrl: source.imageDataUrl,
    imageSize: source.imageSize ?? getFallbackMarkImageSize(source.sourceId),
    imageSource: createSourceImageProvenance(source),
  })
}

function imageSourcesMatch(
  left: ProjectImageAssetProvenance | null | undefined,
  right: ProjectImageAssetProvenance | null | undefined,
) {
  return left?.source === right?.source &&
    left?.sourceId === right?.sourceId &&
    left?.sourceLabel === right?.sourceLabel &&
    left?.sourceUrl === right?.sourceUrl
}

function imageSizesMatch(
  left: ProjectCaseInsertImageSlot['imageSize'],
  right: ProjectCaseInsertImageSlot['imageSize'],
) {
  return left?.width === right?.width && left?.height === right?.height
}

function markLayoutsMatch(
  left: ProjectCaseInsertImageSlot['layout'],
  right: ProjectCaseInsertImageSlot['layout'],
) {
  return left.scale === right.scale &&
    left.x === right.x &&
    left.y === right.y &&
    left.rotation === right.rotation
}

function markSlotsMatch(
  left: ProjectCaseInsertImageSlot,
  right: ProjectCaseInsertImageSlot,
) {
  return left.id === right.id &&
    left.label === right.label &&
    left.enabled === right.enabled &&
    left.imageDataUrl === right.imageDataUrl &&
    left.fit === right.fit &&
    markLayoutsMatch(left.layout, right.layout) &&
    imageSizesMatch(left.imageSize, right.imageSize) &&
    imageSourcesMatch(left.imageSource, right.imageSource)
}

function createActiveCaseInsertMarkSourceItems(
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  return createCaseInsertBrandingSourceSections(brandingSources)
    .filter((section) => (
      section.id === 'rating' ||
      section.id === 'media' ||
      section.id === 'platform' ||
      section.id === 'technical'
    ))
    .flatMap((section) => section.items)
    .filter((source) => source.slotKey === 'markSlots')
}

function findExistingMarkSlotIndex(
  slots: ProjectCaseInsertImageSlot[],
  autoSlotId: string,
  source: CaseInsertBrandingSlotSourceItem,
) {
  const sourceIdentity = getMarkSourceIdentity(source.sourceId)

  return slots.findIndex((slot) => (
    slot.imageSource?.sourceId === source.sourceId ||
    slot.id === autoSlotId ||
    (
      sourceIdentity !== null &&
      getMarkSourceIdentity(slot.imageSource?.sourceId) === sourceIdentity
    )
  ))
}

function syncMarkSlots(
  slots: ProjectCaseInsertImageSlot[],
  sources: CaseInsertBrandingSlotSourceItem[],
  createAutoSlot: (
    source: CaseInsertBrandingSlotSourceItem,
    index: number,
  ) => ProjectCaseInsertImageSlot,
  normalizeBaseSlot: (
    slot: ProjectCaseInsertImageSlot,
    autoSlot: ProjectCaseInsertImageSlot,
    source: CaseInsertBrandingSlotSourceItem,
  ) => ProjectCaseInsertImageSlot = (slot) => slot,
) {
  let nextSlots = slots
  let didChange = false

  sources.forEach((source, sourceIndex) => {
    const autoSlot = createAutoSlot(source, nextSlots.length + sourceIndex + 1)
    const existingIndex = findExistingMarkSlotIndex(
      nextSlots,
      autoSlot.id,
      source,
    )
    const baseSlot = existingIndex >= 0
      ? nextSlots[existingIndex]!
      : autoSlot
    const updatedSlot = setSlotSharedMarkSource(
      normalizeBaseSlot(baseSlot, autoSlot, source),
      source,
    )

    if (existingIndex >= 0) {
      if (markSlotsMatch(nextSlots[existingIndex]!, updatedSlot)) {
        return
      }

      didChange = true
      nextSlots = nextSlots.map((slot, index) =>
        index === existingIndex ? updatedSlot : slot)
      return
    }

    didChange = true
    nextSlots = [...nextSlots, updatedSlot]
  })

  return didChange ? nextSlots : slots
}

function syncTemplateSurfaceMarkSlots(
  paneId: CaseInsertTemplatePaneId,
  surface: ProjectCaseInsertSurfaceState,
  sources: CaseInsertBrandingSlotSourceItem[],
) {
  const defaultMarkLayout =
    getCaseInsertImageSlotGroupConfig(paneId, 'markSlots').defaultLayout
  const markSlots = syncMarkSlots(
    surface.markSlots,
    sources,
    (source, index) =>
      applySourceDefaultMarkLayout(
        {
          ...createCaseInsertTemplateImageSlot(paneId, 'markSlots', index),
          id: getAutoMarkSlotId(paneId, source),
          label: source.label,
        },
        source,
        'template',
      ),
    (slot, autoSlot, source) =>
      migrateLegacySupplementalUskLayout(
        slot,
        source,
        autoSlot,
        defaultMarkLayout,
      ),
  )

  return markSlots === surface.markSlots
    ? surface
    : {
        ...surface,
        markSlots,
      }
}

function syncSpineSideMarkSlots(
  side: JewelCaseSpineSide,
  spineSide: ProjectJewelCaseSpineSideState,
  sources: CaseInsertBrandingSlotSourceItem[],
) {
  const defaultMarkLayout = createDefaultJewelCaseSpineMarkSlot(side, 1).layout
  const markSlots = syncMarkSlots(
    spineSide.markSlots,
    sources,
    (source, index) =>
      applySourceDefaultMarkLayout(
        {
          ...createDefaultJewelCaseSpineMarkSlot(side, index),
          id: getAutoMarkSlotId(`${side}-spine`, source),
          label: source.label,
        },
        source,
        'spine',
      ),
    (slot, autoSlot, source) =>
      migrateLegacySupplementalUskLayout(
        slot,
        source,
        autoSlot,
        defaultMarkLayout,
      ),
  )

  return markSlots === spineSide.markSlots
    ? spineSide
    : {
        ...spineSide,
        markSlots,
      }
}

function syncTargetMarkSlots(
  state: ProjectJewelCaseState,
  target: CaseInsertBrandingMarkTarget,
  sources: CaseInsertBrandingSlotSourceItem[],
): ProjectJewelCaseState {
  if (target.type === 'template') {
    const surface = state.templates[target.paneId]
    const syncedSurface = syncTemplateSurfaceMarkSlots(
      target.paneId,
      surface,
      sources,
    )

    return syncedSurface === surface
      ? state
      : {
          ...state,
          templates: {
            ...state.templates,
            [target.paneId]: syncedSurface,
          },
        }
  }

  const spineSide = state.spine[target.side]
  const syncedSpineSide = syncSpineSideMarkSlots(
    target.side,
    spineSide,
    sources,
  )

  return syncedSpineSide === spineSide
    ? state
    : {
        ...state,
        spine: {
          ...state.spine,
          [target.side]: syncedSpineSide,
        },
      }
}

function updateTargetMarkSlots(
  state: ProjectJewelCaseState,
  target: CaseInsertBrandingMarkTarget,
  updater: (
    slots: ProjectCaseInsertImageSlot[],
  ) => ProjectCaseInsertImageSlot[],
): ProjectJewelCaseState {
  if (target.type === 'template') {
    const surface = state.templates[target.paneId]
    const markSlots = updater(surface.markSlots)

    return markSlots === surface.markSlots
      ? state
      : {
          ...state,
          templates: {
            ...state.templates,
            [target.paneId]: {
              ...surface,
              markSlots,
            },
          },
        }
  }

  const spineSide = state.spine[target.side]
  const markSlots = updater(spineSide.markSlots)

  return markSlots === spineSide.markSlots
    ? state
    : {
        ...state,
        spine: {
          ...state.spine,
          [target.side]: {
            ...spineSide,
            markSlots,
          },
        },
      }
}

function setMarkSlotsOfKindEnabled(
  slots: ProjectCaseInsertImageSlot[],
  kind: CaseInsertMarkLayerKind,
  enabled: boolean,
) {
  let didChange = false
  const markSlots = slots.map((slot) => {
    if (getCaseInsertMarkLayerKind(slot.imageSource?.sourceId) !== kind) {
      return slot
    }

    if (slot.enabled === enabled) {
      return slot
    }

    didChange = true
    return {
      ...slot,
      enabled,
    }
  })

  return didChange ? markSlots : slots
}

function setMarkSlotsWithSourcePrefixEnabled(
  slots: ProjectCaseInsertImageSlot[],
  sourcePrefix: string,
  enabled: boolean,
) {
  let didChange = false
  const markSlots = slots.map((slot) => {
    if (!slot.imageSource?.sourceId?.startsWith(sourcePrefix)) {
      return slot
    }

    if (slot.enabled === enabled) {
      return slot
    }

    didChange = true
    return {
      ...slot,
      enabled,
    }
  })

  return didChange ? markSlots : slots
}

export function getCaseInsertBrandingMarkKindEnabledForTarget(
  targetState: CaseInsertBrandingMarkTargetState,
  kind: CaseInsertMarkLayerKind,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  return targetState.markSlots.some((slot) =>
    isCaseInsertMarkSlotVisible(slot, kind, brandingSources))
}

export function syncProjectJewelCaseBrandingMarkSlotsForTarget(
  state: ProjectJewelCaseState,
  target: CaseInsertBrandingMarkTarget,
  brandingSources: CaseInsertBrandingSourceCatalog,
): ProjectJewelCaseState {
  const sources = createActiveCaseInsertMarkSourceItems(brandingSources)

  if (sources.length === 0) {
    return state
  }

  return syncTargetMarkSlots(state, target, sources)
}

export function setProjectJewelCaseBrandingMarkTargetKindEnabled(
  state: ProjectJewelCaseState,
  target: CaseInsertBrandingMarkTarget,
  kind: CaseInsertMarkLayerKind,
  enabled: boolean,
  brandingSources: CaseInsertBrandingSourceCatalog,
): ProjectJewelCaseState {
  const syncedState = enabled
    ? syncProjectJewelCaseBrandingMarkSlotsForTarget(
        state,
        target,
        brandingSources,
      )
    : state

  return updateTargetMarkSlots(
    syncedState,
    target,
    (slots) => setMarkSlotsOfKindEnabled(slots, kind, enabled),
  )
}

export function setProjectJewelCaseBrandingMarkTargetSourcePrefixEnabled(
  state: ProjectJewelCaseState,
  target: CaseInsertBrandingMarkTarget,
  sourcePrefix: string,
  enabled: boolean,
  brandingSources: CaseInsertBrandingSourceCatalog,
): ProjectJewelCaseState {
  const syncedState = enabled
    ? syncProjectJewelCaseBrandingMarkSlotsForTarget(
        state,
        target,
        brandingSources,
      )
    : state

  return updateTargetMarkSlots(
    syncedState,
    target,
    (slots) => setMarkSlotsWithSourcePrefixEnabled(slots, sourcePrefix, enabled),
  )
}

export function syncProjectJewelCaseBrandingMarkSlots(
  state: ProjectJewelCaseState,
  brandingSources: CaseInsertBrandingSourceCatalog,
): ProjectJewelCaseState {
  const sources = createActiveCaseInsertMarkSourceItems(brandingSources)

  if (sources.length === 0) {
    return state
  }

  let didChange = false
  const templates = { ...state.templates }

  CASE_INSERT_TEMPLATE_MARK_PANES.forEach((paneId) => {
    const surface = state.templates[paneId]
    const syncedSurface = syncTemplateSurfaceMarkSlots(paneId, surface, sources)

    if (syncedSurface !== surface) {
      templates[paneId] = syncedSurface
      didChange = true
    }
  })

  const spine = { ...state.spine }

  JEWEL_CASE_SPINE_SIDES.forEach((side) => {
    const spineSide = state.spine[side]
    const syncedSpineSide = syncSpineSideMarkSlots(side, spineSide, sources)

    if (syncedSpineSide !== spineSide) {
      spine[side] = syncedSpineSide
      didChange = true
    }
  })

  return didChange
    ? {
        ...state,
        templates,
        spine,
      }
    : state
}
