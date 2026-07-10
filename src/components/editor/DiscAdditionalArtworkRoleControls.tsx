import {
  useLayoutEffect,
  useRef,
  type ComponentProps,
} from 'react'
import {
  AdditionalArtworkControls,
} from '../sidebar/artwork/AdditionalArtworkControls.tsx'
import {
  registerAdditionalArtworkAddFocusTarget,
  registerAlwaysMountedAdditionalArtworkFocusTargets,
} from './discAdditionalArtworkRoleFocusRegistration.ts'
import { useEditorRoleFocus } from './editorRoleFocusContext.ts'

export type DiscAdditionalArtworkRoleControlsProps = {
  artworkControls: ComponentProps<typeof AdditionalArtworkControls>
}

export function DiscAdditionalArtworkRoleControls({
  artworkControls,
}: DiscAdditionalArtworkRoleControlsProps) {
  const {
    registerFocusTarget,
    registerFocusTargetFallback,
  } = useEditorRoleFocus()
  const enableRef = useRef<HTMLInputElement | null>(null)
  const addRef = useRef<HTMLButtonElement | null>(null)
  const additionalArtworkEnabled =
    artworkControls.projectAdditionalArtwork.enabled

  useLayoutEffect(() => registerAlwaysMountedAdditionalArtworkFocusTargets({
    enableElement: () => enableRef.current,
    registerFocusTarget,
    registerFocusTargetFallback,
  }), [registerFocusTarget, registerFocusTargetFallback])

  useLayoutEffect(() => {
    if (!additionalArtworkEnabled) return undefined

    return registerAdditionalArtworkAddFocusTarget({
      addElement: () => addRef.current,
      registerFocusTarget,
    })
  }, [additionalArtworkEnabled, registerFocusTarget])

  return (
    <AdditionalArtworkControls
      {...artworkControls}
      addControlRef={addRef}
      enableControlRef={enableRef}
    />
  )
}
