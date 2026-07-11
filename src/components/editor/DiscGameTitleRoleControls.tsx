import {
  useCallback,
  useLayoutEffect,
  useRef,
  type ComponentProps,
} from 'react'
import { TitleArtworkControls } from '../sidebar/artwork/TitleArtworkControls.tsx'
import { DiscGameTitleTextControls } from '../sidebar/text/DiscGameTitleTextControls.tsx'
import {
  registerAlwaysMountedGameTitleFocusTargets,
  registerGameTitleArtworkUploadFocusTarget,
} from './discGameTitleRoleFocusRegistration.ts'
import { useEditorRoleFocus } from './editorRoleFocusContext.ts'

export type DiscGameTitleRoleControlsProps = {
  artworkControls: ComponentProps<typeof TitleArtworkControls>
  textControls: ComponentProps<typeof DiscGameTitleTextControls>
}

export function DiscGameTitleRoleControls({
  artworkControls,
  textControls,
}: DiscGameTitleRoleControlsProps) {
  const {
    registerFocusTarget,
    registerFocusTargetFallback,
    setRoleOpen,
  } = useEditorRoleFocus()
  const artworkEnableRef = useRef<HTMLInputElement | null>(null)
  const artworkUploadRef = useRef<HTMLInputElement | null>(null)
  const textFallbackRef = useRef<HTMLInputElement | null>(null)
  const titleArtworkEnabled = artworkControls.projectTitleArtwork.layout.enabled
  const openGameTitleRole = useCallback(
    () => setRoleOpen('game-title', true),
    [setRoleOpen],
  )

  useLayoutEffect(() => registerAlwaysMountedGameTitleFocusTargets({
    artworkEnableElement: () => artworkEnableRef.current,
    openGameTitleRole,
    registerFocusTarget,
    registerFocusTargetFallback,
    textFallbackElement: () => textFallbackRef.current,
  }), [
    openGameTitleRole,
    registerFocusTarget,
    registerFocusTargetFallback,
  ])

  useLayoutEffect(() => {
    if (!titleArtworkEnabled) return undefined

    return registerGameTitleArtworkUploadFocusTarget({
      artworkUploadElement: () => artworkUploadRef.current,
      openGameTitleRole,
      registerFocusTarget,
    })
  }, [openGameTitleRole, registerFocusTarget, titleArtworkEnabled])

  return (
    <>
      <TitleArtworkControls
        {...artworkControls}
        enableControlRef={artworkEnableRef}
        uploadControlRef={artworkUploadRef}
      />
      <DiscGameTitleTextControls
        {...textControls}
        enableControlRef={textFallbackRef}
      />
    </>
  )
}
