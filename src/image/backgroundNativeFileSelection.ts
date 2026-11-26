import type { ProjectAsyncWork } from '../lifecycle/projectAsyncWork.ts'

/** Only a selected file, not picker open/cancel, can start a background import. */
export async function selectNativeBackgroundFile(
  work: ProjectAsyncWork,
  pick: () => Promise<File | null>,
  accept: (file: File) => void,
  report: (error: unknown) => void,
) {
  const selection = work.begin('image:disc-background-picker')
  if (!work.isCurrent(selection)) return
  let file: File | null
  try {
    file = await pick()
  } catch (error) {
    work.publish(selection, () => { report(error); return undefined })
    return
  }
  work.publish(selection, () => {
    if (file) accept(file)
    return undefined
  })
}
