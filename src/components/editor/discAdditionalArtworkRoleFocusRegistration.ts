import type {
  EditorRoleFocusRequest,
} from '../../editor/editorRoleFocus.ts'
import type {
  EditorRoleFocusController,
} from '../../editor/editorRoleFocusController.ts'

type AdditionalArtworkFocusRegistrationController = Pick<
  EditorRoleFocusController,
  'registerFocusTarget' | 'registerFocusTargetFallback'
>

type RegisterAlwaysMountedAdditionalArtworkFocusTargetsOptions =
  AdditionalArtworkFocusRegistrationController & {
    enableElement: () => HTMLElement | null
  }

type RegisterAdditionalArtworkAddFocusTargetOptions = Pick<
  EditorRoleFocusController,
  'registerFocusTarget'
> & {
  addElement: () => HTMLElement | null
}

export function registerAlwaysMountedAdditionalArtworkFocusTargets({
  enableElement,
  registerFocusTarget,
  registerFocusTargetFallback,
}: RegisterAlwaysMountedAdditionalArtworkFocusTargetsOptions) {
  const unregisterEnable = registerFocusTarget(
    'disc:additional-artwork:enable',
    { element: enableElement },
  )
  const unregisterAddFallback = registerFocusTargetFallback(
    'disc:additional-artwork:add',
    'disc:additional-artwork:enable',
  )

  return () => {
    unregisterAddFallback()
    unregisterEnable()
  }
}

export function registerAdditionalArtworkAddFocusTarget({
  addElement,
  registerFocusTarget,
}: RegisterAdditionalArtworkAddFocusTargetOptions) {
  return registerFocusTarget('disc:additional-artwork:add', {
    element: addElement,
  })
}

type RegisterAdditionalArtworkItemFallbacksOptions = Pick<
  EditorRoleFocusController,
  'registerFocusTargetFallback'
> & {
  elementIds: readonly string[]
}

type RegisterAdditionalArtworkItemFocusTargetsOptions = Pick<
  EditorRoleFocusController,
  'registerFocusTarget'
> & {
  elementId: string
  enableElement: () => HTMLElement | null
  openItemCard: () => void
}

type RegisterAdditionalArtworkItemUploadFocusTargetOptions = Pick<
  EditorRoleFocusController,
  'registerFocusTarget'
> & {
  elementId: string
  openItemCard: () => void
  openLocalFilePanel: () => void
  uploadElement: () => HTMLElement | null
}

export function registerAdditionalArtworkItemFallbacks({
  elementIds,
  registerFocusTargetFallback,
}: RegisterAdditionalArtworkItemFallbacksOptions) {
  const unregister = elementIds.flatMap((elementId) => {
    const itemEnable = {
      focusTarget: 'disc:additional-artwork:item-enable',
      elementId,
    } as const
    const upload = {
      focusTarget: 'disc:additional-artwork:upload',
      elementId,
    } as const

    return [
      registerFocusTargetFallback(upload, itemEnable),
      registerFocusTargetFallback(itemEnable, 'disc:additional-artwork:add'),
    ]
  })

  return () => {
    for (const unregisterTarget of unregister.reverse()) {
      unregisterTarget()
    }
  }
}

export function registerAdditionalArtworkItemEnableFocusTarget({
  elementId,
  enableElement,
  openItemCard,
  registerFocusTarget,
}: RegisterAdditionalArtworkItemFocusTargetsOptions) {
  return registerFocusTarget({
    focusTarget: 'disc:additional-artwork:item-enable',
    elementId,
  }, {
    element: enableElement,
    openAncestors: [openItemCard],
  })
}

export function registerAdditionalArtworkItemUploadFocusTarget({
  elementId,
  openItemCard,
  openLocalFilePanel,
  registerFocusTarget,
  uploadElement,
}: RegisterAdditionalArtworkItemUploadFocusTargetOptions) {
  return registerFocusTarget({
    focusTarget: 'disc:additional-artwork:upload',
    elementId,
  }, {
    element: uploadElement,
    openAncestors: [openItemCard, openLocalFilePanel],
  })
}

export function getPendingAdditionalArtworkItemFocusTarget(
  request: EditorRoleFocusRequest | null,
  elementId: string,
) {
  if (request?.behavior !== 'focus' ||
    request.destination.roleId !== 'additional-artwork' ||
    !('elementId' in request.destination) ||
    request.destination.elementId !== elementId) {
    return null
  }

  return request.destination.focusTarget
}
