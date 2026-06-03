import type { DiscTextKey, DiscTextValues } from '../discText/types'

export type MetadataBoundDiscTextKey = Exclude<DiscTextKey, 'customNote'>
export type DiscTextValueSource = 'metadata' | 'manual'
export type DiscTextValueSources = Record<MetadataBoundDiscTextKey, DiscTextValueSource>
export type DiscTextInputValueKey = DiscTextKey

export type DiscTextInputState = {
  value: string
  placeholder: string
  isMetadataBacked: boolean
  isManualOverride: boolean
}

export type DiscTextInputUpdate = {
  values: DiscTextValues
  sources: DiscTextValueSources
  titleValue: string
}
