import {
  buildCustomDiscTemplate,
  CUSTOM_OUTER_DIAMETER_MAX_MM,
  CUSTOM_OUTER_DIAMETER_MIN_MM,
} from '../disc/geometry.ts'
import type { DiscTemplate } from '../types/template.ts'
import type { CustomDiscDimensionKey } from './discTemplateStateModel.ts'
import { discTemplates } from './discTemplates.ts'

export const DISC_GEOMETRY_FIELDS = [
  'outerDiameterMm',
  'physicalCenterHoleDiameterMm',
  'innerHoleDiameterMm',
  'printableDiameterMm',
  'safeDiameterMm',
] as const satisfies readonly CustomDiscDimensionKey[]

export type DiscGeometryRawDraft = Readonly<Record<CustomDiscDimensionKey, string>>
type ParsedDraft = Partial<Record<CustomDiscDimensionKey, number>>

export type DiscGeometryDiagnostic = Readonly<{
  code: 'incomplete' | 'not-numeric' | 'not-finite' | 'out-of-range' |
    'center-after-inner' | 'center-outside-outer' | 'inner-outside-outer' |
    'inner-after-printable' | 'inner-after-safe' | 'printable-outside-outer' |
    'safe-after-printable'
  field: CustomDiscDimensionKey
  relatedFields: readonly CustomDiscDimensionKey[]
  message: string
  recovery: string
}>

type DraftEvidence = Readonly<{
  rawDraft: DiscGeometryRawDraft
  parsedDraft: Readonly<ParsedDraft>
  diagnostics: readonly DiscGeometryDiagnostic[]
}>

export type DiscGeometryDraftResult = DraftEvidence & (
  | { readonly status: 'incomplete' | 'invalid' }
  | { readonly status: 'valid'; readonly candidate: DiscTemplate }
)

const FIELD_LABELS: Record<CustomDiscDimensionKey, string> = {
  outerDiameterMm: 'Outer diameter',
  physicalCenterHoleDiameterMm: 'Physical center hole',
  innerHoleDiameterMm: 'Inner print boundary',
  printableDiameterMm: 'Printable diameter',
  safeDiameterMm: 'Safe diameter',
}

// Decimal millimeters, including complete exponents. Preserve partial input;
// never interpret empty strings as zero or accept Number's hex/binary syntax.
const COMPLETE_NUMBER = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/
const PARTIAL_NUMBER = /^(?:[+-]?|[+-]?(?:\d+)?\.|[+-]?(?:\d+(?:\.\d+)?|\.\d+)[eE][+-]?)$/

export function createDiscGeometryRawDraft(template: DiscTemplate): DiscGeometryRawDraft {
  return Object.fromEntries(DISC_GEOMETRY_FIELDS.map(field => [field, String(template[field])])) as DiscGeometryRawDraft
}

/** Intrinsic evidence only: a valid candidate still needs a complete owner plan and atomic apply. */
export function validateDiscGeometryDraft(
  input: DiscGeometryRawDraft,
  source: DiscTemplate = discTemplates.standardPrintableDisc,
): DiscGeometryDraftResult {
  const rawDraft = Object.fromEntries(DISC_GEOMETRY_FIELDS.map(field => [field, input[field]])) as DiscGeometryRawDraft
  const parsedDraft: ParsedDraft = {}
  const diagnostics: DiscGeometryDiagnostic[] = []
  const invalidScalarFields = new Set<CustomDiscDimensionKey>()

  for (const field of DISC_GEOMETRY_FIELDS) {
    const raw = rawDraft[field].trim()
    const label = FIELD_LABELS[field]
    let code: DiscGeometryDiagnostic['code'] | undefined
    let message = ''
    if (PARTIAL_NUMBER.test(raw)) {
      code = 'incomplete'
      message = `${label} needs a complete number in millimeters.`
    } else if (/^[+-]?(?:Infinity|NaN)$/.test(raw) || (COMPLETE_NUMBER.test(raw) && !Number.isFinite(Number(raw)))) {
      code = 'not-finite'
      message = `${label} must be a finite number in millimeters.`
    } else if (!COMPLETE_NUMBER.test(raw)) {
      code = 'not-numeric'
      message = `${label} must be a decimal number in millimeters.`
    } else {
      const value = Number(raw)
      parsedDraft[field] = value === 0 ? 0 : value
      const min = field === 'outerDiameterMm' ? CUSTOM_OUTER_DIAMETER_MIN_MM : 0
      if (value < min || value > CUSTOM_OUTER_DIAMETER_MAX_MM) {
        code = 'out-of-range'
        message = `${label} must be between ${min} and ${CUSTOM_OUTER_DIAMETER_MAX_MM} mm; its relationship to the other dimensions must also be valid.`
      }
    }
    if (code) {
      invalidScalarFields.add(field)
      diagnostics.push({ code, field, relatedFields: [], message, recovery: `Correct ${label.toLowerCase()} without changing the committed template.` })
    }
  }

  function checkOrder(
    field: CustomDiscDimensionKey,
    upperField: CustomDiscDimensionKey,
    code: DiscGeometryDiagnostic['code'],
    inset = 0,
  ) {
    if (invalidScalarFields.has(field) || invalidScalarFields.has(upperField)) return
    const value = parsedDraft[field]
    const upper = parsedDraft[upperField]
    if (value === undefined || upper === undefined || value <= upper - inset) return
    const limit = upper - inset
    diagnostics.push({
      code,
      field,
      relatedFields: [upperField],
      message: code === 'safe-after-printable'
        ? `Safe diameter is advisory, but must be at most ${limit} mm to remain inside the printable diameter.`
        : `${FIELD_LABELS[field]} must be at most ${limit} mm (${FIELD_LABELS[upperField].toLowerCase()}${inset ? ` minus ${inset} mm` : ''}).`,
      recovery: `Correct ${FIELD_LABELS[field].toLowerCase()} or ${FIELD_LABELS[upperField].toLowerCase()}; neither value is changed automatically.`,
    })
  }

  checkOrder('physicalCenterHoleDiameterMm', 'innerHoleDiameterMm', 'center-after-inner')
  checkOrder('physicalCenterHoleDiameterMm', 'outerDiameterMm', 'center-outside-outer', 1)
  checkOrder('innerHoleDiameterMm', 'outerDiameterMm', 'inner-outside-outer', 1)
  checkOrder('innerHoleDiameterMm', 'printableDiameterMm', 'inner-after-printable')
  checkOrder('innerHoleDiameterMm', 'safeDiameterMm', 'inner-after-safe')
  checkOrder('printableDiameterMm', 'outerDiameterMm', 'printable-outside-outer')
  checkOrder('safeDiameterMm', 'printableDiameterMm', 'safe-after-printable')

  if (diagnostics.length > 0) {
    return {
      status: diagnostics.some(({ code }) => code !== 'incomplete') ? 'invalid' : 'incomplete',
      rawDraft,
      parsedDraft,
      diagnostics,
    }
  }

  // Only the five parsed dimensions reach the canonical builder. Copy source
  // metadata so modifying a candidate cannot mutate a saved/built-in template.
  return {
    status: 'valid',
    rawDraft,
    parsedDraft,
    diagnostics,
    candidate: buildCustomDiscTemplate(structuredClone(source), parsedDraft),
  }
}
