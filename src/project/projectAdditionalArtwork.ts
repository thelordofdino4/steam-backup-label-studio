import { getAdditionalArtworkBoundsPercent, type RenderBoundsPercent } from '../discGeometry.ts'
import {
  getDefaultAdditionalArtworkLayoutForTemplate,
  getNextAdditionalArtworkLayoutForTemplate,
} from '../layout/discTemplateLayoutDefaults.ts'
import type { DiscTemplate } from '../types/template'
import type { ImportedImageAsset } from '../utils/importedImageAsset.ts'
import type {
  AdditionalArtworkLayout,
  AdditionalArtworkFrame,
  AdditionalArtworkFrameShape,
  AdditionalArtworkSource,
  BackgroundImageSize,
  ProjectAdditionalArtwork,
  ProjectAdditionalArtworkElement,
  ProjectAdditionalArtworkInput,
} from './projectTypes'

export type AdditionalArtworkLayoutField = keyof AdditionalArtworkLayout
export type AdditionalArtworkFrameField = keyof AdditionalArtworkFrame

export type AdditionalArtworkImportSource = {
  source: AdditionalArtworkSource
  sourceId: string | null
  sourceLabel: string
}

export type AdditionalArtworkRenderItem = {
  id: string
  label: string
  imageDataUrl: string
  imageSize: BackgroundImageSize
  layout: AdditionalArtworkLayout
  frame: AdditionalArtworkFrame
  unscaledBounds: RenderBoundsPercent
  scaledBounds: RenderBoundsPercent
  sourceLabel: string
}

type AdditionalArtworkLayoutPoint = {
  x: number
  y: number
}

const FALLBACK_ADDITIONAL_ARTWORK_X_OFFSET_PERCENT = 9
const FALLBACK_ADDITIONAL_ARTWORK_Y_OFFSET_PERCENT = 7

let additionalArtworkIdCounter = 0

export const ADDITIONAL_ARTWORK_SCALE_MIN = 0.2
export const ADDITIONAL_ARTWORK_SCALE_MAX = 4
export const DEFAULT_ADDITIONAL_ARTWORK_SOURCE_LABEL = 'No image selected'

export const DEFAULT_ADDITIONAL_ARTWORK_SIZE: BackgroundImageSize = {
  width: 900,
  height: 600,
}

export const DEFAULT_ADDITIONAL_ARTWORK_LAYOUT: AdditionalArtworkLayout = {
  enabled: true,
  scale: 1,
  x: 68,
  y: 42,
}

export const ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN = 0.25
export const ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX = 8

export const DEFAULT_ADDITIONAL_ARTWORK_FRAME: AdditionalArtworkFrame = {
  enabled: false,
  color: '#f9fafb',
  width: 2,
  shape: 'rectangle',
}

function createAdditionalArtworkElementId() {
  const randomId = globalThis.crypto?.randomUUID?.()

  if (randomId) {
    return `artwork-${randomId}`
  }

  additionalArtworkIdCounter += 1

  return `artwork-${Date.now().toString(36)}-${additionalArtworkIdCounter}`
}

function getDefaultAdditionalArtworkLabel(additionalArtworkIndex: number) {
  return `Artwork ${additionalArtworkIndex + 1}`
}

function normalizeElementLabel(label: unknown, fallbackLabel: string) {
  return typeof label === 'string' && label.trim()
    ? label
    : fallbackLabel
}

function createFallbackAdditionalArtworkLayout(
  additionalArtworkIndex: number,
): AdditionalArtworkLayout {
  return {
    ...DEFAULT_ADDITIONAL_ARTWORK_LAYOUT,
    x:
      DEFAULT_ADDITIONAL_ARTWORK_LAYOUT.x +
      FALLBACK_ADDITIONAL_ARTWORK_X_OFFSET_PERCENT * additionalArtworkIndex,
    y:
      DEFAULT_ADDITIONAL_ARTWORK_LAYOUT.y +
      FALLBACK_ADDITIONAL_ARTWORK_Y_OFFSET_PERCENT * additionalArtworkIndex,
  }
}

function createDefaultAdditionalArtworkLayout(
  additionalArtworkIndex: number,
  selectedDiscTemplate?: DiscTemplate,
  imageSize: BackgroundImageSize | null = null,
) {
  return selectedDiscTemplate
    ? getDefaultAdditionalArtworkLayoutForTemplate(
        selectedDiscTemplate,
        additionalArtworkIndex,
        imageSize,
      )
    : createFallbackAdditionalArtworkLayout(additionalArtworkIndex)
}

