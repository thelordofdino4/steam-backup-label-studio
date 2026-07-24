import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import {
  DISC_GUIDED_COMPLETION_SLOT_IDS,
  ignoreDiscGuidedSlotCompletion,
  type DiscGuidedSlotCompletionHandler,
} from '../guidedPresets/discGuidedCompletion.ts'
import { applyImportedLogoAsset } from '../project/projectVisualAssetImport'
import type { LogoAssetKey } from '../project/projectLogoAssets'
import type {
  ProjectImageAssetProvenance,
  ProjectLogoAssets,
  ProjectMetadata,
} from '../project/projectTypes'
import {
  discoverLogoCandidates,
  type LogoCandidateSourceStatus,
  type RemoteLogoCandidate,
} from '../steam/steamLogoCandidates'
import { importRemoteLogoCandidateAsset } from '../steam/steamLogoCandidateImport'
import type { SteamImportedGame } from '../steam/steamApi'
import type { DiscTemplate } from '../types/template'
import type { ImportedImageAsset } from '../utils/importedImageAsset'

export type LogoCandidateDiscoverySlot = {
  candidates: RemoteLogoCandidate[]
  artworkCandidates: RemoteLogoCandidate[]
  sourceStatuses: LogoCandidateSourceStatus[]
  isLoading: boolean
  isApplying: boolean
  error: string | null
  lastSearchedLabel: string | null
  inputKey: string | null
}

export type LogoCandidateDiscoveryState = Record<LogoAssetKey, LogoCandidateDiscoverySlot>

type UseLogoAssetDiscoveryParams = {
  selectedSteamGame: SteamImportedGame | null
  projectMetadata: ProjectMetadata
  selectedDiscTemplate: DiscTemplate
  setProjectLogoAssets: Dispatch<SetStateAction<ProjectLogoAssets>>
  applyLogoAssetImport?: (
    logoKey: LogoAssetKey,
    importedImage: ImportedImageAsset,
    imageSource: ProjectImageAssetProvenance | null,
    additionalLogoId?: string,
  ) => ProjectLogoAssets
  announceStatus: (message: string) => void
  onDiscGuidedSlotCompleted?: DiscGuidedSlotCompletionHandler
}

const EMPTY_DISCOVERY_SLOT: LogoCandidateDiscoverySlot = {
  candidates: [],
  artworkCandidates: [],
  sourceStatuses: [],
  isLoading: false,
  isApplying: false,
  error: null,
  lastSearchedLabel: null,
  inputKey: null,
}

function createInitialDiscoveryState(): LogoCandidateDiscoveryState {
  return {
    developer: { ...EMPTY_DISCOVERY_SLOT },
    publisher: { ...EMPTY_DISCOVERY_SLOT },
  }
}

