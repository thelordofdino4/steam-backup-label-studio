import {
  CUSTOM_OUTER_DIAMETER_MAX_MM,
  buildCustomDiscTemplate,
  getGuideInsetPercent,
  mmToPixels,
  normalizeCustomDiscTemplate,
} from '../disc/geometry.ts'
import {
  validateDiscTemplateGeometryGuardrail,
  type DiscTemplateGeometryGuardrailResult,
  type DiscTemplateGeometryGuardrailState,
} from '../layout/discTemplateGeometryGuardrail.ts'
import type { SelectedDiscTemplateId } from '../project/projectTypes.ts'
import type { DiscTemplate } from '../types/template.ts'
import { discTemplates, discTemplateOptions } from './discTemplates.ts'

export type CustomDiscDimensionKey =
  | 'outerDiameterMm'
  | 'physicalCenterHoleDiameterMm'
  | 'innerHoleDiameterMm'
  | 'printableDiameterMm'
  | 'safeDiameterMm'

export type RestorableDiscTemplateState = {
  selectedDiscTemplateId: SelectedDiscTemplateId
  customDiscTemplate?: DiscTemplate
}

export type DiscTemplateState = {
  selectedDiscTemplateId: SelectedDiscTemplateId
  customDiscTemplate: DiscTemplate
}

type ValidateDiscTemplateGeometry = (
  template: DiscTemplate,
  state: DiscTemplateGeometryGuardrailState,
) => DiscTemplateGeometryGuardrailResult

type CustomDimensionUpdateInput = {
  state: DiscTemplateState
  field: CustomDiscDimensionKey
  value: string
  geometryGuardrailState: DiscTemplateGeometryGuardrailState
  validateGeometry?: ValidateDiscTemplateGeometry
}

export const DEFAULT_DISC_TEMPLATE_ID: SelectedDiscTemplateId = 'standardPrintableDisc'

export function createDefaultCustomDiscTemplate() {
  return buildCustomDiscTemplate(discTemplates.standardPrintableDisc)
}

export function createDefaultDiscTemplateState(): DiscTemplateState {
  return {
    selectedDiscTemplateId: DEFAULT_DISC_TEMPLATE_ID,
    customDiscTemplate: createDefaultCustomDiscTemplate(),
  }
}

export function getSelectedDiscTemplate(state: DiscTemplateState) {
  return state.selectedDiscTemplateId === 'custom'
    ? state.customDiscTemplate
    : discTemplates[state.selectedDiscTemplateId]
}

export function getIsCustomDiscTemplate(state: DiscTemplateState) {
  return state.selectedDiscTemplateId === 'custom'
}

export function restoreDiscTemplateRuntimeState(
  currentState: DiscTemplateState,
  templateState: RestorableDiscTemplateState,
): DiscTemplateState {
  return {
    selectedDiscTemplateId: templateState.selectedDiscTemplateId,
    customDiscTemplate: templateState.customDiscTemplate ?? currentState.customDiscTemplate,
  }
}

export function createDiscTemplateSelectionChange(
  state: DiscTemplateState,
  templateId: SelectedDiscTemplateId,
) {
  const nextState = {
    ...state,
    selectedDiscTemplateId: templateId,
  }
  const selectedTemplate = getSelectedDiscTemplate(nextState)

  return {
    state: nextState,
    selectedTemplate,
    statusMessage:
      templateId === 'custom'
        ? 'Custom disc dimensions enabled. Edit the numeric fields below.'
        : `Selected ${selectedTemplate.name}.`,
  }
}

export function formatBlockedCustomDiscGeometryMessage(
  guardrail: DiscTemplateGeometryGuardrailResult,
) {
  const [firstBlockingElement] = guardrail.blockingElementLabels
  const extraCount = guardrail.blockingElementLabels.length - 1

  return `Custom geometry needs more printable space for ${firstBlockingElement}${extraCount > 0 ? ` and ${extraCount} more` : ''}.`
}

export function updateCustomDiscTemplateDimension({
  state,
  field,
  value,
  geometryGuardrailState,
  validateGeometry = validateDiscTemplateGeometryGuardrail,
}: CustomDimensionUpdateInput) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return {
      state,
      changed: false,
      selectedTemplateToClamp: null,
      statusMessage: null,
    }
  }

  const nextTemplate = normalizeCustomDiscTemplate({
    ...state.customDiscTemplate,
    [field]: numericValue,
  })
  const geometryGuardrail = validateGeometry(nextTemplate, geometryGuardrailState)

  if (!geometryGuardrail.allowed) {
    return {
      state,
      changed: false,
      selectedTemplateToClamp: null,
      statusMessage: formatBlockedCustomDiscGeometryMessage(geometryGuardrail),
    }
  }

  return {
    state: {
      ...state,
      customDiscTemplate: nextTemplate,
    },
    changed: true,
    selectedTemplateToClamp:
      state.selectedDiscTemplateId === 'custom' ? nextTemplate : null,
    statusMessage: null,
  }
}

export {
  CUSTOM_OUTER_DIAMETER_MAX_MM,
  discTemplateOptions,
  discTemplates,
}

export function createDiscTemplateGuideOverlay(template: DiscTemplate) {
  return {
    innerPrintableBoundaryPercent:
      (template.innerHoleDiameterMm / template.outerDiameterMm) * 100,
    physicalCenterHolePercent:
      (template.physicalCenterHoleDiameterMm / template.outerDiameterMm) * 100,
    printableInsetPercent: getGuideInsetPercent(
      template.outerDiameterMm,
      template.printableDiameterMm,
    ),
    safeInsetPercent: getGuideInsetPercent(
      template.outerDiameterMm,
      template.safeDiameterMm,
    ),
  }
}

export function getDiscTemplateExportPreviewFallbackSize(template: DiscTemplate) {
  return mmToPixels(template.outerDiameterMm)
}
