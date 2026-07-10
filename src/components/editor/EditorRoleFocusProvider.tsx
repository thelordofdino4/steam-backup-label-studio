import {
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  createEditorRoleFocusControllerStore,
  type EditorRoleFocusController,
} from '../../editor/editorRoleFocusController.ts'
import { EditorRoleFocusContext } from './editorRoleFocusContext.ts'

export function EditorRoleFocusProvider({
  children,
}: {
  children: ReactNode
}) {
  const [store] = useState(() => createEditorRoleFocusControllerStore())
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  )

  useLayoutEffect(() => {
    store.processPendingRequest()
  }, [state.pendingRequest, store])

  const controller = useMemo<EditorRoleFocusController>(() => ({
    state,
    requestRoleFocus: store.requestRoleFocus,
    setRoleOpen: store.setRoleOpen,
    isRoleOpen: store.isRoleOpen,
    registerRolePanel: store.registerRolePanel,
    registerFocusTarget: store.registerFocusTarget,
  }), [state, store])

  return (
    <EditorRoleFocusContext.Provider value={controller}>
      {children}
    </EditorRoleFocusContext.Provider>
  )
}
