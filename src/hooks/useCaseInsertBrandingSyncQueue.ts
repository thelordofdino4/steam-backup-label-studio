import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import {
  syncProjectJewelCaseBrandingMarkSlots,
  syncProjectJewelCaseBrandingMarkSlotsForTarget,
  type CaseInsertBrandingMarkTarget,
} from '../caseInsert/brandingMarkSlots.ts'
import type { CaseInsertBrandingSourceCatalog } from '../caseInsert/brandingSlotSources.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import type { ProjectSessionContinuation } from '../lifecycle/projectAsyncWork.ts'
import { useProjectAsyncWork } from './useProjectAsyncWork.ts'

type Reconciliation = Readonly<{
  continuation: ProjectSessionContinuation
  target?: CaseInsertBrandingMarkTarget
  overrides: Partial<CaseInsertBrandingSourceCatalog>
}>

/**
 * Replaces unowned timers with a session-bound post-render reconciliation.
 * Source values come from the committed render. Async uploads use the direct
 * synchronous methods inside their original checked request completion.
 */
export function useCaseInsertBrandingSyncQueue(
  brandingSources: CaseInsertBrandingSourceCatalog,
  setProjectJewelCase: Dispatch<SetStateAction<ProjectJewelCaseState>>,
) {
  const asyncWork = useProjectAsyncWork()
  const pending = useRef<Reconciliation[]>([])
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    const requests = pending.current
    pending.current = []
    const applicable = requests.filter(request =>
      asyncWork.isSessionContinuationCurrent(request.continuation))
    if (applicable.length === 0) return
    const authority = asyncWork.begin('image:case-branding-reconciliation')
    asyncWork.commit(authority, () => {
      setProjectJewelCase(current => applicable.reduce((project, request) => {
        const sources = { ...brandingSources, ...request.overrides }
        return request.target
          ? syncProjectJewelCaseBrandingMarkSlotsForTarget(project, request.target, sources)
          : syncProjectJewelCaseBrandingMarkSlots(project, sources)
      }, current))
    })
  }, [asyncWork, brandingSources, generation, setProjectJewelCase])

  function schedule(
    overrides: Partial<CaseInsertBrandingSourceCatalog> = {},
    target?: CaseInsertBrandingMarkTarget,
  ) {
    pending.current.push({
      continuation: asyncWork.captureSessionContinuation(), target, overrides,
    })
    setGeneration(value => value + 1)
  }

  return {
    scheduleCaseInsertBrandingMarkSlotSync: (overrides: Partial<CaseInsertBrandingSourceCatalog> = {}) => schedule(overrides),
    scheduleCaseInsertBrandingMarkSlotSyncForTarget: (
      target: CaseInsertBrandingMarkTarget,
      overrides: Partial<CaseInsertBrandingSourceCatalog> = {},
    ) => schedule(overrides, target),
  }
}
