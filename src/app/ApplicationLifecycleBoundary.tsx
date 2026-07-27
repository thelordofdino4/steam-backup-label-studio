import { useEffect, type ReactNode } from 'react'
import type {
  ApplicationLifecycleRuntime,
} from './applicationLifecycleRuntime.ts'
import {
  ApplicationLifecycleRuntimeContext,
} from './applicationLifecycleRuntimeContext.ts'

export function ApplicationLifecycleBoundary({
  runtime,
  children,
}: Readonly<{
  runtime: ApplicationLifecycleRuntime
  children: ReactNode
}>) {
  useEffect(() => () => runtime.dispose(), [runtime])

  return (
    <ApplicationLifecycleRuntimeContext.Provider value={runtime}>
      {children}
    </ApplicationLifecycleRuntimeContext.Provider>
  )
}
