import { readDiscBackgroundAsset } from '../image/discBackgroundAsset.ts'
import { startArtworkWorkflow } from '../diagnostics/artworkWorkflowDiagnostics.ts'
import { commitPreparedDiscBackgroundCompound } from '../app/appDiscBackgroundCompoundCommand.ts'
import { useDiscBackgroundDraft } from './useDiscBackgroundDraft.ts'
import { useProjectAsyncWork } from './useProjectAsyncWork.ts'
import type { ProjectAsyncRequest } from '../lifecycle/projectAsyncWork.ts'
import { useContext, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react'
import { ApplicationLifecycleRuntimeContext } from '../app/applicationLifecycleRuntimeContext.ts'
import type { DiscBackgroundOperation, DiscProjectSession } from '../lifecycle/projectSession.ts'
import { ImportedImagePolicyError } from '../image/importedImagePolicy'
import {
  BackgroundImageLoadError,
  createSteamArtworkBackgroundImport,
  createUploadedBackgroundImageImport,
  type BackgroundImageImportResult,
} from '../image/backgroundImageImport'
import {
  DEFAULT_BACKGROUND_SCALE,
  clampBackgroundOffsetToImageBounds,
  createDefaultBackgroundOffset,
  getBackgroundOffsetSliderRanges,
  resolveBackgroundImageLayout,
  updateBackgroundOffsetField,
  updateBackgroundScale,
  type BackgroundOffsetField,
} from '../image/backgroundImage'
import type { SteamLogoPlacement } from '../discText/index'
import { getBackgroundFitToSteamBannerOpenArea } from '../layout/backgroundArtworkFit'
import type {
  BackgroundOffset,
  SavedDiscGuidedLayoutState,
} from '../project/projectTypes'
import type {
  DiscBackgroundPresetOwnerState,
} from '../presets/discPresetOwnerPlacement.ts'
import {
  completeDiscGuidedSlotWhenSatisfied,
  DISC_GUIDED_COMPLETION_SLOT_IDS,
  ignoreDiscGuidedSlotCompletion,
  isDiscGuidedBackgroundOwnerSatisfied,
  type DiscGuidedSlotCompletionHandler,
} from '../guidedPresets/discGuidedCompletion.ts'
import type { SteamArtworkAsset } from '../steam/steamApi'
import { pickDiscBackgroundFile } from '../tauri/discBackgroundPicker.ts'
import { selectNativeBackgroundFile } from '../image/backgroundNativeFileSelection.ts'

type UseBackgroundImageOptions = {
  discPreviewSize: number
  steamLogoPlacement: SteamLogoPlacement
  announceStatus: (message: string) => void
  applyActivePresetPlacement?: (
    background: DiscBackgroundPresetOwnerState,
  ) => { background: DiscBackgroundPresetOwnerState | null; acceptPlacement(): void }
  onDiscGuidedSlotCompleted?: DiscGuidedSlotCompletionHandler
  prepareGuidedCompletion?: (
    slotId: Parameters<DiscGuidedSlotCompletionHandler>[0],
    session: DiscProjectSession,
  ) => { guidedLayout: SavedDiscGuidedLayoutState; mirror(): void } | null
}

const emptyBackground = Object.freeze({
  enabled: true,
  scale: DEFAULT_BACKGROUND_SCALE,
  offset: Object.freeze(createDefaultBackgroundOffset()),
  asset: null,
  imageSource: null,
  imageSize: null,
})

export function selectDiscBackground(session: DiscProjectSession | undefined) {
  return session?.project.background ?? emptyBackground
}

export function useBackgroundImage({
  discPreviewSize,
  steamLogoPlacement,
  announceStatus,
  applyActivePresetPlacement,
  onDiscGuidedSlotCompleted = ignoreDiscGuidedSlotCompletion,
  prepareGuidedCompletion,
}: UseBackgroundImageOptions) {
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null)
  const asyncWork = useProjectAsyncWork()
  const [pendingArtwork, setPendingArtwork] = useState<ProjectAsyncRequest | null>(null)
  const nativePickerInFlight = useRef(false)
  const isArtworkLoading = pendingArtwork !== null && asyncWork.isCurrent(pendingArtwork)
  const runtime = useContext(ApplicationLifecycleRuntimeContext)
  if (!runtime) throw new Error('ApplicationLifecycleBoundary is required.')
  const root = runtime.root
  const diagnostics = runtime.diagnostics
  const { binding: draft, transform } = useDiscBackgroundDraft(runtime)
  function getDiscSession() {
    const session = root.getLifecycleState().activeSession
    return session?.kind === 'disc' ? session : undefined
  }
  const getBackground = () => selectDiscBackground(getDiscSession())
  const committed = useSyncExternalStore(root.subscribe, getBackground, getBackground)
  const backgroundImageUrl = readDiscBackgroundAsset(committed.asset)
  const backgroundImageSource = committed.imageSource ?? null
  const backgroundImageSize = committed.imageSize ?? null
  const { scale: backgroundScale, offset: backgroundOffset } = transform ?? committed
  const isBackgroundArtworkEnabled = committed.enabled ?? true

  function submit(operation: DiscBackgroundOperation, session = getDiscSession()) {
    if (!session) return false
    const result = root.commitDiscBackground({ sessionId: session.id, expectedRevision: session.revision, operation })
    return result === 'committed' || result === 'no-op'
  }

  function updateBackgroundDragOffset(key: string, offset: BackgroundOffset) {
    draft.update(key, current => ({ ...current, offset }))
  }

  const backgroundRangeGesture = {
    begin: (key: string) => draft.begin(key),
    finish: draft.finish,
    cancel: draft.cancel,
    scale(key: string, value: number) {
      draft.update(key, current => {
        const scale = updateBackgroundScale(value, current.scale)
        return { scale, offset: clampBackgroundOffsetToImageBounds(current.offset,
          backgroundImageSize, scale, discPreviewSize) }
      })
    },
    offset(key: string, field: BackgroundOffsetField, value: number) {
      draft.update(key, current => ({
        ...current,
        offset: updateBackgroundOffsetField(current.offset, field, value,
          backgroundImageSize, current.scale, discPreviewSize),
      }))
    },
  }

  const backgroundLayout = useMemo(
    () => resolveBackgroundImageLayout(
      backgroundImageSize, backgroundScale, backgroundOffset, discPreviewSize,
    ),
    [backgroundImageSize, backgroundScale, backgroundOffset, discPreviewSize],
  )
  const backgroundOffsetSliderRanges = useMemo(
    () =>
      getBackgroundOffsetSliderRanges(
        backgroundImageSize,
        backgroundScale,
        discPreviewSize,
      ),
    [backgroundImageSize, backgroundScale, discPreviewSize],
  )
  const effectiveBackgroundImageUrl = isBackgroundArtworkEnabled
    ? backgroundImageUrl
    : null
  const effectiveBackgroundImageSize = isBackgroundArtworkEnabled
    ? backgroundImageSize
    : null

  function applySemanticBackgroundChange(
    background: DiscBackgroundPresetOwnerState,
    committed: DiscProjectSession['project']['background'],
  ) {
    if (!applyActivePresetPlacement) return { next: background }
    const planned = applyActivePresetPlacement(background)
    const { scale: backgroundScale, offset: backgroundOffset } = committed
    return {
      next: planned.background ?? {
        ...background, scale: backgroundScale, offset: { ...backgroundOffset },
      },
      acceptPlacement: planned.acceptPlacement,
    }
  }

  function applyBackgroundImageImport(importedBackground: BackgroundImageImportResult) {
    const session = getDiscSession()
    if (!session || !root.canCommitDiscBackground()) return false
    const { next: nextBackground, acceptPlacement } = applySemanticBackgroundChange({
      enabled: true,
      imageDataUrl: importedBackground.background.imageUrl,
      imageSource: importedBackground.imageSource,
      imageSize: importedBackground.background.imageSize,
      scale: importedBackground.background.scale,
      offset: importedBackground.background.offset,
    }, session.project.background)

    const operation: DiscBackgroundOperation = { kind: 'asset', stagedAsset: importedBackground.stagedAsset, background: {
      ...nextBackground, note: session.project.background.note,
    } }
    let applied = false
    const accepted = () => {
      applied = true
      acceptPlacement?.()
      setSelectedArtworkId(importedBackground.selectedArtworkId)
      announceStatus(importedBackground.statusMessage)
    }
    submitWithGuidedCompanion(session, operation,
      isDiscGuidedBackgroundOwnerSatisfied(nextBackground), accepted)
    return applied
  }

  function submitWithGuidedCompanion(
    session: DiscProjectSession,
    operation: DiscBackgroundOperation,
    satisfied: boolean,
    accepted?: () => void,
  ) {
    const guided = satisfied ? prepareGuidedCompletion?.(
      DISC_GUIDED_COMPLETION_SLOT_IDS.backgroundImage, session) : null
    if (guided) {
      commitPreparedDiscBackgroundCompound(root, {
        sessionId: session.id, expectedRevision: session.revision, operation,
      }, { kind: 'guided', guidedLayout: guided.guidedLayout }, scope => {
        if (scope.guided) guided.mirror()
        if (scope.currentInteraction) accepted?.()
      })
      return
    }

    if (submit(operation, session)) {
      if (!prepareGuidedCompletion) completeDiscGuidedSlotWhenSatisfied(
        onDiscGuidedSlotCompleted, DISC_GUIDED_COMPLETION_SLOT_IDS.backgroundImage, satisfied)
      accepted?.()
    }
  }

  function clearSelectedArtwork() {
    setSelectedArtworkId(null)
    asyncWork.invalidate('background-artwork')
    setPendingArtwork(null)
  }

  async function handleBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) await importBackgroundUpload(file)
  }

  async function handlePickNativeBackgroundFile() {
    if (nativePickerInFlight.current || !getDiscSession()) return
    nativePickerInFlight.current = true
    try {
      await selectNativeBackgroundFile(asyncWork, pickDiscBackgroundFile,
        file => { void importBackgroundUpload(file) }, reportBackgroundUploadFailure)
    } finally {
      nativePickerInFlight.current = false
    }
  }

  function reportBackgroundUploadFailure(error: unknown) {
    announceStatus(
      error instanceof ImportedImagePolicyError
        ? error.message
        : error instanceof BackgroundImageLoadError
        ? 'Background image could not be loaded.'
        : 'Background image could not be read.',
    )
  }

  async function importBackgroundUpload(file: File) {
    const request = asyncWork.begin('background-artwork')
    const observation = startArtworkWorkflow(diagnostics.observeArtworkWorkflow,
      'image.disc-background-import', request.requestId, 'read')
    setPendingArtwork(request)
    try {
      const imported = await createUploadedBackgroundImageImport(file, observation.stage)
      observation.stage('apply')
      let applied = false
      const accepted = asyncWork.commit(request, () => { applied = applyBackgroundImageImport(imported) })
      observation.finish(accepted && applied)
    } catch (error) {
      const accepted = asyncWork.publish(request, () => {
        reportBackgroundUploadFailure(error)
      })
      observation.finish(accepted, 'failure')
    }
  }

  function handleResetBackground() {
    asyncWork.invalidateAll()
    submit({
      kind: 'transform', scale: DEFAULT_BACKGROUND_SCALE, offset: createDefaultBackgroundOffset(),
    })
  }

  async function handleUseSteamArtwork(asset: SteamArtworkAsset) {
    const request = asyncWork.begin('background-artwork')
    setPendingArtwork(request)
    announceStatus(`Downloading ${asset.label}...`)

    try {
      const imported = await createSteamArtworkBackgroundImport(asset)
      asyncWork.commit(request, () => { applyBackgroundImageImport(imported) })
    } catch (error) {
      asyncWork.publish(request, () => {
        announceStatus(`Steam artwork download failed: ${String(error)}`)
      })
    }
  }

  function handleBackgroundArtworkEnabledChange(enabled: boolean) {
    const session = getDiscSession()
    if (!session || !root.canCommitDiscBackground()) return
    const current = session.project.background
    const proposed: DiscBackgroundPresetOwnerState = {
      enabled, imageDataUrl: readDiscBackgroundAsset(current.asset),
      imageSource: current.imageSource ?? null, imageSize: current.imageSize ?? null,
      scale: current.scale, offset: current.offset,
    }
    const placement = enabled ? applySemanticBackgroundChange(proposed, current) : null
    const nextBackground = placement?.next ?? proposed

    submitWithGuidedCompanion(session, { kind: 'visibility', enabled: nextBackground.enabled,
      scale: nextBackground.scale, offset: nextBackground.offset },
    isDiscGuidedBackgroundOwnerSatisfied(nextBackground), placement?.acceptPlacement)
  }

  function handleBackgroundScaleChange(value: number) {
    const session = getDiscSession()
    if (!session) return
    const current = session.project.background
    const scale = updateBackgroundScale(value, current.scale)
    const offset = clampBackgroundOffsetToImageBounds(current.offset, current.imageSize ?? null,
      scale, discPreviewSize)
    submit({ kind: 'transform', scale, offset }, session)
  }

  function handleBackgroundOffsetChange(field: BackgroundOffsetField, value: number) {
    const session = getDiscSession()
    if (!session) return
    const current = session.project.background
    const offset = updateBackgroundOffsetField(current.offset, field, value,
      current.imageSize ?? null, current.scale, discPreviewSize)
    submit({ kind: 'transform', scale: current.scale, offset }, session)
  }

  function handleFitBackgroundToSteamBannerOpenArea() {
    const fit = getBackgroundFitToSteamBannerOpenArea({
      imageSize: backgroundImageSize,
      previewSize: discPreviewSize,
      steamLogoPlacement,
    })

    if (!fit) {
      announceStatus('Choose a background image before fitting the background.')
      return
    }

    if (!submit({ kind: 'placement', scale: updateBackgroundScale(fit.scale), offset: fit.offset })) return
    announceStatus(
      steamLogoPlacement === 'none'
        ? 'Fit background edge to edge.'
        : 'Fit background between the Steam banner and disc edge.',
    )
  }

  return {
    backgroundImageUrl,
    backgroundImageSource,
    backgroundImageSize,
    backgroundScale,
    backgroundOffset,
    beginBackgroundDrag: (key: string) => draft.begin(key),
    updateBackgroundDragOffset,
    finishBackgroundDrag: draft.finish,
    cancelBackgroundDrag: draft.cancel,
    backgroundRangeGesture,
    isBackgroundArtworkEnabled,
    selectedArtworkId,
    setSelectedArtworkId,
    isArtworkLoading,
    backgroundLayout,
    backgroundOffsetSliderRanges,
    effectiveBackgroundImageUrl,
    effectiveBackgroundImageSize,
    applyBackgroundImageImport,
    getDiscSession,
    invalidateBackgroundWorkAfterPreset: asyncWork.invalidateAll,
    clearSelectedArtwork,
    handleBackgroundUpload,
    handlePickNativeBackgroundFile,
    handleResetBackground,
    handleUseSteamArtwork,
    handleBackgroundArtworkEnabledChange,
    handleBackgroundScaleChange,
    handleBackgroundOffsetChange,
    handleFitBackgroundToSteamBannerOpenArea,
  }
}
