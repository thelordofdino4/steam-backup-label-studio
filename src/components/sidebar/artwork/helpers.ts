import type { LocalSteamScreenshotAsset } from '../../../local/localArtwork'
import type {
  ProjectAdditionalArtworkElement,
  ProjectTitleArtwork,
} from '../../../project/projectTypes'
import type { SteamArtworkAsset } from '../../../steam/steamApi'
import type { RemoteLogoCandidate } from '../../../steam/steamLogoCandidates'
import type { ImageCandidatePickerItem } from '../ImageCandidatePicker'
import {
  createEditorLocalSteamScreenshotPickerItems,
  createEditorSteamArtworkPickerItems,
  createEditorWebArtworkPickerItems,
  formatEditorModifiedDate,
  formatEditorSteamArtworkKind,
  formatEditorWebArtworkSourceKind,
} from '../../editor/editorImageSourcePickerItems'

export function formatArtworkKind(kind: SteamArtworkAsset['kind']) {
  return formatEditorSteamArtworkKind(kind)
}

export function formatModifiedDate(modifiedUnixSeconds?: number) {
  return formatEditorModifiedDate(modifiedUnixSeconds)
}

export function formatTitleArtworkSize(size: ProjectTitleArtwork['imageSize']) {
  return size ? ` (${size.width} x ${size.height}px)` : ''
}

export function formatAdditionalArtworkSize(
  size: ProjectAdditionalArtworkElement['imageSize'],
) {
  return size ? ` (${size.width} x ${size.height}px)` : ''
}

export function createSteamArtworkPickerItems(
  assets: SteamArtworkAsset[],
  selectedArtworkId?: string | null,
): ImageCandidatePickerItem[] {
  return createEditorSteamArtworkPickerItems(assets, selectedArtworkId)
}

export function createLocalSteamScreenshotPickerItems(
  assets: LocalSteamScreenshotAsset[],
  thumbnails: Record<string, string>,
  selectedArtworkId?: string | null,
): ImageCandidatePickerItem[] {
  return createEditorLocalSteamScreenshotPickerItems(
    assets,
    thumbnails,
    selectedArtworkId,
  )
}

export function formatWebArtworkSourceKind(sourceKind: RemoteLogoCandidate['sourceKind']) {
  return formatEditorWebArtworkSourceKind(sourceKind)
}

export function createWebArtworkPickerItems(
  candidates: RemoteLogoCandidate[],
  selectedArtworkId?: string | null,
): ImageCandidatePickerItem[] {
  return createEditorWebArtworkPickerItems(candidates, selectedArtworkId)
}

export function getNumericInputValue(event: { currentTarget: HTMLInputElement }) {
  return Number(event.currentTarget.value)
}
