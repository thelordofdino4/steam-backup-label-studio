import {
  getDiscGuidedSlotGeometry,
  type DiscGuidedLayoutId,
  type DiscGuidedRectGeometry,
} from './discGuidedLayouts.ts'
import {
  resolveDiscGuidedSlot,
  type DiscGuidedSlotId,
  type DiscGuidedSlotState,
  type DiscGuidedSlotSuggestion,
} from './discGuidedSlots.ts'

export const DISC_GAME_TITLE_GUIDED_SLOT_ID =
  'disc:guided:game-title:primary' as const

export type DiscGuidedPlaceholderViewModel = Readonly<{
  slotId: typeof DISC_GAME_TITLE_GUIDED_SLOT_ID
  label: 'Game Title'
  geometry: DiscGuidedRectGeometry
}>

const NO_PLACEHOLDERS = Object.freeze([]) as readonly DiscGuidedPlaceholderViewModel[]

export function projectDiscGameTitleGuidedPlaceholder({
  geometry,
  lifecycle,
}: {
  geometry: DiscGuidedRectGeometry | null
  lifecycle: 'unfilled' | 'suggested' | 'filled' | 'skipped'
}): readonly DiscGuidedPlaceholderViewModel[] {
  if (!geometry || lifecycle !== 'unfilled') {
    return NO_PLACEHOLDERS
  }

  return Object.freeze([
    Object.freeze({
      slotId: DISC_GAME_TITLE_GUIDED_SLOT_ID,
      label: 'Game Title',
      geometry,
    }),
  ])
}

export function createDiscGuidedPlaceholderViewModels({
  activeLayoutId,
  state,
  suggestions,
  skippedSlotIds,
}: {
  activeLayoutId: DiscGuidedLayoutId | null
  state: DiscGuidedSlotState
  suggestions: readonly DiscGuidedSlotSuggestion[]
  skippedSlotIds: ReadonlySet<DiscGuidedSlotId>
}): readonly DiscGuidedPlaceholderViewModel[] {
  if (!activeLayoutId) {
    return NO_PLACEHOLDERS
  }

  const geometry = getDiscGuidedSlotGeometry(
    activeLayoutId,
    DISC_GAME_TITLE_GUIDED_SLOT_ID,
  )
  const resolution = resolveDiscGuidedSlot({
    slotId: DISC_GAME_TITLE_GUIDED_SLOT_ID,
    state,
    suggestions,
    skippedSlotIds,
  })

  return projectDiscGameTitleGuidedPlaceholder({
    geometry,
    lifecycle: resolution.lifecycle,
  })
}
