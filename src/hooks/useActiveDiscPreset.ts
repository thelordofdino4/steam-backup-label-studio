import { useCallback, useRef, useState } from 'react'
import type {
  ActiveDiscPresetState,
  ActiveDiscPresetRef,
  DiscPresetTargetedApplicationResult,
} from '../presets/discPresetTargetedApplication.ts'
import type {
  ResolvedDiscPresetDefinition,
} from '../presets/discPresetResolution.ts'

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

export function getNextActiveDiscPresetState({
  currentPresetState,
  appliedPresetState,
  applied,
}: Readonly<{
  currentPresetState: ActiveDiscPresetState | null
  appliedPresetState: ActiveDiscPresetState | null
  applied: boolean
}>): ActiveDiscPresetState | null {
  return applied ? appliedPresetState : currentPresetState
}

export function getNextActiveDiscPresetStateForTargetedApplication({
  currentPresetState,
  application,
}: Readonly<{
  currentPresetState: ActiveDiscPresetState | null
  application: DiscPresetTargetedApplicationResult | null
}>): ActiveDiscPresetState | null {
  if (
    !currentPresetState ||
    !application ||
    !('resolvedPreset' in application) ||
    application.presetRef.id !== currentPresetState.ref.id ||
    application.presetRef.revision !== currentPresetState.ref.revision
  ) {
    return currentPresetState
  }

  if (application.resolvedPreset === currentPresetState.resolvedDefinition) {
    return currentPresetState
  }

  return Object.freeze({
    ref: currentPresetState.ref,
    resolvedDefinition: application.resolvedPreset,
  })
}

export function useActiveDiscPreset() {
  const [activePresetState, setActivePresetState] =
    useState<ActiveDiscPresetState | null>(null)
  const activePresetStateRef = useRef<ActiveDiscPresetState | null>(null)

  const recordPresetApplication = useCallback((
    appliedPresetRef: ActiveDiscPresetRef | null,
    resolvedDefinition: ResolvedDiscPresetDefinition | null,
    applied: boolean,
  ) => {
    const appliedPresetState =
      appliedPresetRef && resolvedDefinition
        ? Object.freeze({
            ref: appliedPresetRef,
            resolvedDefinition,
          })
        : null
    const nextPresetState = getNextActiveDiscPresetState({
      currentPresetState: activePresetStateRef.current,
      appliedPresetState,
      applied,
    })
    activePresetStateRef.current = nextPresetState
    setActivePresetState(nextPresetState)
  }, [])

  const recordTargetedPresetApplication = useCallback((
    application: DiscPresetTargetedApplicationResult | null,
  ) => {
    const nextPresetState =
      getNextActiveDiscPresetStateForTargetedApplication({
        currentPresetState: activePresetStateRef.current,
        application,
      })

    if (nextPresetState === activePresetStateRef.current) return

    activePresetStateRef.current = nextPresetState
    setActivePresetState(nextPresetState)
  }, [])

  const clearActivePreset = useCallback(() => {
    activePresetStateRef.current = null
    setActivePresetState(null)
  }, [])

  const getActivePresetRef = useCallback(
    () => activePresetStateRef.current?.ref ?? null,
    [],
  )

  const getActivePresetState = useCallback(
    () => activePresetStateRef.current,
    [],
  )

  return {
    activePresetState,
    activePresetRef: activePresetState?.ref ?? null,
    getActivePresetRef,
    getActivePresetState,
    recordPresetApplication,
    recordTargetedPresetApplication,
    clearActivePreset,
  }
}
