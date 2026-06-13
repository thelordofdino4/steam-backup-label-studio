import type { LocalSteamScreenshotAsset } from '../../local/localArtwork'
import type { SteamArtworkAsset } from '../../steam/steamApi'
import type { RemoteLogoCandidate } from '../../steam/steamLogoCandidates'
import {
  getImageCandidateRanking,
  type ImageCandidateRanking,
  type ImageCandidateTarget,
} from '../../editor/imageCandidateRanking.ts'
import type { ImageCandidatePickerItem } from '../sidebar/ImageCandidatePicker'

export function formatEditorSteamArtworkKind(
  kind: SteamArtworkAsset['kind'],
) {
  switch (kind) {
    case 'header':
      return 'Header'
    case 'capsule':
      return 'Capsule'
    case 'background':
      return 'Background'
    case 'logo':
      return 'Logo'
    case 'screenshot':
      return 'Screenshot'
    case 'library':
      return 'Library artwork'
    default:
      return kind
  }
}

export function formatEditorModifiedDate(modifiedUnixSeconds?: number) {
  if (!modifiedUnixSeconds) {
    return null
  }

  return new Date(modifiedUnixSeconds * 1000).toLocaleDateString()
}

function withRanking(
  item: ImageCandidatePickerItem,
  ranking: ImageCandidateRanking,
) {
  return {
    ...item,
    details: [...ranking.details, ...(item.details ?? [])],
    qualityLabel: ranking.qualityLabel,
    qualityTone: ranking.qualityTone,
  }
}

function sortRankedPickerItems(
  items: Array<{
    item: ImageCandidatePickerItem
    score: number
    originalIndex: number
  }>,
) {
  return items
    .sort((firstItem, secondItem) =>
      secondItem.score - firstItem.score ||
      firstItem.originalIndex - secondItem.originalIndex)
    .map(({ item }) => item)
}

function inferSteamArtworkDimensions(asset: SteamArtworkAsset) {
  const dimensionMatch = `${asset.label} ${asset.url}`.match(
    /(\d{2,5})\s*[xX]\s*(\d{2,5})/,
  )

  if (dimensionMatch) {
    return {
      width: Number(dimensionMatch[1]),
      height: Number(dimensionMatch[2]),
    }
  }

  const label = asset.label.toLocaleLowerCase()

  if (asset.kind === 'header') return { width: 460, height: 215 }
  if (asset.kind === 'background') return { width: 1920, height: 1080 }
  if (asset.kind === 'logo') return null
  if (asset.kind === 'screenshot') return null

  if (label.includes('hero')) return { width: 3840, height: 1240 }
  if (label.includes('small')) return { width: 231, height: 87 }
  if (label.includes('capsule')) return { width: 600, height: 900 }

  return null
}

export function createEditorSteamArtworkPickerItems(
  assets: SteamArtworkAsset[],
  selectedArtworkId?: string | null,
  target: ImageCandidateTarget = 'background',
): ImageCandidatePickerItem[] {
  return sortRankedPickerItems(
    assets.map((asset, originalIndex) => {
      const dimensions = inferSteamArtworkDimensions(asset)
      const ranking = getImageCandidateRanking({
        height: dimensions?.height,
        kind: asset.kind,
        target,
        width: dimensions?.width,
      })

      return {
        item: withRanking({
          id: asset.id,
          title: asset.label,
          subtitle: `Source: Steam online · Type: ${formatEditorSteamArtworkKind(asset.kind)}`,
          imageUrl: asset.url,
          imageFit: asset.kind === 'logo' ? 'contain' : 'cover',
          isSelected: selectedArtworkId === asset.id,
        }, ranking),
        originalIndex,
        score: ranking.score,
      }
    }),
  )
}

export function createEditorLocalSteamScreenshotPickerItems(
  assets: LocalSteamScreenshotAsset[],
  thumbnails: Record<string, string>,
  selectedArtworkId?: string | null,
  target: ImageCandidateTarget = 'background',
): ImageCandidatePickerItem[] {
  return sortRankedPickerItems(assets.map((asset, originalIndex) => {
    const modifiedDate = formatEditorModifiedDate(asset.modifiedUnixSeconds)
    const ranking = getImageCandidateRanking({
      kind: 'screenshot',
      target,
    })

    return {
      item: withRanking({
        id: asset.id,
        title: asset.label,
        subtitle: 'Source: Local Steam screenshots · Type: Local screenshot',
        details: modifiedDate ? [`Modified: ${modifiedDate}`] : undefined,
        imageUrl: thumbnails[asset.id] ?? null,
        imageFit: 'cover',
        placeholderLabel: 'Local',
        isSelected: selectedArtworkId === asset.id,
      }, ranking),
      originalIndex,
      score: ranking.score,
    }
  }))
}

export function formatEditorWebArtworkSourceKind(
  sourceKind: RemoteLogoCandidate['sourceKind'],
) {
  switch (sourceKind) {
    case 'official-img':
      return 'Official site image'
    case 'official-srcset':
      return 'Official srcset'
    case 'official-css-background':
      return 'Official CSS image'
    case 'official-meta-image':
      return 'Official metadata image'
    case 'steam-meta-image':
      return 'Steam metadata image'
    case 'steam-img':
      return 'Steam page image'
    case 'steam-avatar':
      return 'Steam creator image'
    case 'favicon':
      return 'Site icon'
    default:
      return sourceKind
  }
}

function formatWebArtworkCandidateDimensions(candidate: RemoteLogoCandidate) {
  return candidate.width && candidate.height
    ? ` · ${candidate.width} x ${candidate.height}px`
    : ''
}

export function createEditorWebArtworkPickerItems(
  candidates: RemoteLogoCandidate[],
  selectedArtworkId?: string | null,
  target: ImageCandidateTarget = 'background',
): ImageCandidatePickerItem[] {
  return sortRankedPickerItems(
    candidates.map((candidate, originalIndex) => {
      const ranking = getImageCandidateRanking({
        baseScore: candidate.score,
        contentKind: candidate.contentKind,
        height: candidate.height,
        isVector: candidate.fileType === 'svg',
        target,
        transparencyHint: candidate.transparencyHint,
        width: candidate.width,
      })

      return {
        item: withRanking({
          id: candidate.id,
          title: candidate.label,
          subtitle: `Source: ${formatEditorWebArtworkSourceKind(candidate.sourceKind)}${formatWebArtworkCandidateDimensions(candidate)}`,
          details: candidate.reasons.slice(0, 3),
          imageUrl: candidate.previewUrl ?? candidate.url,
          imageFit: candidate.contentKind === 'logo' ? 'contain' : 'cover',
          isSelected: selectedArtworkId === candidate.id,
        }, ranking),
        originalIndex,
        score: ranking.score,
      }
    }),
  )
}
