import type {
  ApplicationLifecycleCompositionRoot, DiscBackgroundCompoundCompanion, DiscPresetSiblingFields,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import type { DiscRolePresetCurrentState } from './appDiscRolePresetApplication.ts'
import type { DiscRolePresetFeatureOwner } from '../layout/discRolePresets.ts'
import type { DiscBackgroundEdit } from '../lifecycle/projectSession.ts'
import type { RatingBadgeLayout } from '../project/projectTypes.ts'
import { normalizedProjectValueMatches } from '../lifecycle/canonicalProject.ts'

type DirectPresetMirrorField = Exclude<keyof DiscPresetSiblingFields, 'discText' | 'ratingBadge'>
export type DiscBackgroundCompoundMirrorScope = Readonly<{
  currentInteraction: boolean
  presetField(field: DirectPresetMirrorField): boolean
  discTextLayout: boolean
  discTextSettings: boolean
  primaryRatingLayout: boolean
  supplementalRatingLayout: boolean
  guided: boolean
}>

/** A mirror is a projection of accepted values, never an optimistic write
 * requiring rollback. The owner and expected revision are bound before planning. */
export function commitPreparedDiscBackgroundCompound(
  root: Pick<ApplicationLifecycleCompositionRoot, 'commitDiscBackgroundCompound' | 'getLifecycleState'>,
  edit: DiscBackgroundEdit,
  companion: DiscBackgroundCompoundCompanion,
  mirror: (scope: DiscBackgroundCompoundMirrorScope) => void,
) {
  const result = root.commitDiscBackgroundCompound(edit, companion)
  if (result === 'committed' || result === 'no-op') {
    const current = root.getLifecycleState().activeSession
    if (current?.kind !== 'disc' || current.id !== edit.sessionId) return result
    const acceptedRevision = edit.expectedRevision + (result === 'committed' ? 1 : 0)
    const currentInteraction = current.revision === acceptedRevision
    // Store subscribers run after acceptance and can reenter. A later
    // same-session revision may retain some accepted fields. Mirror only
    // those survivors; never undo any field the newer writer changed.
    const fields = companion.kind === 'preset' ? companion.fields : undefined
    const matches = (candidate: unknown, actual: unknown) =>
      currentInteraction || normalizedProjectValueMatches(candidate, actual)
    const matchesRating = (
      patch: NonNullable<DiscPresetSiblingFields['ratingBadge']>['layout'],
      actual: RatingBadgeLayout | undefined,
    ) => currentInteraction || !!actual && Object.entries(patch).every(([field, value]) =>
      value === actual[field as keyof RatingBadgeLayout])
    mirror({
      currentInteraction,
      presetField: field => !!fields && Object.hasOwn(fields, field) &&
        matches(fields[field], current.project[field]),
      discTextLayout: fields?.discText?.layout !== undefined &&
        matches(fields.discText.layout, current.project.discText?.layout),
      discTextSettings: fields?.discText?.settings !== undefined &&
        matches(fields.discText.settings, current.project.discText?.settings),
      primaryRatingLayout: fields?.ratingBadge !== undefined &&
        matchesRating(fields.ratingBadge.layout, current.project.ratingBadge?.layout),
      supplementalRatingLayout: fields?.ratingBadge !== undefined &&
        matchesRating(fields.ratingBadge.uskLayout, current.project.ratingBadge?.uskBadge?.layout),
      guided: companion.guidedLayout !== undefined &&
        matches(companion.guidedLayout ?? undefined, current.project.editor?.guidedLayout),
    })
  }
  return result
}

/** Project only planned writes; text content and rating badge content are
 * not layout-preset targets. */
export function projectDiscPresetSiblingFields(
  before: DiscRolePresetCurrentState,
  planned: DiscRolePresetCurrentState,
  touchedOwners: readonly DiscRolePresetFeatureOwner[],
  ratingVisibility: 'preserve' | 'explicit' = 'explicit',
): DiscPresetSiblingFields {
  const fields: DiscPresetSiblingFields = {}
  for (const owner of touchedOwners) {
    switch (owner) {
      case 'titleArtwork': fields.titleArtwork = planned.titleArtwork; break
      case 'logoAssets': fields.logoAssets = planned.logoAssets; break
      case 'ratingBadge': {
        const placement = ({ x, y, scale }: RatingBadgeLayout) => ({ x, y, scale })
        const { layout, uskBadge } = planned.ratingBadge
        fields.ratingBadge = ratingVisibility === 'preserve'
          ? { layout: placement(layout), uskLayout: placement(uskBadge.layout) }
          : { layout, uskLayout: uskBadge.layout }
        break
      }
      case 'mediaMark': fields.mediaMark = planned.mediaMark; break
      case 'platformMarks': fields.platformMarks = planned.platformMarks; break
      case 'technicalMarks': fields.technicalMarks = planned.technicalMarks; break
      case 'discText':
        fields.discText = { layout: planned.discTextLayout,
          ...(before.discTextSettings === planned.discTextSettings ? {} : { settings: planned.discTextSettings }) }
        break
    }
  }
  return fields
}
