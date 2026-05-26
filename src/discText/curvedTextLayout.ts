export type CurvedTextAlignment = 'left' | 'center' | 'right'
export type CurvedTextSide = 'top' | 'bottom'

export type CurvedTextLineInput = {
  text: string
  measuredWidth: number
  radius: number
}

export type CurvedTextLayoutInput = {
  side: CurvedTextSide
  centerAngleDegrees: number
  arcDegrees: number
  align: CurvedTextAlignment
  lines: CurvedTextLineInput[]
  blockWindowDegrees?: number
}

export type CurvedTextLineLayout = {
  text: string
  radius: number
  startAngleDegrees: number
  endAngleDegrees: number
  centerAngleDegrees: number
  angleWidthDegrees: number
}

export type CurvedTextLayout = {
  blockStartAngleDegrees: number
  blockEndAngleDegrees: number
  blockWindowDegrees: number
  lines: CurvedTextLineLayout[]
}

function radiansToDegrees(radians: number) {
  return (radians * 180) / Math.PI
}

export function normalizeAngleDegrees(angle: number) {
  return ((angle % 360) + 360) % 360
}

function normalizeArcDegrees(arcDegrees: number) {
  if (!Number.isFinite(arcDegrees)) return 0
  return Math.min(Math.max(arcDegrees, 0), 360)
}

function getLineAngleWidthDegrees(line: CurvedTextLineInput) {
  if (line.radius <= 0 || line.measuredWidth <= 0) return 0
  return radiansToDegrees(line.measuredWidth / line.radius)
}

function getPathStartAngle(side: CurvedTextSide, centerAngleDegrees: number, windowDegrees: number) {
  return side === 'top'
    ? centerAngleDegrees - windowDegrees / 2
    : centerAngleDegrees + windowDegrees / 2
}

function getPathEndAngle(side: CurvedTextSide, centerAngleDegrees: number, windowDegrees: number) {
  return side === 'top'
    ? centerAngleDegrees + windowDegrees / 2
    : centerAngleDegrees - windowDegrees / 2
}

function getDerivedBlockWindowDegrees(input: CurvedTextLayoutInput) {
  const rawArcDegrees = normalizeArcDegrees(input.arcDegrees)

  if (typeof input.blockWindowDegrees === 'number' && Number.isFinite(input.blockWindowDegrees)) {
    return Math.min(Math.max(input.blockWindowDegrees, 0), rawArcDegrees)
  }

  const firstLine = input.lines[0]
  if (!firstLine) return rawArcDegrees

  return Math.min(rawArcDegrees, getLineAngleWidthDegrees(firstLine))
}

export function layoutCurvedText(input: CurvedTextLayoutInput): CurvedTextLayout {
  const blockWindowDegrees = getDerivedBlockWindowDegrees(input)
  const blockStartAngleDegrees = getPathStartAngle(
    input.side,
    input.centerAngleDegrees,
    blockWindowDegrees,
  )
  const blockEndAngleDegrees = getPathEndAngle(
    input.side,
    input.centerAngleDegrees,
    blockWindowDegrees,
  )

  const lines = input.lines.map((line): CurvedTextLineLayout => {
    const angleWidthDegrees = Math.min(
      blockWindowDegrees,
      getLineAngleWidthDegrees(line),
    )

    let startAngleDegrees: number
    let endAngleDegrees: number

    if (input.side === 'top') {
      if (input.align === 'left') {
        startAngleDegrees = blockStartAngleDegrees
        endAngleDegrees = blockStartAngleDegrees + angleWidthDegrees
      } else if (input.align === 'right') {
        endAngleDegrees = blockEndAngleDegrees
        startAngleDegrees = blockEndAngleDegrees - angleWidthDegrees
      } else {
        startAngleDegrees = input.centerAngleDegrees - angleWidthDegrees / 2
        endAngleDegrees = input.centerAngleDegrees + angleWidthDegrees / 2
      }
    } else if (input.align === 'left') {
      startAngleDegrees = blockStartAngleDegrees
      endAngleDegrees = blockStartAngleDegrees - angleWidthDegrees
    } else if (input.align === 'right') {
      endAngleDegrees = blockEndAngleDegrees
      startAngleDegrees = blockEndAngleDegrees + angleWidthDegrees
    } else {
      startAngleDegrees = input.centerAngleDegrees + angleWidthDegrees / 2
      endAngleDegrees = input.centerAngleDegrees - angleWidthDegrees / 2
    }

    return {
      text: line.text,
      radius: line.radius,
      startAngleDegrees,
      endAngleDegrees,
      centerAngleDegrees: input.centerAngleDegrees,
      angleWidthDegrees,
    }
  })

  return {
    blockStartAngleDegrees,
    blockEndAngleDegrees,
    blockWindowDegrees,
    lines,
  }
}
