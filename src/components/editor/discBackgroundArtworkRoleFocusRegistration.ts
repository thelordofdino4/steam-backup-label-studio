import type {
  EditorRoleFocusRequest,
} from '../../editor/editorRoleFocus.ts'
import type {
  EditorRoleFocusController,
} from '../../editor/editorRoleFocusController.ts'

type RegisterBackgroundArtworkFocusTargetsOptions = Pick<
  EditorRoleFocusController,
  'registerFocusTarget'
> & {
  enableElement: () => HTMLElement | null
  localUploadElement: () => HTMLElement | null
  openLocalFilePanel: () => void
}

export function shouldOpenBackgroundLocalFilePanelForRequest(
  request: EditorRoleFocusRequest | null,
) {
  return request?.behavior === 'focus' &&
    request.destination.roleId === 'background-artwork' &&
    request.destination.focusTarget === 'disc:background-image:local-upload'
}

export function registerBackgroundArtworkFocusTargets({
  enableElement,
  localUploadElement,
  openLocalFilePanel,
  registerFocusTarget,
}: RegisterBackgroundArtworkFocusTargetsOptions) {
  const unregisterEnable = registerFocusTarget(
    'disc:background-image:enable',
    { element: enableElement },
  )
  const unregisterLocalUpload = registerFocusTarget(
    'disc:background-image:local-upload',
    {
      element: localUploadElement,
      openAncestors: [openLocalFilePanel],
    },
  )

  return () => {
    unregisterLocalUpload()
    unregisterEnable()
  }
}
