import { useMemo, useState } from 'react'
import { createDiscDimensionEditingState, getDiscDimensionFieldViews, updateDiscDimensionDraft } from '../templates/discDimensionEditing'
import type { DiscTemplate } from '../types/template'
import type { DiscTemplateGeometryGuardrailState } from '../layout/discTemplateGeometryGuardrail'
import {
  CUSTOM_OUTER_DIAMETER_MAX_MM,
  createDefaultDiscTemplateState,
  createDiscTemplateGuideOverlay,
  createDiscTemplateSelectionChange,
  discTemplateOptions,
  discTemplates,
  getDiscTemplateExportPreviewFallbackSize,
  getIsCustomDiscTemplate,
  getSelectedDiscTemplate,
  restoreDiscTemplateRuntimeState,
  type CustomDiscDimensionKey,
  type RestorableDiscTemplateState,
} from '../templates/discTemplateStateModel'

export type UseDiscTemplateOptions = {
  announceStatus: (message: string) => void
  clampForegroundElementLayoutsToTemplate: (template: DiscTemplate) => void
  getGeometryGuardrailState: () => DiscTemplateGeometryGuardrailState
}

export function useDiscTemplate({
  announceStatus,
  clampForegroundElementLayoutsToTemplate,
  getGeometryGuardrailState,
}: UseDiscTemplateOptions) {
  const [dimensionEditing, setDimensionEditing] = useState(() =>
    createDiscDimensionEditingState(createDefaultDiscTemplateState()))
  const discTemplateState = dimensionEditing.templateState
  const selectedDiscTemplate = useMemo(
    () => getSelectedDiscTemplate(discTemplateState),
    [discTemplateState],
  )
  const isCustomDiscTemplate = getIsCustomDiscTemplate(discTemplateState)
  const guideOverlay = useMemo(
    () => createDiscTemplateGuideOverlay(selectedDiscTemplate),
    [selectedDiscTemplate],
  )
  const discExportPreviewFallbackSize = useMemo(
    () => getDiscTemplateExportPreviewFallbackSize(selectedDiscTemplate),
    [selectedDiscTemplate],
  )

  function resetDiscTemplateState() {
    setDimensionEditing(createDiscDimensionEditingState(createDefaultDiscTemplateState()))
  }

  function restoreDiscTemplateState(templateState: RestorableDiscTemplateState) {
    setDimensionEditing(current => createDiscDimensionEditingState(
      restoreDiscTemplateRuntimeState(current.templateState, templateState)))
  }

  function handleTemplateChange(templateId: RestorableDiscTemplateState['selectedDiscTemplateId']) {
    const templateChange = createDiscTemplateSelectionChange(
      discTemplateState,
      templateId,
    )

    setDimensionEditing(createDiscDimensionEditingState(templateChange.state))
    clampForegroundElementLayoutsToTemplate(templateChange.selectedTemplate)
    announceStatus(templateChange.statusMessage)
  }

  function handleCustomDimensionChange(
    field: CustomDiscDimensionKey,
    value: string,
  ) {
    const dimensionChange = updateDiscDimensionDraft(
      dimensionEditing, field, value, getGeometryGuardrailState())
    setDimensionEditing(dimensionChange.state)

    if (dimensionChange.statusMessage) {
      announceStatus(dimensionChange.statusMessage)
    }

    if (!dimensionChange.changed) {
      return
    }

    if (dimensionChange.selectedTemplateToClamp) {
      clampForegroundElementLayoutsToTemplate(
        dimensionChange.selectedTemplateToClamp,
      )
    }
  }

  return {
    selectedDiscTemplateId: discTemplateState.selectedDiscTemplateId,
    customDiscTemplate: discTemplateState.customDiscTemplate,
    customDimensionFields: getDiscDimensionFieldViews(dimensionEditing),
    selectedDiscTemplate,
    defaultDiscTemplate: discTemplates.standardPrintableDisc,
    discTemplateOptions,
    customOuterDiameterMaxMm: CUSTOM_OUTER_DIAMETER_MAX_MM,
    isCustomDiscTemplate,
    guideOverlay,
    discExportPreviewFallbackSize,
    resetDiscTemplateState,
    restoreDiscTemplateState,
    handleTemplateChange,
    handleCustomDimensionChange,
  }
}
