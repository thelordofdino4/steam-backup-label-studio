import {
  useLayoutEffect,
  useMemo,
  useRef,
  type ComponentProps,
} from 'react'
import {
  AdditionalArtworkControls,
} from '../sidebar/artwork/AdditionalArtworkControls.tsx'
import {
  registerAdditionalArtworkAddFocusTarget,
  registerAdditionalArtworkItemFallbacks,
  registerAlwaysMountedAdditionalArtworkFocusTargets,
} from './discAdditionalArtworkRoleFocusRegistration.ts'
import { DiscAdditionalArtworkItemControls } from './DiscAdditionalArtworkItemControls.tsx'
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
  const elementIds = useMemo(
    () => artworkControls.projectAdditionalArtwork.elements.map(({ id }) => id),
    [artworkControls.projectAdditionalArtwork.elements],
  )

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

  useLayoutEffect(() => registerAdditionalArtworkItemFallbacks({
    elementIds,
    registerFocusTargetFallback,
  }), [elementIds, registerFocusTargetFallback])

  return (
    <AdditionalArtworkControls
      {...artworkControls}
      ElementControlsComponent={DiscAdditionalArtworkItemControls}
      addControlRef={addRef}
      enableControlRef={enableRef}
    />
  )
}
