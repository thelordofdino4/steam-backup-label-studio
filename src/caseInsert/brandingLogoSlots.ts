import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import {
  isOptionalVisualFeatureEnabled,
} from '../editor/optionalVisualFeature.ts'
import type {
  BackgroundImageSize,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
} from '../project/projectTypes.ts'
import {
  getLogoAssetRenderDataUrl,
  getLogoAssetRenderSize,
  type LogoAssetKey,
} from '../project/projectLogoAssets.ts'
import {
  createAdditionalLogoAssetLabel,
  getPrimaryLogoAssetLabel,
} from '../editor/logoAsset.ts'
import { createDefaultCaseInsertImageSlot } from './defaults.ts'
import {
  CASE_INSERT_COVER_DEVELOPER_LOGO_LAYOUT,
  CASE_INSERT_COVER_PUBLISHER_LOGO_LAYOUT,
} from './defaultBrandingLayouts.ts'
import {
  setCaseInsertImageSlotEnabled,
  setCaseInsertImageSlotImage,
  updateCaseInsertImageSlotLayoutField,
} from './imageSlotTransitions.ts'
import {
  getCaseInsertImageSlotGroupConfig,
} from './templateSurfaceTransitions.ts'
import type { CaseInsertTemplatePaneId } from './templateSurfaces.ts'
import type {
  CaseInsertImageSlotImageInput,
  CaseInsertLayoutField,
} from './types.ts'

export type CaseInsertLogoSurfaceId = CaseInsertTemplatePaneId | 'spine'

type CaseInsertLogoSlotState = {
  logoSlots: ProjectCaseInsertImageSlot[]
}

export type CaseInsertLogoSlotRenderInfo = {
  imageDataUrl: string
  imageSize: BackgroundImageSize
  isBundledFallback: boolean
  logoKey: LogoAssetKey
}

const CASE_INSERT_PRIMARY_LOGO_LAYOUTS:
Record<CaseInsertLogoSurfaceId, Record<LogoAssetKey, ProjectCaseInsertLayout>> = {
  cover: {
    developer: CASE_INSERT_COVER_DEVELOPER_LOGO_LAYOUT,
    publisher: CASE_INSERT_COVER_PUBLISHER_LOGO_LAYOUT,
  },
  tray: {
    developer: { scale: 1, x: 18, y: 88, rotation: 0 },
    publisher: { scale: 1, x: 82, y: 88, rotation: 0 },
  },
  spine: {
    developer: { scale: 1, x: 50, y: 78, rotation: 0 },
    publisher: { scale: 1, x: 50, y: 90, rotation: 0 },
  },
}

export function getCaseInsertPrimaryLogoLabel(logoKey: LogoAssetKey) {
  return getPrimaryLogoAssetLabel(logoKey)
}

export function getCaseInsertPrimaryLogoSourceId(logoKey: LogoAssetKey) {
  return `case-logo:${logoKey}`
}

export function getCaseInsertAdditionalLogoSourceId(
  logoKey: LogoAssetKey,
  slotId: string,
) {
  return `case-logo:${logoKey}:additional:${slotId}`
}

export function getDefaultCaseInsertPrimaryLogoLayout(
  surfaceId: CaseInsertLogoSurfaceId,
  logoKey: LogoAssetKey,
) {
  return CASE_INSERT_PRIMARY_LOGO_LAYOUTS[surfaceId][logoKey]
}

function getDefaultCaseInsertAdditionalLogoLabel(
  logoKey: LogoAssetKey,
  additionalLogoIndex: number,
) {
  return createAdditionalLogoAssetLabel(logoKey, additionalLogoIndex)
}

