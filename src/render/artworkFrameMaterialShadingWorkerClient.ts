import type { ArtworkFrameCorrosionDerivedMaps } from './artworkFrameCorrosionMaps.ts'
import type {
  ArtworkFrameCanvasMaterialShadingPayload,
  ArtworkFrameMaterialShadingCoordinateContext,
  ArtworkFrameMaterialShadingRect,
} from './artworkFrameMaterialShading.ts'
import type {
  ArtworkFrameSteelFinishDerivedMaps,
  ArtworkFrameSteelFinishNormalInputs,
} from './artworkFrameSteelFinish.ts'
import {
  ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS,
  ARTWORK_FRAME_STEEL_DEFECT_KINDS,
  ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS,
  ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS,
  type ArtworkFrameSteelDefectActiveDecalBodyMaps,
  type ArtworkFrameSteelDefectActivePhysicalContributionMaps,
  type ArtworkFrameSteelDefectDecalMapSet,
  type ArtworkFrameSteelDefectKindRecord,
  type ArtworkFrameSteelDefectStablePlacementCandidateMaps,
} from './artworkFrameSteelDefects.ts'

export type ArtworkFrameMaterialWorkerShadingRequest = Omit<
  ArtworkFrameCanvasMaterialShadingPayload,
  'performance'
> & {
  id: string
}

export type ArtworkFrameMaterialWorkerShadingResponse =
  | {
    error?: never
    id: string
    imageData: ImageData
  }
  | {
    error: string
    id: string
    imageData?: never
  }

export type ArtworkFrameMaterialShadingWorkerLike = {
  onerror?: ((event: unknown) => void) | null
  onmessage?: ((event: { data: ArtworkFrameMaterialWorkerShadingResponse }) => void) | null
  postMessage: (
    message: ArtworkFrameMaterialWorkerShadingRequest,
    transfer?: Transferable[],
  ) => void
  terminate?: () => void
}

export type ArtworkFrameMaterialShadingWorkerFactory =
  () => ArtworkFrameMaterialShadingWorkerLike

export type ArtworkFrameMaterialWorkerShadingRequestInit = {
  request: ArtworkFrameMaterialWorkerShadingRequest
  transferables: Transferable[]
}

const CORROSION_MAP_FLOAT32_CHANNELS = [
  'albedo',
  'ambientOcclusion',
  'crackMask',
  'flakeBodyMask',
  'flakeCastShadow',
  'flakeCurlX',
  'flakeCurlY',
  'flakeLiftHeight',
  'flakeLipMask',
  'flakeMask',
  'flakeRootMask',
  'flakeUndercutAO',
  'height',
  'metalExposure',
  'normalX',
  'normalY',
  'normalZ',
  'poreMask',
  'roughness',
] as const satisfies ReadonlyArray<keyof ArtworkFrameCorrosionDerivedMaps>

const STEEL_FINISH_MAP_FLOAT32_CHANNELS = [
  'abrasionCloudMask',
  'brushedGrainMask',
  'burrRidgeMask',
  'dentPocketMask',
  'gougeTroughMask',
  'machiningGrooveMask',
  'machiningRidgeMask',
  'pitPocketMask',
  'polishedHazeMask',
  'polishedReflectionMask',
  'scuffCrossScratchRimLightMask',
  'scuffCrossScratchRimShadowMask',
  'scuffCrossScratchTroughMask',
  'scratchRimLightMask',
  'scratchRimShadowMask',
  'scratchTroughMask',
  'steelAlbedo',
  'steelAmbientOcclusion',
  'steelAnisotropy',
  'steelAnisotropyDirectionX',
  'steelAnisotropyDirectionY',
  'steelGloss',
  'steelHeight',
  'steelMetalness',
  'steelRoughness',
  'visibleBurrRidgeMask',
  'visibleDefectShadowMask',
  'visibleDentAmbientOcclusionMask',
  'visibleDentDepthMask',
  'visibleDentShadowMask',
  'visibleGougeAmbientOcclusionMask',
  'visibleGougeDepthMask',
  'visibleGougeShadowMask',
  'visiblePitAmbientOcclusionMask',
  'visiblePitDepthMask',
  'visiblePitShadowMask',
  'visibleScratchAmbientOcclusionMask',
  'visibleScratchDepthMask',
  'visibleScratchRimLightMask',
  'visibleScratchRimShadowMask',
  'visibleScratchShadowMask',
] as const satisfies ReadonlyArray<keyof ArtworkFrameSteelFinishDerivedMaps>

const STEEL_NORMAL_INPUT_FLOAT32_CHANNELS = [
  'normalX',
  'normalY',
  'normalZ',
  'steelAnisotropy',
  'steelAnisotropyDirectionX',
  'steelAnisotropyDirectionY',
  'steelHeight',
] as const satisfies ReadonlyArray<keyof ArtworkFrameSteelFinishNormalInputs>

