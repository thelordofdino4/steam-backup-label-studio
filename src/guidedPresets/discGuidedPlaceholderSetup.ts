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
  | 'media-format'
  | 'operating-system-marks-enable'
  | 'developer-logo-upload'
  | 'publisher-logo-upload'
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
  | Readonly<{
      kind: 'unavailable'
      label: string
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
  'rating-badge': Object.freeze({
    kind: 'direct',
    action: createAction({
      id: 'rating-enable',
      label: 'Set up Rating Badge',
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
  'media-format-mark': Object.freeze({
    kind: 'direct',
    action: createAction({
      id: 'media-format',
      label: 'Set up Media Format Mark',
      request: {
        surfaceId: 'disc-label',
        behavior: 'focus',
        scrollAlignment: 'role-start',
        destination: {
          roleId: 'game-info-logos',
          focusTarget: 'disc:media-format-mark:format',
        },
      },
    }),
  }),
  'operating-system-marks': Object.freeze({
    kind: 'direct',
    action: createAction({
      id: 'operating-system-marks-enable',
      label: 'Set up Operating System Marks',
      request: {
        surfaceId: 'disc-label',
        behavior: 'focus',
        scrollAlignment: 'role-start',
        destination: {
          roleId: 'game-info-logos',
          focusTarget: 'disc:operating-system-marks:enable',
        },
      },
    }),
  }),
  'developer-logo': Object.freeze({
    kind: 'direct',
    action: createAction({
      id: 'developer-logo-upload',
      label: 'Set up Developer Logo',
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
  }),
  'publisher-logo': Object.freeze({
    kind: 'direct',
    action: createAction({
      id: 'publisher-logo-upload',
      label: 'Set up Publisher Logo',
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
  }),
  'legal-text': Object.freeze({
    kind: 'direct',
    action: createAction({
      id: 'legal-copyright',
      label: 'Set up Copyright / Legal Text',
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