function normalizeLabel(value: string) {
  return value.trim().toLocaleLowerCase()
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

export function getCaseInsertPrimaryLogoKey(
  slot: ProjectCaseInsertImageSlot,
): LogoAssetKey | null {
  if (slot.imageSource?.sourceId === getCaseInsertPrimaryLogoSourceId('developer')) {
    return 'developer'
  }

  if (slot.imageSource?.sourceId === getCaseInsertPrimaryLogoSourceId('publisher')) {
    return 'publisher'
  }

  const label = normalizeLabel(slot.label)

  if (label === normalizeLabel(getCaseInsertPrimaryLogoLabel('developer'))) {
    return 'developer'
  }

  if (label === normalizeLabel(getCaseInsertPrimaryLogoLabel('publisher'))) {
    return 'publisher'
  }

  return null
}

export function getCaseInsertAdditionalLogoKey(
  slot: ProjectCaseInsertImageSlot,
): LogoAssetKey | null {
  const sourceId = slot.imageSource?.sourceId

  if (
    sourceId?.startsWith(`${getCaseInsertPrimaryLogoSourceId('developer')}:`)
  ) {
    return 'developer'
  }

  if (
    sourceId?.startsWith(`${getCaseInsertPrimaryLogoSourceId('publisher')}:`)
  ) {
    return 'publisher'
  }

  const label = normalizeLabel(slot.label)

  if (label.startsWith('additional developer')) {
    return 'developer'
  }

  if (label.startsWith('additional publisher')) {
    return 'publisher'
  }

  return null
}

export function getCaseInsertPrimaryLogoSlot(
  templateState: CaseInsertLogoSlotState,
  logoKey: LogoAssetKey,
) {
  return templateState.logoSlots.find(
    (slot) => getCaseInsertPrimaryLogoKey(slot) === logoKey,
  ) ?? null
}

export function getCaseInsertAdditionalLogoSlots(
  templateState: CaseInsertLogoSlotState,
) {
  return templateState.logoSlots.filter(
    (slot) => getCaseInsertPrimaryLogoKey(slot) === null,
  )
}

export function getCaseInsertAdditionalLogoSlotsForKey(
  templateState: CaseInsertLogoSlotState,
  logoKey: LogoAssetKey,
) {
  return getCaseInsertAdditionalLogoSlots(templateState).filter(
    (slot) => getCaseInsertAdditionalLogoKey(slot) === logoKey,
  )
}

export function getCaseInsertUnassignedAdditionalLogoSlots(
  templateState: CaseInsertLogoSlotState,
) {
  return getCaseInsertAdditionalLogoSlots(templateState).filter(
    (slot) => getCaseInsertAdditionalLogoKey(slot) === null,
  )
}

function getNextCaseInsertLogoSlotIndex(
  idPrefix: string,
  slots: ProjectCaseInsertImageSlot[],
) {
  let index = slots.length + 1

  while (slots.some(({ id }) => id === `${idPrefix}-${index}`)) {
    index += 1
  }

  return index
}

function createCaseInsertPrimaryLogoSlot(
  surfaceId: CaseInsertLogoSurfaceId,
  idPrefix: string,
  logoKey: LogoAssetKey,
  index: number,
) {
  return createDefaultCaseInsertImageSlot(
    `${idPrefix}-${index}`,
    getCaseInsertPrimaryLogoLabel(logoKey),
    {
      fit: 'contain',
      layout: getDefaultCaseInsertPrimaryLogoLayout(surfaceId, logoKey),
    },
  )
}

function getDefaultCaseInsertAdditionalLogoLayout(
  templateState: CaseInsertLogoSlotState,
  surfaceId: CaseInsertLogoSurfaceId,
  logoKey: LogoAssetKey,
  additionalLogoIndex: number,
): ProjectCaseInsertLayout {
  const primaryLayout = getCaseInsertPrimaryLogoSlot(
    templateState,
    logoKey,
  )?.layout ?? getDefaultCaseInsertPrimaryLogoLayout(surfaceId, logoKey)
  const offset = additionalLogoIndex + 1

  if (surfaceId === 'spine') {
    return {
      ...primaryLayout,
      y: clampPercent(primaryLayout.y + 8 * offset),
    }
  }

  return {
    ...primaryLayout,
    x: clampPercent(
      primaryLayout.x + (logoKey === 'developer' ? 12 : -12) * offset,
    ),
  }
}

function createCaseInsertAdditionalLogoSlot(
  templateState: CaseInsertLogoSlotState,
  surfaceId: CaseInsertLogoSurfaceId,
  idPrefix: string,
  logoKey: LogoAssetKey,
  index: number,
) {
  const additionalLogoIndex =
    getCaseInsertAdditionalLogoSlotsForKey(templateState, logoKey).length
  const label = getDefaultCaseInsertAdditionalLogoLabel(
    logoKey,
    additionalLogoIndex,
  )
  const id = `${idPrefix}-${index}`

  return {
    ...createDefaultCaseInsertImageSlot(
      id,
      label,
      {
        enabled: true,
        fit: 'contain',
        layout: getDefaultCaseInsertAdditionalLogoLayout(
          templateState,
          surfaceId,
          logoKey,
          additionalLogoIndex,
        ),
      },
    ),
    imageSource: createProjectImageAssetProvenance({
      source: 'embedded',
      sourceId: getCaseInsertAdditionalLogoSourceId(logoKey, id),
      sourceLabel: label,
    }),
  }
}

function normalizeCaseInsertPrimaryLogoSlot(
  slot: ProjectCaseInsertImageSlot,
  surfaceId: CaseInsertLogoSurfaceId,
  logoKey: LogoAssetKey,
): ProjectCaseInsertImageSlot {
  return {
    ...slot,
    label: getCaseInsertPrimaryLogoLabel(logoKey),
    fit: 'contain',
    layout: {
      ...getDefaultCaseInsertPrimaryLogoLayout(surfaceId, logoKey),
      ...slot.layout,
    },
    imageSource: slot.imageSource
      ? {
          ...slot.imageSource,
          sourceId: getCaseInsertPrimaryLogoSourceId(logoKey),
        }
      : null,
  }
}

function normalizeCaseInsertAdditionalLogoSlot(
  slot: ProjectCaseInsertImageSlot,
  logoKey: LogoAssetKey,
): ProjectCaseInsertImageSlot {
  const sourceId = slot.imageSource?.sourceId ??
    getCaseInsertAdditionalLogoSourceId(logoKey, slot.id)

  return {
    ...slot,
    imageSource: createProjectImageAssetProvenance({
      ...slot.imageSource,
      source: slot.imageSource?.source ?? 'embedded',
      sourceId,
      sourceLabel: slot.imageSource?.sourceLabel ?? slot.label,
    }),
  }
}

function getCaseInsertLogoSlotIdPrefix(
  surfaceId: CaseInsertLogoSurfaceId,
  idPrefix?: string,
) {
  if (idPrefix) {
    return idPrefix
  }

  return surfaceId === 'spine'
    ? 'spine-logo'
    : getCaseInsertImageSlotGroupConfig(surfaceId, 'logoSlots').idPrefix
}

function updateCaseInsertPrimaryLogoSlot<T extends CaseInsertLogoSlotState>(
  templateState: T,
  surfaceId: CaseInsertLogoSurfaceId,
  logoKey: LogoAssetKey,
  updater: (slot: ProjectCaseInsertImageSlot) => ProjectCaseInsertImageSlot,
  idPrefix?: string,
): T {
  const resolvedIdPrefix = getCaseInsertLogoSlotIdPrefix(surfaceId, idPrefix)
  const existingIndex = templateState.logoSlots.findIndex(
    (slot) => getCaseInsertPrimaryLogoKey(slot) === logoKey,
  )

  if (existingIndex >= 0) {
    return {
      ...templateState,
      logoSlots: templateState.logoSlots.map((slot, index) =>
        index === existingIndex
          ? normalizeCaseInsertPrimaryLogoSlot(
              updater(slot),
              surfaceId,
              logoKey,
            )
          : slot),
    } as T
  }

  const slot = createCaseInsertPrimaryLogoSlot(
    surfaceId,
    resolvedIdPrefix,
    logoKey,
    getNextCaseInsertLogoSlotIndex(resolvedIdPrefix, templateState.logoSlots),
  )

  return {
    ...templateState,
    logoSlots: [
      ...templateState.logoSlots,
      normalizeCaseInsertPrimaryLogoSlot(updater(slot), surfaceId, logoKey),
    ],
  } as T
}

export function addCaseInsertAdditionalLogoSlot<T extends CaseInsertLogoSlotState>(
  templateState: T,
  surfaceId: CaseInsertLogoSurfaceId,
  logoKey: LogoAssetKey,
  idPrefix?: string,
) {
  const resolvedIdPrefix = `${getCaseInsertLogoSlotIdPrefix(
    surfaceId,
    idPrefix,
  )}-${logoKey}`
  const slot = createCaseInsertAdditionalLogoSlot(
    templateState,
    surfaceId,
    resolvedIdPrefix,
    logoKey,
    getNextCaseInsertLogoSlotIndex(resolvedIdPrefix, templateState.logoSlots),
  )

  return {
    ...templateState,
    logoSlots: [...templateState.logoSlots, slot],
  } as T
}

function withPrimaryLogoImageSource(
  logoKey: LogoAssetKey,
  image: CaseInsertImageSlotImageInput,
): CaseInsertImageSlotImageInput {
  const sourceId = getCaseInsertPrimaryLogoSourceId(logoKey)

  return {
    ...image,
    imageSource: image.imageSource
      ? {
          ...image.imageSource,
          sourceId,
        }
      : createProjectImageAssetProvenance({
          source: 'embedded',
          sourceId,
          sourceLabel: getCaseInsertPrimaryLogoLabel(logoKey),
        }),
  }
}

export function withCaseInsertAdditionalLogoImageSource(
  slot: ProjectCaseInsertImageSlot,
  image: CaseInsertImageSlotImageInput,
): CaseInsertImageSlotImageInput {
  const logoKey = getCaseInsertAdditionalLogoKey(slot)

  if (!logoKey) {
    return image
  }

  const sourceId = slot.imageSource?.sourceId ??
    getCaseInsertAdditionalLogoSourceId(logoKey, slot.id)

  return {
    ...image,
    imageSource: {
      ...image.imageSource,
      sourceId,
      sourceLabel: image.imageSource?.sourceLabel ??
        slot.imageSource?.sourceLabel ??
        slot.label,
    },
  }
}

export function clearCaseInsertAdditionalLogoSlotImage(
  slot: ProjectCaseInsertImageSlot,
): ProjectCaseInsertImageSlot {
  const logoKey = getCaseInsertAdditionalLogoKey(slot)

  if (!logoKey) {
    return {
      ...slot,
      imageDataUrl: null,
      imageSize: null,
      imageSource: null,
    }
  }

  return normalizeCaseInsertAdditionalLogoSlot(
    {
      ...slot,
      imageDataUrl: null,
      imageSize: null,
      imageSource: createProjectImageAssetProvenance({
        source: 'embedded',
        sourceId: slot.imageSource?.sourceId ??
          getCaseInsertAdditionalLogoSourceId(logoKey, slot.id),
        sourceLabel: slot.label,
      }),
    },
    logoKey,
  )
}

export function getCaseInsertLogoSlotRenderInfo(
  slot: ProjectCaseInsertImageSlot,
): CaseInsertLogoSlotRenderInfo | null {
  if (!isOptionalVisualFeatureEnabled(slot)) {
    return null
  }

  const logoKey =
    getCaseInsertPrimaryLogoKey(slot) ??
    getCaseInsertAdditionalLogoKey(slot)

  if (!logoKey) {
    return slot.imageDataUrl
      ? {
          imageDataUrl: slot.imageDataUrl,
          imageSize: getLogoAssetRenderSize(slot.imageSize),
          isBundledFallback: false,
          logoKey: 'developer',
        }
      : null
  }

  return {
    imageDataUrl: getLogoAssetRenderDataUrl(logoKey, slot.imageDataUrl),
    imageSize: getLogoAssetRenderSize(slot.imageSize),
    isBundledFallback: !slot.imageDataUrl,
    logoKey,
  }
}

export function setCaseInsertPrimaryLogoSlotEnabled<T extends CaseInsertLogoSlotState>(
  templateState: T,
  surfaceId: CaseInsertLogoSurfaceId,
  logoKey: LogoAssetKey,
  enabled: boolean,
  idPrefix?: string,
) {
  return updateCaseInsertPrimaryLogoSlot(
    templateState,
    surfaceId,
    logoKey,
    (slot) => setCaseInsertImageSlotEnabled(slot, enabled),
    idPrefix,
  )
}

export function setCaseInsertPrimaryLogoSlotImage<T extends CaseInsertLogoSlotState>(
  templateState: T,
  surfaceId: CaseInsertLogoSurfaceId,
  logoKey: LogoAssetKey,
  image: CaseInsertImageSlotImageInput,
  idPrefix?: string,
) {
  return updateCaseInsertPrimaryLogoSlot(
    templateState,
    surfaceId,
    logoKey,
    (slot) => setCaseInsertImageSlotImage(
      slot,
      withPrimaryLogoImageSource(logoKey, image),
    ),
    idPrefix,
  )
}

export function updateCaseInsertPrimaryLogoSlotLayoutField<T extends CaseInsertLogoSlotState>(
  templateState: T,
  surfaceId: CaseInsertLogoSurfaceId,
  logoKey: LogoAssetKey,
  field: CaseInsertLayoutField,
  value: number,
  idPrefix?: string,
) {
  return updateCaseInsertPrimaryLogoSlot(
    templateState,
    surfaceId,
    logoKey,
    (slot) => updateCaseInsertImageSlotLayoutField(slot, field, value),
    idPrefix,
  )
}

export function resetCaseInsertPrimaryLogoSlotLayout<T extends CaseInsertLogoSlotState>(
  templateState: T,
  surfaceId: CaseInsertLogoSurfaceId,
  logoKey: LogoAssetKey,
  idPrefix?: string,
) {
  return updateCaseInsertPrimaryLogoSlot(
    templateState,
    surfaceId,
    logoKey,
    (slot) => ({
      ...slot,
      layout: getDefaultCaseInsertPrimaryLogoLayout(surfaceId, logoKey),
    }),
    idPrefix,
  )
}

export function clearCaseInsertPrimaryLogoSlotImage<T extends CaseInsertLogoSlotState>(
  templateState: T,
  surfaceId: CaseInsertLogoSurfaceId,
  logoKey: LogoAssetKey,
  idPrefix?: string,
) {
  return updateCaseInsertPrimaryLogoSlot(
    templateState,
    surfaceId,
    logoKey,
    (slot) => ({
      ...slot,
      imageDataUrl: null,
      imageSize: null,
      imageSource: null,
    }),
    idPrefix,
  )
}
