type CaseInsertArtworkViewportSlotLike = Readonly<{
  reservedArtworkViewport?: unknown
}>

/**
 * Active viewport artwork is stacked before title artwork. Null legacy slots
 * retain their historical post-title order and drawing path.
 */
export function partitionCaseInsertArtworkViewportSlots<
  TSlot extends CaseInsertArtworkViewportSlotLike,
>(slots: readonly TSlot[]) {
  const activeViewportSlots: TSlot[] = []
  const legacySlots: TSlot[] = []

  for (const slot of slots) {
    if (slot.reservedArtworkViewport == null) {
      legacySlots.push(slot)
    } else {
      activeViewportSlots.push(slot)
    }
  }

  return Object.freeze({
    activeViewportSlots: Object.freeze(activeViewportSlots),
    legacySlots: Object.freeze(legacySlots),
  })
}
