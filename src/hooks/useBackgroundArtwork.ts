import { useMemo, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react'
import {
  BackgroundImageLoadError,
  createUploadedBackgroundImageImport,
  type BackgroundImageImportResult,
} from '../image/backgroundImageImport'
import {
  DEFAULT_BACKGROUND_SCALE,
  clampBackgroundOffsetToImageBounds,
  createDefaultBackgroundOffset,
  createEmptyBackgroundImageState,
  getBackgroundOffsetSliderRanges,
  getBackgroundPreviewSize,
  updateBackgroundOffsetField,
  updateBackgroundScale,
  type BackgroundOffsetField,
} from '../image/backgroundImage'
import type { SteamLogoPlacement } from '../discText'
import { getBackgroundFitToSteamBannerOpenArea } from '../layout/backgroundArtworkFit'
import type {
  BackgroundImageSize,
  BackgroundOffset,
  ProjectImageAssetProvenance,
} from '../project/projectTypes'

type UseBackgroundArtworkOptions = {
  discPreviewSize: number
  steamLogoPlacement: SteamLogoPlacement
  setSelectedArtworkId: Dispatch<SetStateAction<string | null>>
  announceStatus: (message: string) => void
}

export function useBackgroundArtwork({
  discPreviewSize,
  steamLogoPlacement,
  setSelectedArtworkId,
  announceStatus,
}: UseBackgroundArtworkOptions) {
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null)
  const [backgroundImageSource, setBackgroundImageSource] =
    useState<ProjectImageAssetProvenance | null>(null)
  const [backgroundImageSize, setBackgroundImageSize] =
    useState<BackgroundImageSize | null>(null)
  const [backgroundScale, setBackgroundScale] = useState(DEFAULT_BACKGROUND_SCALE)
  const [backgroundOffset, setBackgroundOffset] = useState<BackgroundOffset>({
    x: 0,
    y: 0,
  })
  const [isBackgroundArtworkEnabled, setIsBackgroundArtworkEnabled] = useState(true)

  const backgroundPreviewSize = useMemo(
    () => getBackgroundPreviewSize(backgroundImageSize),
    [backgroundImageSize],
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

  function applyBackgroundImageImport(importedBackground: BackgroundImageImportResult) {
    setBackgroundImageUrl(importedBackground.background.imageUrl)
    setBackgroundImageSource(importedBackground.imageSource)
    setBackgroundImageSize(importedBackground.background.imageSize)
    setBackgroundScale(importedBackground.background.scale)
    setBackgroundOffset(importedBackground.background.offset)
    setIsBackgroundArtworkEnabled(true)
    setSelectedArtworkId(importedBackground.selectedArtworkId)
    announceStatus(importedBackground.statusMessage)
  }

  function resetBackgroundArtwork() {
    const emptyBackground = createEmptyBackgroundImageState()
    setBackgroundImageUrl(emptyBackground.imageUrl)
    setBackgroundImageSource(null)
    setBackgroundImageSize(emptyBackground.imageSize)
    setBackgroundScale(emptyBackground.scale)
    setBackgroundOffset(emptyBackground.offset)
    setIsBackgroundArtworkEnabled(true)
  }

  async function handleBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      applyBackgroundImageImport(await createUploadedBackgroundImageImport(file))
    } catch (error) {
      announceStatus(
        error instanceof BackgroundImageLoadError
          ? 'Background image could not be loaded.'
          : 'Background image could not be read.',
      )
    }
  }

  function handleResetBackground() {
    setBackgroundScale(DEFAULT_BACKGROUND_SCALE)
    setBackgroundOffset(createDefaultBackgroundOffset())
  }

  function handleBackgroundArtworkEnabledChange(enabled: boolean) {
    setIsBackgroundArtworkEnabled(enabled)
  }

  function handleBackgroundScaleChange(value: number) {
    const nextScale = updateBackgroundScale(value)

    setBackgroundScale(nextScale)
    setBackgroundOffset((currentOffset) =>
      clampBackgroundOffsetToImageBounds(
        currentOffset,
        backgroundImageSize,
        nextScale,
        discPreviewSize,
      ),
    )
  }

  function handleBackgroundOffsetChange(
    field: BackgroundOffsetField,
    value: number,
  ) {
    setBackgroundOffset((currentOffset) =>
      updateBackgroundOffsetField(
        currentOffset,
        field,
        value,
        backgroundImageSize,
        backgroundScale,
        discPreviewSize,
      ),
    )
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

    setBackgroundScale(updateBackgroundScale(fit.scale))
    setBackgroundOffset(fit.offset)
    announceStatus(
      steamLogoPlacement === 'none'
        ? 'Fit background edge to edge.'
        : 'Fit background between the Steam banner and disc edge.',
    )
  }

  return {
    backgroundImageUrl,
    setBackgroundImageUrl,
    backgroundImageSource,
    setBackgroundImageSource,
    backgroundImageSize,
    setBackgroundImageSize,
    backgroundScale,
    setBackgroundScale,
    backgroundOffset,
    setBackgroundOffset,
    isBackgroundArtworkEnabled,
    setIsBackgroundArtworkEnabled,
    backgroundPreviewSize,
    backgroundOffsetSliderRanges,
    effectiveBackgroundImageUrl,
    effectiveBackgroundImageSize,
    applyBackgroundImageImport,
    resetBackgroundArtwork,
    handleBackgroundUpload,
    handleResetBackground,
    handleBackgroundArtworkEnabledChange,
    handleBackgroundScaleChange,
    handleBackgroundOffsetChange,
    handleFitBackgroundToSteamBannerOpenArea,
  }
}
