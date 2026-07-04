import {
  getDiscTextContent,
  type DiscTextValues,
} from './index.ts'
import {
  resolveMetadataBoundDiscTextTitle,
  resolveMetadataBoundDiscTextValues,
  updateDiscTextInputValue,
  type DiscTextValueSources,
  type MetadataBoundDiscTextKey,
} from '../project/metadataDiscText.ts'
import type {
  ProjectMetadata,
} from '../project/projectTypes.ts'

export type DiscTextMetadataState = {
  discTextValues: DiscTextValues
  discTextValueSources: DiscTextValueSources
  discTextTitleValue: string
}

export type DiscTextMetadataResolution = DiscTextMetadataState & {
  metadataBoundDiscTextValues: DiscTextValues
  resolvedDiscTextTitle: string
}

export function resolveDiscTextMetadataState(
  metadata: ProjectMetadata,
  state: DiscTextMetadataState,
): DiscTextMetadataResolution {
  return {
    ...state,
    metadataBoundDiscTextValues: resolveMetadataBoundDiscTextValues(
      state.discTextValues,
      metadata,
      state.discTextValueSources,
    ),
    resolvedDiscTextTitle: resolveMetadataBoundDiscTextTitle(
      state.discTextTitleValue,
      metadata,
      state.discTextValueSources,
    ),
  }
}

export function restoreDiscTextMetadataValueTransition({
  key,
  metadata,
  state,
}: {
  key: MetadataBoundDiscTextKey
  metadata: ProjectMetadata
  state: DiscTextMetadataState
}) {
  const nextState = updateDiscTextInputValue(
    state.discTextValues,
    state.discTextValueSources,
    key,
    '',
    state.discTextTitleValue,
  )
  const resolution = resolveDiscTextMetadataState(metadata, {
    discTextValues: nextState.values,
    discTextValueSources: nextState.sources,
    discTextTitleValue: nextState.titleValue,
  })

  return {
    resolution,
    state: {
      discTextValues: nextState.values,
      discTextValueSources: nextState.sources,
      discTextTitleValue: nextState.titleValue,
    },
    renderedContent: getDiscTextContent(
      key,
      resolution.metadataBoundDiscTextValues,
      resolution.resolvedDiscTextTitle,
    ),
  }
}
