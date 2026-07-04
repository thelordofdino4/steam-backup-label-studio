import type { CaseInsertImageSlotImageInput } from './types'

export type LoadedCaseInsertImageSlotSource = {
  image: CaseInsertImageSlotImageInput
  successStatus: string
}

export async function applyLoadedCaseInsertImageSlotSource({
  announceStatus,
  applyImage,
  importedImagePromise,
}: {
  announceStatus: (message: string) => void
  applyImage: (image: CaseInsertImageSlotImageInput) => void
  importedImagePromise: Promise<LoadedCaseInsertImageSlotSource | null>
}) {
  const importedImage = await importedImagePromise

  if (!importedImage) {
    return false
  }

  applyImage(importedImage.image)
  announceStatus(importedImage.successStatus)
  return true
}
