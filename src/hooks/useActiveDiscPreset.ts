import { useCallback, useRef, useState } from 'react'
import type {
  ActiveDiscPresetRef,
} from '../presets/discPresetTargetedApplication.ts'

export function getNextActiveDiscPresetRef({
  currentPresetRef,
  appliedPresetRef,
  applied,
}: Readonly<{
  currentPresetRef: ActiveDiscPresetRef | null
  appliedPresetRef: ActiveDiscPresetRef | null
  applied: boolean
}>): ActiveDiscPresetRef | null {
  return applied ? appliedPresetRef : currentPresetRef
}

export function useActiveDiscPreset() {
  const [activePresetRef, setActivePresetRef] =
    useState<ActiveDiscPresetRef | null>(null)
  const activePresetRefRef = useRef<ActiveDiscPresetRef | null>(null)

  const recordPresetApplication = useCallback((
    appliedPresetRef: ActiveDiscPresetRef | null,
    applied: boolean,
  ) => {
    const nextPresetRef = getNextActiveDiscPresetRef({
      currentPresetRef: activePresetRefRef.current,
      appliedPresetRef,
      applied,
    })
    activePresetRefRef.current = nextPresetRef
    setActivePresetRef(nextPresetRef)
  }, [])

  const clearActivePreset = useCallback(() => {
    activePresetRefRef.current = null
    setActivePresetRef(null)
  }, [])

  const getActivePresetRef = useCallback(
    () => activePresetRefRef.current,
    [],
  )

  return {
    activePresetRef,
    getActivePresetRef,
    recordPresetApplication,
    clearActivePreset,
  }
}
