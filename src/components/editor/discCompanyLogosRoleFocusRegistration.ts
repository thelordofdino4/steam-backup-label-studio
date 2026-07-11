import type {
  EditorRoleFocusRequest,
} from '../../editor/editorRoleFocus.ts'
import type {
  EditorRoleFocusController,
} from '../../editor/editorRoleFocusController.ts'

type CompanyLogoFocusRegistrationController = Pick<
  EditorRoleFocusController,
  'registerFocusTarget' | 'registerFocusTargetFallback'
>

type RegisterAlwaysMountedCompanyLogoFocusTargetsOptions =
  CompanyLogoFocusRegistrationController & {
    developerEnableElement: () => HTMLElement | null
    openCompanyLogoPanel: () => void
    publisherEnableElement: () => HTMLElement | null
  }

type RegisterCompanyLogoUploadFocusTargetOptions = Pick<
  EditorRoleFocusController,
  'registerFocusTarget'
> & {
  openCompanyLogoPanel: () => void
  uploadElement: () => HTMLElement | null
}

export function shouldOpenCompanyLogoPanelForRequest(
  request: EditorRoleFocusRequest | null,
) {
  return request?.behavior === 'focus' &&
    request.destination.roleId === 'company-logos' &&
    request.destination.focusTarget.startsWith('disc:company-logo:')
}

export function registerAlwaysMountedCompanyLogoFocusTargets({
  developerEnableElement,
  openCompanyLogoPanel,
  publisherEnableElement,
  registerFocusTarget,
  registerFocusTargetFallback,
}: RegisterAlwaysMountedCompanyLogoFocusTargetsOptions) {
  const openAncestors = [openCompanyLogoPanel]
  const unregisterDeveloperEnable = registerFocusTarget(
    'disc:company-logo:developer-enable',
    {
      element: developerEnableElement,
      openAncestors,
    },
  )
  const unregisterPublisherEnable = registerFocusTarget(
    'disc:company-logo:publisher-enable',
    {
      element: publisherEnableElement,
      openAncestors,
    },
  )
  const unregisterDeveloperUploadFallback = registerFocusTargetFallback(
    'disc:company-logo:developer-upload',
    'disc:company-logo:developer-enable',
  )
  const unregisterPublisherUploadFallback = registerFocusTargetFallback(
    'disc:company-logo:publisher-upload',
    'disc:company-logo:publisher-enable',
  )

  return () => {
    unregisterPublisherUploadFallback()
    unregisterDeveloperUploadFallback()
    unregisterPublisherEnable()
    unregisterDeveloperEnable()
  }
}

export function registerDeveloperCompanyLogoUploadFocusTarget({
  openCompanyLogoPanel,
  registerFocusTarget,
  uploadElement,
}: RegisterCompanyLogoUploadFocusTargetOptions) {
  return registerFocusTarget('disc:company-logo:developer-upload', {
    element: uploadElement,
    openAncestors: [openCompanyLogoPanel],
  })
}

export function registerPublisherCompanyLogoUploadFocusTarget({
  openCompanyLogoPanel,
  registerFocusTarget,
  uploadElement,
}: RegisterCompanyLogoUploadFocusTargetOptions) {
  return registerFocusTarget('disc:company-logo:publisher-upload', {
    element: uploadElement,
    openAncestors: [openCompanyLogoPanel],
  })
}