function createAdditionalArtworkElement(
  additionalArtworkIndex: number,
  selectedDiscTemplate?: DiscTemplate,
): ProjectAdditionalArtworkElement {
  return {
    id: createAdditionalArtworkElementId(),
    label: getDefaultAdditionalArtworkLabel(additionalArtworkIndex),
    source: 'custom',
    sourceId: null,
    sourceLabel: DEFAULT_ADDITIONAL_ARTWORK_SOURCE_LABEL,
    imageDataUrl: null,
    imageSize: null,
    layout: createDefaultAdditionalArtworkLayout(
      additionalArtworkIndex,
      selectedDiscTemplate,
    ),
    frame: DEFAULT_ADDITIONAL_ARTWORK_FRAME,
  }
}

function updateAdditionalArtworkElement(
  additionalArtwork: ProjectAdditionalArtwork,
  elementId: string,
  updater: (
    element: ProjectAdditionalArtworkElement,
    index: number,
  ) => ProjectAdditionalArtworkElement,
): ProjectAdditionalArtwork {
  let didUpdate = false
  const elements = additionalArtwork.elements.map((element, index) => {
    if (element.id !== elementId) {
      return element
    }

    didUpdate = true
    return updater(element, index)
  })

  return didUpdate ? { ...additionalArtwork, elements } : additionalArtwork
}

export function createDefaultProjectAdditionalArtwork(): ProjectAdditionalArtwork {
  return {
    enabled: false,
    elements: [],
  }
}

export function setAdditionalArtworkEnabled(
  additionalArtwork: ProjectAdditionalArtwork,
  enabled: boolean,
): ProjectAdditionalArtwork {
  return {
    ...additionalArtwork,
    enabled,
  }
}

export function addAdditionalArtworkElement(
  additionalArtwork: ProjectAdditionalArtwork,
  selectedDiscTemplate?: DiscTemplate,
): ProjectAdditionalArtwork {
  const elements = additionalArtwork.elements
  const previousElement = elements[elements.length - 1]
  const nextElement = createAdditionalArtworkElement(elements.length, selectedDiscTemplate)
  const layout = previousElement
    ? selectedDiscTemplate
      ? getNextAdditionalArtworkLayoutForTemplate(
          selectedDiscTemplate,
          previousElement.layout,
          nextElement.imageSize,
        )
      : {
          ...previousElement.layout,
          enabled: true,
          x:
            previousElement.layout.x +
            FALLBACK_ADDITIONAL_ARTWORK_X_OFFSET_PERCENT,
          y:
            previousElement.layout.y +
            FALLBACK_ADDITIONAL_ARTWORK_Y_OFFSET_PERCENT,
        }
    : nextElement.layout

  return {
    ...additionalArtwork,
    enabled: true,
    elements: [
      ...elements,
      {
        ...nextElement,
        layout,
      },
    ],
  }
}

export function removeAdditionalArtworkElement(
  additionalArtwork: ProjectAdditionalArtwork,
  elementId: string,
): ProjectAdditionalArtwork {
  return {
    ...additionalArtwork,
    elements: additionalArtwork.elements.filter((element) => element.id !== elementId),
  }
}

export function updateAdditionalArtworkElementLabel(
  additionalArtwork: ProjectAdditionalArtwork,
  elementId: string,
  label: string,
): ProjectAdditionalArtwork {
  return updateAdditionalArtworkElement(
    additionalArtwork,
    elementId,
    (element) => ({
      ...element,
      label,
    }),
  )
}

export function getAdditionalArtworkElement(
  additionalArtwork: ProjectAdditionalArtwork,
  elementId: string,
) {
  return additionalArtwork.elements.find((element) => element.id === elementId)
}

export function getAdditionalArtworkElementLayout(
  additionalArtwork: ProjectAdditionalArtwork,
  elementId: string,
) {
  return getAdditionalArtworkElement(additionalArtwork, elementId)?.layout ??
    DEFAULT_ADDITIONAL_ARTWORK_LAYOUT
}

export function getAdditionalArtworkElementImageSize(
  additionalArtwork: ProjectAdditionalArtwork,
  elementId: string,
) {
  return getAdditionalArtworkElement(additionalArtwork, elementId)?.imageSize ?? null
}

export function setAdditionalArtworkElementLayout(
  additionalArtwork: ProjectAdditionalArtwork,
  elementId: string,
  layout: AdditionalArtworkLayout,
): ProjectAdditionalArtwork {
  return updateAdditionalArtworkElement(
    additionalArtwork,
    elementId,
    (element) => ({
      ...element,
      layout,
    }),
  )
}

