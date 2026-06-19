export type OptionalFeatureSectionModelInput = {
  enabled: boolean
  hasActions?: boolean
  hasChildren?: boolean
  hasStatus?: boolean
}

export type OptionalFeatureSectionModel = {
  actionSlotVisible: boolean
  contentVisible: boolean
  controlsHidden: boolean
  statusSlotVisible: boolean
}

export function getOptionalFeatureSectionModel({
  enabled,
  hasActions = false,
  hasChildren = false,
  hasStatus = false,
}: OptionalFeatureSectionModelInput): OptionalFeatureSectionModel {
  const contentVisible = enabled && (hasActions || hasChildren || hasStatus)

  return {
    actionSlotVisible: enabled && hasActions,
    contentVisible,
    controlsHidden: !enabled,
    statusSlotVisible: enabled && hasStatus,
  }
}
