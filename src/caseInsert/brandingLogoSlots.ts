import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import type { LogoAssetKey } from '../project/projectLogoAssets.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertSurfaceState,
} from '../project/projectTypes.ts'
import { createDefaultCaseInsertImageSlot } from './defaults.ts'
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

const CASE_INSERT_PRIMARY_LOGO_LAYOUTS:
Record<CaseInsertTemplatePaneId, Record<LogoAssetKey, ProjectCaseInsertLayout>> = {
  cover: {
    developer: { scale: 1, x: 20, y: 84, rotation: 0 },
    publisher: { scale: 1, x: 80, y: 84, rotation: 0 },
  },
  tray: {
    developer: { scale: 1, x: 18, y: 88, rotation: 0 },
    publisher: { scale: 1, x: 82, y: 88, rotation: 0 },
  },
}

export function getCaseInsertPrimaryLogoLabel(logoKey: LogoAssetKey) {
  return logoKey === 'developer' ? 'Developer logo' : 'Publisher logo'
}

export function getCaseInsertPrimaryLogoSourceId(logoKey: LogoAssetKey) {
  return `case-logo:${logoKey}`
}

export function getDefaultCaseInsertPrimaryLogoLayout(
  paneId: CaseInsertTemplatePaneId,
  logoKey: LogoAssetKey,
) {
  return CASE_INSERT_PRIMARY_LOGO_LAYOUTS[paneId][logoKey]
}

function normalizeLabel(value: string) {
  return value.trim().toLocaleLowerCase()
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

export function getCaseInsertPrimaryLogoSlot(
  templateState: ProjectCaseInsertSurfaceState,
  logoKey: LogoAssetKey,
) {
  return templateState.logoSlots.find(
    (slot) => getCaseInsertPrimaryLogoKey(slot) === logoKey,
  ) ?? null
}

export function getCaseInsertAdditionalLogoSlots(
  templateState: ProjectCaseInsertSurfaceState,
) {
  return templateState.logoSlots.filter(
    (slot) => getCaseInsertPrimaryLogoKey(slot) === null,
  )
}

function getNextCaseInsertLogoSlotIndex(
  paneId: CaseInsertTemplatePaneId,
  slots: ProjectCaseInsertImageSlot[],
) {
  const { idPrefix } = getCaseInsertImageSlotGroupConfig(paneId, 'logoSlots')
  let index = slots.length + 1

  while (slots.some(({ id }) => id === `${idPrefix}-${index}`)) {
    index += 1
  }

  return index
}

function createCaseInsertPrimaryLogoSlot(
  paneId: CaseInsertTemplatePaneId,
  logoKey: LogoAssetKey,
  index: number,
) {
  const { idPrefix } = getCaseInsertImageSlotGroupConfig(paneId, 'logoSlots')

  return createDefaultCaseInsertImageSlot(
    `${idPrefix}-${index}`,
    getCaseInsertPrimaryLogoLabel(logoKey),
    {
      fit: 'contain',
      layout: getDefaultCaseInsertPrimaryLogoLayout(paneId, logoKey),
    },
  )
}

function normalizeCaseInsertPrimaryLogoSlot(
  slot: ProjectCaseInsertImageSlot,
  paneId: CaseInsertTemplatePaneId,
  logoKey: LogoAssetKey,
): ProjectCaseInsertImageSlot {
  return {
    ...slot,
    label: getCaseInsertPrimaryLogoLabel(logoKey),
    fit: 'contain',
    layout: {
      ...getDefaultCaseInsertPrimaryLogoLayout(paneId, logoKey),
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

function updateCaseInsertPrimaryLogoSlot(
  templateState: ProjectCaseInsertSurfaceState,
  paneId: CaseInsertTemplatePaneId,
  logoKey: LogoAssetKey,
  updater: (slot: ProjectCaseInsertImageSlot) => ProjectCaseInsertImageSlot,
): ProjectCaseInsertSurfaceState {
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
              paneId,
              logoKey,
            )
          : slot),
    }
  }

  const slot = createCaseInsertPrimaryLogoSlot(
    paneId,
    logoKey,
    getNextCaseInsertLogoSlotIndex(paneId, templateState.logoSlots),
  )

  return {
    ...templateState,
    logoSlots: [
      ...templateState.logoSlots,
      normalizeCaseInsertPrimaryLogoSlot(updater(slot), paneId, logoKey),
    ],
  }
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

export function setCaseInsertPrimaryLogoSlotEnabled(
  templateState: ProjectCaseInsertSurfaceState,
  paneId: CaseInsertTemplatePaneId,
  logoKey: LogoAssetKey,
  enabled: boolean,
) {
  return updateCaseInsertPrimaryLogoSlot(
    templateState,
    paneId,
    logoKey,
    (slot) => setCaseInsertImageSlotEnabled(slot, enabled),
  )
}

export function setCaseInsertPrimaryLogoSlotImage(
  templateState: ProjectCaseInsertSurfaceState,
  paneId: CaseInsertTemplatePaneId,
  logoKey: LogoAssetKey,
  image: CaseInsertImageSlotImageInput,
) {
  return updateCaseInsertPrimaryLogoSlot(
    templateState,
    paneId,
    logoKey,
    (slot) => setCaseInsertImageSlotImage(
      slot,
      withPrimaryLogoImageSource(logoKey, image),
    ),
  )
}

export function updateCaseInsertPrimaryLogoSlotLayoutField(
  templateState: ProjectCaseInsertSurfaceState,
  paneId: CaseInsertTemplatePaneId,
  logoKey: LogoAssetKey,
  field: CaseInsertLayoutField,
  value: number,
) {
  return updateCaseInsertPrimaryLogoSlot(
    templateState,
    paneId,
    logoKey,
    (slot) => updateCaseInsertImageSlotLayoutField(slot, field, value),
  )
}

export function resetCaseInsertPrimaryLogoSlotLayout(
  templateState: ProjectCaseInsertSurfaceState,
  paneId: CaseInsertTemplatePaneId,
  logoKey: LogoAssetKey,
) {
  return updateCaseInsertPrimaryLogoSlot(
    templateState,
    paneId,
    logoKey,
    (slot) => ({
      ...slot,
      layout: getDefaultCaseInsertPrimaryLogoLayout(paneId, logoKey),
    }),
  )
}

export function clearCaseInsertPrimaryLogoSlotImage(
  templateState: ProjectCaseInsertSurfaceState,
  paneId: CaseInsertTemplatePaneId,
  logoKey: LogoAssetKey,
) {
  return updateCaseInsertPrimaryLogoSlot(
    templateState,
    paneId,
    logoKey,
    (slot) => ({
      ...slot,
      imageDataUrl: null,
      imageSize: null,
      imageSource: null,
    }),
  )
}