export function updateAdditionalArtworkElementLayoutField(
  additionalArtwork: ProjectAdditionalArtwork,
  elementId: string,
  field: AdditionalArtworkLayoutField,
  value: boolean | number,
): ProjectAdditionalArtwork {
  return setAdditionalArtworkElementLayout(
    additionalArtwork,
    elementId,
    {
      ...getAdditionalArtworkElementLayout(additionalArtwork, elementId),
      [field]: value,
    },
  )
}

export function updateAdditionalArtworkElementLayoutPosition(
  additionalArtwork: ProjectAdditionalArtwork,
  elementId: string,
  point: AdditionalArtworkLayoutPoint,
): ProjectAdditionalArtwork {
  return setAdditionalArtworkElementLayout(
    additionalArtwork,
    elementId,
    {
      ...getAdditionalArtworkElementLayout(additionalArtwork, elementId),
      x: point.x,
      y: point.y,
    },
  )
}

export function updateAdditionalArtworkElementFrameField(
  additionalArtwork: ProjectAdditionalArtwork,
  elementId: string,
  field: AdditionalArtworkFrameField,
  value: boolean | number | string,
): ProjectAdditionalArtwork {
  return updateAdditionalArtworkElement(
    additionalArtwork,
    elementId,
    (element) => ({
      ...element,
      frame: {
        ...element.frame,
        [field]: value,
      },
    }),
  )
}

export function resetAdditionalArtworkElementFrame(
  additionalArtwork: ProjectAdditionalArtwork,
  elementId: string,
): ProjectAdditionalArtwork {
  return updateAdditionalArtworkElement(
    additionalArtwork,
    elementId,
    (element) => ({
      ...element,
      frame: DEFAULT_ADDITIONAL_ARTWORK_FRAME,
    }),
  )
}

export function setAdditionalArtworkElementImage(
  additionalArtwork: ProjectAdditionalArtwork,
  elementId: string,
  importedImage: ImportedImageAsset,
  importSource: AdditionalArtworkImportSource,
): ProjectAdditionalArtwork {
  return updateAdditionalArtworkElement(
    additionalArtwork,
    elementId,
    (element) => ({
      ...element,
      source: importSource.source,
      sourceId: importSource.sourceId,
      sourceLabel: importSource.sourceLabel,
      imageDataUrl: importedImage.imageDataUrl,
      imageSize: importedImage.imageSize,
      layout: {
        ...element.layout,
        enabled: true,
      },
    }),
  )
}

export function clearAdditionalArtworkElementImage(
  additionalArtwork: ProjectAdditionalArtwork,
  elementId: string,
): ProjectAdditionalArtwork {
  return updateAdditionalArtworkElement(
    additionalArtwork,
    elementId,
    (element) => ({
      ...element,
      source: 'custom',
      sourceId: null,
      sourceLabel: DEFAULT_ADDITIONAL_ARTWORK_SOURCE_LABEL,
      imageDataUrl: null,
      imageSize: null,
    }),
  )
}

export function resetProjectAdditionalArtworkElementLayout(
  additionalArtwork: ProjectAdditionalArtwork,
  elementId: string,
  selectedDiscTemplate?: DiscTemplate,
): ProjectAdditionalArtwork {
  return updateAdditionalArtworkElement(
    additionalArtwork,
    elementId,
    (element, index) => ({
      ...element,
      layout: {
        ...createDefaultAdditionalArtworkLayout(
          index,
          selectedDiscTemplate,
          element.imageSize,
        ),
        enabled: element.layout.enabled,
      },
    }),
  )
}

export function canUseAdditionalArtworkElement(
  element: ProjectAdditionalArtworkElement,
) {
  return Boolean(element.imageDataUrl)
}

export function shouldRenderAdditionalArtworkElement(
  additionalArtwork: ProjectAdditionalArtwork,
  element: ProjectAdditionalArtworkElement,
) {
  return (
    additionalArtwork.enabled &&
    element.layout.enabled &&
    canUseAdditionalArtworkElement(element)
  )
}

