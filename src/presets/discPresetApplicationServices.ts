import type {
  TextMeasureFunction,
} from '../discText/straightTextWrapping.ts'

export type DiscPresetTextMeasurementService = Readonly<{
  measureText: TextMeasureFunction
}>

export type DiscPresetApplicationServices = Readonly<{
  textMeasurement?: DiscPresetTextMeasurementService
}>
