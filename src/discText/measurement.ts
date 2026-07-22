import type { TextMeasureFunction } from './straightTextWrapping.ts'

let discTextMeasureContext: CanvasRenderingContext2D | null = null

function getDiscTextMeasureContext() {
  if (discTextMeasureContext) return discTextMeasureContext
  if (typeof document === 'undefined') return null

  discTextMeasureContext = document.createElement('canvas').getContext('2d')
  return discTextMeasureContext
}

export const measureDiscTextWithBrowserCanvas: TextMeasureFunction = (
  text,
  font,
) => {
  const context = getDiscTextMeasureContext()

  if (!context) {
    const fontSizeMatch = font.match(/(\d+(?:\.\d+)?)px/)
    const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 1
    return Array.from(text).length * fontSize * 0.58
  }

  context.font = font
  return context.measureText(text).width
}
