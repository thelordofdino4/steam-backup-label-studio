import type {
  ContextualTextControlId,
  ContextualTextTargetCapability,
  ContextualTextTargetCapabilityId,
} from '../text/contextualTextControlViewModel.ts'
import {
  getContextualTextTargetCapability,
  hasContextualTextControlEquivalent,
  isContextualTextControlSupportedForTarget,
} from '../text/contextualTextControlViewModel.ts'
import type { DiscTextKey, DiscTextLayout } from './types.ts'

export type DiscTextSidebarControlPolicyParams = {
  controlId: ContextualTextControlId
  key: DiscTextKey
  layout: DiscTextLayout
}

export function getDiscTextSidebarTargetCapabilityId(
  key: DiscTextKey,
  layout: DiscTextLayout,
): ContextualTextTargetCapabilityId {
  return key === 'copyright' && layout.mode === 'curved'
    ? 'curvedDiscCopyrightText'
    : 'straightDiscText'
}

export function getDiscTextSidebarTargetCapability(
  key: DiscTextKey,
  layout: DiscTextLayout,
): ContextualTextTargetCapability {
  return getContextualTextTargetCapability(
    getDiscTextSidebarTargetCapabilityId(key, layout),
  )
}

export function getDiscTextSidebarException(
  key: DiscTextKey,
  layout: DiscTextLayout,
) {
  return getDiscTextSidebarTargetCapability(key, layout).sidebarException
}

export function shouldShowDiscTextSidebarControl({
  controlId,
  key,
  layout,
}: DiscTextSidebarControlPolicyParams) {
  const targetId = getDiscTextSidebarTargetCapabilityId(key, layout)
  const target = getContextualTextTargetCapability(targetId)

  if (!target.supportsContextualEditor) {
    return true
  }

  if (!hasContextualTextControlEquivalent(controlId)) {
    return true
  }

  return !isContextualTextControlSupportedForTarget(targetId, controlId)
}
