import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from 'react'
import {
  CompanyLogoControls,
} from '../sidebar/branding/CompanyLogoControls.tsx'
import {
  registerAlwaysMountedCompanyLogoFocusTargets,
  registerDeveloperCompanyLogoUploadFocusTarget,
  registerPublisherCompanyLogoUploadFocusTarget,
  shouldOpenCompanyLogoPanelForRequest,
} from './discCompanyLogosRoleFocusRegistration.ts'
import { useEditorRoleFocus } from './editorRoleFocusContext.ts'

export type DiscCompanyLogosRoleControlsProps = {
  brandingControls: ComponentProps<typeof CompanyLogoControls>
}

export function DiscCompanyLogosRoleControls({
  brandingControls,
}: DiscCompanyLogosRoleControlsProps) {
  const {
    registerFocusTarget,
    registerFocusTargetFallback,
    registerSectionAlignmentTarget,
    state,
  } = useEditorRoleFocus()
  const [companyLogoPanelOpen, setCompanyLogoPanelOpen] = useState(false)
  const developerEnableRef = useRef<HTMLInputElement | null>(null)
  const developerSectionRef = useRef<HTMLDivElement | null>(null)
  const developerUploadRef = useRef<HTMLInputElement | null>(null)
  const publisherEnableRef = useRef<HTMLInputElement | null>(null)
  const publisherSectionRef = useRef<HTMLDivElement | null>(null)
  const publisherUploadRef = useRef<HTMLInputElement | null>(null)
  const openCompanyLogoPanel = useCallback(
    () => setCompanyLogoPanelOpen(true),
    [],
  )
  const developerEnabled =
    brandingControls.projectLogoAssets.developerLogoLayout.enabled
  const publisherEnabled =
    brandingControls.projectLogoAssets.publisherLogoLayout.enabled
  const companyLogoPanelFocusPending =
    shouldOpenCompanyLogoPanelForRequest(state.pendingRequest)

  useLayoutEffect(() => registerAlwaysMountedCompanyLogoFocusTargets({
    developerEnableElement: () => developerEnableRef.current,
    developerSectionElement: () => developerSectionRef.current,
    openCompanyLogoPanel,
    publisherEnableElement: () => publisherEnableRef.current,
    publisherSectionElement: () => publisherSectionRef.current,
    registerFocusTarget,
    registerFocusTargetFallback,
    registerSectionAlignmentTarget,
  }), [
    openCompanyLogoPanel,
    registerFocusTarget,
    registerFocusTargetFallback,
    registerSectionAlignmentTarget,
  ])

  useLayoutEffect(() => {
    if (!developerEnabled) return undefined

    return registerDeveloperCompanyLogoUploadFocusTarget({
      openCompanyLogoPanel,
      registerFocusTarget,
      uploadElement: () => developerUploadRef.current,
    })
  }, [developerEnabled, openCompanyLogoPanel, registerFocusTarget])

  useLayoutEffect(() => {
    if (!publisherEnabled) return undefined

    return registerPublisherCompanyLogoUploadFocusTarget({
      openCompanyLogoPanel,
      registerFocusTarget,
      uploadElement: () => publisherUploadRef.current,
    })
  }, [openCompanyLogoPanel, publisherEnabled, registerFocusTarget])

  return (
    <CompanyLogoControls
      {...brandingControls}
      developerEnableControlRef={developerEnableRef}
      developerSectionRef={developerSectionRef}
      developerUploadControlRef={developerUploadRef}
      onPanelOpenChange={setCompanyLogoPanelOpen}
      panelOpen={companyLogoPanelOpen || companyLogoPanelFocusPending}
      publisherEnableControlRef={publisherEnableRef}
      publisherSectionRef={publisherSectionRef}
      publisherUploadControlRef={publisherUploadRef}
    />
  )
}
