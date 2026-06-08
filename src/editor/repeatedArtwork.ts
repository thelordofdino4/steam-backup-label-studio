export const REPEATED_ARTWORK_LABEL_PREFIX = 'Artwork'

export type RepeatedArtworkFeatureGate = {
  enabled: boolean
} | {
  additionalArtworkEnabled: boolean
}

export type RepeatedArtworkItemGate = {
  enabled: boolean
}

export type RepeatedArtworkIdItem = {
  id: string
}

export type RepeatedArtworkLabelItem = {
  label?: string | null
}

export type RepeatedArtworkFrameSummary = {
  enabled: boolean
  shape: string
}

function normalizeSlotNumber(slotNumber: number) {
  return Number.isInteger(slotNumber) && slotNumber > 0 ? slotNumber : 1
}

export function createRepeatedArtworkLabel(slotNumber: number) {
  return `${REPEATED_ARTWORK_LABEL_PREFIX} ${normalizeSlotNumber(slotNumber)}`
}

export function createRepeatedArtworkLabelForIndex(index: number) {
  return createRepeatedArtworkLabel(index + 1)
}

export function normalizeRepeatedArtworkLabel(
  label: unknown,
  fallbackSlotNumber: number,
) {
  return typeof label === 'string' && label.trim()
    ? label
    : createRepeatedArtworkLabel(fallbackSlotNumber)
}

export function getNextRepeatedArtworkSlotNumber(
  items: readonly RepeatedArtworkIdItem[],
  idPrefix: string,
) {
  let slotNumber = items.length + 1

  while (items.some(({ id }) => id === `${idPrefix}-${slotNumber}`)) {
    slotNumber += 1
  }

  return slotNumber
}

export function createRepeatedArtworkSlotId(
  idPrefix: string,
  slotNumber: number,
) {
  return `${idPrefix}-${normalizeSlotNumber(slotNumber)}`
}

export function getNextRepeatedArtworkLabelNumber(
  items: readonly RepeatedArtworkLabelItem[],
) {
  const usedNumbers = new Set<number>()

  items.forEach(({ label }) => {
    const match = label?.trim().match(/^Artwork\s+(\d+)$/i)
    const slotNumber = match ? Number(match[1]) : null

    if (slotNumber && Number.isInteger(slotNumber) && slotNumber > 0) {
      usedNumbers.add(slotNumber)
    }
  })

  let slotNumber = items.length + 1

  while (usedNumbers.has(slotNumber)) {
    slotNumber += 1
  }

  return slotNumber
}

export function getFeatureVisibleRepeatedArtworkItems<T>(
  feature: RepeatedArtworkFeatureGate,
  items: readonly T[],
) {
  const isEnabled = 'additionalArtworkEnabled' in feature
    ? feature.additionalArtworkEnabled
    : feature.enabled

  return isEnabled ? [...items] : []
}

export function shouldRenderRepeatedArtworkItem({
  featureEnabled,
  itemEnabled,
  hasRenderableContent = true,
}: {
  featureEnabled: boolean
  itemEnabled: boolean
  hasRenderableContent?: boolean
}) {
  return featureEnabled && itemEnabled && hasRenderableContent
}

export function getRepeatedArtworkFrameSummary(
  frame: RepeatedArtworkFrameSummary | null | undefined,
) {
  if (!frame) {
    return null
  }

  return frame.enabled ? `${frame.shape} frame` : 'no frame'
}

export function createRepeatedArtworkSummary({
  enabled,
  imageSummary,
  frame,
  details = [],
}: {
  enabled: boolean
  imageSummary: string
  frame?: RepeatedArtworkFrameSummary | null
  details?: Array<string | null | undefined>
}) {
  return [
    enabled ? 'shown' : 'hidden',
    imageSummary,
    getRepeatedArtworkFrameSummary(frame),
    ...details,
  ].filter(Boolean).join(' · ')
}
