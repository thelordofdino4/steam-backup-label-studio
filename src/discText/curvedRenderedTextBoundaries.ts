import {
  DISC_TEXT_KEY_ATTRIBUTE,
} from '../editor/previewEditableRegistry.ts'
import {
  getCurvedDiscTextOffsetForSvgPoint,
  getCurvedDiscTextProgressForSvgPoint,
  type CurvedDiscTextHostGeometry,
} from './curvedInlineEditorGeometry.ts'
import {
  clampCurvedTextRangeValue,
} from './curvedTextRangeMath.ts'
import type { DiscTextKey } from './index.ts'

type SvgPointLike = {
  x: number
  y: number
}

type SvgRectLike = {
  height: number
  width: number
  x: number
  y: number
}

type SvgTextContentElementLike = Element & {
  getEndPositionOfChar?: (charnum: number) => SvgPointLike
  getExtentOfChar?: (charnum: number) => SvgRectLike
  getNumberOfChars?: () => number
  getStartPositionOfChar?: (charnum: number) => SvgPointLike
  ownerSVGElement: SVGSVGElement | null
  textContent: string | null
}

type RenderedCharacterMode = 'codePoint' | 'grapheme' | 'utf16'

function getGraphemeSegments(text: string) {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const SegmenterConstructor = Intl.Segmenter
    const segmenter = new SegmenterConstructor(undefined, {
      granularity: 'grapheme',
    })

    return Array.from(segmenter.segment(text), (segment) => ({
      end: segment.index + segment.segment.length,
      segment: segment.segment,
      start: segment.index,
    }))
  }

  const segments: { end: number; segment: string; start: number }[] = []
  let offset = 0

  for (const segment of Array.from(text)) {
    segments.push({
      end: offset + segment.length,
      segment,
      start: offset,
    })
    offset += segment.length
  }

  return segments
}

function getRenderedCharacterMode(
  text: string,
  renderedCharacterCount: number,
): RenderedCharacterMode | null {
  if (renderedCharacterCount === text.length) return 'utf16'
  if (renderedCharacterCount === Array.from(text).length) return 'codePoint'
  if (renderedCharacterCount === getGraphemeSegments(text).length) {
    return 'grapheme'
  }

  return null
}

export function getSvgTextCharacterIndexForUtf16Offset({
  renderedCharacterCount,
  text,
  utf16Offset,
}: {
  renderedCharacterCount: number
  text: string
  utf16Offset: number
}) {
  const clampedOffset = clampCurvedTextRangeValue(
    utf16Offset,
    0,
    Math.max(0, text.length),
  )
  const mode = getRenderedCharacterMode(text, renderedCharacterCount)

  if (mode === 'utf16') {
    return clampCurvedTextRangeValue(clampedOffset, 0, renderedCharacterCount)
  }

  if (mode === 'codePoint') {
    return clampCurvedTextRangeValue(
      Array.from(text.slice(0, clampedOffset)).length,
      0,
      renderedCharacterCount,
    )
  }

  if (mode === 'grapheme') {
    return clampCurvedTextRangeValue(
      getGraphemeSegments(text)
        .filter((segment) => segment.end <= clampedOffset)
        .length,
      0,
      renderedCharacterCount,
    )
  }

  if (text.length === 0) return 0

  return clampCurvedTextRangeValue(
    Math.round((clampedOffset / text.length) * renderedCharacterCount),
    0,
    renderedCharacterCount,
  )
}

function getLineSvgCharacterIndex({
  rawText,
  renderedCharacterCount,
  lineStart,
  lineText,
  lineOffset,
}: {
  rawText: string
  renderedCharacterCount: number
  lineStart: number
  lineText: string
  lineOffset: number
}) {
  const lineMode = getRenderedCharacterMode(lineText, renderedCharacterCount)

  if (lineMode) {
    return getSvgTextCharacterIndexForUtf16Offset({
      renderedCharacterCount,
      text: lineText,
      utf16Offset: lineOffset,
    })
  }

  return getSvgTextCharacterIndexForUtf16Offset({
    renderedCharacterCount,
    text: rawText,
    utf16Offset: lineStart + lineOffset,
  })
}

function getSvgCharacterPoint(
  textElement: SvgTextContentElementLike,
  charIndex: number,
  side: 'end' | 'start',
): SvgPointLike | null {
  try {
    const point =
      side === 'start'
        ? textElement.getStartPositionOfChar?.(charIndex)
        : textElement.getEndPositionOfChar?.(charIndex)

    if (
      point &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    ) {
      return { x: point.x, y: point.y }
    }
  } catch {
    // Fall through to the extent fallback below.
  }

  try {
    const extent = textElement.getExtentOfChar?.(charIndex)

    if (
      extent &&
      Number.isFinite(extent.x) &&
      Number.isFinite(extent.y) &&
      Number.isFinite(extent.width) &&
      Number.isFinite(extent.height)
    ) {
      return {
        x: side === 'start' ? extent.x : extent.x + extent.width,
        y: extent.y + extent.height / 2,
      }
    }
  } catch {
    return null
  }

  return null
}

