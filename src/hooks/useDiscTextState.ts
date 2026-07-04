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
  finalizeDiscTextInlineDraftValue,
  getDiscTextKeysForProjectMetadataField,
  isMetadataBoundDiscTextKey,
  updateDiscTextInlineDraftValue,
  updateDiscTextInputValue,
  type DiscTextInputUpdate,
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
  getDiscTextHtmlSource,
  resetDiscTextLayout,
  isCurvedCopyrightDiscTextLayout,
  isDiscTextHtmlEnabled,
  setDiscTextHtmlEnabled,
  setDiscTextHtmlSource,
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
  type DiscTextHtmlSources,
  type DiscTextMode,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from '../discText/index'
import {
  createDefaultDiscTextStyles,
  type DiscTextStyleField,
  type DiscTextStyleSettings,
  type DiscTextStyleValue,
} from '../discText/styles'
import {
  applyDiscTextStylePresetTransition,
  resetDiscTextStyleTransition,
  updateDiscTextStyleFieldTransition,
} from '../discText/styleStateTransitions'
import {
  parseHtmlText,
  type TextContentMode,
} from '../text/htmlText'
import {
  applyRichTextPlainTextMutation,
  type PlainTextSelectionRange,
  type RichTextListKeyboardCommand,
} from '../text/richTextCommands'
import {
  applyDiscTextRichTextCommandToSource,
  applyDiscTextRichTextKeyboardCommandToSource,
  createDiscTextRichTextSource,
  getDiscTextInlineStorageValue,
  getDiscTextRichTextCommandStateFromSource,
  type DiscTextRichTextCommand,
  type DiscTextRichTextCommandState,
} from '../discText/textStateTransitions'
import {
  resolveDiscTextMetadataState,
  restoreDiscTextMetadataValueTransition,
  type DiscTextMetadataResolution,
  type DiscTextMetadataState,
} from '../discText/metadataStateTransitions'

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
  discTextHtmlSources: DiscTextHtmlSources
  discTextLayout: DiscTextLayoutSettings
  discTextStyles: DiscTextStyleSettings
}

type DiscTextResolutionInput = Partial<DiscTextMetadataState>

