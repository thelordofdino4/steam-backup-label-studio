export function canvasToPngBytes(canvas: HTMLCanvasElement) {
  return new Promise<number[]>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not create PNG blob.'))
        return
      }

      blob
        .arrayBuffer()
        .then((buffer) => resolve(Array.from(new Uint8Array(buffer))))
        .catch(reject)
    }, 'image/png')
  })
}

export function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load background image.'))

    image.src = source
  })
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Could not convert image asset to a data URL.'))
    }

    reader.onerror = () => reject(new Error('Could not convert image asset to a data URL.'))
    reader.readAsDataURL(blob)
  })
}

export async function getCanvasSafeImageSource(source: string) {
  if (source.startsWith('data:')) {
    return source
  }

  const response = await fetch(source)

  if (!response.ok) {
    throw new Error(`Could not load image asset for export: ${response.status}`)
  }

  return blobToDataUrl(await response.blob())
}
