export type RenderPercentBounds = {
  halfWidth: number
  halfHeight: number
}

export type RenderPointLayout = {
  x: number
  y: number
}

export type RenderPixelPoint = {
  x: number
  y: number
}

export type RenderPixelRect = RenderPixelPoint & {
  width: number
  height: number
}

export type RenderTransformedBox = {
  center: RenderPixelPoint
  width: number
  height: number
  rotationDegrees: number
}

// Neutral image artifacts carry resolved image visibility and placement only.
// Editor-specific geometry stays in disc/case layout adapters; preview may map
// these artifacts to CSS boxes while export maps them to canvas draws.
export type ImageRenderArtifact = {
  imageDataUrl: string
  label: string
  alt: string
  isPlaceholderImage: boolean
}

type ImageRenderArtifactInput = {
  imageDataUrl?: string | null
  label?: string | null
  alt?: string | null
  isPlaceholderImage?: boolean
}

export type PercentPositionedImageRenderArtifact<
  Layout extends RenderPointLayout = RenderPointLayout,
  Extra extends object = object,
> = ImageRenderArtifact & Extra & {
  layout: Layout
  unscaledBounds: RenderPercentBounds
  scaledBounds: RenderPercentBounds
}

export type RectPositionedImageRenderArtifact<
  Extra extends object = object,
> = ImageRenderArtifact & Extra & {
  rect: RenderPixelRect
}

export type BoxPositionedImageRenderArtifact<
  Extra extends object = object,
> = ImageRenderArtifact & Extra & {
  box: RenderTransformedBox
}

function normalizeRenderArtifactLabel(label: string | null | undefined) {
  return label?.trim() || 'Image'
}

export function hasRenderableImageArtifact(
  artifact: { imageDataUrl?: string | null } | null | undefined,
) {
  return Boolean(artifact?.imageDataUrl)
}

export function createImageRenderArtifact(
  input: ImageRenderArtifactInput,
): ImageRenderArtifact | null {
  if (!input.imageDataUrl) {
    return null
  }

  const label = normalizeRenderArtifactLabel(input.label)

  return {
    imageDataUrl: input.imageDataUrl,
    label,
    alt: typeof input.alt === 'string' ? input.alt : label,
    isPlaceholderImage: input.isPlaceholderImage ?? false,
  }
}

export function createPercentPositionedImageRenderArtifact<
  Layout extends RenderPointLayout,
  Extra extends object = object,
>(
  input: ImageRenderArtifactInput & Extra & {
    layout: Layout
    unscaledBounds: RenderPercentBounds
    scaledBounds: RenderPercentBounds
  },
): PercentPositionedImageRenderArtifact<Layout, Extra> | null {
  const artifact = createImageRenderArtifact(input)

  if (!artifact) {
    return null
  }

  return {
    ...input,
    ...artifact,
  } as PercentPositionedImageRenderArtifact<Layout, Extra>
}

export function createRectPositionedImageRenderArtifact<
  Extra extends object = object,
>(
  input: ImageRenderArtifactInput & Extra & {
    rect: RenderPixelRect | null
  },
): RectPositionedImageRenderArtifact<Extra> | null {
  const artifact = createImageRenderArtifact(input)

  if (!artifact || !input.rect) {
    return null
  }

  return {
    ...input,
    ...artifact,
    rect: input.rect,
  } as RectPositionedImageRenderArtifact<Extra>
}

export function createBoxPositionedImageRenderArtifact<
  Extra extends object = object,
>(
  input: ImageRenderArtifactInput & Extra & {
    box: RenderTransformedBox | null
  },
): BoxPositionedImageRenderArtifact<Extra> | null {
  const artifact = createImageRenderArtifact(input)

  if (!artifact || !input.box) {
    return null
  }

  return {
    ...input,
    ...artifact,
    box: input.box,
  } as BoxPositionedImageRenderArtifact<Extra>
}
