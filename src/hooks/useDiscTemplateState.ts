import { useMemo, useState } from 'react'
import {
  buildCustomDiscTemplate,
  getGuideInsetPercent,
  normalizeCustomDiscTemplate,
} from '../disc/geometry'
import { validateDiscTemplateGeometryGuardrail, type DiscTemplateGeometryGuardrailState } from '../layout/discTemplateGeometryGuardrail'
import { discTemplates } from '../templates/discTemplates'
import type { DiscTemplate } from '../types/template'
import type { SelectedDiscTemplateId } from '../project/projectTypes'

type CustomDimensionKey =
  | 'outerDiameterMm'
  | 'physicalCenterHoleDiameterMm'
  | 'innerHoleDiameterMm'
  | 'printableDiameterMm'
  | 'safeDiameterMm'

type RestorableDiscTemplateState = {
  selectedDiscTemplateId: SelectedDiscTemplateId
  customDiscTemplate?: DiscTemplate
}

type UseDiscTemplateStateOptions = {
  announceStatus: (message: string) => void
  clampForegroundElementLayoutsToTemplate: (template: DiscTemplate) => void
  getGeometryGuardrailState: () => DiscTemplateGeometryGuardrailState
}

export function useDiscTemplateState({
  announceStatus,
  clampForegroundElementLayoutsToTemplate,
  getGeometryGuardrailState,
}: UseDiscTemplateStateOptions) {
  const [selectedDiscTemplateId, setSelectedDiscTemplateId] =
    useState<SelectedDiscTemplateId>('standardPrintableDisc')
  const [customDiscTemplate, setCustomDiscTemplate] = useState<DiscTemplate>(() =>
    buildCustomDiscTemplate(discTemplates.standardPrintableDisc),
  )
  const selectedDiscTemplate =
    selectedDiscTemplateId === 'custom'
      ? customDiscTemplate
      : discTemplates[selectedDiscTemplateId]
  const isCustomDiscTemplate = selectedDiscTemplateId === 'custom'
  const guideOverlay = useMemo(
    () => ({
      innerPrintableBoundaryPercent:
        (selectedDiscTemplate.innerHoleDiameterMm / selectedDiscTemplate.outerDiameterMm) * 100,
      physicalCenterHolePercent:
        (selectedDiscTemplate.physicalCenterHoleDiameterMm / selectedDiscTemplate.outerDiameterMm) * 100,
      printableInsetPercent: getGuideInsetPercent(
        selectedDiscTemplate.outerDiameterMm,
        selectedDiscTemplate.printableDiameterMm,
      ),
      safeInsetPercent: getGuideInsetPercent(
        selectedDiscTemplate.outerDiameterMm,
        selectedDiscTemplate.safeDiameterMm,
      ),
    }),
    [selectedDiscTemplate],
  )

  function resetDiscTemplateState() {
    setSelectedDiscTemplateId('standardPrintableDisc')
    setCustomDiscTemplate(buildCustomDiscTemplate(discTemplates.standardPrintableDisc))
  }

  function restoreDiscTemplateState(templateState: RestorableDiscTemplateState) {
    if (templateState.customDiscTemplate) {
      setCustomDiscTemplate(templateState.customDiscTemplate)
    }

    setSelectedDiscTemplateId(templateState.selectedDiscTemplateId)
  }

  function handleTemplateChange(templateId: SelectedDiscTemplateId) {
    setSelectedDiscTemplateId(templateId)

    if (templateId === 'custom') {
      clampForegroundElementLayoutsToTemplate(customDiscTemplate)
      announceStatus('Custom disc dimensions enabled. Edit the numeric fields below.')
      return
    }

    clampForegroundElementLayoutsToTemplate(discTemplates[templateId])
    announceStatus(`Selected ${discTemplates[templateId].name}.`)
  }

  function handleCustomDimensionChange(field: CustomDimensionKey, value: string) {
    const numericValue = Number(value)

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return
    }

    const nextTemplate = normalizeCustomDiscTemplate({
      ...customDiscTemplate,
      [field]: numericValue,
    })
    const geometryGuardrail = validateDiscTemplateGeometryGuardrail(
      nextTemplate,
      getGeometryGuardrailState(),
    )

    if (!geometryGuardrail.allowed) {
      const [firstBlockingElement] = geometryGuardrail.blockingElementLabels
      const extraCount = geometryGuardrail.blockingElementLabels.length - 1

      announceStatus(
        `Custom geometry needs more printable space for ${firstBlockingElement}${extraCount > 0 ? ` and ${extraCount} more` : ''}.`,
      )
      return
    }

    setCustomDiscTemplate(nextTemplate)

    if (selectedDiscTemplateId === 'custom') {
      clampForegroundElementLayoutsToTemplate(nextTemplate)
    }
  }

  return {
    selectedDiscTemplateId,
    customDiscTemplate,
    selectedDiscTemplate,
    isCustomDiscTemplate,
    guideOverlay,
    resetDiscTemplateState,
    restoreDiscTemplateState,
    handleTemplateChange,
    handleCustomDimensionChange,
  }
}
