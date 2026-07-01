export type ArtworkFrameMaterialCanvasExecutionTarget =
  | 'main-thread-canvas-2d'
  | 'main-thread-offscreen-canvas-2d'
  | 'unavailable'
  | 'worker-offscreen-canvas-2d'

export type ArtworkFrameMaterialCanvasCapabilities = {
  canFallbackToMainThreadCanvas2d: boolean
  canUseWorkerOffscreenCanvas2d: boolean
  createImageBitmap: boolean
  imageBitmap: boolean
  imageBitmapConstructor: boolean
  mainThreadCanvas2d: boolean
  offscreenCanvas: boolean
  offscreenCanvas2d: boolean
  preferredExecutionTarget: ArtworkFrameMaterialCanvasExecutionTarget
  worker: boolean
}

export type ArtworkFrameMaterialCanvasCapabilityScope = Partial<Record<
  | 'OffscreenCanvas'
  | 'Worker'
  | 'createImageBitmap'
  | 'document'
  | 'ImageBitmap',
  unknown
>>

type CanvasLike = {
  getContext?: (contextId: string) => unknown
}

type DocumentLike = {
  createElement?: (tagName: string) => CanvasLike
}

type OffscreenCanvasConstructor = new (
  width: number,
  height: number,
) => CanvasLike

function getFunctionValue<T>(
  scope: ArtworkFrameMaterialCanvasCapabilityScope,
  key: keyof ArtworkFrameMaterialCanvasCapabilityScope,
) {
  const value = scope[key]

  return typeof value === 'function' ? value as T : null
}

function canCreateOffscreenCanvas2d(
  constructor: OffscreenCanvasConstructor | null,
) {
  if (!constructor) {
    return false
  }

  try {
    const canvas = new constructor(1, 1)

    return typeof canvas.getContext === 'function' &&
      canvas.getContext('2d') !== null
  } catch {
    return false
  }
}

function canCreateMainThreadCanvas2d(
  documentLike: unknown,
) {
  const document = documentLike as DocumentLike | undefined

  if (typeof document?.createElement !== 'function') {
    return false
  }

  try {
    const canvas = document.createElement('canvas')

    return typeof canvas.getContext === 'function' &&
      canvas.getContext('2d') !== null
  } catch {
    return false
  }
}

function getPreferredExecutionTarget({
  mainThreadCanvas2d,
  offscreenCanvas2d,
  worker,
}: {
  mainThreadCanvas2d: boolean
  offscreenCanvas2d: boolean
  worker: boolean
}): ArtworkFrameMaterialCanvasExecutionTarget {
  if (offscreenCanvas2d && worker) {
    return 'worker-offscreen-canvas-2d'
  }

  if (offscreenCanvas2d) {
    return 'main-thread-offscreen-canvas-2d'
  }

  if (mainThreadCanvas2d) {
    return 'main-thread-canvas-2d'
  }

  return 'unavailable'
}

export function detectArtworkFrameMaterialCanvasCapabilities(
  scope: ArtworkFrameMaterialCanvasCapabilityScope = globalThis,
): ArtworkFrameMaterialCanvasCapabilities {
  const offscreenCanvasConstructor = getFunctionValue<
    OffscreenCanvasConstructor
  >(scope, 'OffscreenCanvas')
  const offscreenCanvas = offscreenCanvasConstructor !== null
  const offscreenCanvas2d = canCreateOffscreenCanvas2d(
    offscreenCanvasConstructor,
  )
  const imageBitmapConstructor = getFunctionValue(scope, 'ImageBitmap') !== null
  const createImageBitmap = getFunctionValue(scope, 'createImageBitmap') !== null
  const worker = getFunctionValue(scope, 'Worker') !== null
  const mainThreadCanvas2d = canCreateMainThreadCanvas2d(scope.document)

  return {
    canFallbackToMainThreadCanvas2d: mainThreadCanvas2d,
    canUseWorkerOffscreenCanvas2d: offscreenCanvas2d && worker,
    createImageBitmap,
    imageBitmap: imageBitmapConstructor || createImageBitmap,
    imageBitmapConstructor,
    mainThreadCanvas2d,
    offscreenCanvas,
    offscreenCanvas2d,
    preferredExecutionTarget: getPreferredExecutionTarget({
      mainThreadCanvas2d,
      offscreenCanvas2d,
      worker,
    }),
    worker,
  }
}
