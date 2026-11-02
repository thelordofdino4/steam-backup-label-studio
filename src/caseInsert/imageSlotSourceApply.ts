import type { CaseInsertImageSlotImageInput } from './types'

export type LoadedCaseInsertImageSlotSource = {
  image: CaseInsertImageSlotImageInput
  successStatus: string
}

export async function applyLoadedCaseInsertImageSlotSource({
  announceStatus,
  applyImage,
  importedImagePromise,
  commitPrepared,
}: {
  announceStatus: (message: string) => void
  applyImage: (image: CaseInsertImageSlotImageInput) => void
  importedImagePromise: Promise<LoadedCaseInsertImageSlotSource | null>
  commitPrepared: (apply: () => undefined) => boolean
}) {
  const importedImage = await importedImagePromise

  if (!importedImage) {
    return false
  }

  return commitPrepared(() => {
    applyImage(importedImage.image)
    announceStatus(importedImage.successStatus)
  })
}
