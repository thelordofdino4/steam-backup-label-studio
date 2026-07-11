import { createContext, useContext } from 'react'
import type {
  EditorRoleFocusController,
} from '../../editor/editorRoleFocusController.ts'

export const EditorRoleFocusContext =
  createContext<EditorRoleFocusController | null>(null)

export function useEditorRoleFocus() {
  const controller = useContext(EditorRoleFocusContext)

  if (!controller) {
    throw new Error(
      'useEditorRoleFocus must be used inside EditorRoleFocusProvider.',
    )
  }

  return controller
}

export function useOptionalEditorRoleFocus() {
  return useContext(EditorRoleFocusContext)
}
