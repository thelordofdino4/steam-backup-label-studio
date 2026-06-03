import type { BackgroundImageSize } from '../../../project/projectTypes'

export function formatLogoSize(size: BackgroundImageSize | null) {
  return size ? ` · ${size.width}×${size.height}` : ''
}

export function getNumericInputValue(event: { currentTarget: HTMLInputElement }) {
  return Number(event.currentTarget.value)
}
