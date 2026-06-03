import type { LocalSteamScreenshotAsset } from '../../../local/localArtwork'
import type {
  ProjectAdditionalArtworkElement,
  ProjectTitleArtwork,
} from '../../../project/projectTypes'
import type { SteamArtworkAsset } from '../../../steam/steamApi'
import type { ImageCandidatePickerItem } from '../ImageCandidatePicker'

export function formatArtworkKind(kind: SteamArtworkAsset['kind']) {
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

export function formatModifiedDate(modifiedUnixSeconds?: number) {
  if (!modifiedUnixSeconds) {
    return null
  }

  return new Date(modifiedUnixSeconds * 1000).toLocaleDateString()
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
  return assets.map((asset) => ({
    id: asset.id,
    title: asset.label,
    subtitle: `Source: Steam online · Type: ${formatArtworkKind(asset.kind)}`,
    imageUrl: asset.url,
    imageFit: 'cover',
    isSelected: selectedArtworkId === asset.id,
  }))
}

export function createLocalSteamScreenshotPickerItems(
  assets: LocalSteamScreenshotAsset[],
  thumbnails: Record<string, string>,
  selectedArtworkId?: string | null,
): ImageCandidatePickerItem[] {
  return assets.map((asset) => {
    const modifiedDate = formatModifiedDate(asset.modifiedUnixSeconds)

    return {
      id: asset.id,
      title: asset.label,
      subtitle: 'Source: Local Steam screenshots · Type: Local screenshot',
      details: modifiedDate ? [`Modified: ${modifiedDate}`] : undefined,
      imageUrl: thumbnails[asset.id] ?? null,
      imageFit: 'cover',
      placeholderLabel: 'Local',
      isSelected: selectedArtworkId === asset.id,
    }
  })
}

export function getNumericInputValue(event: { currentTarget: HTMLInputElement }) {
  return Number(event.currentTarget.value)
}
