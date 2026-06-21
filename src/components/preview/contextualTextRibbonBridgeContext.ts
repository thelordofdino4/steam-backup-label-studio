import {
  createContext,
  useContext,
  useLayoutEffect,
  type ReactNode,
} from 'react'

export type ContextualTextRibbonRegistration = {
  content: ReactNode
  key: string
}

export type ContextualTextRibbonRegistrationActions = {
  register: (registration: ContextualTextRibbonRegistration) => void
  unregister: (key: string) => void
}

export const ContextualTextRibbonContentContext =
  createContext<ReactNode>(null)

export const ContextualTextRibbonRegistrationContext =
  createContext<ContextualTextRibbonRegistrationActions | null>(null)

export function useContextualTextRibbonContent() {
  return useContext(ContextualTextRibbonContentContext)
}

export function useContextualTextRibbonRegistration({
  content,
  targetKey,
}: {
  content: ReactNode
  targetKey: string
}) {
  const bridge = useContext(ContextualTextRibbonRegistrationContext)

  useLayoutEffect(() => {
    if (!bridge) {
      return undefined
    }

    bridge.register({
      content,
      key: targetKey,
    })

    return () => {
      bridge.unregister(targetKey)
    }
  }, [bridge, content, targetKey])
}
