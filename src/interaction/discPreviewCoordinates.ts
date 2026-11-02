/** The existing Disc offset basis is the local border box, before viewport zoom. */
export function getDiscPreviewCoordinateSize(
  element: Pick<HTMLElement, 'offsetWidth'> | null,
  fallback: number,
): number {
  const size = element?.offsetWidth
  return size !== undefined && Number.isFinite(size) && size > 0 ? size : fallback
}