function cloneImageData(imageData: ImageData): ImageData {
  return {
    colorSpace: imageData.colorSpace,
    data: new Uint8ClampedArray(imageData.data),
    height: imageData.height,
    width: imageData.width,
  } as ImageData
}

function cloneFloat32Array(value: Float32Array) {
  return new Float32Array(value)
}

function cloneSteelDefectChannelMaps<Maps extends Record<string, Float32Array>>(
  maps: Maps,
  channels: readonly (keyof Maps)[],
): Maps {
  const cloned = {} as Maps

  for (const channel of channels) {
    cloned[channel] = cloneFloat32Array(maps[channel]) as Maps[typeof channel]
  }

  return cloned
}

function cloneSteelDefectKindRecord<T extends Record<string, Float32Array>>(
  record: ArtworkFrameSteelDefectKindRecord<T>,
  channels: readonly (keyof T)[],
): ArtworkFrameSteelDefectKindRecord<T> {
  return Object.fromEntries(
    ARTWORK_FRAME_STEEL_DEFECT_KINDS.map((kind) => [
      kind,
      cloneSteelDefectChannelMaps(record[kind], channels),
    ]),
  ) as ArtworkFrameSteelDefectKindRecord<T>
}

function cloneSteelDefectDecalMaps(
  maps: ArtworkFrameSteelDefectDecalMapSet | null | undefined,
): ArtworkFrameSteelDefectDecalMapSet | null {
  if (!maps) {
    return null
  }

  return {
    activeBodies: cloneSteelDefectKindRecord<
      ArtworkFrameSteelDefectActiveDecalBodyMaps
    >(
      maps.activeBodies,
      ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS,
    ),
    heightPixels: maps.heightPixels,
    physicalContributions: cloneSteelDefectKindRecord<
      ArtworkFrameSteelDefectActivePhysicalContributionMaps
    >(
      maps.physicalContributions,
      ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS,
    ),
    stablePlacement: cloneSteelDefectKindRecord<
      ArtworkFrameSteelDefectStablePlacementCandidateMaps
    >(
      maps.stablePlacement,
      ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS,
    ),
    widthPixels: maps.widthPixels,
  }
}

function cloneShadingRect(
  rect: ArtworkFrameMaterialShadingRect,
): ArtworkFrameMaterialShadingRect {
  return {
    height: rect.height,
    width: rect.width,
    x: rect.x,
    y: rect.y,
  }
}

function cloneShadingCoordinateContext(
  coordinates: ArtworkFrameMaterialShadingCoordinateContext,
): ArtworkFrameMaterialShadingCoordinateContext {
  return {
    frameAspectRatio: coordinates.frameAspectRatio,
    frameBounds: cloneShadingRect(coordinates.frameBounds),
    frameCenter: {
      x: coordinates.frameCenter.x,
      y: coordinates.frameCenter.y,
    },
    materialPixelSize: {
      x: coordinates.materialPixelSize.x,
      y: coordinates.materialPixelSize.y,
    },
    samplingBounds: cloneShadingRect(coordinates.samplingBounds),
    textureBounds: cloneShadingRect(coordinates.textureBounds),
    textureSize: {
      height: coordinates.textureSize.height,
      scale: coordinates.textureSize.scale,
      width: coordinates.textureSize.width,
    },
  }
}

function cloneCorrosionMaps(
  maps: ArtworkFrameCorrosionDerivedMaps | null,
): ArtworkFrameCorrosionDerivedMaps | null {
  if (!maps) {
    return null
  }

  const cloned = {
    heightPixels: maps.heightPixels,
    widthPixels: maps.widthPixels,
  } as ArtworkFrameCorrosionDerivedMaps

  for (const channel of CORROSION_MAP_FLOAT32_CHANNELS) {
    cloned[channel] = cloneFloat32Array(maps[channel])
  }

  return cloned
}

function cloneSteelFinishMaps(
  maps: ArtworkFrameSteelFinishDerivedMaps | null,
): ArtworkFrameSteelFinishDerivedMaps | null {
  if (!maps) {
    return null
  }

  const cloned = {
    heightPixels: maps.heightPixels,
    polishUnit: maps.polishUnit,
    stageUnits: { ...maps.stageUnits },
    widthPixels: maps.widthPixels,
  } as ArtworkFrameSteelFinishDerivedMaps

  for (const channel of STEEL_FINISH_MAP_FLOAT32_CHANNELS) {
    cloned[channel] = cloneFloat32Array(maps[channel])
  }

  if (maps.defectDecalMaps) {
    cloned.defectDecalMaps = cloneSteelDefectDecalMaps(maps.defectDecalMaps)
  }

  return cloned
}

