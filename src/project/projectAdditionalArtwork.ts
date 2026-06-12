import { getAdditionalArtworkBoundsPercent } from '../disc/geometry.ts'
import {
  isOptionalVisualFeatureEnabled,
  setOptionalVisualFeatureEnabled,
  setOptionalLayoutFeatureEnabled,
} from '../editor/optionalVisualFeature.ts'
import {
  clearEditorImageAssetContent,
  setEditorImageAssetContent,
} from '../editor/imageAssetTransitions.ts'
import {
  createRepeatedArtworkLabel,
  createRepeatedArtworkLabelForIndex,
  getNextRepeatedArtworkLabelNumber,
  normalizeRepeatedArtworkLabel,
  shouldRenderRepeatedArtworkItem,
} from '../editor/repeatedArtwork.ts'
import {
  getDefaultAdditionalArtworkLayoutForTemplate,
  getNextAdditionalArtworkLayoutForTemplate,
} from '../layout/discTemplateLayoutDefaults.ts'
import type { DiscTemplate } from '../types/template'
import type { ImportedImageAsset } from '../utils/importedImageAsset.ts'
import type {
  AdditionalArtworkLayout,
  AdditionalArtworkFrame,
  AdditionalArtworkSource,
  BackgroundImageSize,
  ProjectAdditionalArtwork,
  ProjectAdditionalArtworkElement,
  ProjectAdditionalArtworkInput,
} from './projectTypes'
import { sanitizeProjectImageAssetSourceLabel } from './projectAssetStatus.ts'
import {
  DEFAULT_ADDITIONAL_ARTWORK_FRAME,
  normalizeAdditionalArtworkFrame,
  type AdditionalArtworkFrameField,
} from './additionalArtworkFrame.ts'
import {
  normalizeBoolean,
  normalizeFiniteNumber,
  normalizeImageSize,
  normalizeNullableString,
  normalizePositiveNumber,
} from './savedProjectNormalization.ts'
import {
  createPercentPositionedImageRenderArtifact,
  type PercentPositionedImageRenderArtifact,
} from '../render/imageRenderArtifact.ts'
export {
  ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MAX,
  ADDITIONAL_ARTWORK_FRAME_JAGGEDNESS_MIN,
  ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MAX,
  ADDITIONAL_ARTWORK_FRAME_LUMPINESS_MIN,
  ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MAX,
  ADDITIONAL_ARTWORK_FRAME_ROUGHNESS_OFFSET_MIN,
  ADDITIONAL_ARTWORK_FRAME_WIDTH_MAX,
  ADDITIONAL_ARTWORK_FRAME_WIDTH_MIN,
  DEFAULT_ADDITIONAL_ARTWORK_FRAME,
} from './additionalArtworkFrame.ts'
export type {
  AdditionalArtworkFrameField,
} from './additionalArtworkFrame.ts'

export type AdditionalArtworkLayoutField = keyof AdditionalArtworkLayout

export type AdditionalArtworkImportSource = {
  source: AdditionalArtworkSource
  sourceId: string | null
  sourceLabel: string
}

export type AdditionalArtworkRenderItem = PercentPositionedImageRenderArtifact<
  AdditionalArtworkLayout,
  {
  id: string
  imageSize: BackgroundImageSize
  frame: AdditionalArtworkFrame
  sourceLabel: string
  }
>

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

function createAdditionalArtworkElementId() {
  const randomId = globalThis.crypto?.randomUUID?.()

  if (randomId) {
    return `artwork-${randomId}`
  }

  additionalArtworkIdCounter += 1

  return `artwork-${Date.now().toString(36)}-${additionalArtworkIdCounter}`
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
  label = createRepeatedArtworkLabelForIndex(additionalArtworkIndex),
): ProjectAdditionalArtworkElement {
  return {
    id: createAdditionalArtworkElementId(),
    label,
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
  return setOptionalVisualFeatureEnabled(additionalArtwork, enabled)
}

export function addAdditionalArtworkElement(
  additionalArtwork: ProjectAdditionalArtwork,
  selectedDiscTemplate?: DiscTemplate,
): ProjectAdditionalArtwork {
  const elements = additionalArtwork.elements
  const previousElement = elements[elements.length - 1]
  const nextElement = createAdditionalArtworkElement(
    elements.length,
    selectedDiscTemplate,
    createRepeatedArtworkLabel(
      getNextRepeatedArtworkLabelNumber(elements),
    ),
  )
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
      ...setEditorImageAssetContent(element, importedImage),
      source: importSource.source,
      sourceId: importSource.sourceId,
      sourceLabel: sanitizeProjectImageAssetSourceLabel(
        importSource.sourceLabel,
        DEFAULT_ADDITIONAL_ARTWORK_SOURCE_LABEL,
      ),
      layout: setOptionalLayoutFeatureEnabled(element, true).layout,
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
      ...clearEditorImageAssetContent(element),
      source: 'custom',
      sourceId: null,
      sourceLabel: DEFAULT_ADDITIONAL_ARTWORK_SOURCE_LABEL,
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
  return shouldRenderRepeatedArtworkItem({
    featureEnabled: isOptionalVisualFeatureEnabled(additionalArtwork),
    itemEnabled: element.layout.enabled,
    hasRenderableContent: canUseAdditionalArtworkElement(element),
  })
}

export function createAdditionalArtworkRenderItems(
  additionalArtwork: ProjectAdditionalArtwork,
): AdditionalArtworkRenderItem[] {
  if (!isOptionalVisualFeatureEnabled(additionalArtwork)) {
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

    const renderItem = createPercentPositionedImageRenderArtifact({
        id: element.id,
        label: element.label,
        alt: element.label,
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
      })

    return renderItem ? [renderItem] : []
  })
}

function isAdditionalArtworkSource(value: unknown): value is AdditionalArtworkSource {
  return (
    value === 'custom' ||
    value === 'steam-artwork' ||
    value === 'web-artwork' ||
    value === 'local-steam-screenshot'
  )
}

function normalizeAdditionalArtworkLayout(
  layout: Partial<AdditionalArtworkLayout> | undefined,
  defaults: AdditionalArtworkLayout,
): AdditionalArtworkLayout {
  return {
    enabled: normalizeBoolean(layout?.enabled, defaults.enabled),
    scale: normalizePositiveNumber(layout?.scale, defaults.scale),
    x: normalizeFiniteNumber(layout?.x, defaults.x),
    y: normalizeFiniteNumber(layout?.y, defaults.y),
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

  const imageSize = normalizeImageSize(element.imageSize)
  const defaultLayout = createDefaultAdditionalArtworkLayout(
    additionalArtworkIndex,
    selectedDiscTemplate,
    imageSize,
  )

  return {
    id: typeof element.id === 'string' && element.id.trim()
      ? element.id
      : createAdditionalArtworkElementId(),
    label: normalizeRepeatedArtworkLabel(
      element.label,
      additionalArtworkIndex + 1,
    ),
    source: isAdditionalArtworkSource(element.source) ? element.source : 'custom',
    sourceId: normalizeNullableString(element.sourceId),
    sourceLabel:
      sanitizeProjectImageAssetSourceLabel(
        element.sourceLabel,
        DEFAULT_ADDITIONAL_ARTWORK_SOURCE_LABEL,
      ),
    imageDataUrl: normalizeNullableString(element.imageDataUrl),
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
    enabled: normalizeBoolean(
      additionalArtwork?.enabled,
      elements.length > 0 ? true : defaults.enabled,
    ),
    elements,
  }
}
