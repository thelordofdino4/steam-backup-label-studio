import { shadeArtworkFrameCanvasMaterialImageData } from './artworkFrameMaterialShading.ts'
import type {
  ArtworkFrameMaterialWorkerShadingRequest,
  ArtworkFrameMaterialWorkerShadingResponse,
} from './artworkFrameMaterialShadingWorkerClient.ts'

type WorkerGlobalScopeLike = {
  onmessage: ((event: { data: ArtworkFrameMaterialWorkerShadingRequest }) => void) | null
  postMessage: (
    message: ArtworkFrameMaterialWorkerShadingResponse,
    transfer?: Transferable[],
  ) => void
}

const workerScope = self as unknown as WorkerGlobalScopeLike

workerScope.onmessage = (event) => {
  const request = event.data

  try {
    const imageData = shadeArtworkFrameCanvasMaterialImageData({
      coordinates: request.coordinates,
      corrosionMaps: request.corrosionMaps,
      imageData: request.imageData,
      lighting: request.lighting,
      metalBrushAngle: request.metalBrushAngle,
      steelFinishMaps: request.steelFinishMaps,
      steelFinishNormalInputs: request.steelFinishNormalInputs,
    })

    workerScope.postMessage(
      {
        id: request.id,
        imageData,
      },
      [imageData.data.buffer as Transferable],
    )
  } catch (error) {
    workerScope.postMessage({
      error: error instanceof Error ? error.message : String(error),
      id: request.id,
    })
  }
}
