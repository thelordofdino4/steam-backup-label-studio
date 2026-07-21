import type {
  EditorRoleFocusRequest,
} from '../../editor/editorRoleFocus.ts'
import type {
  EditorRoleFocusController,
} from '../../editor/editorRoleFocusController.ts'

type FocusRegistrationController = Pick<
  EditorRoleFocusController,
  | 'registerFocusTarget'
  | 'registerFocusTargetFallback'
  | 'registerSectionAlignmentTarget'
>

type RegisterAlwaysMountedMediaFocusTargetsOptions =
  FocusRegistrationController & {
    enableElement: () => HTMLElement | null
    openMediaPanel: () => void
    sectionElement: () => HTMLElement | null
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
  'registerFocusTarget' | 'registerSectionAlignmentTarget'
> & {
  enableElement: () => HTMLElement | null
  openOperatingSystemPanel: () => void
  sectionElement: () => HTMLElement | null
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
  registerSectionAlignmentTarget,
  sectionElement,
}: RegisterAlwaysMountedMediaFocusTargetsOptions) {
  const unregisterSection = registerSectionAlignmentTarget(
    'disc:media-format-mark:section',
    { element: sectionElement },
  )
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
    unregisterSection()
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
  registerSectionAlignmentTarget,
  sectionElement,
}: RegisterAlwaysMountedOperatingSystemFocusTargetOptions) {
  const unregisterSection = registerSectionAlignmentTarget(
    'disc:operating-system-marks:section',
    { element: sectionElement },
  )
  const unregisterEnable = registerFocusTarget(
    'disc:operating-system-marks:enable',
    {
      element: enableElement,
      openAncestors: [openOperatingSystemPanel],
    },
  )

  return () => {
    unregisterEnable()
    unregisterSection()
  }
}
