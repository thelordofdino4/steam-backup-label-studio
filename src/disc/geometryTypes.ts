import type {
  BackgroundImageSize,
} from '../project/projectTypes.ts'

export type LayoutPoint = {
  x: number
  y: number
}

export type RenderBoundsPercent = {
  halfWidth: number
  halfHeight: number
}

export type RenderShapeFootprintPercent = {
  loops: LayoutPoint[][]
  safetyOutset: number
}

export type NaturalSize = BackgroundImageSize | null
