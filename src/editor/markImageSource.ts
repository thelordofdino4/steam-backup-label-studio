export type MarkImageSource = 'placeholder' | 'custom'

export type MarkImageSize = {
  width: number
  height: number
}

export type MarkImageSourceState = {
  source: MarkImageSource
  customImageDataUrl: string | null
  customImageSize?: MarkImageSize | null
}

export type ResolvedMarkImageSource = {
  imageDataUrl: string
  imageSize: MarkImageSize | null
  isCustomImage: boolean
  isBuiltInFallback: boolean
  provenanceSource: MarkImageSource
}

export function hasCustomMarkImage(
  source: MarkImageSource,
  imageDataUrl: string | null,
): imageDataUrl is string {
  return source === 'custom' && Boolean(imageDataUrl)
}

export function getMarkImageSourceStatus(
  state: MarkImageSourceState,
) {
  const hasCustomImage = hasCustomMarkImage(
    state.source,
    state.customImageDataUrl,
  )

  return {
    isCustomSource: state.source === 'custom',
    hasCustomImage,
    usesCustomImage: hasCustomImage,
    usesBuiltInFallback: !hasCustomImage,
  }
}

export function resolveMarkImageSource({
  source,
  customImageDataUrl,
  customImageSize = null,
  builtInImageDataUrl,
  builtInImageSize = null,
}: MarkImageSourceState & {
  builtInImageDataUrl: string
  builtInImageSize?: MarkImageSize | null
}): ResolvedMarkImageSource {
  if (hasCustomMarkImage(source, customImageDataUrl)) {
    return {
      imageDataUrl: customImageDataUrl,
      imageSize: customImageSize,
      isCustomImage: true,
      isBuiltInFallback: false,
      provenanceSource: 'custom',
    }
  }

  return {
    imageDataUrl: builtInImageDataUrl,
    imageSize: builtInImageSize,
    isCustomImage: false,
    isBuiltInFallback: true,
    provenanceSource: 'placeholder',
  }
}
