import type { DiscTemplateGeometryGuardrailState } from '../layout/discTemplateGeometryGuardrail.ts'
import {
  DISC_GEOMETRY_FIELDS, createDiscGeometryRawDraft, validateDiscGeometryDraft,
  type DiscGeometryDiagnostic, type DiscGeometryRawDraft,
} from './discGeometryDraft.ts'
import {
  commitCustomDiscTemplateDimensions, type CustomDiscDimensionKey, type DiscTemplateState,
} from './discTemplateStateModel.ts'

type Diagnostic = Omit<DiscGeometryDiagnostic, 'code'> & {
  code: DiscGeometryDiagnostic['code'] | 'content-does-not-fit'
}
export type DiscDimensionEditingState = Readonly<{
  templateState: DiscTemplateState
  rawDraft: DiscGeometryRawDraft
  diagnostics: readonly Diagnostic[]
}>
const LABELS: Record<CustomDiscDimensionKey, string> = {
  outerDiameterMm: 'Outer diameter', physicalCenterHoleDiameterMm: 'Physical center hole',
  innerHoleDiameterMm: 'Inner print boundary', printableDiameterMm: 'Outer print boundary',
  safeDiameterMm: 'Safe zone',
}
export function createDiscDimensionEditingState(templateState: DiscTemplateState): DiscDimensionEditingState {
  return { templateState, rawDraft: createDiscGeometryRawDraft(templateState.customDiscTemplate), diagnostics: [] }
}

/** #307 presentation draft only. Valid changes retain the established commit path; #311 remains separate. */
export function updateDiscDimensionDraft(
  current: DiscDimensionEditingState,
  field: CustomDiscDimensionKey,
  value: string,
  geometryGuardrailState: DiscTemplateGeometryGuardrailState,
) {
  const validation = validateDiscGeometryDraft({ ...current.rawDraft, [field]: value }, current.templateState.customDiscTemplate)
  const diagnostics: Diagnostic[] = [...validation.diagnostics]
  // The existing edit handler rejects zero. Retained zero values from a loaded
  // template remain valid; this does not change normalization or file semantics.
  for (const key of DISC_GEOMETRY_FIELDS) {
    if (validation.parsedDraft[key] === 0 && current.templateState.customDiscTemplate[key] !== 0 &&
      !diagnostics.some(item => item.field === key && item.code === 'out-of-range')) {
      diagnostics.push({ code: 'out-of-range', field: key, relatedFields: [],
        message: LABELS[key] + ' must be greater than 0 mm.',
        recovery: 'Enter a positive dimension; the committed template has not changed.' })
    }
  }
  const draftState: DiscDimensionEditingState = { ...current, rawDraft: validation.rawDraft, diagnostics }
  if (validation.status !== 'valid' || diagnostics.length) {
    return { state: draftState, changed: false, selectedTemplateToClamp: null, statusMessage: null }
  }
  const committed = commitCustomDiscTemplateDimensions({
    state: current.templateState, dimensions: validation.parsedDraft, geometryGuardrailState,
  })
  return {
    ...committed,
    state: { templateState: committed.state, rawDraft: validation.rawDraft,
      diagnostics: committed.changed ? [] : [{
        code: 'content-does-not-fit' as const, field, relatedFields: [],
        message: committed.statusMessage!, recovery: 'Increase printable space or correct the dimension.',
      }] },
  }
}

export function getDiscDimensionFieldViews(state: DiscDimensionEditingState) {
  return DISC_GEOMETRY_FIELDS.map(key => ({
    key, label: LABELS[key], value: state.rawDraft[key],
    inputId: 'disc-custom-' + key, errorId: 'disc-custom-' + key + '-error',
    messages: state.diagnostics.filter(item => item.field === key || item.relatedFields.includes(key))
      .map(item => item.message),
  }))
}
export type DiscDimensionFieldView = ReturnType<typeof getDiscDimensionFieldViews>[number]
