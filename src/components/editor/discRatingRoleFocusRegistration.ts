import type {
  EditorRoleFocusRequest,
} from '../../editor/editorRoleFocus.ts'
import type {
  EditorRoleFocusController,
} from '../../editor/editorRoleFocusController.ts'

type RatingFocusRegistrationController = Pick<
  EditorRoleFocusController,
  'registerFocusTarget' | 'registerFocusTargetFallback'
>

type RegisterAlwaysMountedRatingFocusTargetsOptions =
  RatingFocusRegistrationController & {
    enableElement: () => HTMLElement | null
    openRatingPanel: () => void
  }

type RegisterEnabledRatingSelectFocusTargetsOptions = Pick<
  EditorRoleFocusController,
  'registerFocusTarget'
> & {
  openRatingPanel: () => void
  sourceElement: () => HTMLElement | null
  systemElement: () => HTMLElement | null
}

type RegisterRatingValueFocusTargetOptions = Pick<
  EditorRoleFocusController,
  'registerFocusTarget'
> & {
  openRatingPanel: () => void
  valueElement: () => HTMLElement | null
}

export function shouldOpenRatingPanelForRequest(
  request: EditorRoleFocusRequest | null,
) {
  return request?.behavior === 'focus' &&
    request.destination.roleId === 'game-info-logos' &&
    request.destination.focusTarget.startsWith('disc:rating:')
}

export function registerAlwaysMountedRatingFocusTargets({
  enableElement,
  openRatingPanel,
  registerFocusTarget,
  registerFocusTargetFallback,
}: RegisterAlwaysMountedRatingFocusTargetsOptions) {
  const unregisterEnable = registerFocusTarget('disc:rating:enable', {
    element: enableElement,
    openAncestors: [openRatingPanel],
  })
  const unregisterSystemFallback = registerFocusTargetFallback(
    'disc:rating:system',
    'disc:rating:enable',
  )
  const unregisterValueFallback = registerFocusTargetFallback(
    'disc:rating:value',
    'disc:rating:enable',
  )
  const unregisterSourceFallback = registerFocusTargetFallback(
    'disc:rating:source',
    'disc:rating:enable',
  )

  return () => {
    unregisterSourceFallback()
    unregisterValueFallback()
    unregisterSystemFallback()
    unregisterEnable()
  }
}

export function registerEnabledRatingSelectFocusTargets({
  openRatingPanel,
  registerFocusTarget,
  sourceElement,
  systemElement,
}: RegisterEnabledRatingSelectFocusTargetsOptions) {
  const openAncestors = [openRatingPanel]
  const unregisterSystem = registerFocusTarget('disc:rating:system', {
    element: systemElement,
    openAncestors,
  })
  const unregisterSource = registerFocusTarget('disc:rating:source', {
    element: sourceElement,
    openAncestors,
  })

  return () => {
    unregisterSource()
    unregisterSystem()
  }
}

export function registerRatingValueFocusTarget({
  openRatingPanel,
  registerFocusTarget,
  valueElement,
}: RegisterRatingValueFocusTargetOptions) {
  return registerFocusTarget('disc:rating:value', {
    element: valueElement,
    openAncestors: [openRatingPanel],
  })
}
