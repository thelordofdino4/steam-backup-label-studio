import type {
  EditorRoleFocusRequest,
} from '../../editor/editorRoleFocus.ts'
import type {
  EditorRoleFocusController,
} from '../../editor/editorRoleFocusController.ts'

type FocusRegistrationController = Pick<
  EditorRoleFocusController,
  'registerFocusTarget' | 'registerFocusTargetFallback'
>

type RegisterAlwaysMountedMediaFocusTargetsOptions =
  FocusRegistrationController & {
    enableElement: () => HTMLElement | null
    openMediaPanel: () => void
  }

type RegisterEnabledMediaFormatFocusTargetOptions = Pick<
  EditorRoleFocusController,
  'registerFocusTarget'
> & {
  formatElement: () => HTMLElement | null
  openMediaPanel: () => void
}

type RegisterAlwaysMountedOperatingSystemFocusTargetOptions = Pick<
  EditorRoleFocusController,
  'registerFocusTarget'
> & {
  enableElement: () => HTMLElement | null
  openOperatingSystemPanel: () => void
}

export function shouldOpenMediaPanelForRequest(
  request: EditorRoleFocusRequest | null,
) {
  return request?.behavior === 'focus' &&
    request.destination.roleId === 'game-info-logos' &&
    (request.destination.focusTarget === 'disc:media-format-mark:enable' ||
      request.destination.focusTarget === 'disc:media-format-mark:format')
}

export function shouldOpenOperatingSystemPanelForRequest(
  request: EditorRoleFocusRequest | null,
) {
  return request?.behavior === 'focus' &&
    request.destination.roleId === 'game-info-logos' &&
    request.destination.focusTarget ===
      'disc:operating-system-marks:enable'
}

export function registerAlwaysMountedMediaFocusTargets({
  enableElement,
  openMediaPanel,
  registerFocusTarget,
  registerFocusTargetFallback,
}: RegisterAlwaysMountedMediaFocusTargetsOptions) {
  const unregisterEnable = registerFocusTarget(
    'disc:media-format-mark:enable',
    {
      element: enableElement,
      openAncestors: [openMediaPanel],
    },
  )
  const unregisterFormatFallback = registerFocusTargetFallback(
    'disc:media-format-mark:format',
    'disc:media-format-mark:enable',
  )

  return () => {
    unregisterFormatFallback()
    unregisterEnable()
  }
}

export function registerEnabledMediaFormatFocusTarget({
  formatElement,
  openMediaPanel,
  registerFocusTarget,
}: RegisterEnabledMediaFormatFocusTargetOptions) {
  return registerFocusTarget('disc:media-format-mark:format', {
    element: formatElement,
    openAncestors: [openMediaPanel],
  })
}

export function registerAlwaysMountedOperatingSystemFocusTarget({
  enableElement,
  openOperatingSystemPanel,
  registerFocusTarget,
}: RegisterAlwaysMountedOperatingSystemFocusTargetOptions) {
  return registerFocusTarget('disc:operating-system-marks:enable', {
    element: enableElement,
    openAncestors: [openOperatingSystemPanel],
  })
}
