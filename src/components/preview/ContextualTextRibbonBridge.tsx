import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ContextualTextRibbonContentContext,
  type ContextualTextRibbonRegistration,
  ContextualTextRibbonRegistrationContext,
} from './contextualTextRibbonBridgeContext'

export function ContextualTextRibbonProvider({
  children,
}: {
  children: ReactNode
}) {
  const [registration, setRegistration] =
    useState<ContextualTextRibbonRegistration | null>(null)

  const register = useCallback((
    nextRegistration: ContextualTextRibbonRegistration,
  ) => {
    setRegistration((currentRegistration) =>
      currentRegistration?.key === nextRegistration.key &&
        currentRegistration.content === nextRegistration.content
        ? currentRegistration
        : nextRegistration)
  }, [])

  const unregister = useCallback((key: string) => {
    setRegistration((currentRegistration) =>
      currentRegistration?.key === key ? null : currentRegistration)
  }, [])

  const value = useMemo(() => ({
    register,
    unregister,
  }), [register, unregister])

  return (
    <ContextualTextRibbonRegistrationContext.Provider value={value}>
      <ContextualTextRibbonContentContext.Provider
        value={registration?.content ?? null}
      >
        {children}
      </ContextualTextRibbonContentContext.Provider>
    </ContextualTextRibbonRegistrationContext.Provider>
  )
}
