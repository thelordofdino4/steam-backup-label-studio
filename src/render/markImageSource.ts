export function hasCustomMarkImage(
  source: 'placeholder' | 'custom',
  imageDataUrl: string | null,
): imageDataUrl is string {
  return source === 'custom' && Boolean(imageDataUrl)
}
