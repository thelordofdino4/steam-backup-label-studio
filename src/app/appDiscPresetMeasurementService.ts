import {
  measureDiscTextWithBrowserCanvas,
} from '../discText/measurement.ts'
import type {
  DiscPresetApplicationServices,
} from '../presets/discPresetApplicationServices.ts'

export const DISC_PRESET_PRODUCTION_APPLICATION_SERVICES =
  Object.freeze({
    textMeasurement: Object.freeze({
      measureText: measureDiscTextWithBrowserCanvas,
    }),
  }) satisfies DiscPresetApplicationServices
