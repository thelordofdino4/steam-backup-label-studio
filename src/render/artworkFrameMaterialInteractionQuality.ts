export type ArtworkFrameMaterialLightDragFrameHandle = number

export type ArtworkFrameMaterialLightDragFrameScheduler = (
  callback: () => void,
) => ArtworkFrameMaterialLightDragFrameHandle

export type ArtworkFrameMaterialLightDragFrameCanceller = (
  handle: ArtworkFrameMaterialLightDragFrameHandle,
) => void

export type ArtworkFrameMaterialLightDragScheduler<T> = {
  cancel: () => void
  flush: () => void
  schedule: (value: T) => void
}

export type ArtworkFrameMaterialLightDragSchedulerOptions = {
  cancelAnimationFrame?: ArtworkFrameMaterialLightDragFrameCanceller
  requestAnimationFrame?: ArtworkFrameMaterialLightDragFrameScheduler
}

function createFallbackAnimationFrame(callback: () => void) {
  return setTimeout(callback, 16) as unknown as number
}

function cancelFallbackAnimationFrame(handle: number) {
  clearTimeout(handle)
}

function getRequestAnimationFrame(
  options: ArtworkFrameMaterialLightDragSchedulerOptions,
): ArtworkFrameMaterialLightDragFrameScheduler {
  if (options.requestAnimationFrame) {
    return options.requestAnimationFrame
  }

  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame.bind(globalThis)
  }

  return createFallbackAnimationFrame
}

function getCancelAnimationFrame(
  options: ArtworkFrameMaterialLightDragSchedulerOptions,
): ArtworkFrameMaterialLightDragFrameCanceller {
  if (options.cancelAnimationFrame) {
    return options.cancelAnimationFrame
  }

  if (typeof globalThis.cancelAnimationFrame === 'function') {
    return globalThis.cancelAnimationFrame.bind(globalThis)
  }

  return cancelFallbackAnimationFrame
}

export function createArtworkFrameMaterialLightDragScheduler<T>(
  render: (value: T) => void,
  options: ArtworkFrameMaterialLightDragSchedulerOptions = {},
): ArtworkFrameMaterialLightDragScheduler<T> {
  const requestFrame = getRequestAnimationFrame(options)
  const cancelFrame = getCancelAnimationFrame(options)
  let queuedFrame: number | null = null
  let hasLatestValue = false
  let latestValue: T | null = null

  const runLatest = () => {
    queuedFrame = null

    if (!hasLatestValue) {
      return
    }

    const value = latestValue as T

    latestValue = null
    hasLatestValue = false
    render(value)
  }

  return {
    cancel: () => {
      if (queuedFrame !== null) {
        cancelFrame(queuedFrame)
      }

      queuedFrame = null
      latestValue = null
      hasLatestValue = false
    },
    flush: () => {
      if (queuedFrame !== null) {
        cancelFrame(queuedFrame)
      }

      runLatest()
    },
    schedule: (value) => {
      latestValue = value
      hasLatestValue = true

      if (queuedFrame === null) {
        queuedFrame = requestFrame(runLatest)
      }
    },
  }
}
