import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { EditorRoleFocusProvider } from '../../editor/EditorRoleFocusProvider.tsx'
import { DiscEditorNavigationRolePanel } from '../../editor/DiscEditorNavigationRolePanel.tsx'
import { EditorFeaturePanel } from '../../editor/EditorPanel.tsx'
import { DiscLayoutPresetsPanel } from '../../sidebar/DiscLayoutPresetsPanel.tsx'
import { useEditorRoleFocus } from '../../editor/editorRoleFocusContext.ts'
import {
  registerBackgroundArtworkFocusTargets,
  shouldOpenBackgroundLocalFilePanelForRequest,
} from '../../editor/discBackgroundArtworkRoleFocusRegistration.ts'
import {
  registerAlwaysMountedCompanyLogoFocusTargets,
  registerDeveloperCompanyLogoUploadFocusTarget,
  registerPublisherCompanyLogoUploadFocusTarget,
  shouldOpenCompanyLogoPanelForRequest,
} from '../../editor/discCompanyLogosRoleFocusRegistration.ts'
import {
  registerDiscLegalInfoFocusTarget,
} from '../../editor/discFixedTextRoleFocusRegistration.ts'
import {
  registerAlwaysMountedGameTitleFocusTargets,
  registerGameTitleArtworkUploadFocusTarget,
} from '../../editor/discGameTitleRoleFocusRegistration.ts'
import {
  registerAlwaysMountedMediaFocusTargets,
  registerAlwaysMountedOperatingSystemFocusTarget,
  registerEnabledMediaFormatFocusTarget,
  shouldOpenMediaPanelForRequest,
  shouldOpenOperatingSystemPanelForRequest,
} from '../../editor/discGameInfoRoleFocusRegistration.ts'
import {
  registerAlwaysMountedRatingFocusTargets,
  registerEnabledRatingSelectFocusTargets,
  shouldOpenRatingPanelForRequest,
} from '../../editor/discRatingRoleFocusRegistration.ts'
import type { EditorRoleFocusRequest } from '../../../editor/editorRoleFocus.ts'
import type {
  EditorRoleFocusRequestInput,
} from '../../../editor/editorRoleFocusController.ts'
import {
  getDiscGuidedLayoutDefinition,
  getDiscGuidedLayoutIdForRolePreset,
} from '../../../guidedPresets/discGuidedLayouts.ts'
import {
  projectDiscGuidedPlaceholderViewModel,
} from '../../../guidedPresets/discGuidedPlaceholderViewModel.ts'
import type { DiscGuidedSlotId } from '../../../guidedPresets/discGuidedSlots.ts'
import {
  createDiscGuidedProgressItems,
} from '../../../guidedPresets/discGuidedRestoreItems.ts'
import {
  INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  applyDiscGuidedLayout,
  completeDiscGuidedSlot,
  omitDiscGuidedSlot,
  resetDiscGuidedProgress,
  restoreCompletedDiscGuidedSlot,
  restoreDiscGuidedSlot,
  type DiscGuidedWorkflowState,
} from '../../../guidedPresets/discGuidedWorkflow.ts'
import {
  getNextDiscGuidedWorkflowForPresetApplication,
} from '../../../hooks/useDiscGuidedPlaceholderPreview.ts'
import {
  createSavedDiscGuidedLayout,
  restoreSavedDiscGuidedWorkflow,
} from '../../../project/projectGuidedWorkflow.ts'
import { DiscGuidedPlaceholderActions } from '../DiscGuidedPlaceholderActions.tsx'

type ToggleableFeature =
  | 'titleArtwork'
  | 'rating'
  | 'media'
  | 'developer'
  | 'publisher'

type HarnessFeatureState = {
  enabled: Record<ToggleableFeature, boolean>
  selectedValues: {
    ratingSystem: string
    mediaFormat: string
    platformMarks: readonly string[]
  }
  text: {
    title: string
    copyright: string
  }
  imageAssets: {
    background: string | null
    titleArtwork: string | null
    developer: string | null
    publisher: string | null
  }
  sources: Record<string, string>
  theme: string
  layout: Record<string, number>
  projectDirty: boolean
  undoDepth: number
  previewSelection: string | null
  discTextSelection: string | null
  contextualRibbon: string | null
}

