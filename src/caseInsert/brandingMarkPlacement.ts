import type {
  ProjectCaseInsertImageSlot,
} from '../project/projectTypes.ts'
import {
  getCaseInsertMarkLayerKind,
  type CaseInsertMarkLayerKind,
} from './brandingSlotSources.ts'

function isCaseInsertMarkSlotOfKind(
  slot: ProjectCaseInsertImageSlot,
  kind: CaseInsertMarkLayerKind,
) {
  const sourceId = slot.imageSource?.sourceId

  return Boolean(
    sourceId?.startsWith('case-') &&
      getCaseInsertMarkLayerKind(sourceId) === kind,
  )
}

export function getEnabledCaseInsertMarkSlotForKind(
  slots: ProjectCaseInsertImageSlot[],
  kind: CaseInsertMarkLayerKind,
) {
  return slots.find((slot) =>
    slot.enabled && isCaseInsertMarkSlotOfKind(slot, kind)) ?? null
}

export function getEnabledCaseInsertMarkSlotForSourcePrefix(
  slots: ProjectCaseInsertImageSlot[],
  kind: CaseInsertMarkLayerKind,
  sourcePrefix: string,
) {
  return slots.find((slot) => {
    const sourceId = slot.imageSource?.sourceId

    return Boolean(
      slot.enabled &&
        sourceId?.startsWith(sourcePrefix) &&
        isCaseInsertMarkSlotOfKind(slot, kind),
    )
  }) ?? null
}
