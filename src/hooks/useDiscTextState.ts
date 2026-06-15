import { useState } from 'react'
import {
  applySteamGameImportToDiscTextValues,
} from '../steam/steamGameImport'
import type { SteamImportedGame } from '../steam/steamApi'
import type { DiscTemplate } from '../types/template'
import {
  clampStraightDiscTextLayoutToSafeZone,
} from '../layout/discElementSafeZone'
import {
  createDefaultDiscTextValueSources,
  getDiscTextKeysForProjectMetadataField,
  isMetadataBoundDiscTextKey,
  resolveMetadataBoundDiscTextTitle,
  resolveMetadataBoundDiscTextValues,
  updateDiscTextInlineDraftValue,
  updateDiscTextInputValue,
  type DiscTextValueSources,
  type MetadataBoundDiscTextKey,
} from '../project/metadataDiscText'
import type { ProjectDiscNumberArtwork, ProjectMetadata } from '../project/projectTypes'
import {
  createDefaultProjectDiscNumberArtwork,
  updateDiscNumberArtworkBadgeSet,
  updateDiscNumberArtworkMode,
  type DiscNumberArtworkMode,
  type DiscNumberBadgeSet,
} from '../discText/discNumberArtwork'
import {
  DISC_TEXT_KEYS,
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
  getDiscTextContent,
  resetDiscTextLayout,
  isCurvedCopyrightDiscTextLayout,
  updateDiscTextAlignment,
  updateDiscTextArcSide,
  updateDiscTextLayoutForSteamLogoPlacement,
  updateDiscTextLayoutField,
  updateDiscTextVisualAvoidance,
  updateDiscTextMode,
  updateDiscTextSetting,
  type DiscTextAlignment,
  type DiscTextArcSide,
  type DiscTextKey,
  type DiscTextLayoutNumericField,
  type DiscTextLayoutSettings,
  type DiscTextMode,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from '../discText/index'
import {
  createDefaultDiscTextStyles,
  applyDiscTextStylePreset,
  resetDiscTextStyle,
  updateDiscTextStyleField,
  type DiscTextStyleField,
  type DiscTextStyleSettings,
  type DiscTextStyleValue,
} from '../discText/styles'

type UseDiscTextStateOptions = {
  projectMetadata: ProjectMetadata
  selectedDiscTemplate: DiscTemplate
  steamLogoPlacement: SteamLogoPlacement
}

type DiscTextStateSnapshot = {
  projectDiscNumberArtwork: ProjectDiscNumberArtwork
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  discTextValueSources: DiscTextValueSources
  discTextTitleValue: string
  discTextLayout: DiscTextLayoutSettings
  discTextStyles: DiscTextStyleSettings
}

type DiscTextResolutionInput = {
  discTextValues?: DiscTextValues
  discTextValueSources?: DiscTextValueSources
  discTextTitleValue?: string
}

type DiscTextResolution = {
  discTextValues: DiscTextValues
  discTextValueSources: DiscTextValueSources
  discTextTitleValue: string
  metadataBoundDiscTextValues: DiscTextValues
  resolvedDiscTextTitle: string
}

export function useDiscTextState({
  projectMetadata,
  selectedDiscTemplate,
  steamLogoPlacement,
}: UseDiscTextStateOptions) {
  const [discTextSettings, setDiscTextSettings] = useState<DiscTextSettings>(
    DEFAULT_DISC_TEXT_SETTINGS,
  )
  const [discTextValues, setDiscTextValues] = useState<DiscTextValues>(() =>
    createDefaultDiscTextValues(),
  )
  const [discTextValueSources, setDiscTextValueSources] = useState<DiscTextValueSources>(() =>
    createDefaultDiscTextValueSources(),
  )
  const [discTextTitleValue, setDiscTextTitleValue] = useState('')
  const [discTextLayout, setDiscTextLayout] = useState<DiscTextLayoutSettings>(() =>
    createDefaultDiscTextLayout(steamLogoPlacement, selectedDiscTemplate),
  )
  const [discTextStyles, setDiscTextStyles] = useState<DiscTextStyleSettings>(() =>
    createDefaultDiscTextStyles(),
  )
  const [projectDiscNumberArtwork, setProjectDiscNumberArtwork] = useState(() =>
    createDefaultProjectDiscNumberArtwork(),
  )

  function resolveDiscTextForMetadata(
    metadata: ProjectMetadata,
    input: DiscTextResolutionInput = {},
  ): DiscTextResolution {
    const values = input.discTextValues ?? discTextValues
    const sources = input.discTextValueSources ?? discTextValueSources
    const titleValue = input.discTextTitleValue ?? discTextTitleValue

    return {
      discTextValues: values,
      discTextValueSources: sources,
      discTextTitleValue: titleValue,
      metadataBoundDiscTextValues: resolveMetadataBoundDiscTextValues(
        values,
        metadata,
        sources,
      ),
      resolvedDiscTextTitle: resolveMetadataBoundDiscTextTitle(
        titleValue,
        metadata,
        sources,
      ),
    }
  }

  const {
    metadataBoundDiscTextValues,
    resolvedDiscTextTitle,
  } = resolveDiscTextForMetadata(projectMetadata)

  function getCurrentDiscTextContent(key: DiscTextKey) {
    return getDiscTextContent(key, metadataBoundDiscTextValues, resolvedDiscTextTitle)
  }

  function clampDiscTextLayoutSettingsForCurrentContent(
    layout: DiscTextLayoutSettings,
    template: DiscTemplate,
    styles: DiscTextStyleSettings = discTextStyles,
  ) {
    return DISC_TEXT_KEYS.reduce((nextLayout, key) => {
      const currentTextLayout = layout[key]
      nextLayout[key] = isCurvedCopyrightDiscTextLayout(key, currentTextLayout)
        ? currentTextLayout
        : clampStraightDiscTextLayoutToSafeZone(
            key,
            currentTextLayout,
            template,
            getCurrentDiscTextContent(key),
            undefined,
            styles,
          )

      return nextLayout
    }, {} as DiscTextLayoutSettings)
  }

  function resetDiscTextState(
    template: DiscTemplate = selectedDiscTemplate,
    placement: SteamLogoPlacement = steamLogoPlacement,
  ) {
    setProjectDiscNumberArtwork(createDefaultProjectDiscNumberArtwork())
    setDiscTextSettings(DEFAULT_DISC_TEXT_SETTINGS)
    setDiscTextValues(createDefaultDiscTextValues())
    setDiscTextValueSources(createDefaultDiscTextValueSources())
    setDiscTextTitleValue('')
    setDiscTextLayout(createDefaultDiscTextLayout(placement, template))
    setDiscTextStyles(createDefaultDiscTextStyles())
  }

  function restoreDiscTextState({
    projectDiscNumberArtwork: restoredProjectDiscNumberArtwork,
    discTextSettings: restoredDiscTextSettings,
    discTextValues: restoredDiscTextValues,
    discTextValueSources: restoredDiscTextValueSources,
    discTextTitleValue: restoredDiscTextTitleValue,
    discTextLayout: restoredDiscTextLayout,
    discTextStyles: restoredDiscTextStyles,
  }: DiscTextStateSnapshot) {
    setProjectDiscNumberArtwork(restoredProjectDiscNumberArtwork)
    setDiscTextSettings(restoredDiscTextSettings)
    setDiscTextValues(restoredDiscTextValues)
    setDiscTextValueSources(restoredDiscTextValueSources)
    setDiscTextTitleValue(restoredDiscTextTitleValue)
    setDiscTextLayout(restoredDiscTextLayout)
    setDiscTextStyles(restoredDiscTextStyles)
  }

  function clampDiscTextLayoutToTemplate(template: DiscTemplate) {
    setDiscTextLayout((currentLayout) => {
      const nextLayout = clampDiscTextLayoutSettingsForCurrentContent(
        currentLayout,
        template,
      )
      const didChange = DISC_TEXT_KEYS.some(
        (key) =>
          nextLayout[key].x !== currentLayout[key].x ||
          nextLayout[key].y !== currentLayout[key].y,
      )

      return didChange ? nextLayout : currentLayout
    })
  }

  function repositionDiscTextForSteamLogoPlacement(
    placement: SteamLogoPlacement,
    template: DiscTemplate = selectedDiscTemplate,
  ) {
    setDiscTextLayout((currentLayout) => {
      return clampDiscTextLayoutSettingsForCurrentContent(
        updateDiscTextLayoutForSteamLogoPlacement(
          currentLayout,
          placement,
          template,
        ),
        template,
      )
    })
  }

  function handleDiscTextToggle(key: DiscTextKey, checked: boolean) {
    setDiscTextSettings((currentSettings) =>
      updateDiscTextSetting(currentSettings, key, checked),
    )
  }

  function clampDiscTextLayoutForContent(key: DiscTextKey, renderedText: string) {
    setDiscTextLayout((currentLayout) => {
      const currentTextLayout = currentLayout[key]

      if (isCurvedCopyrightDiscTextLayout(key, currentTextLayout)) {
        return currentLayout
      }

      return {
        ...currentLayout,
        [key]: clampStraightDiscTextLayoutToSafeZone(
          key,
          currentTextLayout,
          selectedDiscTemplate,
          renderedText,
          undefined,
          discTextStyles,
        ),
      }
    })
  }

  function clampMetadataBoundDiscTextLayoutsForContent(
    keys: MetadataBoundDiscTextKey[],
    values: DiscTextValues,
    title: string,
    sources: DiscTextValueSources = discTextValueSources,
  ) {
    for (const key of keys) {
      if (sources[key] === 'manual') {
        continue
      }

      clampDiscTextLayoutForContent(
        key,
        getDiscTextContent(key, values, title),
      )
    }
  }

  function clampMetadataBoundDiscTextLayoutsForProjectMetadataFields(
    fields: Array<keyof ProjectMetadata>,
    metadata: ProjectMetadata,
    input: DiscTextResolutionInput = {},
  ) {
    const affectedTextKeys = fields.flatMap((field) =>
      getDiscTextKeysForProjectMetadataField(field),
    )
    const nextResolution = resolveDiscTextForMetadata(metadata, input)

    clampMetadataBoundDiscTextLayoutsForContent(
      affectedTextKeys,
      nextResolution.metadataBoundDiscTextValues,
      nextResolution.resolvedDiscTextTitle,
      nextResolution.discTextValueSources,
    )

    return nextResolution
  }

  function handleDiscTextContentChange(key: DiscTextKey, value: string) {
    const nextInputUpdate = updateDiscTextInputValue(
      discTextValues,
      discTextValueSources,
      key,
      value,
      discTextTitleValue,
    )
    const nextResolution = resolveDiscTextForMetadata(projectMetadata, {
      discTextValues: nextInputUpdate.values,
      discTextValueSources: nextInputUpdate.sources,
      discTextTitleValue: nextInputUpdate.titleValue,
    })

    if (isMetadataBoundDiscTextKey(key)) {
      setDiscTextValueSources(nextInputUpdate.sources)
    }
    setDiscTextValues(nextInputUpdate.values)
    setDiscTextTitleValue(nextInputUpdate.titleValue)
    clampDiscTextLayoutForContent(
      key,
      getDiscTextContent(
        key,
        nextResolution.metadataBoundDiscTextValues,
        nextResolution.resolvedDiscTextTitle,
      ),
    )
  }

  function handleDiscTextInlineDraftChange(key: DiscTextKey, value: string) {
    const nextInputUpdate = updateDiscTextInlineDraftValue(
      discTextValues,
      discTextValueSources,
      key,
      value,
      discTextTitleValue,
    )
    const nextResolution = resolveDiscTextForMetadata(projectMetadata, {
      discTextValues: nextInputUpdate.values,
      discTextValueSources: nextInputUpdate.sources,
      discTextTitleValue: nextInputUpdate.titleValue,
    })

    if (isMetadataBoundDiscTextKey(key)) {
      setDiscTextValueSources(nextInputUpdate.sources)
    }
    setDiscTextValues(nextInputUpdate.values)
    setDiscTextTitleValue(nextInputUpdate.titleValue)
    clampDiscTextLayoutForContent(
      key,
      getDiscTextContent(
        key,
        nextResolution.metadataBoundDiscTextValues,
        nextResolution.resolvedDiscTextTitle,
      ),
    )
  }

  function finalizeDiscTextInlineDraft(key: DiscTextKey) {
    if (!isMetadataBoundDiscTextKey(key) || getCurrentDiscTextContent(key).trim()) {
      return
    }

    handleDiscTextContentChange(key, '')
  }

  function handleUseMetadataDiscTextValue(key: MetadataBoundDiscTextKey) {
    const nextInputUpdate = updateDiscTextInputValue(
      discTextValues,
      discTextValueSources,
      key,
      '',
      discTextTitleValue,
    )
    const nextResolution = resolveDiscTextForMetadata(projectMetadata, {
      discTextValues: nextInputUpdate.values,
      discTextValueSources: nextInputUpdate.sources,
      discTextTitleValue: nextInputUpdate.titleValue,
    })

    setDiscTextValueSources(nextInputUpdate.sources)
    setDiscTextValues(nextInputUpdate.values)
    setDiscTextTitleValue(nextInputUpdate.titleValue)
    clampDiscTextLayoutForContent(
      key,
      getDiscTextContent(
        key,
        nextResolution.metadataBoundDiscTextValues,
        nextResolution.resolvedDiscTextTitle,
      ),
    )
  }

  function handleDiscTextLayoutChange(
    key: DiscTextKey,
    field: DiscTextLayoutNumericField,
    value: number,
  ) {
    setDiscTextLayout((currentLayout) => {
      const nextLayout = updateDiscTextLayoutField(currentLayout, key, field, value)

      return {
        ...nextLayout,
        [key]: clampStraightDiscTextLayoutToSafeZone(
          key,
          nextLayout[key],
          selectedDiscTemplate,
          getCurrentDiscTextContent(key),
          undefined,
          discTextStyles,
        ),
      }
    })
  }

  function handleDiscTextAlignmentChange(key: DiscTextKey, align: DiscTextAlignment) {
    setDiscTextLayout((currentLayout) => {
      const nextLayout = updateDiscTextAlignment(currentLayout, key, align)
      const nextTextLayout = nextLayout[key]

      return {
        ...nextLayout,
        [key]: isCurvedCopyrightDiscTextLayout(key, nextTextLayout)
          ? nextTextLayout
          : clampStraightDiscTextLayoutToSafeZone(
              key,
              nextTextLayout,
              selectedDiscTemplate,
              getCurrentDiscTextContent(key),
              undefined,
              discTextStyles,
            ),
      }
    })
  }

  function handleDiscTextModeChange(key: DiscTextKey, mode: DiscTextMode) {
    setDiscTextLayout((currentLayout) => {
      const nextLayout = updateDiscTextMode(
        currentLayout,
        key,
        mode,
        steamLogoPlacement,
        selectedDiscTemplate,
      )

      return {
        ...nextLayout,
        [key]: clampStraightDiscTextLayoutToSafeZone(
          key,
          nextLayout[key],
          selectedDiscTemplate,
          getCurrentDiscTextContent(key),
          undefined,
          discTextStyles,
        ),
      }
    })
  }

  function handleDiscTextArcSideChange(key: DiscTextKey, arcSide: DiscTextArcSide) {
    setDiscTextLayout((currentLayout) =>
      updateDiscTextArcSide(currentLayout, key, arcSide),
    )
  }

  function handleDiscTextVisualAvoidanceChange(
    key: DiscTextKey,
    avoidVisualElements: boolean,
  ) {
    setDiscTextLayout((currentLayout) =>
      updateDiscTextVisualAvoidance(
        currentLayout,
        key,
        avoidVisualElements,
      ),
    )
  }

  function handleResetDiscTextLayout(key: DiscTextKey) {
    setDiscTextLayout((currentLayout) => {
      const nextLayout = resetDiscTextLayout(
        currentLayout,
        key,
        steamLogoPlacement,
        selectedDiscTemplate,
      )

      return {
        ...nextLayout,
        [key]: clampStraightDiscTextLayoutToSafeZone(
          key,
          nextLayout[key],
          selectedDiscTemplate,
          getCurrentDiscTextContent(key),
          undefined,
          discTextStyles,
        ),
      }
    })
  }

  function handleDiscTextStyleChange(
    key: DiscTextKey,
    field: DiscTextStyleField,
    value: DiscTextStyleValue,
  ) {
    const nextStyles = updateDiscTextStyleField(discTextStyles, key, field, value)

    setDiscTextStyles(nextStyles)
    setDiscTextLayout((currentLayout) => ({
      ...currentLayout,
      [key]: clampStraightDiscTextLayoutToSafeZone(
        key,
        currentLayout[key],
        selectedDiscTemplate,
        getCurrentDiscTextContent(key),
        undefined,
        nextStyles,
      ),
    }))
  }

  function handleResetDiscTextStyle(key: DiscTextKey) {
    const nextStyles = resetDiscTextStyle(discTextStyles, key)

    setDiscTextStyles(nextStyles)
    setDiscTextLayout((currentLayout) => ({
      ...currentLayout,
      [key]: clampStraightDiscTextLayoutToSafeZone(
        key,
        currentLayout[key],
        selectedDiscTemplate,
        getCurrentDiscTextContent(key),
        undefined,
        nextStyles,
      ),
    }))
  }

  function handleApplyDiscTextStylePreset(key: DiscTextKey, presetId: string) {
    const nextStyles = applyDiscTextStylePreset(discTextStyles, key, presetId)

    setDiscTextStyles(nextStyles)
    setDiscTextLayout((currentLayout) => ({
      ...currentLayout,
      [key]: clampStraightDiscTextLayoutToSafeZone(
        key,
        currentLayout[key],
        selectedDiscTemplate,
        getCurrentDiscTextContent(key),
        undefined,
        nextStyles,
      ),
    }))
  }

  function handleDiscNumberArtworkModeChange(mode: DiscNumberArtworkMode) {
    setProjectDiscNumberArtwork((currentArtwork) =>
      updateDiscNumberArtworkMode(currentArtwork, mode),
    )
  }

  function handleDiscNumberArtworkBadgeSetChange(badgeSet: DiscNumberBadgeSet) {
    setProjectDiscNumberArtwork((currentArtwork) =>
      updateDiscNumberArtworkBadgeSet(currentArtwork, badgeSet),
    )
  }

  function enableCurvedCopyrightDiscText() {
    setDiscTextValueSources((currentSources) => ({
      ...currentSources,
      copyright: 'metadata',
    }))
    setDiscTextSettings((currentSettings) =>
      updateDiscTextSetting(currentSettings, 'copyright', true),
    )
    setDiscTextLayout((currentLayout) =>
      updateDiscTextMode(
        currentLayout,
        'copyright',
        'curved',
        steamLogoPlacement,
        selectedDiscTemplate,
      ),
    )
  }

  function setCopyrightDiscTextEnabled(enabled: boolean) {
    setDiscTextSettings((currentSettings) =>
      updateDiscTextSetting(currentSettings, 'copyright', enabled),
    )
  }

  function applySteamImportedDiscTextValues(
    importedGame: SteamImportedGame,
    metadata: ProjectMetadata,
    options: { useMetadataCopyright: boolean },
  ) {
    const nextDiscTextValueSources = options.useMetadataCopyright
      ? {
          ...discTextValueSources,
          copyright: 'metadata' as const,
        }
      : discTextValueSources
    const nextDiscTextValuesBase = applySteamGameImportToDiscTextValues(
      importedGame,
      discTextValues,
      nextDiscTextValueSources,
    )
    const nextDiscTextValues = options.useMetadataCopyright
      ? {
          ...nextDiscTextValuesBase,
          copyright: '',
        }
      : nextDiscTextValuesBase
    const nextResolution = resolveDiscTextForMetadata(metadata, {
      discTextValues: nextDiscTextValues,
      discTextValueSources: nextDiscTextValueSources,
      discTextTitleValue,
    })

    setDiscTextValues(nextDiscTextValues)
    if (options.useMetadataCopyright) {
      setDiscTextValueSources(nextDiscTextValueSources)
    }

    return nextResolution
  }

  return {
    projectDiscNumberArtwork,
    discTextSettings,
    discTextValues,
    discTextValueSources,
    discTextTitleValue,
    discTextLayout,
    discTextStyles,
    metadataBoundDiscTextValues,
    resolvedDiscTextTitle,
    getCurrentDiscTextContent,
    setDiscTextLayout,
    resetDiscTextState,
    restoreDiscTextState,
    clampDiscTextLayoutToTemplate,
    repositionDiscTextForSteamLogoPlacement,
    clampDiscTextLayoutForContent,
    clampMetadataBoundDiscTextLayoutsForContent,
    clampMetadataBoundDiscTextLayoutsForProjectMetadataFields,
    handleDiscTextToggle,
    handleDiscTextContentChange,
    handleDiscTextInlineDraftChange,
    finalizeDiscTextInlineDraft,
    handleUseMetadataDiscTextValue,
    handleDiscTextLayoutChange,
    handleDiscTextAlignmentChange,
    handleDiscTextModeChange,
    handleDiscTextArcSideChange,
    handleDiscTextVisualAvoidanceChange,
    handleResetDiscTextLayout,
    handleDiscTextStyleChange,
    handleResetDiscTextStyle,
    handleApplyDiscTextStylePreset,
    handleDiscNumberArtworkModeChange,
    handleDiscNumberArtworkBadgeSetChange,
    enableCurvedCopyrightDiscText,
    setCopyrightDiscTextEnabled,
    applySteamImportedDiscTextValues,
  }
}