type GuidedNavigationHarnessApi = {
  activateClassicLayout: () => void
  completeSlots: (slotIds: readonly DiscGuidedSlotId[]) => void
  getSavedEditor: () => unknown
  getFeatureSnapshot: () => HarnessFeatureState & { serializedProject: string }
  getWorkflowSnapshot: () => DiscGuidedWorkflowState
  getPendingRequest: () => EditorRoleFocusRequest | null
  loadSavedEditor: (editor: unknown) => void
  omitSlots: (slotIds: readonly DiscGuidedSlotId[]) => void
  requestLog: EditorRoleFocusRequest[]
  resetGuidedWorkflow: () => void
  requestRoleFocus: (request: EditorRoleFocusRequestInput) => void
  setFeatureEnabled: (feature: ToggleableFeature, enabled: boolean) => void
  setFilledSlotId: (slotId: DiscGuidedSlotId | null) => void
  setSuggestedSlotId: (slotId: DiscGuidedSlotId | null) => void
}

declare global {
  interface Window {
    __discGuidedNavigationHarness?: GuidedNavigationHarnessApi
  }
}

const INITIAL_FEATURE_STATE: HarnessFeatureState = {
  enabled: {
    titleArtwork: false,
    rating: false,
    media: false,
    developer: false,
    publisher: false,
  },
  selectedValues: {
    ratingSystem: 'ESRB',
    mediaFormat: 'dvd-rom',
    platformMarks: ['windows'],
  },
  text: {
    title: 'Integration Fixture',
    copyright: 'Copyright fixture',
  },
  imageAssets: {
    background: null,
    titleArtwork: null,
    developer: null,
    publisher: null,
  },
  sources: {
    background: 'none',
    titleArtwork: 'none',
    rating: 'builtin',
    media: 'builtin',
  },
  theme: 'classic',
  layout: {
    backgroundScale: 1,
    titleX: 50,
    titleY: 20,
  },
  projectDirty: false,
  undoDepth: 0,
  previewSelection: null,
  discTextSelection: null,
  contextualRibbon: null,
}

function getRequiredGuidedLayout() {
  const layout = getDiscGuidedLayoutDefinition(
    'disc:guided-layout:classic-top-title',
  )

  if (!layout) {
    throw new Error(
      'Classic Top Title guided layout is required by the integration harness.',
    )
  }

  return layout
}

const guidedLayout = getRequiredGuidedLayout()

const ALL_PLACEHOLDERS = guidedLayout.slotOrder.map((slotId) => {
  const placeholder = projectDiscGuidedPlaceholderViewModel({
    layoutSlot: guidedLayout.slots[slotId] ?? null,
    lifecycle: 'unfilled',
  })

  if (!placeholder) {
    throw new Error(`Missing Classic Top Title placeholder: ${slotId}`)
  }

  return placeholder
})

function cloneFeatureState(state: HarnessFeatureState) {
  const snapshot = structuredClone(state)
  return {
    ...snapshot,
    serializedProject: JSON.stringify(snapshot),
  }
}

function RolePanel({
  children,
  label,
  roleId,
}: {
  children: ReactNode
  label: string
  roleId: 'background-artwork' | 'game-title' | 'game-info-logos' |
    'company-logos' | 'legal-info' | 'additional-artwork'
}) {
  return (
    <section data-role-id={roleId}>
      <DiscEditorNavigationRolePanel
        label={label}
        roleId={roleId}
        smokeId={`integration-${roleId}`}
      >
        {children}
      </DiscEditorNavigationRolePanel>
    </section>
  )
}

