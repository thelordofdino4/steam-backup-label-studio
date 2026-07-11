import type {
  EditorRoleFocusRequestInput,
} from '../editor/editorRoleFocusController.ts'
import type { DiscGuidedSetupKind } from './discGuidedLayouts.ts'
import type {
  DiscGuidedPlaceholderViewModel,
} from './discGuidedPlaceholderViewModel.ts'

export type DiscGuidedSetupActionId =
  | 'game-title-image'
  | 'game-title-text'
  | 'background-local-upload'
  | 'rating-enable'
  | 'company-logo-developer'
  | 'company-logo-publisher'
  | 'legal-copyright'

export type DiscGuidedSetupAction = Readonly<{
  id: DiscGuidedSetupActionId
  label: string
  request: EditorRoleFocusRequestInput
}>

export type DiscGuidedPlaceholderSetup =
  | Readonly<{
      kind: 'direct'
      action: DiscGuidedSetupAction
    }>
  | Readonly<{
      kind: 'choice'
      label: string
      actions: readonly DiscGuidedSetupAction[]
    }>

export type DiscGuidedPlaceholderActionViewModel = Readonly<{
  slotId: DiscGuidedPlaceholderViewModel['slotId']
  label: string
  actionGeometry: DiscGuidedPlaceholderViewModel['actionGeometry']
  lifecycle: DiscGuidedPlaceholderViewModel['lifecycle']
  setup: DiscGuidedPlaceholderSetup
}>

function createAction(
  action: DiscGuidedSetupAction,
): DiscGuidedSetupAction {
  return Object.freeze({
    ...action,
    request: Object.freeze({
      ...action.request,
      destination: Object.freeze({ ...action.request.destination }),
    }),
  })
}

const SETUP_BY_KIND = Object.freeze({
  'game-title-choice': Object.freeze({
    kind: 'choice',
    label: 'Choose Game Title setup',
    actions: Object.freeze([
      createAction({
        id: 'game-title-image',
        label: 'Image',
        request: {
          surfaceId: 'disc-label',
          behavior: 'focus',
          scrollAlignment: 'role-start',
          destination: {
            roleId: 'game-title',
            focusTarget: 'disc:game-title:artwork-upload',
          },
        },
      }),
      createAction({
        id: 'game-title-text',
        label: 'Text',
        request: {
          surfaceId: 'disc-label',
          behavior: 'focus',
          scrollAlignment: 'role-start',
          destination: {
            roleId: 'game-title',
            focusTarget: 'disc:game-title:text-fallback',
          },
        },
      }),
    ]),
  }),
  background: Object.freeze({
    kind: 'direct',
    action: createAction({
      id: 'background-local-upload',
      label: 'Choose Background Image',
      request: {
        surfaceId: 'disc-label',
        behavior: 'focus',
        scrollAlignment: 'role-start',
        destination: {
          roleId: 'background-artwork',
          focusTarget: 'disc:background-image:local-upload',
        },
      },
    }),
  }),
  rating: Object.freeze({
    kind: 'direct',
    action: createAction({
      id: 'rating-enable',
      label: 'Set up Game Info Logos',
      request: {
        surfaceId: 'disc-label',
        behavior: 'focus',
        scrollAlignment: 'role-start',
        destination: {
          roleId: 'game-info-logos',
          focusTarget: 'disc:rating:enable',
        },
      },
    }),
  }),
  'company-logo-choice': Object.freeze({
    kind: 'choice',
    label: 'Choose Company Logo setup',
    actions: Object.freeze([
      createAction({
        id: 'company-logo-developer',
        label: 'Developer',
        request: {
          surfaceId: 'disc-label',
          behavior: 'focus',
          scrollAlignment: 'role-start',
          destination: {
            roleId: 'company-logos',
            focusTarget: 'disc:company-logo:developer-upload',
          },
        },
      }),
      createAction({
        id: 'company-logo-publisher',
        label: 'Publisher',
        request: {
          surfaceId: 'disc-label',
          behavior: 'focus',
          scrollAlignment: 'role-start',
          destination: {
            roleId: 'company-logos',
            focusTarget: 'disc:company-logo:publisher-upload',
          },
        },
      }),
    ]),
  }),
  legal: Object.freeze({
    kind: 'direct',
    action: createAction({
      id: 'legal-copyright',
      label: 'Set up Legal Info',
      request: {
        surfaceId: 'disc-label',
        behavior: 'focus',
        scrollAlignment: 'role-start',
        destination: {
          roleId: 'legal-info',
          focusTarget: 'disc:legal-text:copyright',
        },
      },
    }),
  }),
} as const satisfies Readonly<
  Record<DiscGuidedSetupKind, DiscGuidedPlaceholderSetup>
>)

export function getDiscGuidedPlaceholderSetup(
  setupKind: DiscGuidedSetupKind,
): DiscGuidedPlaceholderSetup {
  return SETUP_BY_KIND[setupKind]
}

export function createDiscGuidedPlaceholderActionViewModels(
  placeholders: readonly DiscGuidedPlaceholderViewModel[],
): readonly DiscGuidedPlaceholderActionViewModel[] {
  return Object.freeze(placeholders.map((placeholder) => Object.freeze({
    slotId: placeholder.slotId,
    label: placeholder.label,
    actionGeometry: placeholder.actionGeometry,
    lifecycle: placeholder.lifecycle,
    setup: getDiscGuidedPlaceholderSetup(placeholder.setupKind),
  })))
}