function getBoundaryPointForLineOffset({
  lineOffset,
  lineStart,
  lineText,
  rawText,
  renderedCharacterCount,
  textElement,
}: {
  lineOffset: number
  lineStart: number
  lineText: string
  rawText: string
  renderedCharacterCount: number
  textElement: SvgTextContentElementLike
}) {
  const lineStartCharIndex = getLineSvgCharacterIndex({
    lineOffset: 0,
    lineStart,
    lineText,
    rawText,
    renderedCharacterCount,
  })
  const lineEndCharIndex = getLineSvgCharacterIndex({
    lineOffset: lineText.length,
    lineStart,
    lineText,
    rawText,
    renderedCharacterCount,
  })
  const boundaryCharIndex = getLineSvgCharacterIndex({
    lineOffset,
    lineStart,
    lineText,
    rawText,
    renderedCharacterCount,
  })

  if (
    renderedCharacterCount <= 0 ||
    lineEndCharIndex <= lineStartCharIndex ||
    boundaryCharIndex <= lineStartCharIndex
  ) {
    return getSvgCharacterPoint(textElement, lineStartCharIndex, 'start')
  }

  if (boundaryCharIndex >= lineEndCharIndex) {
    return getSvgCharacterPoint(textElement, lineEndCharIndex - 1, 'end')
  }

  const previousEnd = getSvgCharacterPoint(
    textElement,
    boundaryCharIndex - 1,
    'end',
  )
  const nextStart = getSvgCharacterPoint(
    textElement,
    boundaryCharIndex,
    'start',
  )

  if (!previousEnd) return nextStart
  if (!nextStart) return previousEnd

  return {
    x: (previousEnd.x + nextStart.x) / 2,
    y: (previousEnd.y + nextStart.y) / 2,
  }
}

export function getRenderedCurvedDiscTextBoundaryProgressesForElement({
  line,
  textElement,
}: {
  line: CurvedDiscTextHostGeometry['lines'][number]
  textElement: SvgTextContentElementLike
}) {
  if (
    typeof textElement.getNumberOfChars !== 'function' ||
    typeof textElement.getStartPositionOfChar !== 'function' ||
    typeof textElement.getEndPositionOfChar !== 'function'
  ) {
    return null
  }

  const rawText = textElement.textContent ?? ''
  const lineStart = rawText.indexOf(line.text)

  if (!line.text || lineStart < 0) {
    return null
  }

  let renderedCharacterCount = 0
  try {
    renderedCharacterCount = textElement.getNumberOfChars()
  } catch {
    return null
  }

  if (!Number.isFinite(renderedCharacterCount) || renderedCharacterCount <= 0) {
    return null
  }

  const boundaries = getGraphemeSegments(line.text)
    .map((segment) => segment.end)
  const offsets = [0, ...boundaries]
  const renderedBoundaries = offsets.flatMap((offset) => {
    const point = getBoundaryPointForLineOffset({
      lineOffset: offset,
      lineStart,
      lineText: line.text,
      rawText,
      renderedCharacterCount,
      textElement,
    })

    if (!point) return []

    return [{
      offset,
      progress: clampCurvedTextRangeValue(
        getCurvedDiscTextProgressForSvgPoint(line, point),
        0,
        1,
      ),
    }]
  })

  if (renderedBoundaries.length < 2) {
    return null
  }

  return renderedBoundaries
}

function escapeCssAttributeValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function getMainCurvedTextElements({
  key,
  root,
}: {
  key: DiscTextKey
  root: ParentNode
}) {
  const escapedKey = escapeCssAttributeValue(key)

  return Array.from(root.querySelectorAll<SvgTextContentElementLike>(
    `text.disc-text-render-text[${DISC_TEXT_KEY_ATTRIBUTE}="${escapedKey}"]:not(.disc-text-curved-shadow)`,
  ))
}

function getRenderedCurvedDiscTextBoundarySnapshot({
  geometry,
  key,
  root,
}: {
  geometry: CurvedDiscTextHostGeometry
  key: DiscTextKey
  root?: ParentNode
}) {
  const resolvedRoot = root ??
    (typeof document === 'undefined' ? null : document)

  if (!resolvedRoot) return null

  const textElements = getMainCurvedTextElements({
    key,
    root: resolvedRoot,
  })

  if (textElements.length === 0) return null

  let hasRenderedBoundary = false
  const renderedLines = geometry.lines.map((line, index) => {
    const textElement = textElements[index]
    const boundaryProgresses = textElement
      ? getRenderedCurvedDiscTextBoundaryProgressesForElement({
          line,
          textElement,
        })
      : null

    if (!boundaryProgresses) return line
    hasRenderedBoundary = true

    return {
      ...line,
      boundaryProgresses,
    }
  })

  if (!hasRenderedBoundary) return null

  return {
    geometry: {
      ...geometry,
      lines: renderedLines,
    },
    textElements,
  }
}

export function getRenderedCurvedDiscTextGeometry({
  geometry,
  key,
  root,
}: {
  geometry: CurvedDiscTextHostGeometry
  key: DiscTextKey
  root?: ParentNode
}) {
  return getRenderedCurvedDiscTextBoundarySnapshot({
    geometry,
    key,
    root,
  })?.geometry ?? null
}

function getSvgPointForClientPoint({
  clientX,
  clientY,
  textElement,
}: {
  clientX: number
  clientY: number
  textElement: SvgTextContentElementLike
}) {
  const svg = textElement.ownerSVGElement
  const ctm = svg?.getScreenCTM()

  if (!svg || !ctm) return null

  try {
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY

    return point.matrixTransform(ctm.inverse())
  } catch {
    return null
  }
}

export function getRenderedCurvedDiscTextOffsetForClientPoint({
  clientX,
  clientY,
  geometry,
  key,
  root,
}: {
  clientX: number
  clientY: number
  geometry: CurvedDiscTextHostGeometry
  key: DiscTextKey
  root?: ParentNode
}) {
  const snapshot = getRenderedCurvedDiscTextBoundarySnapshot({
    geometry,
    key,
    root,
  })
  const textElement = snapshot?.textElements[0]

  if (!snapshot || !textElement) return null

  const point = getSvgPointForClientPoint({
    clientX,
    clientY,
    textElement,
  })

  if (!point) return null

  return getCurvedDiscTextOffsetForSvgPoint({
    geometry: snapshot.geometry,
    x: point.x,
    y: point.y,
  })
}