type DiscTextInlineDoneCommit = {
  sourceMode?: boolean
  value: string
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
  const [discTextHtmlSources, setDiscTextHtmlSources] =
    useState<DiscTextHtmlSources>({})
  const [discTextLayout, setDiscTextLayout] = useState<DiscTextLayoutSettings>(() =>
    createDefaultDiscTextLayout(steamLogoPlacement, selectedDiscTemplate),
  )
  const [discTextStyles, setDiscTextStyles] = useState<DiscTextStyleSettings>(() =>
    createDefaultDiscTextStyles(),
  )
  const [selectedDiscTextKey, setSelectedDiscTextKey] =
    useState<DiscTextKey | null>(null)
  const [projectDiscNumberArtwork, setProjectDiscNumberArtwork] = useState(() =>
    createDefaultProjectDiscNumberArtwork(),
  )

  function resolveDiscTextForMetadata(
    metadata: ProjectMetadata,
    input: DiscTextResolutionInput = {},
  ): DiscTextMetadataResolution {
    return resolveDiscTextMetadataState(metadata, {
      discTextValues: input.discTextValues ?? discTextValues,
      discTextValueSources:
        input.discTextValueSources ?? discTextValueSources,
      discTextTitleValue: input.discTextTitleValue ?? discTextTitleValue,
    })
  }

  const {
    metadataBoundDiscTextValues,
    resolvedDiscTextTitle,
  } = resolveDiscTextForMetadata(projectMetadata)

  function getCurrentDiscTextContent(key: DiscTextKey) {
    return getDiscTextContent(key, metadataBoundDiscTextValues, resolvedDiscTextTitle)
  }

  function getCurrentDiscTextRenderedContent(key: DiscTextKey) {
    const text = getCurrentDiscTextContent(key)

    return isDiscTextHtmlEnabled(discTextHtmlSources, key)
      ? parseHtmlText(
          getDiscTextHtmlSource(discTextHtmlSources, key, text),
        ).plainText
      : text
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
            getCurrentDiscTextRenderedContent(key),
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
    setDiscTextHtmlSources({})
    setDiscTextLayout(createDefaultDiscTextLayout(placement, template))
    setDiscTextStyles(createDefaultDiscTextStyles())
  }

  function restoreDiscTextState({
    projectDiscNumberArtwork: restoredProjectDiscNumberArtwork,
    discTextSettings: restoredDiscTextSettings,
    discTextValues: restoredDiscTextValues,
    discTextValueSources: restoredDiscTextValueSources,
    discTextTitleValue: restoredDiscTextTitleValue,
    discTextHtmlSources: restoredDiscTextHtmlSources,
    discTextLayout: restoredDiscTextLayout,
    discTextStyles: restoredDiscTextStyles,
  }: DiscTextStateSnapshot) {
    setProjectDiscNumberArtwork(restoredProjectDiscNumberArtwork)
    setDiscTextSettings(restoredDiscTextSettings)
    setDiscTextValues(restoredDiscTextValues)
    setDiscTextValueSources(restoredDiscTextValueSources)
    setDiscTextTitleValue(restoredDiscTextTitleValue)
    setDiscTextHtmlSources(restoredDiscTextHtmlSources)
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

  function handleDiscTextPreviewEditStart(key: DiscTextKey) {
    if (!discTextSettings[key]) {
      handleDiscTextToggle(key, true)
    }

    setSelectedDiscTextKey(key)
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

  function getDiscTextInputUpdateRenderedContent(
    key: DiscTextKey,
    inputUpdate: DiscTextInputUpdate,
  ) {
    const nextResolution = resolveDiscTextForMetadata(projectMetadata, {
      discTextValues: inputUpdate.values,
      discTextValueSources: inputUpdate.sources,
      discTextTitleValue: inputUpdate.titleValue,
    })

    return getDiscTextContent(
      key,
      nextResolution.metadataBoundDiscTextValues,
      nextResolution.resolvedDiscTextTitle,
    )
  }

  function applyDiscTextInputUpdate(
    key: DiscTextKey,
    inputUpdate: DiscTextInputUpdate,
    renderedContent: string,
    options: {
      htmlSources?: DiscTextHtmlSources
      valueSources?: 'always' | 'metadataBound'
    } = {},
  ) {
    const valueSourcesMode = options.valueSources ?? 'metadataBound'
    const shouldSetValueSources = valueSourcesMode === 'always' ||
      (
        valueSourcesMode === 'metadataBound' &&
        isMetadataBoundDiscTextKey(key)
      )

    if (shouldSetValueSources) {
      setDiscTextValueSources(inputUpdate.sources)
    }
    setDiscTextValues(inputUpdate.values)
    setDiscTextTitleValue(inputUpdate.titleValue)
    if (options.htmlSources) {
      setDiscTextHtmlSources(options.htmlSources)
    }
    clampDiscTextLayoutForContent(key, renderedContent)
  }

  function handleDiscTextContentChange(key: DiscTextKey, value: string) {
    const nextInputUpdate = updateDiscTextInputValue(
      discTextValues,
      discTextValueSources,
      key,
      value,
      discTextTitleValue,
    )

    applyDiscTextInputUpdate(
      key,
      nextInputUpdate,
      getDiscTextInputUpdateRenderedContent(key, nextInputUpdate),
    )
  }

  function handleDiscTextContentModeChange(
    key: DiscTextKey,
    contentMode: TextContentMode,
  ) {
    const currentText = getCurrentDiscTextContent(key)
    const currentSource = getDiscTextHtmlSource(
      discTextHtmlSources,
      key,
      currentText,
    )

    if (contentMode === 'html') {
      setDiscTextHtmlSources((currentSources) =>
        setDiscTextHtmlEnabled(currentSources, key, true, currentSource))
      clampDiscTextLayoutForContent(
        key,
        parseHtmlText(currentSource).plainText,
      )
      return
    }

    const renderedPlainText = parseHtmlText(currentSource).plainText
    const nextInputUpdate = updateDiscTextInputValue(
      discTextValues,
      discTextValueSources,
      key,
      renderedPlainText,
      discTextTitleValue,
    )

    setDiscTextHtmlSources((currentSources) =>
      setDiscTextHtmlEnabled(currentSources, key, false, currentSource))
    applyDiscTextInputUpdate(key, nextInputUpdate, renderedPlainText)
  }

  function handleDiscTextInlineDraftChange(
    key: DiscTextKey,
    value: string,
    options: { sourceMode?: boolean } = {},
  ) {
    if (options.sourceMode) {
      const renderedPlainText = parseHtmlText(value).plainText
      const nextInputUpdate = updateDiscTextInlineDraftValue(
        discTextValues,
        discTextValueSources,
        key,
        getDiscTextInlineStorageValue(key, renderedPlainText),
        discTextTitleValue,
      )

      setDiscTextHtmlSources((currentSources) =>
        setDiscTextHtmlSource(currentSources, key, value))
      applyDiscTextInputUpdate(key, nextInputUpdate, renderedPlainText)
      return
    }

    if (isDiscTextHtmlEnabled(discTextHtmlSources, key)) {
      const currentText = getCurrentDiscTextContent(key)
      const result = applyRichTextPlainTextMutation({
        fallbackText: currentText,
        htmlSource: getDiscTextHtmlSource(discTextHtmlSources, key, currentText),
        nextPlainText: value,
      })
      const renderedPlainText = result.plainText
      const nextInputUpdate = updateDiscTextInlineDraftValue(
        discTextValues,
        discTextValueSources,
        key,
        getDiscTextInlineStorageValue(key, renderedPlainText),
        discTextTitleValue,
      )

      setDiscTextHtmlSources((currentSources) =>
        setDiscTextHtmlSource(currentSources, key, result.htmlSource))
      applyDiscTextInputUpdate(key, nextInputUpdate, renderedPlainText)
      return
    }

    const nextInputUpdate = updateDiscTextInlineDraftValue(
      discTextValues,
      discTextValueSources,
      key,
      value,
      discTextTitleValue,
    )

    applyDiscTextInputUpdate(
      key,
      nextInputUpdate,
      getDiscTextInputUpdateRenderedContent(key, nextInputUpdate),
    )
  }

  function finalizeDiscTextInlineDraft(
    key: DiscTextKey,
    commit?: DiscTextInlineDoneCommit,
  ) {
    const committedHtmlSource =
      commit?.sourceMode === true ? commit.value : undefined
    const committedPlainText = committedHtmlSource !== undefined
      ? parseHtmlText(committedHtmlSource).plainText
      : undefined
    const committedInputUpdate = committedPlainText !== undefined
      ? updateDiscTextInlineDraftValue(
          discTextValues,
          discTextValueSources,
          key,
          getDiscTextInlineStorageValue(key, committedPlainText),
          discTextTitleValue,
        )
      : null
    const draftDiscTextValues =
      committedInputUpdate?.values ?? discTextValues
    const draftDiscTextValueSources =
      committedInputUpdate?.sources ?? discTextValueSources
    const draftDiscTextTitleValue =
      committedInputUpdate?.titleValue ?? discTextTitleValue
    const draftDiscTextHtmlSources =
      committedHtmlSource !== undefined
        ? setDiscTextHtmlSource(discTextHtmlSources, key, committedHtmlSource)
        : discTextHtmlSources
    const renderedContent =
      committedPlainText ?? getCurrentDiscTextRenderedContent(key)
    const finalizedDraft = finalizeDiscTextInlineDraftValue(
      draftDiscTextValues,
      draftDiscTextValueSources,
      key,
      renderedContent,
      draftDiscTextTitleValue,
      draftDiscTextHtmlSources,
    )

    if (!finalizedDraft) {
      if (committedPlainText !== undefined) {
        const draftInputUpdate = {
          sources: draftDiscTextValueSources,
          titleValue: draftDiscTextTitleValue,
          values: draftDiscTextValues,
        }

        applyDiscTextInputUpdate(
          key,
          draftInputUpdate,
          getDiscTextInputUpdateRenderedContent(key, draftInputUpdate),
          {
            htmlSources: draftDiscTextHtmlSources,
            valueSources: 'always',
          },
        )
      }
      return
    }

    applyDiscTextInputUpdate(
      key,
      finalizedDraft,
      getDiscTextInputUpdateRenderedContent(key, finalizedDraft),
      {
        htmlSources: finalizedDraft.htmlSources,
        valueSources: 'always',
      },
    )
  }

  function handleUseMetadataDiscTextValue(key: MetadataBoundDiscTextKey) {
    const transition = restoreDiscTextMetadataValueTransition({
      key,
      metadata: projectMetadata,
      state: {
        discTextValues,
        discTextValueSources,
        discTextTitleValue,
      },
    })

    setDiscTextValueSources(transition.state.discTextValueSources)
    setDiscTextValues(transition.state.discTextValues)
    setDiscTextTitleValue(transition.state.discTextTitleValue)
    clampDiscTextLayoutForContent(key, transition.renderedContent)
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
          getCurrentDiscTextRenderedContent(key),
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
              getCurrentDiscTextRenderedContent(key),
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
          getCurrentDiscTextRenderedContent(key),
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
          getCurrentDiscTextRenderedContent(key),
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
    const transition = updateDiscTextStyleFieldTransition({
      currentLayout: discTextLayout,
      currentStyles: discTextStyles,
      field,
      key,
      renderedContent: getCurrentDiscTextRenderedContent(key),
      selectedDiscTemplate,
      value,
    })

    setDiscTextStyles(transition.styles)
    setDiscTextLayout((currentLayout) =>
      updateDiscTextStyleFieldTransition({
        currentLayout,
        currentStyles: discTextStyles,
        field,
        key,
        renderedContent: getCurrentDiscTextRenderedContent(key),
        selectedDiscTemplate,
        value,
      }).layout)
  }

  function handleDiscTextRichTextCommand(
    key: DiscTextKey,
    command: DiscTextRichTextCommand,
    selection: PlainTextSelectionRange | undefined,
    value: boolean | number | string,
  ) {
    if (
      command === 'bulletedList' &&
      isCurvedCopyrightDiscTextLayout(key, discTextLayout[key])
    ) {
      return
    }

    const currentText = getCurrentDiscTextContent(key)
    const result = applyDiscTextRichTextCommandToSource({
      command,
      selection,
      source: createDiscTextRichTextSource({
        currentText,
        htmlSources: discTextHtmlSources,
        key,
        layout: discTextLayout[key],
        styles: discTextStyles,
      }),
      value,
    })

    if (!result) {
      return
    }

    const nextInputUpdate = updateDiscTextInlineDraftValue(
      discTextValues,
      discTextValueSources,
      key,
      getDiscTextInlineStorageValue(key, result.plainText),
      discTextTitleValue,
    )

    setDiscTextHtmlSources((currentSources) =>
      setDiscTextHtmlSource(currentSources, key, result.htmlSource))
    applyDiscTextInputUpdate(key, nextInputUpdate, result.plainText)
    return result.selection
  }

  function handleDiscTextRichTextKeyboardCommand(
    key: DiscTextKey,
    command: RichTextListKeyboardCommand,
    selection: PlainTextSelectionRange,
  ) {
    if (isCurvedCopyrightDiscTextLayout(key, discTextLayout[key])) {
      return null
    }

    const currentText = getCurrentDiscTextContent(key)
    const result = applyDiscTextRichTextKeyboardCommandToSource({
      command,
      selection,
      source: createDiscTextRichTextSource({
        currentText,
        htmlSources: discTextHtmlSources,
        key,
        layout: discTextLayout[key],
        styles: discTextStyles,
      }),
    })

    if (!result) {
      return null
    }

    const nextInputUpdate = updateDiscTextInlineDraftValue(
      discTextValues,
      discTextValueSources,
      key,
      getDiscTextInlineStorageValue(key, result.plainText),
      discTextTitleValue,
    )

    setDiscTextHtmlSources((currentSources) =>
      setDiscTextHtmlSource(currentSources, key, result.htmlSource))
    applyDiscTextInputUpdate(key, nextInputUpdate, result.plainText)
    return result.selection
  }

  function getDiscTextRichTextCommandState(
    key: DiscTextKey,
    command: DiscTextRichTextCommand,
    selection: PlainTextSelectionRange | undefined,
  ): DiscTextRichTextCommandState {
    const currentText = getCurrentDiscTextContent(key)

    return getDiscTextRichTextCommandStateFromSource({
      command,
      selection,
      source: createDiscTextRichTextSource({
        currentText,
        htmlSources: discTextHtmlSources,
        key,
        layout: discTextLayout[key],
        styles: discTextStyles,
      }),
    })
  }

  function handleResetDiscTextStyle(key: DiscTextKey) {
    const transition = resetDiscTextStyleTransition({
      currentLayout: discTextLayout,
      currentStyles: discTextStyles,
      key,
      renderedContent: getCurrentDiscTextRenderedContent(key),
      selectedDiscTemplate,
    })

    setDiscTextStyles(transition.styles)
    setDiscTextLayout((currentLayout) =>
      resetDiscTextStyleTransition({
        currentLayout,
        currentStyles: discTextStyles,
        key,
        renderedContent: getCurrentDiscTextRenderedContent(key),
        selectedDiscTemplate,
      }).layout)
  }

  function handleApplyDiscTextStylePreset(key: DiscTextKey, presetId: string) {
    const transition = applyDiscTextStylePresetTransition({
      currentLayout: discTextLayout,
      currentStyles: discTextStyles,
      key,
      presetId,
      renderedContent: getCurrentDiscTextRenderedContent(key),
      selectedDiscTemplate,
    })

    setDiscTextStyles(transition.styles)
    setDiscTextLayout((currentLayout) =>
      applyDiscTextStylePresetTransition({
        currentLayout,
        currentStyles: discTextStyles,
        key,
        presetId,
        renderedContent: getCurrentDiscTextRenderedContent(key),
        selectedDiscTemplate,
      }).layout)
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
    discTextHtmlSources,
    discTextLayout,
    discTextStyles,
    selectedDiscTextKey,
    setSelectedDiscTextKey,
    metadataBoundDiscTextValues,
    resolvedDiscTextTitle,
    getCurrentDiscTextContent,
    getCurrentDiscTextRenderedContent,
    setDiscTextLayout,
    resetDiscTextState,
    restoreDiscTextState,
    clampDiscTextLayoutToTemplate,
    repositionDiscTextForSteamLogoPlacement,
    clampDiscTextLayoutForContent,
    clampMetadataBoundDiscTextLayoutsForContent,
    clampMetadataBoundDiscTextLayoutsForProjectMetadataFields,
    handleDiscTextToggle,
    handleDiscTextPreviewEditStart,
    handleDiscTextContentChange,
    handleDiscTextContentModeChange,
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
    handleDiscTextRichTextCommand,
    handleDiscTextRichTextKeyboardCommand,
    getDiscTextRichTextCommandState,
    handleResetDiscTextStyle,
    handleApplyDiscTextStylePreset,
    handleDiscNumberArtworkModeChange,
    handleDiscNumberArtworkBadgeSetChange,
    enableCurvedCopyrightDiscText,
    setCopyrightDiscTextEnabled,
    applySteamImportedDiscTextValues,
  }
}
