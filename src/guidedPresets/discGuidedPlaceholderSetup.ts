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
  | 'rating-system'
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

export type DiscGuidedPlaceholderSetup = Readonly<{
  kind: 'menu'
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

function createMenu(
  label: string,
  actions: readonly DiscGuidedSetupAction[],
): DiscGuidedPlaceholderSetup {
  return Object.freeze({
    kind: 'menu',
    label,
    actions: Object.freeze(actions.map(createAction)),
  })
}

const SETUP_BY_KIND = Object.freeze({
  'game-title-choice': createMenu('Set up Game Title', [
    {
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
    },
    {
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
    },
  ]),
  background: createMenu('Set up Background Image', [{
    id: 'background-local-upload',
    label: 'Set up Background Image',
    request: {
      surfaceId: 'disc-label',
      behavior: 'focus',
      scrollAlignment: 'role-start',
      destination: {
        roleId: 'background-artwork',
        focusTarget: 'disc:background-image:local-upload',
      },
    },
  }]),
  'rating-badge': createMenu('Set up Rating Badge', [{
    id: 'rating-system',
    label: 'Set up Rating Badge',
    request: {
      surfaceId: 'disc-label',
      behavior: 'focus',
      scrollAlignment: 'role-start',
      destination: {
        roleId: 'game-info-logos',
        focusTarget: 'disc:rating:system',
      },
    },
  }]),
  'media-format-mark': createMenu('Set up Media Format Mark', [{
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
  }]),
  'operating-system-marks': createMenu('Set up Operating System Marks', [{
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
  }]),
  'developer-logo': createMenu('Set up Developer Logo', [{
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
  }]),
  'publisher-logo': createMenu('Set up Publisher Logo', [{
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
  }]),
  'legal-text': createMenu('Set up Copyright / Legal Text', [{
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
  }]),
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
