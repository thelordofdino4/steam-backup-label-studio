/** Publish one completion before invoking synchronous cleanup callbacks. */
export function onceAsyncCleanup(cleanup: () => void | Promise<void>): () => Promise<void> {
  let completion: Promise<void> | undefined
  return () => {
    if (completion) return completion
    let resolve!: () => void
    let reject!: (cause: unknown) => void
    completion = new Promise<void>((accept, decline) => { resolve = accept; reject = decline })
    try { Promise.resolve(cleanup()).then(resolve, reject) }
    catch (cause) { reject(cause) }
    return completion
  }
}
