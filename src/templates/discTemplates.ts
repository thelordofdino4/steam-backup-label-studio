import type { DiscTemplate } from '../types/template'

export type DiscTemplateId =
  | 'standardPrintableDisc'
  | 'stickyLabelDisc'
  | 'lightScribeDisc'

export const discTemplates: Record<DiscTemplateId, DiscTemplate> = {
  standardPrintableDisc: {
    id: 'standardPrintableDisc',
    name: 'Standard printable disc',
    type: 'disc',
    units: 'mm',
    outerDiameterMm: 120,
    innerHoleDiameterMm: 22,
    printableDiameterMm: 118,
    safeDiameterMm: 112,
    bleedDiameterMm: 120,
    defaultZones: [],
  },
  stickyLabelDisc: {
    id: 'stickyLabelDisc',
    name: 'Sticky label disc',
    type: 'disc',
    units: 'mm',
    outerDiameterMm: 117,
    innerHoleDiameterMm: 41,
    printableDiameterMm: 117,
    safeDiameterMm: 109,
    bleedDiameterMm: 117,
    defaultZones: [],
  },
  lightScribeDisc: {
    id: 'lightScribeDisc',
    name: 'LightScribe disc',
    type: 'disc',
    units: 'mm',
    outerDiameterMm: 120,
    innerHoleDiameterMm: 44,
    printableDiameterMm: 117,
    safeDiameterMm: 109,
    bleedDiameterMm: 120,
    defaultZones: [],
  },
}

export const discTemplateOptions = Object.values(discTemplates)
