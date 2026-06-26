import { useMemo, useState } from 'react'
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
  updateCustomDiscTemplateDimension,
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
  const [discTemplateState, setDiscTemplateState] = useState(
    createDefaultDiscTemplateState,
  )
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
    setDiscTemplateState(createDefaultDiscTemplateState())
  }

  function restoreDiscTemplateState(templateState: RestorableDiscTemplateState) {
    setDiscTemplateState((currentState) =>
      restoreDiscTemplateRuntimeState(currentState, templateState))
  }

  function handleTemplateChange(templateId: RestorableDiscTemplateState['selectedDiscTemplateId']) {
    const templateChange = createDiscTemplateSelectionChange(
      discTemplateState,
      templateId,
    )

    setDiscTemplateState(templateChange.state)
    clampForegroundElementLayoutsToTemplate(templateChange.selectedTemplate)
    announceStatus(templateChange.statusMessage)
  }

  function handleCustomDimensionChange(
    field: CustomDiscDimensionKey,
    value: string,
  ) {
    const dimensionChange = updateCustomDiscTemplateDimension({
      state: discTemplateState,
      field,
      value,
      geometryGuardrailState: getGeometryGuardrailState(),
    })

    if (dimensionChange.statusMessage) {
      announceStatus(dimensionChange.statusMessage)
    }

    if (!dimensionChange.changed) {
      return
    }

    setDiscTemplateState(dimensionChange.state)

    if (dimensionChange.selectedTemplateToClamp) {
      clampForegroundElementLayoutsToTemplate(
        dimensionChange.selectedTemplateToClamp,
      )
    }
  }

  return {
    selectedDiscTemplateId: discTemplateState.selectedDiscTemplateId,
    customDiscTemplate: discTemplateState.customDiscTemplate,
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
