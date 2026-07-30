import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ProjectReplacementDecision,
  ProjectReplacementPrompt,
} from '../../app/appProjectReplacementGuard.ts'

export function useProjectReplacementPrompt(): Readonly<{
  open: boolean
  requestDecision: ProjectReplacementPrompt
  decide: (decision: ProjectReplacementDecision) => void
}> {
  const [open, setOpen] = useState(false)
  const resolveRef = useRef<
    ((decision: ProjectReplacementDecision) => void) | null
  >(null)

  const decide = useCallback((decision: ProjectReplacementDecision) => {
    const resolve = resolveRef.current
    if (!resolve) return
    resolveRef.current = null
    setOpen(false)
    resolve(decision)
  }, [])

  const requestDecision = useCallback<ProjectReplacementPrompt>(() => {
    if (resolveRef.current) return Promise.resolve('cancel')
    setOpen(true)
    return new Promise<ProjectReplacementDecision>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  useEffect(() => () => {
    resolveRef.current?.('cancel')
    resolveRef.current = null
  }, [])

  return { open, requestDecision, decide }
}
