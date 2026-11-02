import { useEffect } from 'react'
import type { ApplicationStartupAttempt } from './applicationStartup.ts'

/** A committed React tree is distinct from native-menu or whole-workflow readiness. */
export function ApplicationRendered({ startup }: { startup: ApplicationStartupAttempt }) {
  useEffect(() => { startup.rendered() }, [startup])
  return null
}