function cloneSteelFinishNormalInputs(
  inputs: ArtworkFrameSteelFinishNormalInputs | null,
): ArtworkFrameSteelFinishNormalInputs | null {
  if (!inputs) {
    return null
  }

  const cloned = {
    heightPixels: inputs.heightPixels,
    normalStrength: inputs.normalStrength,
    widthPixels: inputs.widthPixels,
  } as ArtworkFrameSteelFinishNormalInputs

  for (const channel of STEEL_NORMAL_INPUT_FLOAT32_CHANNELS) {
    cloned[channel] = cloneFloat32Array(inputs[channel])
  }

  return cloned
}

function addFloat32Transferables(
  transferables: Set<Transferable>,
  values: Iterable<Float32Array>,
) {
  for (const value of values) {
    transferables.add(value.buffer as Transferable)
  }
}

function getSteelDefectDecalMapFloat32Arrays(
  maps: ArtworkFrameSteelDefectDecalMapSet,
) {
  const values: Float32Array[] = []

  for (const kind of ARTWORK_FRAME_STEEL_DEFECT_KINDS) {
    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_ACTIVE_BODY_CHANNELS) {
      values.push(maps.activeBodies[kind][channel])
    }

    for (
      const channel of ARTWORK_FRAME_STEEL_DEFECT_PHYSICAL_CONTRIBUTION_CHANNELS
    ) {
      values.push(maps.physicalContributions[kind][channel])
    }

    for (const channel of ARTWORK_FRAME_STEEL_DEFECT_STABLE_PLACEMENT_CHANNELS) {
      values.push(maps.stablePlacement[kind][channel])
    }
  }

  return values
}

function getWorkerShadingTransferables(
  request: ArtworkFrameMaterialWorkerShadingRequest,
) {
  const transferables = new Set<Transferable>()

  transferables.add(request.imageData.data.buffer as Transferable)

  if (request.corrosionMaps) {
    addFloat32Transferables(
      transferables,
      CORROSION_MAP_FLOAT32_CHANNELS.map((channel) =>
        request.corrosionMaps![channel]
      ),
    )
  }

  if (request.steelFinishMaps) {
    addFloat32Transferables(
      transferables,
      STEEL_FINISH_MAP_FLOAT32_CHANNELS.map((channel) =>
        request.steelFinishMaps![channel]
      ),
    )

    if (request.steelFinishMaps.defectDecalMaps) {
      addFloat32Transferables(
        transferables,
        getSteelDefectDecalMapFloat32Arrays(
          request.steelFinishMaps.defectDecalMaps,
        ),
      )
    }
  }

  if (request.steelFinishNormalInputs) {
    addFloat32Transferables(
      transferables,
      STEEL_NORMAL_INPUT_FLOAT32_CHANNELS.map((channel) =>
        request.steelFinishNormalInputs![channel]
      ),
    )
  }

  return [...transferables]
}

export function createArtworkFrameMaterialWorkerShadingRequest(
  payload: ArtworkFrameCanvasMaterialShadingPayload,
  id = `artwork-frame-material-shading-${Date.now().toString(36)}`,
): ArtworkFrameMaterialWorkerShadingRequestInit {
  const request: ArtworkFrameMaterialWorkerShadingRequest = {
    coordinates: cloneShadingCoordinateContext(payload.coordinates),
    corrosionMaps: cloneCorrosionMaps(payload.corrosionMaps),
    id,
    imageData: cloneImageData(payload.imageData),
    lighting: {
      lightVector: { ...payload.lighting.lightVector },
    },
    metalBrushAngle: payload.metalBrushAngle,
    steelFinishMaps: cloneSteelFinishMaps(payload.steelFinishMaps),
    steelFinishNormalInputs: cloneSteelFinishNormalInputs(
      payload.steelFinishNormalInputs,
    ),
  }

  return {
    request,
    transferables: getWorkerShadingTransferables(request),
  }
}

function createDefaultWorker(): ArtworkFrameMaterialShadingWorkerLike {
  return new Worker(
    new URL('./artworkFrameMaterialShadingWorker.ts', import.meta.url),
    { type: 'module' },
  ) as unknown as ArtworkFrameMaterialShadingWorkerLike
}

export function shadeArtworkFrameCanvasMaterialImageDataInWorker(
  payload: ArtworkFrameCanvasMaterialShadingPayload,
  createWorker: ArtworkFrameMaterialShadingWorkerFactory = createDefaultWorker,
): Promise<ImageData> {
  const { request, transferables } =
    createArtworkFrameMaterialWorkerShadingRequest(payload)
  const worker = createWorker()

  return new Promise((resolve, reject) => {
    worker.onerror = (event) => {
      worker.terminate?.()
      reject(event instanceof Error ? event : new Error('Worker shading failed.'))
    }
    worker.onmessage = (event) => {
      if (event.data.id !== request.id) {
        return
      }

      worker.terminate?.()

      if (event.data.error) {
        reject(new Error(event.data.error))
        return
      }

      if (!event.data.imageData) {
        reject(new Error('Worker shading returned no image data.'))
        return
      }

      resolve(event.data.imageData)
    }
    worker.postMessage(request, transferables)
  })
}