function getLogoEntityLabel(
  logoKey: LogoAssetKey,
  selectedSteamGame: SteamImportedGame | null,
  projectMetadata: ProjectMetadata,
) {
  const steamNames = logoKey === 'developer'
    ? selectedSteamGame?.developer ?? []
    : selectedSteamGame?.publisher ?? []
  const metadataName = logoKey === 'developer'
    ? projectMetadata.developer
    : projectMetadata.publisher
  const names = [...steamNames, metadataName].map((name) => name.trim()).filter(Boolean)

  return names[0] ?? logoKey
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function useLogoAssetDiscovery({
  selectedSteamGame,
  projectMetadata,
  selectedDiscTemplate,
  setProjectLogoAssets,
  applyLogoAssetImport,
  announceStatus,
  onDiscGuidedSlotCompleted = ignoreDiscGuidedSlotCompletion,
}: UseLogoAssetDiscoveryParams) {
  const [logoCandidateDiscovery, setLogoCandidateDiscovery] =
    useState<LogoCandidateDiscoveryState>(() => createInitialDiscoveryState())
  const discoveryInputKey = [
    selectedSteamGame?.appId ?? projectMetadata.steamAppId,
    projectMetadata.developer,
    projectMetadata.publisher,
  ].join('|')

  const updateSlot = useCallback((
    logoKey: LogoAssetKey,
    updater: (slot: LogoCandidateDiscoverySlot) => LogoCandidateDiscoverySlot,
  ) => {
    setLogoCandidateDiscovery((currentState) => ({
      ...currentState,
      [logoKey]: updater(currentState[logoKey]),
    }))
  }, [])

  const findLogoCandidates = useCallback(async (logoKey: LogoAssetKey) => {
    const lastSearchedLabel = getLogoEntityLabel(logoKey, selectedSteamGame, projectMetadata)

    updateSlot(logoKey, (slot) => ({
      ...slot,
      isLoading: true,
      error: null,
      lastSearchedLabel,
      inputKey: discoveryInputKey,
    }))

    try {
      const discoveryResult = await discoverLogoCandidates({
        logoKey,
        selectedSteamGame,
        projectMetadata,
      })
      const { candidates, artworkCandidates, sourceStatuses } = discoveryResult

      updateSlot(logoKey, (slot) => ({
        ...slot,
        candidates,
        artworkCandidates,
        sourceStatuses,
        isLoading: false,
        error: null,
        inputKey: discoveryInputKey,
      }))

      announceStatus(
        candidates.length > 0
          ? `Found ${candidates.length} logo candidate${candidates.length === 1 ? '' : 's'} for ${lastSearchedLabel}.`
          : `No logo candidates found for ${lastSearchedLabel}. Manual upload is still available.`,
      )
    } catch (error) {
      const message = getErrorMessage(error)
      updateSlot(logoKey, (slot) => ({
        ...slot,
        isLoading: false,
        error: message,
        inputKey: discoveryInputKey,
      }))
      announceStatus(`Logo candidate search failed: ${message}`)
    }
  }, [announceStatus, discoveryInputKey, projectMetadata, selectedSteamGame, updateSlot])

  const applyLogoCandidate = useCallback(async (
    logoKey: LogoAssetKey,
    candidate: RemoteLogoCandidate,
    additionalLogoId?: string,
  ) => {
    updateSlot(logoKey, (slot) => ({
      ...slot,
      isApplying: true,
      error: null,
    }))

    try {
      const { importedImage, imageSource } =
        await importRemoteLogoCandidateAsset(candidate)

      if (applyLogoAssetImport) {
        applyLogoAssetImport(
          logoKey,
          importedImage,
          imageSource,
          additionalLogoId,
        )
      } else {
        setProjectLogoAssets((currentLogoAssets) =>
          applyImportedLogoAsset(
            currentLogoAssets,
            logoKey,
            importedImage,
            selectedDiscTemplate,
            imageSource,
            additionalLogoId,
          ),
        )
      }

      if (!additionalLogoId) {
        onDiscGuidedSlotCompleted(
          logoKey === 'developer'
            ? DISC_GUIDED_COMPLETION_SLOT_IDS.developerLogo
            : DISC_GUIDED_COMPLETION_SLOT_IDS.publisherLogo,
        )
      }

      updateSlot(logoKey, (slot) => ({
        ...slot,
        isApplying: false,
        error: null,
      }))
      announceStatus(
        `Using ${candidate.label} as the ${additionalLogoId ? `additional ${logoKey}` : logoKey} logo.`,
      )
    } catch (error) {
      const message = getErrorMessage(error)
      updateSlot(logoKey, (slot) => ({
        ...slot,
        isApplying: false,
        error: message,
      }))
      announceStatus(`Logo candidate import failed: ${message}`)
    }
  }, [
    announceStatus,
    applyLogoAssetImport,
    onDiscGuidedSlotCompleted,
    selectedDiscTemplate,
    setProjectLogoAssets,
    updateSlot,
  ])

  return {
    logoCandidateDiscovery: {
      developer: logoCandidateDiscovery.developer.inputKey === discoveryInputKey
        ? logoCandidateDiscovery.developer
        : { ...EMPTY_DISCOVERY_SLOT },
      publisher: logoCandidateDiscovery.publisher.inputKey === discoveryInputKey
        ? logoCandidateDiscovery.publisher
        : { ...EMPTY_DISCOVERY_SLOT },
    },
    findLogoCandidates,
    applyLogoCandidate,
  }
}
