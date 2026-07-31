import { useEffect, type ReactNode } from 'react'

import type {
  ApplicationMenuRuntime,
} from '../applicationMenu/applicationMenuRuntime.ts'
import { ApplicationMenuRuntimeContext } from './applicationMenuRuntimeContext.ts'

export function ApplicationMenuBoundary({
  runtime,
  children,
}: Readonly<{
  runtime: ApplicationMenuRuntime
  children: ReactNode
}>) {
  useEffect(() => {
    void runtime.start()
    return () => {
      void runtime.dispose()
    }
  }, [runtime])

  return (
    <ApplicationMenuRuntimeContext.Provider value={runtime}>
      {children}
    </ApplicationMenuRuntimeContext.Provider>
  )
}
