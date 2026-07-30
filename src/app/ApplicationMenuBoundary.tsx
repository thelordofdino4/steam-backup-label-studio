import { useEffect, type ReactNode } from 'react'

import type {
  ApplicationMenuRuntime,
} from '../applicationMenu/applicationMenuRuntime.ts'

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

  return children
}
