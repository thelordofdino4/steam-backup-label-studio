import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from 'react'
import { getActiveRatingSystemForBadge } from '../../project/projectMetadata.ts'
import { GameInfoLogoControls } from '../sidebar/branding/GameInfoLogoControls.tsx'
import {
  registerAlwaysMountedMediaFocusTargets,
  registerAlwaysMountedOperatingSystemFocusTarget,
  registerEnabledMediaFormatFocusTarget,
  shouldOpenMediaPanelForRequest,
  shouldOpenOperatingSystemPanelForRequest,
} from './discGameInfoRoleFocusRegistration.ts'
import {
  registerAlwaysMountedRatingFocusTargets,
  registerEnabledRatingSelectFocusTargets,
  registerRatingValueFocusTarget,
  shouldOpenRatingPanelForRequest,
} from './discRatingRoleFocusRegistration.ts'
import { useEditorRoleFocus } from './editorRoleFocusContext.ts'

export type DiscGameInfoLogoRoleControlsProps = {
  brandingControls: ComponentProps<typeof GameInfoLogoControls>
}

export function DiscGameInfoLogoRoleControls({
  brandingControls,
}: DiscGameInfoLogoRoleControlsProps) {
  const {
    registerFocusTarget,
    registerFocusTargetFallback,
    state,
  } = useEditorRoleFocus()
  const [ratingPanelOpen, setRatingPanelOpen] = useState(false)
  const [mediaPanelOpen, setMediaPanelOpen] = useState(false)
  const [operatingSystemPanelOpen, setOperatingSystemPanelOpen] =
    useState(false)
  const ratingEnableRef = useRef<HTMLInputElement | null>(null)
  const ratingSystemRef = useRef<HTMLSelectElement | null>(null)
  const ratingValueRef = useRef<
    HTMLInputElement | HTMLSelectElement | null
  >(null)
  const ratingSourceRef = useRef<HTMLSelectElement | null>(null)
  const mediaEnableRef = useRef<HTMLInputElement | null>(null)
  const mediaFormatRef = useRef<HTMLSelectElement | null>(null)
  const operatingSystemEnableRef = useRef<HTMLInputElement | null>(null)
  const openRatingPanel = useCallback(() => setRatingPanelOpen(true), [])
  const openMediaPanel = useCallback(() => setMediaPanelOpen(true), [])
  const openOperatingSystemPanel = useCallback(
    () => setOperatingSystemPanelOpen(true),
    [],
  )
  const setRatingValueControlRef = useCallback(
    (element: HTMLInputElement | HTMLSelectElement | null) => {
      ratingValueRef.current = element
    },
    [],
  )
  const ratingEnabled = brandingControls.projectRatingBadge.layout.enabled
  const mediaEnabled = brandingControls.projectMediaMark.layout.enabled
  const ratingValueControlKind = getActiveRatingSystemForBadge(
    brandingControls.projectMetadata.ratingSystem,
  ) === 'custom' ? 'input' : 'select'
  const pendingRequest = state.pendingRequest

  useLayoutEffect(() => registerAlwaysMountedRatingFocusTargets({
    enableElement: () => ratingEnableRef.current,
    openRatingPanel,
    registerFocusTarget,
    registerFocusTargetFallback,
  }), [
    openRatingPanel,
    registerFocusTarget,
    registerFocusTargetFallback,
  ])

  useLayoutEffect(() => {
    if (!ratingEnabled) return undefined

    return registerEnabledRatingSelectFocusTargets({
      openRatingPanel,
      registerFocusTarget,
      sourceElement: () => ratingSourceRef.current,
      systemElement: () => ratingSystemRef.current,
    })
  }, [openRatingPanel, ratingEnabled, registerFocusTarget])

  useLayoutEffect(() => {
    if (!ratingEnabled) return undefined

    return registerRatingValueFocusTarget({
      openRatingPanel,
      registerFocusTarget,
      valueElement: () => ratingValueRef.current,
    })
  }, [
    openRatingPanel,
    ratingEnabled,
    ratingValueControlKind,
    registerFocusTarget,
  ])

  useLayoutEffect(() => registerAlwaysMountedMediaFocusTargets({
    enableElement: () => mediaEnableRef.current,
    openMediaPanel,
    registerFocusTarget,
    registerFocusTargetFallback,
  }), [
    openMediaPanel,
    registerFocusTarget,
    registerFocusTargetFallback,
  ])

  useLayoutEffect(() => {
    if (!mediaEnabled) return undefined

    return registerEnabledMediaFormatFocusTarget({
      formatElement: () => mediaFormatRef.current,
      openMediaPanel,
      registerFocusTarget,
    })
  }, [mediaEnabled, openMediaPanel, registerFocusTarget])

  useLayoutEffect(() => registerAlwaysMountedOperatingSystemFocusTarget({
    enableElement: () => operatingSystemEnableRef.current,
    openOperatingSystemPanel,
    registerFocusTarget,
  }), [
    openOperatingSystemPanel,
    registerFocusTarget,
  ])

  return (
    <GameInfoLogoControls
      {...brandingControls}
      mediaEnableControlRef={mediaEnableRef}
      mediaFormatControlRef={mediaFormatRef}
      mediaPanelOpen={mediaPanelOpen ||
        shouldOpenMediaPanelForRequest(pendingRequest)}
      onMediaPanelOpenChange={setMediaPanelOpen}
      onOperatingSystemPanelOpenChange={setOperatingSystemPanelOpen}
      onRatingPanelOpenChange={setRatingPanelOpen}
      operatingSystemEnableControlRef={operatingSystemEnableRef}
      operatingSystemPanelOpen={operatingSystemPanelOpen ||
        shouldOpenOperatingSystemPanelForRequest(pendingRequest)}
      ratingEnableControlRef={ratingEnableRef}
      ratingPanelOpen={ratingPanelOpen ||
        shouldOpenRatingPanelForRequest(pendingRequest)}
      ratingSourceControlRef={ratingSourceRef}
      ratingSystemControlRef={ratingSystemRef}
      ratingValueControlRef={setRatingValueControlRef}
    />
  )
}