export function createAdditionalArtworkRenderItems(
  additionalArtwork: ProjectAdditionalArtwork,
): AdditionalArtworkRenderItem[] {
  if (!additionalArtwork.enabled) {
    return []
  }

  return additionalArtwork.elements.flatMap((element) => {
    if (!shouldRenderAdditionalArtworkElement(additionalArtwork, element)) {
      return []
    }

    const imageDataUrl = element.imageDataUrl

    if (!imageDataUrl) {
      return []
    }

    const imageSize = element.imageSize ?? DEFAULT_ADDITIONAL_ARTWORK_SIZE

    return [
      {
        id: element.id,
        label: element.label,
        imageDataUrl,
        imageSize,
        layout: element.layout,
        unscaledBounds: getAdditionalArtworkBoundsPercent(imageSize, 1),
        scaledBounds: getAdditionalArtworkBoundsPercent(
          imageSize,
          element.layout.scale,
        ),
        frame: element.frame,
        sourceLabel: element.sourceLabel,
      },
    ]
  })
}

function isAdditionalArtworkSource(value: unknown): value is AdditionalArtworkSource {
  return (
    value === 'custom' ||
    value === 'steam-artwork' ||
    value === 'local-steam-screenshot'
  )
}

function isAdditionalArtworkFrameShape(
  value: unknown,
): value is AdditionalArtworkFrameShape {
  return value === 'rectangle' || value === 'circle'
}

function normalizeAdditionalArtworkFrame(
  frame: Partial<AdditionalArtworkFrame> | undefined,
): AdditionalArtworkFrame {
  const width =
    typeof frame?.width === 'number' && Number.isFinite(frame.width)
      ? Math.min(
          ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX,
          Math.max(ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN, frame.width),
        )
      : DEFAULT_ADDITIONAL_ARTWORK_FRAME.width

  return {
    enabled: frame?.enabled ?? DEFAULT_ADDITIONAL_ARTWORK_FRAME.enabled,
    color:
      typeof frame?.color === 'string' && frame.color.trim()
        ? frame.color
        : DEFAULT_ADDITIONAL_ARTWORK_FRAME.color,
    width,
    shape: isAdditionalArtworkFrameShape(frame?.shape)
      ? frame.shape
      : DEFAULT_ADDITIONAL_ARTWORK_FRAME.shape,
  }
}

function normalizeAdditionalArtworkLayout(
  layout: Partial<AdditionalArtworkLayout> | undefined,
  defaults: AdditionalArtworkLayout,
): AdditionalArtworkLayout {
  return {
    enabled: layout?.enabled ?? defaults.enabled,
    scale: layout?.scale ?? defaults.scale,
    x: layout?.x ?? defaults.x,
    y: layout?.y ?? defaults.y,
  }
}

function normalizeAdditionalArtworkElement(
  element: Partial<ProjectAdditionalArtworkElement> | undefined,
  additionalArtworkIndex: number,
  selectedDiscTemplate?: DiscTemplate,
): ProjectAdditionalArtworkElement | null {
  if (!element || typeof element !== 'object') {
    return null
  }

  const imageSize = element.imageSize ?? null
  const defaultLayout = createDefaultAdditionalArtworkLayout(
    additionalArtworkIndex,
    selectedDiscTemplate,
    imageSize,
  )

  return {
    id: typeof element.id === 'string' && element.id.trim()
      ? element.id
      : createAdditionalArtworkElementId(),
    label: normalizeElementLabel(
      element.label,
      getDefaultAdditionalArtworkLabel(additionalArtworkIndex),
    ),
    source: isAdditionalArtworkSource(element.source) ? element.source : 'custom',
    sourceId: typeof element.sourceId === 'string' ? element.sourceId : null,
    sourceLabel:
      typeof element.sourceLabel === 'string' && element.sourceLabel.trim()
        ? element.sourceLabel
        : DEFAULT_ADDITIONAL_ARTWORK_SOURCE_LABEL,
    imageDataUrl: element.imageDataUrl ?? null,
    imageSize,
    layout: normalizeAdditionalArtworkLayout(element.layout, defaultLayout),
    frame: normalizeAdditionalArtworkFrame(element.frame),
  }
}

export function normalizeProjectAdditionalArtwork(
  additionalArtwork: ProjectAdditionalArtworkInput | undefined,
  selectedDiscTemplate?: DiscTemplate,
): ProjectAdditionalArtwork {
  const defaults = createDefaultProjectAdditionalArtwork()
  const rawElements = Array.isArray(additionalArtwork?.elements)
    ? additionalArtwork.elements
    : []
  const elements = rawElements.flatMap((element, index) => {
    const normalizedElement = normalizeAdditionalArtworkElement(
      element,
      index,
      selectedDiscTemplate,
    )

    return normalizedElement ? [normalizedElement] : []
  })

  return {
    enabled: additionalArtwork?.enabled ?? (elements.length > 0 ? true : defaults.enabled),
    elements,
  }
}
