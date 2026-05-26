import {
  DISC_TEXT_KEYS,
  getCopyrightArcSide,
  getDiscTextContent,
  getReadableCurvedTextScale,
  type DiscTextAlignment,
  type DiscTextKey,
  type DiscTextLayout,
  type DiscTextLayoutSettings,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from '../discText'

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (context.measureText(testLine).width <= maxWidth || !currentLine) currentLine = testLine
    else { lines.push(currentLine); currentLine = word }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}
function splitLongTokenByCanvasWidth(context: CanvasRenderingContext2D, token: string, maxWidth: number) {
  const chunks: string[] = []; let currentChunk = ''
  for (const character of Array.from(token)) {
    const testChunk = `${currentChunk}${character}`
    if (context.measureText(testChunk).width <= maxWidth || !currentChunk) currentChunk = testChunk
    else { chunks.push(currentChunk); currentChunk = character }
  }
  if (currentChunk) chunks.push(currentChunk)
  return chunks
}
function wrapTextByArcLength(context: CanvasRenderingContext2D, text: string, maxArcLength: number) {
  const tokens = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []; let currentLine = ''
  for (const token of tokens) {
    const tokenParts = context.measureText(token).width > maxArcLength ? splitLongTokenByCanvasWidth(context, token, maxArcLength) : [token]
    for (const part of tokenParts) {
      const testLine = currentLine ? `${currentLine} ${part}` : part
      if (context.measureText(testLine).width <= maxArcLength || !currentLine) currentLine = testLine
      else { lines.push(currentLine); currentLine = part }
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}
function getCurvedTextNaturalWidth(context: CanvasRenderingContext2D, text: string, radius: number) {
  const characters = Array.from(text)
  const baseCharacterSpacing = Math.max(2.7, radius * 0.0036)
  const widths = characters.map((c) => context.measureText(c).width)
  const glyphWidth = widths.reduce((sum, width) => sum + width, 0)
  return glyphWidth + Math.max(0, characters.length - 1) * baseCharacterSpacing
}
function drawCurvedTextLine(context: CanvasRenderingContext2D, text: string, centerX: number, centerY: number, radius: number, centerAngle: number, arcAngle: number, isTopArc: boolean, align: DiscTextAlignment) {
  const characters = Array.from(text)
  const baseCharacterSpacing = Math.max(2.7, radius * 0.0036)
  const widths = characters.map((c) => context.measureText(c).width)
  const naturalWidth = getCurvedTextNaturalWidth(context, text, radius)
  if (naturalWidth <= 0 || radius <= 0) return
  const characterSpacing = baseCharacterSpacing
  const totalTextAngle = naturalWidth / radius
  const effectiveAlign = totalTextAngle >= arcAngle ? 'center' : align
  let startAngle: number
  if (isTopArc) {
    if (effectiveAlign === 'left') startAngle = centerAngle - arcAngle / 2
    else if (effectiveAlign === 'right') startAngle = centerAngle + arcAngle / 2 - totalTextAngle
    else startAngle = centerAngle - totalTextAngle / 2
  } else if (effectiveAlign === 'left') startAngle = centerAngle + arcAngle / 2
  else if (effectiveAlign === 'right') startAngle = centerAngle - arcAngle / 2 + totalTextAngle
  else startAngle = centerAngle + totalTextAngle / 2
  let currentOffset = 0
  characters.forEach((character, index) => {
    const characterCenterOffset = currentOffset + widths[index] / 2
    const angle = isTopArc ? startAngle + characterCenterOffset / radius : startAngle - characterCenterOffset / radius
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius
    const rotation = isTopArc ? angle + Math.PI / 2 : angle - Math.PI / 2
    context.save(); context.translate(x, y); context.rotate(rotation); context.strokeText(character, 0, 0); context.fillText(character, 0, 0); context.restore()
    currentOffset += widths[index] + characterSpacing
  })
}
function drawCurvedCopyrightText(context: CanvasRenderingContext2D, exportSize: number, safeZoneRadius: number, placement: SteamLogoPlacement, layout: DiscTextLayout, text: string, fontSize: number) {
  const isTopArc = getCopyrightArcSide(placement, layout) === 'top'
  const centerAngle = (isTopArc ? -Math.PI / 2 : Math.PI / 2) + (layout.x * Math.PI) / 180
  const maxArcAngle = (layout.arcDegrees * Math.PI) / 180
  const lineHeight = fontSize * 1.38
  const outerLineRadius = Math.max(1, safeZoneRadius - layout.y * exportSize * 0.0018)
  const maxArcLength = outerLineRadius * maxArcAngle
  const lines = wrapTextByArcLength(context, text, maxArcLength)
  lines.forEach((line, index) => {
    const lineRadius = isTopArc ? outerLineRadius - index * lineHeight : outerLineRadius - (lines.length - 1 - index) * lineHeight
    if (lineRadius <= safeZoneRadius * 0.35) return
    drawCurvedTextLine(context, line, exportSize / 2, exportSize / 2, lineRadius, centerAngle, maxArcAngle, isTopArc, layout.align)
  })
}

export function drawDiscTextElements(context: CanvasRenderingContext2D, exportSize: number, settings: DiscTextSettings, values: DiscTextValues, layoutSettings: DiscTextLayoutSettings, title: string, placement: SteamLogoPlacement, safeZoneRadius: number) {
  const textStyle: Record<DiscTextKey, { fontSize: number; fontWeight: number; color: string; maxLines: number }> = { title: { fontSize: exportSize * 0.036, fontWeight: 900, color: '#f9fafb', maxLines: 2 }, discNumber: { fontSize: exportSize * 0.019, fontWeight: 800, color: '#f9fafb', maxLines: 1 }, backupDate: { fontSize: exportSize * 0.016, fontWeight: 700, color: '#e5e7eb', maxLines: 1 }, appId: { fontSize: exportSize * 0.015, fontWeight: 700, color: '#d1d5db', maxLines: 1 }, customNote: { fontSize: exportSize * 0.015, fontWeight: 700, color: '#f9fafb', maxLines: 2 }, copyright: { fontSize: exportSize * 0.011, fontWeight: 600, color: '#d1d5db', maxLines: 3 } }
  for (const key of DISC_TEXT_KEYS) {
    if (!settings[key]) continue
    const text = getDiscTextContent(key, values, title).trim(); if (!text) continue
    const style = textStyle[key]; const layout = layoutSettings[key]
    const effectiveScale = key === 'copyright' && layout.mode === 'curved' ? getReadableCurvedTextScale(layout.scale) : layout.scale
    const fontSize = style.fontSize * effectiveScale; const lineHeight = fontSize * 1.18
    const textX = exportSize * ((50 + layout.x) / 100); const textY = exportSize * (layout.y / 100)
    context.save(); context.font = `${style.fontWeight} ${Math.round(fontSize)}px Arial`; context.textAlign = layout.align; context.textBaseline = 'middle'; context.lineJoin = 'round'; context.shadowColor = 'rgba(0, 0, 0, 0.72)'; context.shadowBlur = Math.max(3, exportSize * 0.004); context.shadowOffsetY = Math.max(1, exportSize * 0.0015); context.strokeStyle = 'rgba(0, 0, 0, 0.58)'; context.lineWidth = Math.max(2, exportSize * 0.002); context.fillStyle = style.color
    if (key === 'copyright' && layout.mode === 'curved') { context.textAlign = 'center'; drawCurvedCopyrightText(context, exportSize, safeZoneRadius, placement, layout, text, fontSize); context.restore(); continue }
    const maxWidth = exportSize * (layout.width / 100)
    const lines = wrapCanvasText(context, text, maxWidth).slice(0, style.maxLines)
    const firstLineY = textY - ((lines.length - 1) * lineHeight) / 2
    const drawTextX =
      layout.align === 'left'
        ? textX - maxWidth / 2
        : layout.align === 'right'
          ? textX + maxWidth / 2
        : textX
    lines.forEach((line, index) => { const lineY = firstLineY + index * lineHeight; context.strokeText(line, drawTextX, lineY, maxWidth); context.fillText(line, drawTextX, lineY, maxWidth) })
    context.restore()
  }
}
