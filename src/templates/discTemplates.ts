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
    physicalCenterHoleDiameterMm: 15,
    innerHoleDiameterMm: 22,
    printableDiameterMm: 118,
    safeDiameterMm: 112,
    bleedDiameterMm: 120,
    geometryNote:
      'Physical CD/DVD media is 120 mm with a 15 mm spindle hole. The 22 mm inner guide represents the common inkjet-printable hub cutout, not the physical hole.',
    defaultZones: [],
  },
  stickyLabelDisc: {
    id: 'stickyLabelDisc',
    name: 'Sticky label disc',
    type: 'disc',
    units: 'mm',
    outerDiameterMm: 117,
    physicalCenterHoleDiameterMm: 15,
    innerHoleDiameterMm: 41,
    printableDiameterMm: 117,
    safeDiameterMm: 109,
    bleedDiameterMm: 117,
    geometryNote:
      'Sticky labels sit on top of standard media. The 41 mm inner cutout represents the label hole, while the physical disc spindle hole remains 15 mm.',
    defaultZones: [],
  },
  lightScribeDisc: {
    id: 'lightScribeDisc',
    name: 'LightScribe disc',
    type: 'disc',
    units: 'mm',
    outerDiameterMm: 120,
    physicalCenterHoleDiameterMm: 15,
    innerHoleDiameterMm: 44,
    printableDiameterMm: 117,
    safeDiameterMm: 109,
    bleedDiameterMm: 120,
    geometryNote:
      'LightScribe-style label art normally avoids the large inner hub area. The 44 mm inner guide represents the label/design boundary, while the physical disc spindle hole remains 15 mm.',
    defaultZones: [],
  },
}

export const discTemplateOptions = Object.values(discTemplates)