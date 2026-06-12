import type { AdditionalArtworkFrame, BackgroundImageSize } from '../../project/projectTypes'
import { getImageContentSize } from '../../image/imageContentBounds'
import { getImageContentShape } from '../../image/imageContentShape'
import {
  createTexturedArtworkFramePathData,
  getArtworkFrameStrokeWidth,
  getArtworkFrameTexturePatternSize,
  getArtworkFrameTextureUrl,
  isTexturedArtworkFrame,
} from '../../render/artworkFrame'

type ArtworkFrameOverlayProps = {
  className: string
  frame: AdditionalArtworkFrame
  imageSize: BackgroundImageSize | null | undefined
  patternId: string
}

function getFrameViewBox(imageSize: BackgroundImageSize | null | undefined) {
  const contentSize = getImageContentSize(imageSize)
  const width = 100
  const height =
    contentSize && contentSize.width > 0
      ? Math.max(1, 100 * (contentSize.height / contentSize.width))
      : 100

  return { width, height }
}

function sanitizeSvgId(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, '-')
}

function TexturedArtworkFrameRing({
  pathData,
  patternId,
  strokeWidth,
}: {
  pathData: string
  patternId: string
  strokeWidth: number
}) {
  const outlineWidth = Math.max(0.2, strokeWidth * 0.16)

  return (
    <>
      <path
        d={pathData}
        fill="rgba(15, 23, 42, 0.62)"
        fillRule="evenodd"
      />
      <path
        d={pathData}
        fill={`url(#${patternId})`}
        fillRule="evenodd"
      />
      <path
        d={pathData}
        fill="none"
        stroke="rgba(15, 23, 42, 0.62)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={outlineWidth}
      />
    </>
  )
}

function TexturedArtworkFrameStroke({
  pathData,
  patternId,
  strokeWidth,
}: {
  pathData: string
  patternId: string
  strokeWidth: number
}) {
  const outlineWidth = Math.max(0.2, strokeWidth * 0.16)

  return (
    <>
      <path
        d={pathData}
        fill="none"
        stroke="rgba(15, 23, 42, 0.62)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth + outlineWidth}
      />
      <path
        d={pathData}
        fill="none"
        stroke={`url(#${patternId})`}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </>
  )
}

export function ArtworkFrameOverlay({
  className,
  frame,
  imageSize,
  patternId,
}: ArtworkFrameOverlayProps) {
  if (!frame.enabled) {
    return null
  }

  const contentShape = getImageContentShape(imageSize)
  const viewBox = contentShape
    ? { width: contentShape.width, height: contentShape.height }
    : getFrameViewBox(imageSize)
  const strokeWidth = Math.min(
    getArtworkFrameStrokeWidth(frame, viewBox.width, viewBox.height),
    viewBox.width,
    viewBox.height,
  )
  const inset = strokeWidth / 2
  const tracedPathData = contentShape?.path ?? null

  if (isTexturedArtworkFrame(frame)) {
    const safePatternId = sanitizeSvgId(patternId)
    const textureUrl = getArtworkFrameTextureUrl(frame)
    const pathData = tracedPathData ||
      createTexturedArtworkFramePathData(
        frame,
        { x: 0, y: 0, width: viewBox.width, height: viewBox.height },
        strokeWidth,
      )
    const patternSize = getArtworkFrameTexturePatternSize(viewBox, strokeWidth)

    return (
      <svg
        className={className}
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <pattern
            id={safePatternId}
            patternUnits="userSpaceOnUse"
            width={patternSize}
            height={patternSize}
          >
            {textureUrl ? (
              <image
                href={textureUrl}
                width={patternSize}
                height={patternSize}
                preserveAspectRatio="xMidYMid slice"
              />
            ) : null}
          </pattern>
        </defs>
        {tracedPathData ? (
          <TexturedArtworkFrameStroke
            pathData={pathData}
            patternId={safePatternId}
            strokeWidth={strokeWidth}
          />
        ) : (
          <TexturedArtworkFrameRing
            pathData={pathData}
            patternId={safePatternId}
            strokeWidth={strokeWidth}
          />
        )}
      </svg>
    )
  }

  return (
    <svg
      className={className}
      viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {tracedPathData ? (
        <path
          d={tracedPathData}
          fill="none"
          stroke={frame.color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      ) : frame.shape === 'circle' ? (
        <ellipse
          cx={viewBox.width / 2}
          cy={viewBox.height / 2}
          rx={Math.max(0, (viewBox.width - strokeWidth) / 2)}
          ry={Math.max(0, (viewBox.height - strokeWidth) / 2)}
          fill="none"
          stroke={frame.color}
          strokeWidth={strokeWidth}
        />
      ) : (
        <rect
          x={inset}
          y={inset}
          width={Math.max(0, viewBox.width - strokeWidth)}
          height={Math.max(0, viewBox.height - strokeWidth)}
          fill="none"
          stroke={frame.color}
          strokeWidth={strokeWidth}
        />
      )}
    </svg>
  )
}
