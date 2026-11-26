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

/** Prospective text effects of a Disc Steam import. Geometry and Guided
 * completion still run at their existing accepted owner boundary.
 */
export function planSteamImportedDiscTextValues(
  appId: number,
  metadata: ProjectMetadata,
  state: DiscTextMetadataState,
  useMetadataCopyright: boolean,
): DiscTextMetadataResolution {
  const values = state.discTextValueSources.appId === 'manual'
    ? state.discTextValues
    : { ...state.discTextValues, appId: String(appId) }
  return resolveDiscTextMetadataState(metadata, {
    discTextValues: useMetadataCopyright ? { ...values, copyright: '' } : values,
    discTextValueSources: useMetadataCopyright
      ? { ...state.discTextValueSources, copyright: 'metadata' }
      : state.discTextValueSources,
    discTextTitleValue: state.discTextTitleValue,
  })
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
