import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from 'react'
import { BackgroundArtworkControls } from '../sidebar/artwork/BackgroundArtworkControls.tsx'
import {
  registerBackgroundArtworkFocusTargets,
  shouldOpenBackgroundLocalFilePanelForRequest,
} from './discBackgroundArtworkRoleFocusRegistration.ts'
import { useEditorRoleFocus } from './editorRoleFocusContext.ts'

export type DiscBackgroundArtworkRoleControlsProps = {
  artworkControls: ComponentProps<typeof BackgroundArtworkControls>
}

export function DiscBackgroundArtworkRoleControls({
  artworkControls,
}: DiscBackgroundArtworkRoleControlsProps) {
  const { registerFocusTarget, state } = useEditorRoleFocus()
  const [localFilePanelOpen, setLocalFilePanelOpen] = useState(false)
  const enableRef = useRef<HTMLInputElement | null>(null)
  const localUploadRef = useRef<HTMLInputElement | null>(null)
  const openLocalFilePanel = useCallback(
    () => setLocalFilePanelOpen(true),
    [],
  )
  const localFilePanelFocusPending =
    shouldOpenBackgroundLocalFilePanelForRequest(state.pendingRequest)

  useLayoutEffect(() => registerBackgroundArtworkFocusTargets({
    enableElement: () => enableRef.current,
    localUploadElement: () => localUploadRef.current,
    openLocalFilePanel,
    registerFocusTarget,
  }), [openLocalFilePanel, registerFocusTarget])

  return (
    <BackgroundArtworkControls
      {...artworkControls}
      enableControlRef={enableRef}
      localFilePanelOpen={localFilePanelOpen || localFilePanelFocusPending}
      localUploadControlRef={localUploadRef}
      onLocalFilePanelOpenChange={setLocalFilePanelOpen}
    />
  )
}
