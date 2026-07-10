import type {
  EditorRoleFocusController,
} from '../../editor/editorRoleFocusController.ts'

type GameTitleFocusRegistrationController = Pick<
  EditorRoleFocusController,
  'registerFocusTarget' | 'registerFocusTargetFallback'
>

type RegisterAlwaysMountedGameTitleFocusTargetsOptions =
  GameTitleFocusRegistrationController & {
    artworkEnableElement: () => HTMLElement | null
    openGameTitleRole: () => void
    textFallbackElement: () => HTMLElement | null
  }

type RegisterGameTitleArtworkUploadFocusTargetOptions =
  Pick<EditorRoleFocusController, 'registerFocusTarget'> & {
    artworkUploadElement: () => HTMLElement | null
    openGameTitleRole: () => void
  }

export function registerAlwaysMountedGameTitleFocusTargets({
  artworkEnableElement,
  openGameTitleRole,
  registerFocusTarget,
  registerFocusTargetFallback,
  textFallbackElement,
}: RegisterAlwaysMountedGameTitleFocusTargetsOptions) {
  const openAncestors = [openGameTitleRole]
  const unregisterArtworkEnable = registerFocusTarget(
    'disc:game-title:artwork-enable',
    {
      element: artworkEnableElement,
      openAncestors,
    },
  )
  const unregisterTextFallback = registerFocusTarget(
    'disc:game-title:text-fallback',
    {
      element: textFallbackElement,
      openAncestors,
    },
  )
  const unregisterArtworkUploadFallback = registerFocusTargetFallback(
    'disc:game-title:artwork-upload',
    'disc:game-title:artwork-enable',
  )

  return () => {
    unregisterArtworkUploadFallback()
    unregisterTextFallback()
    unregisterArtworkEnable()
  }
}

export function registerGameTitleArtworkUploadFocusTarget({
  artworkUploadElement,
  openGameTitleRole,
  registerFocusTarget,
}: RegisterGameTitleArtworkUploadFocusTargetOptions) {
  return registerFocusTarget('disc:game-title:artwork-upload', {
    element: artworkUploadElement,
    openAncestors: [openGameTitleRole],
  })
}
