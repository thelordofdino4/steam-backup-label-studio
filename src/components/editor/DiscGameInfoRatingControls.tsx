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
  registerAlwaysMountedRatingFocusTargets,
  registerEnabledRatingSelectFocusTargets,
  registerRatingValueFocusTarget,
  shouldOpenRatingPanelForRequest,
} from './discRatingRoleFocusRegistration.ts'
import { useEditorRoleFocus } from './editorRoleFocusContext.ts'

export type DiscGameInfoRatingControlsProps = {
  brandingControls: ComponentProps<typeof GameInfoLogoControls>
}

export function DiscGameInfoRatingControls({
  brandingControls,
}: DiscGameInfoRatingControlsProps) {
  const {
    registerFocusTarget,
    registerFocusTargetFallback,
    state,
  } = useEditorRoleFocus()
  const [ratingPanelOpen, setRatingPanelOpen] = useState(false)
  const enableRef = useRef<HTMLInputElement | null>(null)
  const systemRef = useRef<HTMLSelectElement | null>(null)
  const valueRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)
  const sourceRef = useRef<HTMLSelectElement | null>(null)
  const openRatingPanel = useCallback(() => setRatingPanelOpen(true), [])
  const setValueControlRef = useCallback(
    (element: HTMLInputElement | HTMLSelectElement | null) => {
      valueRef.current = element
    },
    [],
  )
  const ratingEnabled = brandingControls.projectRatingBadge.layout.enabled
  const ratingValueControlKind = getActiveRatingSystemForBadge(
    brandingControls.projectMetadata.ratingSystem,
  ) === 'custom' ? 'input' : 'select'
  const ratingPanelFocusPending = shouldOpenRatingPanelForRequest(
    state.pendingRequest,
  )

  useLayoutEffect(() => registerAlwaysMountedRatingFocusTargets({
    enableElement: () => enableRef.current,
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
      sourceElement: () => sourceRef.current,
      systemElement: () => systemRef.current,
    })
  }, [openRatingPanel, ratingEnabled, registerFocusTarget])

  useLayoutEffect(() => {
    if (!ratingEnabled) return undefined

    return registerRatingValueFocusTarget({
      openRatingPanel,
      registerFocusTarget,
      valueElement: () => valueRef.current,
    })
  }, [
    openRatingPanel,
    ratingEnabled,
    ratingValueControlKind,
    registerFocusTarget,
  ])

  return (
    <GameInfoLogoControls
      {...brandingControls}
      enableControlRef={enableRef}
      onRatingPanelOpenChange={setRatingPanelOpen}
      ratingPanelOpen={ratingPanelOpen || ratingPanelFocusPending}
      sourceControlRef={sourceRef}
      systemControlRef={systemRef}
      valueControlRef={setValueControlRef}
    />
  )
}
