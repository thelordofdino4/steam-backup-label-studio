import type {
  EditorRoleFocusController,
} from '../../editor/editorRoleFocusController.ts'

type AdditionalArtworkFocusRegistrationController = Pick<
  EditorRoleFocusController,
  'registerFocusTarget' | 'registerFocusTargetFallback'
>

type RegisterAlwaysMountedAdditionalArtworkFocusTargetsOptions =
  AdditionalArtworkFocusRegistrationController & {
    enableElement: () => HTMLElement | null
  }

type RegisterAdditionalArtworkAddFocusTargetOptions = Pick<
  EditorRoleFocusController,
  'registerFocusTarget'
> & {
  addElement: () => HTMLElement | null
}

export function registerAlwaysMountedAdditionalArtworkFocusTargets({
  enableElement,
  registerFocusTarget,
  registerFocusTargetFallback,
}: RegisterAlwaysMountedAdditionalArtworkFocusTargetsOptions) {
  const unregisterEnable = registerFocusTarget(
    'disc:additional-artwork:enable',
    { element: enableElement },
  )
  const unregisterAddFallback = registerFocusTargetFallback(
    'disc:additional-artwork:add',
    'disc:additional-artwork:enable',
  )

  return () => {
    unregisterAddFallback()
    unregisterEnable()
  }
}

export function registerAdditionalArtworkAddFocusTarget({
  addElement,
  registerFocusTarget,
}: RegisterAdditionalArtworkAddFocusTargetOptions) {
  return registerFocusTarget('disc:additional-artwork:add', {
    element: addElement,
  })
}
