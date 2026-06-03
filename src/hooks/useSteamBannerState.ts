import { useState, type ChangeEvent } from 'react'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus'
import type {
  BackgroundImageSize,
  ProjectImageAssetProvenance,
  SteamBannerColors,
  SteamBannerLockupLayout,
} from '../project/projectTypes'
import {
  DEFAULT_STEAM_BANNER_COLORS,
  DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
  DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
  createCustomSteamBannerLockupImageState,
  createDefaultSteamBannerLockupImageState,
  updateSteamBannerColor,
  updateSteamBannerLockupLayoutField,
  type SteamBannerColorField,
  type SteamBannerLockupLayoutField,
} from '../branding/steamBanner'
import {
  isImageFile,
  readImportedImageAssetFromFile,
} from '../utils/importedImageAsset'

type UseSteamBannerStateOptions = {
  announceStatus: (message: string) => void
}

function createDefaultSteamBannerLockupImageSource() {
  return createProjectImageAssetProvenance({
    source: 'built-in',
    sourceLabel: 'Default Steam banner lockup',
  })
}

export function useSteamBannerState({
  announceStatus,
}: UseSteamBannerStateOptions) {
  const [steamBannerColors, setSteamBannerColors] = useState<SteamBannerColors>(
    DEFAULT_STEAM_BANNER_COLORS,
  )
  const [steamBannerLockupImageUrl, setSteamBannerLockupImageUrl] = useState<
    string | null
  >(() => createDefaultSteamBannerLockupImageState().imageUrl)
  const [steamBannerLockupImageSource, setSteamBannerLockupImageSource] =
    useState<ProjectImageAssetProvenance | null>(() =>
      createDefaultSteamBannerLockupImageSource(),
    )
  const [steamBannerLockupImageSize, setSteamBannerLockupImageSize] =
    useState<BackgroundImageSize | null>(null)
  const [steamBannerLockupLayout, setSteamBannerLockupLayout] =
    useState<SteamBannerLockupLayout>(DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT)
  const [steamBannerUseTextFallback, setSteamBannerUseTextFallback] =
    useState(false)
  const [steamBannerFallbackText, setSteamBannerFallbackText] = useState(
    DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
  )

  function resetSteamBannerState() {
    const defaultLockupImage = createDefaultSteamBannerLockupImageState()

    setSteamBannerColors(DEFAULT_STEAM_BANNER_COLORS)
    setSteamBannerLockupImageUrl(defaultLockupImage.imageUrl)
    setSteamBannerLockupImageSource(createDefaultSteamBannerLockupImageSource())
    setSteamBannerLockupImageSize(defaultLockupImage.imageSize)
    setSteamBannerLockupLayout(DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT)
    setSteamBannerUseTextFallback(false)
    setSteamBannerFallbackText(DEFAULT_STEAM_BANNER_FALLBACK_TEXT)
  }

  async function handleSteamBannerLockupUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!isImageFile(file)) {
      announceStatus('Choose an image file for the banner lockup.')
      return
    }

    try {
      const importedImage = await readImportedImageAssetFromFile(file)
      const lockupImage = createCustomSteamBannerLockupImageState(
        importedImage.imageDataUrl,
        importedImage.imageSize,
      )

      setSteamBannerLockupImageUrl(lockupImage.imageUrl)
      setSteamBannerLockupImageSource(createProjectImageAssetProvenance({
        source: 'uploaded',
        sourceLabel: file.name,
      }))
      setSteamBannerLockupImageSize(lockupImage.imageSize)
      setSteamBannerUseTextFallback(false)
      announceStatus(`Using ${file.name} as the Steam banner lockup.`)
    } catch (error) {
      announceStatus(`Banner lockup import failed: ${String(error)}`)
    }
  }

  function handleClearSteamBannerLockup() {
    const lockupImage = createDefaultSteamBannerLockupImageState()

    setSteamBannerLockupImageUrl(lockupImage.imageUrl)
    setSteamBannerLockupImageSource(createDefaultSteamBannerLockupImageSource())
    setSteamBannerLockupImageSize(lockupImage.imageSize)
    announceStatus('Reset Steam banner lockup image to the default asset.')
  }

  function handleSteamBannerUseTextFallbackChange(useTextFallback: boolean) {
    setSteamBannerUseTextFallback(useTextFallback)
    announceStatus(
      useTextFallback
        ? 'Using saved text for the Steam banner lockup.'
        : 'Using the Steam banner lockup image.',
    )
  }

  function handleSteamBannerFallbackTextChange(fallbackText: string) {
    setSteamBannerFallbackText(fallbackText)
  }

  function handleSteamBannerLockupLayoutChange(
    field: SteamBannerLockupLayoutField,
    value: number,
  ) {
    setSteamBannerLockupLayout((currentLayout) =>
      updateSteamBannerLockupLayoutField(currentLayout, field, value),
    )
  }

  function handleResetSteamBannerLockupLayout() {
    setSteamBannerLockupLayout(DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT)
    announceStatus('Reset Steam banner lockup layout to the default position.')
  }

  function handleSteamBannerColorChange(
    field: SteamBannerColorField,
    value: string,
  ) {
    setSteamBannerColors((currentColors) =>
      updateSteamBannerColor(currentColors, field, value),
    )
  }

  function handleResetSteamBannerColors() {
    setSteamBannerColors(DEFAULT_STEAM_BANNER_COLORS)
    announceStatus('Reset Steam banner colors to the default palette.')
  }

  return {
    steamBannerColors,
    setSteamBannerColors,
    steamBannerLockupImageUrl,
    setSteamBannerLockupImageUrl,
    steamBannerLockupImageSource,
    setSteamBannerLockupImageSource,
    steamBannerLockupImageSize,
    setSteamBannerLockupImageSize,
    steamBannerLockupLayout,
    setSteamBannerLockupLayout,
    steamBannerUseTextFallback,
    setSteamBannerUseTextFallback,
    steamBannerFallbackText,
    setSteamBannerFallbackText,
    resetSteamBannerState,
    handleSteamBannerLockupUpload,
    handleClearSteamBannerLockup,
    handleSteamBannerUseTextFallbackChange,
    handleSteamBannerFallbackTextChange,
    handleSteamBannerLockupLayoutChange,
    handleResetSteamBannerLockupLayout,
    handleSteamBannerColorChange,
    handleResetSteamBannerColors,
  }
}
