import type { BackgroundImageSize } from '../project/projectTypes.ts'

export function readImageFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error(`Could not read ${file.name} as an image.`))
    }

    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

export function getNaturalImageSize(image: HTMLImageElement): BackgroundImageSize {
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  }
}
