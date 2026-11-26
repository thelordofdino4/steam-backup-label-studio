import type {
  CSSProperties,
  PointerEventHandler,
} from 'react'
import type { BackgroundImageSize } from '../../project/projectTypes.ts'
import {
  getImageContentBounds,
  isEmptyImageContentBounds,
} from '../../image/imageContentBounds.ts'
import { getImageContentShape } from '../../image/imageContentShape.ts'

export type ContentBoundedImageProps = {
  src: string
  alt: string
  imageSize?: BackgroundImageSize | null
  className?: string
  style?: CSSProperties
  editableAttributes?: Record<string, string>
  draggable?: boolean
  onPointerDown?: PointerEventHandler<Element>
  onPointerMove?: PointerEventHandler<Element>
  onPointerUp?: PointerEventHandler<Element>
  onPointerCancel?: PointerEventHandler<Element>
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function getSourceStyle(
  imageSize: BackgroundImageSize,
  bounds: NonNullable<ReturnType<typeof getImageContentBounds>>,
): CSSProperties {
  return {
    left: `${-(bounds.x / bounds.width) * 100}%`,
    top: `${-(bounds.y / bounds.height) * 100}%`,
    width: `${(imageSize.width / bounds.width) * 100}%`,
    height: `${(imageSize.height / bounds.height) * 100}%`,
  }
}

const FULL_SOURCE_STYLE: CSSProperties = {
  inset: 0,
  width: '100%',
  height: '100%',
}

function ImageContentShapeOverlay({
  imageSize,
}: {
  imageSize?: BackgroundImageSize | null
}) {
  const shape = getImageContentShape(imageSize)

  if (!shape) {
    return null
  }

  return (
    <svg
      className="content-shape-overlay"
      viewBox={`0 0 ${shape.width} ${shape.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="content-shape-hit-area"
        d={shape.path}
        fillRule={shape.fillRule}
      />
    </svg>
  )
}

export function ContentBoundedImage({
  src,
  alt,
  imageSize,
  className,
  style,
  editableAttributes,
  draggable = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: ContentBoundedImageProps) {
  const bounds = getImageContentBounds(imageSize)
  const shape = getImageContentShape(imageSize)

  if (bounds && isEmptyImageContentBounds(bounds)) {
    return null
  }

  if ((!bounds && !shape) || !imageSize) {
    return (
      <img
        className={className}
        src={src}
        alt={alt}
        {...editableAttributes}
        draggable={draggable}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={style}
      />
    )
  }

  const sourceStyle = bounds
    ? getSourceStyle(imageSize, bounds)
    : FULL_SOURCE_STYLE

  return (
    <span
      className={cx(
        className,
        'content-bounded-image',
        shape && 'content-bounded-image--content-shaped',
      )}
      {...editableAttributes}
      draggable={draggable}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={style}
    >
      <img
        className="content-bounded-image-source"
        src={src}
        alt=""
        draggable={false}
        aria-hidden="true"
        style={sourceStyle}
      />
      <ImageContentShapeOverlay imageSize={imageSize} />
    </span>
  )
}