function GuidedNavigationHarnessContent() {
  const {
    registerFocusTarget,
    registerFocusTargetFallback,
    registerSectionAlignmentTarget,
    requestRoleFocus,
    setRoleOpen,
    state: navigationState,
  } = useEditorRoleFocus()
  const [featureState, setFeatureState] = useState(() =>
    structuredClone(INITIAL_FEATURE_STATE))
  const [workflow, setWorkflow] = useState(() =>
    applyDiscGuidedLayout(INITIAL_DISC_GUIDED_WORKFLOW_STATE, {
      id: guidedLayout.id,
      version: guidedLayout.version,
    }).state)
  const [resolvedPresetAvailable, setResolvedPresetAvailable] = useState(true)
  const [suggestedSlotId, setSuggestedSlotId] = useState<DiscGuidedSlotId | null>(null)
  const [filledSlotId, setFilledSlotId] = useState<DiscGuidedSlotId | null>(null)
  const [backgroundPanelOpen, setBackgroundPanelOpen] = useState(false)
  const [ratingPanelOpen, setRatingPanelOpen] = useState(false)
  const [mediaPanelOpen, setMediaPanelOpen] = useState(false)
  const [operatingSystemPanelOpen, setOperatingSystemPanelOpen] = useState(false)
  const [companyPanelOpen, setCompanyPanelOpen] = useState(false)
  const requestLogRef = useRef<EditorRoleFocusRequest[]>([])
  const lastLoggedRequestIdRef = useRef<number | null>(null)
  const artworkEnableRef = useRef<HTMLInputElement | null>(null)
  const artworkUploadRef = useRef<HTMLInputElement | null>(null)
  const titleTextRef = useRef<HTMLInputElement | null>(null)
  const backgroundEnableRef = useRef<HTMLInputElement | null>(null)
  const backgroundUploadRef = useRef<HTMLInputElement | null>(null)
  const ratingEnableRef = useRef<HTMLInputElement | null>(null)
  const ratingSystemRef = useRef<HTMLSelectElement | null>(null)
  const mediaEnableRef = useRef<HTMLInputElement | null>(null)
  const mediaFormatRef = useRef<HTMLSelectElement | null>(null)
  const mediaSectionRef = useRef<HTMLDetailsElement | null>(null)
  const operatingSystemEnableRef = useRef<HTMLInputElement | null>(null)
  const operatingSystemSectionRef = useRef<HTMLDetailsElement | null>(null)
  const developerEnableRef = useRef<HTMLInputElement | null>(null)
  const developerSectionRef = useRef<HTMLDivElement | null>(null)
  const developerUploadRef = useRef<HTMLInputElement | null>(null)
  const publisherEnableRef = useRef<HTMLInputElement | null>(null)
  const publisherSectionRef = useRef<HTMLDivElement | null>(null)
  const publisherUploadRef = useRef<HTMLInputElement | null>(null)
  const copyrightRef = useRef<HTMLInputElement | null>(null)
  const previewFallbackRef = useRef<HTMLElement | null>(null)
  const pendingRequest = navigationState.pendingRequest
  const openGameTitleRole = useCallback(
    () => setRoleOpen('game-title', true),
    [setRoleOpen],
  )
  const openBackgroundPanel = useCallback(
    () => setBackgroundPanelOpen(true),
    [],
  )
  const openRatingPanel = useCallback(() => setRatingPanelOpen(true), [])
  const openMediaPanel = useCallback(() => setMediaPanelOpen(true), [])
  const openOperatingSystemPanel = useCallback(
    () => setOperatingSystemPanelOpen(true),
    [],
  )
  const openCompanyPanel = useCallback(() => setCompanyPanelOpen(true), [])
  const setFeatureEnabled = useCallback(
    (feature: ToggleableFeature, enabled: boolean) => {
      setFeatureState((current) => ({
        ...current,
        enabled: { ...current.enabled, [feature]: enabled },
      }))
    },
    [],
  )
  const activateClassicLayout = useCallback(() => {
    setWorkflow((current) => applyDiscGuidedLayout(current, {
      id: guidedLayout.id,
      version: guidedLayout.version,
    }).state)
    setResolvedPresetAvailable(true)
  }, [])
  const resetGuidedWorkflow = useCallback(() => {
    setWorkflow(INITIAL_DISC_GUIDED_WORKFLOW_STATE)
    setResolvedPresetAvailable(false)
  }, [])
  const omitSlots = useCallback((slotIds: readonly DiscGuidedSlotId[]) => {
    setWorkflow((current) => slotIds.reduce(
      (next, slotId) => omitDiscGuidedSlot(next, slotId).state,
      current,
    ))
  }, [])
  const completeSlots = useCallback((slotIds: readonly DiscGuidedSlotId[]) => {
    setWorkflow((current) => slotIds.reduce(
      (next, slotId) => completeDiscGuidedSlot(next, slotId).state,
      current,
    ))
  }, [])
  const loadSavedEditor = useCallback((editor: unknown) => {
    const restoredWorkflow = restoreSavedDiscGuidedWorkflow(editor)
    setWorkflow(restoredWorkflow)
    setResolvedPresetAvailable(Boolean(restoredWorkflow.activeLayout))
  }, [])

  useLayoutEffect(() => {
    if (pendingRequest && pendingRequest.requestId !== lastLoggedRequestIdRef.current) {
      requestLogRef.current.push(structuredClone(pendingRequest))
      lastLoggedRequestIdRef.current = pendingRequest.requestId
    }

    window.__discGuidedNavigationHarness = {
      activateClassicLayout,
      completeSlots,
      getSavedEditor: () => {
        const savedLayout = createSavedDiscGuidedLayout(workflow)
        return savedLayout ? { guidedLayout: savedLayout } : undefined
      },
      getFeatureSnapshot: () => cloneFeatureState(featureState),
      getWorkflowSnapshot: () => structuredClone(workflow),
      getPendingRequest: () => navigationState.pendingRequest,
      loadSavedEditor,
      omitSlots,
      requestLog: requestLogRef.current,
      resetGuidedWorkflow,
      requestRoleFocus,
      setFeatureEnabled,
      setFilledSlotId,
      setSuggestedSlotId,
    }
  }, [
    activateClassicLayout,
    completeSlots,
    featureState,
    loadSavedEditor,
    navigationState.pendingRequest,
    omitSlots,
    pendingRequest,
    requestRoleFocus,
    resetGuidedWorkflow,
    setFeatureEnabled,
    setFilledSlotId,
    setSuggestedSlotId,
    workflow,
  ])

  useLayoutEffect(() => registerAlwaysMountedGameTitleFocusTargets({
    artworkEnableElement: () => artworkEnableRef.current,
    openGameTitleRole,
    registerFocusTarget,
    registerFocusTargetFallback,
    textFallbackElement: () => titleTextRef.current,
  }), [
    openGameTitleRole,
    registerFocusTarget,
    registerFocusTargetFallback,
  ])

  useLayoutEffect(() => {
    if (!featureState.enabled.titleArtwork) return undefined
    return registerGameTitleArtworkUploadFocusTarget({
      artworkUploadElement: () => artworkUploadRef.current,
      openGameTitleRole,
      registerFocusTarget,
    })
  }, [featureState.enabled.titleArtwork, openGameTitleRole, registerFocusTarget])

  useLayoutEffect(() => registerBackgroundArtworkFocusTargets({
    enableElement: () => backgroundEnableRef.current,
    localUploadElement: () => backgroundUploadRef.current,
    openLocalFilePanel: openBackgroundPanel,
    registerFocusTarget,
  }), [openBackgroundPanel, registerFocusTarget])

  useLayoutEffect(() => registerAlwaysMountedRatingFocusTargets({
    enableElement: () => ratingEnableRef.current,
    openRatingPanel,
    registerFocusTarget,
    registerFocusTargetFallback,
  }), [openRatingPanel, registerFocusTarget, registerFocusTargetFallback])

  useLayoutEffect(() => {
    if (!featureState.enabled.rating) return undefined
    return registerEnabledRatingSelectFocusTargets({
      openRatingPanel,
      registerFocusTarget,
      sourceElement: () => null,
      systemElement: () => ratingSystemRef.current,
    })
  }, [featureState.enabled.rating, openRatingPanel, registerFocusTarget])

  useLayoutEffect(() => registerAlwaysMountedMediaFocusTargets({
    enableElement: () => mediaEnableRef.current,
    openMediaPanel,
    registerFocusTarget,
    registerFocusTargetFallback,
    registerSectionAlignmentTarget,
    sectionElement: () => mediaSectionRef.current,
  }), [
    openMediaPanel,
    registerFocusTarget,
    registerFocusTargetFallback,
    registerSectionAlignmentTarget,
  ])

  useLayoutEffect(() => {
    if (!featureState.enabled.media) return undefined
    return registerEnabledMediaFormatFocusTarget({
      formatElement: () => mediaFormatRef.current,
      openMediaPanel,
      registerFocusTarget,
    })
  }, [featureState.enabled.media, openMediaPanel, registerFocusTarget])

  useLayoutEffect(() => registerAlwaysMountedOperatingSystemFocusTarget({
    enableElement: () => operatingSystemEnableRef.current,
    openOperatingSystemPanel,
    registerFocusTarget,
    registerSectionAlignmentTarget,
    sectionElement: () => operatingSystemSectionRef.current,
  }), [
    openOperatingSystemPanel,
    registerFocusTarget,
    registerSectionAlignmentTarget,
  ])

  useLayoutEffect(() => registerAlwaysMountedCompanyLogoFocusTargets({
    developerEnableElement: () => developerEnableRef.current,
    developerSectionElement: () => developerSectionRef.current,
    openCompanyLogoPanel: openCompanyPanel,
    publisherEnableElement: () => publisherEnableRef.current,
    publisherSectionElement: () => publisherSectionRef.current,
    registerFocusTarget,
    registerFocusTargetFallback,
    registerSectionAlignmentTarget,
  }), [
    openCompanyPanel,
    registerFocusTarget,
    registerFocusTargetFallback,
    registerSectionAlignmentTarget,
  ])

  useLayoutEffect(() => {
    if (!featureState.enabled.developer) return undefined
    return registerDeveloperCompanyLogoUploadFocusTarget({
      openCompanyLogoPanel: openCompanyPanel,
      registerFocusTarget,
      uploadElement: () => developerUploadRef.current,
    })
  }, [featureState.enabled.developer, openCompanyPanel, registerFocusTarget])

  useLayoutEffect(() => {
    if (!featureState.enabled.publisher) return undefined
    return registerPublisherCompanyLogoUploadFocusTarget({
      openCompanyLogoPanel: openCompanyPanel,
      registerFocusTarget,
      uploadElement: () => publisherUploadRef.current,
    })
  }, [featureState.enabled.publisher, openCompanyPanel, registerFocusTarget])

  useLayoutEffect(() => registerDiscLegalInfoFocusTarget({
    copyrightElement: () => copyrightRef.current,
    registerFocusTarget,
  }), [registerFocusTarget])

  const backgroundOpen = backgroundPanelOpen ||
    shouldOpenBackgroundLocalFilePanelForRequest(pendingRequest)
  const ratingOpen = ratingPanelOpen || shouldOpenRatingPanelForRequest(pendingRequest)
  const mediaOpen = mediaPanelOpen || shouldOpenMediaPanelForRequest(pendingRequest)
  const operatingSystemOpen = operatingSystemPanelOpen ||
    shouldOpenOperatingSystemPanelForRequest(pendingRequest)
  const companyOpen = companyPanelOpen ||
    shouldOpenCompanyLogoPanelForRequest(pendingRequest)
  const featureSnapshot = useMemo(() => cloneFeatureState(featureState), [featureState])
  const placeholders = useMemo(
    () => resolvedPresetAvailable
      ? ALL_PLACEHOLDERS
      .filter(({ slotId }) => !workflow.omittedSlotIds.includes(slotId))
      .filter(({ slotId }) => !workflow.completedSlotIds.includes(slotId))
      .filter(({ slotId }) => slotId !== filledSlotId)
      .map((placeholder) => placeholder.slotId === suggestedSlotId
        ? { ...placeholder, lifecycle: 'suggested' as const }
        : placeholder)
      : [],
    [
      filledSlotId,
      resolvedPresetAvailable,
      suggestedSlotId,
      workflow.completedSlotIds,
      workflow.omittedSlotIds,
    ],
  )
  const progressItems = useMemo(
    () => createDiscGuidedProgressItems(workflow),
    [workflow],
  )
  const omitSlot = useCallback((slotId: typeof placeholders[number]['slotId']) => {
    setWorkflow((current) => omitDiscGuidedSlot(current, slotId).state)
  }, [])
  const includeSlot = useCallback((slotId: DiscGuidedSlotId) => {
    setWorkflow((current) => restoreDiscGuidedSlot(current, slotId).state)
  }, [])
  const showSlotAgain = useCallback((slotId: DiscGuidedSlotId) => {
    setWorkflow((current) =>
      restoreCompletedDiscGuidedSlot(current, slotId).state,
    )
  }, [])
  const resetProgress = useCallback(() => {
    setWorkflow((current) => resetDiscGuidedProgress(current).state)
  }, [])
  const applyPreset = useCallback((presetId: string) => {
    setWorkflow((current) => getNextDiscGuidedWorkflowForPresetApplication({
      currentWorkflow: current,
      presetId,
      applied: true,
    }))
    setResolvedPresetAvailable(
      getDiscGuidedLayoutIdForRolePreset(presetId) !== null,
    )
    return true
  }, [])

  return (
    <main data-feature-snapshot={JSON.stringify(featureSnapshot)}>
      <aside>
        <DiscLayoutPresetsPanel
          guidedProgress={progressItems}
          onApplyPreset={applyPreset}
          onIncludeGuidedSlot={includeSlot}
          onShowGuidedSlotAgain={showSlotAgain}
          onResetGuidedProgress={resetProgress}
        />

        <RolePanel label="Background Artwork" roleId="background-artwork">
          <label><input ref={backgroundEnableRef} type="checkbox" /> Show background</label>
          <div data-nested-panel="background-local-file">
            <EditorFeaturePanel
              title="Local file"
              open={backgroundOpen}
              onOpenChange={setBackgroundPanelOpen}
            >
              <label className="secondary-button logo-upload-button" htmlFor="integration-background-upload">
                Choose local image
              </label>
              <input
                ref={backgroundUploadRef}
                id="integration-background-upload"
                className="logo-file-input"
                type="file"
              />
            </EditorFeaturePanel>
          </div>
        </RolePanel>

        <RolePanel label="Game Title" roleId="game-title">
          <label>
            <input
              ref={artworkEnableRef}
              id="integration-title-artwork-enable"
              type="checkbox"
              checked={featureState.enabled.titleArtwork}
              onChange={(event) => setFeatureEnabled('titleArtwork', event.target.checked)}
            />
            Show game logo
          </label>
          {featureState.enabled.titleArtwork ? (
            <input
              ref={artworkUploadRef}
              id="integration-title-artwork-upload"
              className="logo-file-input"
              type="file"
            />
          ) : null}
          <label>
            <input ref={titleTextRef} id="integration-title-text-enable" type="checkbox" />
            Show title text
          </label>
        </RolePanel>

        <RolePanel label="Game Info Logos" roleId="game-info-logos">
          <div data-nested-panel="rating">
            <EditorFeaturePanel
              title="Rating badge"
              open={ratingOpen}
              onOpenChange={setRatingPanelOpen}
            >
              <label>
                <input
                  ref={ratingEnableRef}
                  id="integration-rating-enable"
                  type="checkbox"
                  checked={featureState.enabled.rating}
                  onChange={(event) => setFeatureEnabled('rating', event.target.checked)}
                />
                Show rating
              </label>
              {featureState.enabled.rating ? (
                <select
                  ref={ratingSystemRef}
                  id="integration-rating-system"
                  value={featureState.selectedValues.ratingSystem}
                  onChange={() => undefined}
                >
                  <option>ESRB</option>
                  <option>PEGI</option>
                </select>
              ) : null}
            </EditorFeaturePanel>
          </div>

          <div data-nested-panel="media">
            <EditorFeaturePanel
              title="Media format mark"
              detailsRef={mediaSectionRef}
              open={mediaOpen}
              onOpenChange={setMediaPanelOpen}
            >
              <label>
                <input
                  ref={mediaEnableRef}
                  id="integration-media-enable"
                  data-simulate-focus-scroll="nearest"
                  type="checkbox"
                  checked={featureState.enabled.media}
                  onChange={(event) => setFeatureEnabled('media', event.target.checked)}
                />
                Show media format
              </label>
              {featureState.enabled.media ? (
                <select
                  ref={mediaFormatRef}
                  id="integration-media-format"
                  data-simulate-focus-scroll="nearest"
                  value={featureState.selectedValues.mediaFormat}
                  onChange={() => undefined}
                >
                  <option value="dvd-rom">DVD-ROM</option>
                  <option value="cd-rom">CD-ROM</option>
                </select>
              ) : null}
            </EditorFeaturePanel>
          </div>

          <div data-nested-panel="operating-system">
            <EditorFeaturePanel
              title="Operating system marks"
              detailsRef={operatingSystemSectionRef}
              open={operatingSystemOpen}
              onOpenChange={setOperatingSystemPanelOpen}
            >
              <label>
                <input
                  ref={operatingSystemEnableRef}
                  id="integration-operating-system-enable"
                  data-simulate-focus-scroll="nearest"
                  type="checkbox"
                />
                Show operating system marks
              </label>
            </EditorFeaturePanel>
          </div>
        </RolePanel>

        <RolePanel label="Company Logos" roleId="company-logos">
          <div data-nested-panel="company-logos">
            <EditorFeaturePanel
              title="Developer / publisher logos"
              open={companyOpen}
              onOpenChange={setCompanyPanelOpen}
            >
              <div
                ref={developerSectionRef}
                className="logo-asset-card editor-nested-panel"
                data-nested-panel="developer"
              >
                <label>
                  <input
                    ref={developerEnableRef}
                    id="integration-developer-enable"
                    data-simulate-focus-scroll="nearest"
                    type="checkbox"
                    checked={featureState.enabled.developer}
                    onChange={(event) => setFeatureEnabled('developer', event.target.checked)}
                  />
                  Show developer logo
                </label>
                {featureState.enabled.developer ? (
                  <input
                    ref={developerUploadRef}
                    id="integration-developer-upload"
                    className="logo-file-input"
                    data-simulate-focus-scroll="nearest"
                    type="file"
                  />
                ) : null}
              </div>
              <div
                ref={publisherSectionRef}
                className="logo-asset-card editor-nested-panel"
                data-nested-panel="publisher"
              >
                <label>
                  <input
                    ref={publisherEnableRef}
                    id="integration-publisher-enable"
                    data-simulate-focus-scroll="nearest"
                    type="checkbox"
                    checked={featureState.enabled.publisher}
                    onChange={(event) => setFeatureEnabled('publisher', event.target.checked)}
                  />
                  Show publisher logo
                </label>
                {featureState.enabled.publisher ? (
                  <input
                    ref={publisherUploadRef}
                    id="integration-publisher-upload"
                    className="logo-file-input"
                    data-simulate-focus-scroll="nearest"
                    type="file"
                  />
                ) : null}
              </div>
            </EditorFeaturePanel>
          </div>
        </RolePanel>

        <RolePanel label="Legal Info" roleId="legal-info">
          <label>
            <input ref={copyrightRef} id="integration-copyright-enable" type="checkbox" />
            Show copyright text
          </label>
        </RolePanel>

        <RolePanel label="Additional Artwork" roleId="additional-artwork">
          <button id="integration-unrelated-control" type="button">Unrelated control</button>
        </RolePanel>
      </aside>

      <section
        ref={previewFallbackRef}
        aria-label="Guided preview actions"
        data-guided-preview-fallback
        tabIndex={-1}
      >
        <DiscGuidedPlaceholderActions
          placeholders={placeholders}
          workflowRevision={workflow}
          onOmitSlot={omitSlot}
          fallbackFocusRef={previewFallbackRef}
        />
      </section>
    </main>
  )
}

export function DiscGuidedNavigationIntegrationHarness() {
  return (
    <EditorRoleFocusProvider>
      <GuidedNavigationHarnessContent />
    </EditorRoleFocusProvider>
  )
}
