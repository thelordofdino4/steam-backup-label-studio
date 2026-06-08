export type OptionalVisualFeatureState = {
  enabled: boolean
}

export type OptionalVisualFeatureLayoutState = {
  layout: OptionalVisualFeatureState
}

export function isOptionalVisualFeatureEnabled(
  feature: OptionalVisualFeatureState | null | undefined,
) {
  return feature?.enabled === true
}

export function isOptionalLayoutFeatureEnabled(
  feature: OptionalVisualFeatureLayoutState | null | undefined,
) {
  return feature?.layout.enabled === true
}

export function shouldRenderOptionalVisualFeature(
  feature: OptionalVisualFeatureState | null | undefined,
  hasRenderableContent = true,
) {
  return isOptionalVisualFeatureEnabled(feature) && hasRenderableContent
}

export function shouldRenderOptionalLayoutFeature(
  feature: OptionalVisualFeatureLayoutState | null | undefined,
  hasRenderableContent = true,
) {
  return isOptionalLayoutFeatureEnabled(feature) && hasRenderableContent
}

export function setOptionalVisualFeatureEnabled<
  T extends OptionalVisualFeatureState,
>(feature: T, enabled: boolean): T {
  if (feature.enabled === enabled) {
    return feature
  }

  return {
    ...feature,
    enabled,
  } as T
}

export function setOptionalLayoutFeatureEnabled<
  T extends OptionalVisualFeatureLayoutState,
>(feature: T, enabled: boolean): T {
  if (feature.layout.enabled === enabled) {
    return feature
  }

  return {
    ...feature,
    layout: {
      ...feature.layout,
      enabled,
    },
  } as T
}
