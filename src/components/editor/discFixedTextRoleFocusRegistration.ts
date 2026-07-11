import type {
  EditorRoleFocusController,
} from '../../editor/editorRoleFocusController.ts'

type FixedTextRoleFocusController = Pick<
  EditorRoleFocusController,
  'registerFocusTarget'
>

type RegisterDiscLegalInfoFocusTargetOptions =
  FixedTextRoleFocusController & {
    copyrightElement: () => HTMLElement | null
  }

type RegisterDiscAdditionalTextFocusTargetOptions =
  FixedTextRoleFocusController & {
    customNoteElement: () => HTMLElement | null
  }

export function registerDiscLegalInfoFocusTarget({
  copyrightElement,
  registerFocusTarget,
}: RegisterDiscLegalInfoFocusTargetOptions) {
  return registerFocusTarget('disc:legal-text:copyright', {
    element: copyrightElement,
  })
}

export function registerDiscAdditionalTextFocusTarget({
  customNoteElement,
  registerFocusTarget,
}: RegisterDiscAdditionalTextFocusTargetOptions) {
  return registerFocusTarget('disc:additional-text:custom-note', {
    element: customNoteElement,
  })
}
