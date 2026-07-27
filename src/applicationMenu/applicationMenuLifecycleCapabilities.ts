import type {
  ApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'

export function getApplicationMenuLifecycleCapabilities(
  lifecycle: Pick<
    ApplicationLifecycleCompositionRoot,
    'getLifecycleCommandCapabilities'
  >,
) {
  return lifecycle.getLifecycleCommandCapabilities()
}
