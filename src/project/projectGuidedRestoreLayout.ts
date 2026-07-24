import {
  getDiscGuidedLayoutDefinition,
} from '../guidedPresets/discGuidedLayouts.ts'
import {
  INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  type DiscGuidedWorkflowState,
} from '../guidedPresets/discGuidedWorkflow.ts'
import type {
  DiscPresetPlacementTarget,
} from '../presets/discPresetDefinition.ts'
import {
  IMPLEMENTED_DISC_PRESET_PLACEMENT_TARGETS,
} from '../presets/discPresetProductionAdapterRegistry.ts'
import {
  DISC_PRESET_REGISTRY,
  type DiscPresetRegistry,
} from '../presets/discPresetRegistry.ts'
import {
  createDiscPresetTemplateResolutionInput,
  resolveDiscPresetDefinition,
} from '../presets/discPresetResolution.ts'
import type { DiscTemplate } from '../types/template.ts'

export type DiscGuidedRestoreLayoutPolicy = Readonly<{
  workflow: DiscGuidedWorkflowState
  preservedTargets: readonly DiscPresetPlacementTarget[]
  preservesTarget(target: DiscPresetPlacementTarget): boolean
}>

type ResolveDiscGuidedRestoreLayoutPolicyInput = Readonly<{
  workflow: DiscGuidedWorkflowState
  selectedDiscTemplate: DiscTemplate
  registry?: DiscPresetRegistry
}>

const IMPLEMENTED_TARGETS = new Set<string>(
  IMPLEMENTED_DISC_PRESET_PLACEMENT_TARGETS,
)

function createPolicy(
  workflow: DiscGuidedWorkflowState,
  preservedTargets: readonly DiscPresetPlacementTarget[],
): DiscGuidedRestoreLayoutPolicy {
  const targetSet = new Set(preservedTargets)

  return Object.freeze({
    workflow,
    preservedTargets: Object.freeze([...preservedTargets]),
    preservesTarget(target: DiscPresetPlacementTarget) {
      return targetSet.has(target)
    },
  })
}

function deactivatePolicy(): DiscGuidedRestoreLayoutPolicy {
  return createPolicy(INITIAL_DISC_GUIDED_WORKFLOW_STATE, [])
}

/**
 * Resolves which normalized saved placements remain authoritative during load.
 *
 * Generic safe-zone clamping remains the default. A placement is overlaid only
 * when the saved guided identity maps to its exact canonical preset revision,
 * that preset resolves for the restored template, and the owning slot remains
 * supported. Omission and completion are presentation state and intentionally
 * do not participate in geometry restoration.
 */
export function resolveDiscGuidedRestoreLayoutPolicy({
  workflow,
  selectedDiscTemplate,
  registry = DISC_PRESET_REGISTRY,
}: ResolveDiscGuidedRestoreLayoutPolicyInput): DiscGuidedRestoreLayoutPolicy {
  if (!workflow.activeLayout) return createPolicy(workflow, [])

  try {
    const layout = getDiscGuidedLayoutDefinition(
      workflow.activeLayout.id,
      workflow.activeLayout.version,
    )

    if (!layout) return deactivatePolicy()

    const definition = registry.get(layout.presetId, layout.version)

    if (
      !definition ||
      definition.id !== layout.presetId ||
      definition.revision !== layout.version
    ) {
      return deactivatePolicy()
    }

    const resolution = resolveDiscPresetDefinition({
      definition,
      template: createDiscPresetTemplateResolutionInput(
        selectedDiscTemplate,
      ),
    })

    if (resolution.status === 'rejected') return deactivatePolicy()

    const activeSlotIds = new Set(layout.slotOrder)
    const preservedTargets: DiscPresetPlacementTarget[] = []

    for (const slot of resolution.preset.slots) {
      if (
        !activeSlotIds.has(slot.id) ||
        slot.status === 'unsupported'
      ) {
        continue
      }

      for (const placement of slot.placements) {
        if (
          IMPLEMENTED_TARGETS.has(placement.target) &&
          !preservedTargets.includes(placement.target)
        ) {
          preservedTargets.push(placement.target)
        }
      }
    }

    return createPolicy(workflow, preservedTargets)
  } catch {
    return deactivatePolicy()
  }
}
