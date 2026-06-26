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
  type DiscTextLayout,
  type DiscTextLayoutNumericField,
  type DiscTextLayoutSettings,
  type DiscTextHtmlSources,
  type DiscTextMode,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from '../discText/index'
import {
  DISC_TEXT_RENDER_STYLES,
  createDefaultDiscTextStyles,
  applyDiscTextStylePreset,
  resetDiscTextStyle,
  updateDiscTextStyleField,
  type DiscTextStyleField,
  type DiscTextStyleSettings,
  type DiscTextStyleValue,
} from '../discText/styles'
import {
  parseHtmlText,
  type TextContentMode,
} from '../text/htmlText'
import {
  RICH_TEXT_BOLD_FONT_WEIGHT,
} from '../text/richTextWeights'
import {
  applyRichTextBulletedListCommand,
  applyRichTextInlineColorCommand,
  applyRichTextInlineFontFamilyCommand,
  applyRichTextInlineFontSizePtCommand,
  applyRichTextInlineToggleCommand,
  applyRichTextListKeyboardCommand,
  applyRichTextPlainTextMutation,
  getRichTextBulletedListState,
  getRichTextInlineToggleState,
  getRichTextSelectionColorState,
  getRichTextSelectionFontFamilyState,
  getRichTextSelectionFontSizePtState,
  type PlainTextSelectionRange,
  type RichTextAmbientInlineStyle,
  type RichTextInlineToggleCommand,
  type RichTextListKeyboardCommand,
  type RichTextSelectionColorState,
  type RichTextSelectionNumberState,
  type RichTextSelectionStringState,
  type RichTextSelectionStyleState,
} from '../text/richTextCommands'

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

type DiscTextRichTextCommand =
  | RichTextInlineToggleCommand
  | 'bulletedList'
  | 'color'
  | 'fontFamily'
  | 'fontSizePt'
type DiscTextRichTextCommandState =
  | RichTextSelectionStyleState
  | RichTextSelectionColorState
  | RichTextSelectionNumberState
  | RichTextSelectionStringState

type DiscTextInlineDoneCommit = {
  sourceMode?: boolean
  value: string
}

const DISC_TEXT_INLINE_RENDERED_PREFIXES: Partial<Record<DiscTextKey, string>> = {
  appId: 'Steam App ID ',
  backupDate: 'Backed up ',
  developer: 'Developer: ',
  publisher: 'Publisher: ',
}

function getDiscTextInlineStorageValue(key: DiscTextKey, value: string) {
  const prefix = DISC_TEXT_INLINE_RENDERED_PREFIXES[key]

  return prefix && value.startsWith(prefix)
    ? value.slice(prefix.length)
    : value
}

function getDiscTextRichTextAmbientStyle(
  key: DiscTextKey,
  styles: DiscTextStyleSettings,
  layout?: DiscTextLayout,
): RichTextAmbientInlineStyle {
  return {
    bold: styles[key].bold,
    boldFontWeight: RICH_TEXT_BOLD_FONT_WEIGHT,
    color: styles[key].color,
    fontFamily: styles[key].fontFamily,
    fontSizePt: layout?.fontSizePt,
    italic: styles[key].italic,
    normalFontWeight: Math.min(DISC_TEXT_RENDER_STYLES[key].fontWeight, 400),
    underline: styles[key].underline,
  }
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

    if (isMetadataBoundDiscTextKey(key)) {
      setDiscTextValueSources(nextInputUpdate.sources)
    }
    setDiscTextValues(nextInputUpdate.values)
    setDiscTextTitleValue(nextInputUpdate.titleValue)
    setDiscTextHtmlSources((currentSources) =>
      setDiscTextHtmlEnabled(currentSources, key, false, currentSource))
    clampDiscTextLayoutForContent(key, renderedPlainText)
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
      if (isMetadataBoundDiscTextKey(key)) {
        setDiscTextValueSources(nextInputUpdate.sources)
      }
      setDiscTextValues(nextInputUpdate.values)
      setDiscTextTitleValue(nextInputUpdate.titleValue)
      clampDiscTextLayoutForContent(key, renderedPlainText)
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
      if (isMetadataBoundDiscTextKey(key)) {
        setDiscTextValueSources(nextInputUpdate.sources)
      }
      setDiscTextValues(nextInputUpdate.values)
      setDiscTextTitleValue(nextInputUpdate.titleValue)
      clampDiscTextLayoutForContent(key, renderedPlainText)
      return
    }

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
        const nextResolution = resolveDiscTextForMetadata(projectMetadata, {
          discTextValues: draftDiscTextValues,
          discTextValueSources: draftDiscTextValueSources,
          discTextTitleValue: draftDiscTextTitleValue,
        })

        setDiscTextValueSources(draftDiscTextValueSources)
        setDiscTextValues(draftDiscTextValues)
        setDiscTextTitleValue(draftDiscTextTitleValue)
        setDiscTextHtmlSources(draftDiscTextHtmlSources)
        clampDiscTextLayoutForContent(
          key,
          getDiscTextContent(
            key,
            nextResolution.metadataBoundDiscTextValues,
            nextResolution.resolvedDiscTextTitle,
          ),
        )
      }
      return
    }

    const nextResolution = resolveDiscTextForMetadata(projectMetadata, {
      discTextValues: finalizedDraft.values,
      discTextValueSources: finalizedDraft.sources,
      discTextTitleValue: finalizedDraft.titleValue,
    })

    setDiscTextValueSources(finalizedDraft.sources)
    setDiscTextValues(finalizedDraft.values)
    setDiscTextTitleValue(finalizedDraft.titleValue)
    setDiscTextHtmlSources(finalizedDraft.htmlSources)
    clampDiscTextLayoutForContent(
      key,
      getDiscTextContent(
        key,
        nextResolution.metadataBoundDiscTextValues,
        nextResolution.resolvedDiscTextTitle,
      ),
    )
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
    const nextStyles = updateDiscTextStyleField(discTextStyles, key, field, value)

    setDiscTextStyles(nextStyles)
    setDiscTextLayout((currentLayout) => ({
      ...currentLayout,
      [key]: clampStraightDiscTextLayoutToSafeZone(
              key,
              currentLayout[key],
              selectedDiscTemplate,
              getCurrentDiscTextRenderedContent(key),
              undefined,
              nextStyles,
            ),
    }))
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
    const source = {
      ambientStyle: getDiscTextRichTextAmbientStyle(
        key,
        discTextStyles,
        discTextLayout[key],
      ),
      fallbackText: currentText,
      htmlSource: isDiscTextHtmlEnabled(discTextHtmlSources, key)
        ? getDiscTextHtmlSource(discTextHtmlSources, key, currentText)
        : undefined,
    }
    const result = command === 'color'
      ? applyRichTextInlineColorCommand({
          ...source,
          color: String(value),
          selection,
        })
      : command === 'fontFamily'
        ? applyRichTextInlineFontFamilyCommand({
            ...source,
            fontFamily: String(value),
            selection,
          })
      : command === 'fontSizePt'
        ? applyRichTextInlineFontSizePtCommand({
            ...source,
            fontSizePt: Number(value),
            selection,
          })
      : command === 'bulletedList'
        ? applyRichTextBulletedListCommand({
            ...source,
            active: Boolean(value),
            selection,
          })
        : applyRichTextInlineToggleCommand({
            ...source,
            active: Boolean(value),
            command,
            selection,
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
    if (isMetadataBoundDiscTextKey(key)) {
      setDiscTextValueSources(nextInputUpdate.sources)
    }
    setDiscTextValues(nextInputUpdate.values)
    setDiscTextTitleValue(nextInputUpdate.titleValue)
    clampDiscTextLayoutForContent(key, result.plainText)
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
    const source = {
      ambientStyle: getDiscTextRichTextAmbientStyle(
        key,
        discTextStyles,
        discTextLayout[key],
      ),
      fallbackText: currentText,
      htmlSource: isDiscTextHtmlEnabled(discTextHtmlSources, key)
        ? getDiscTextHtmlSource(discTextHtmlSources, key, currentText)
        : undefined,
    }
    const result = applyRichTextListKeyboardCommand({
      ...source,
      command,
      selection,
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
    if (isMetadataBoundDiscTextKey(key)) {
      setDiscTextValueSources(nextInputUpdate.sources)
    }
    setDiscTextValues(nextInputUpdate.values)
    setDiscTextTitleValue(nextInputUpdate.titleValue)
    clampDiscTextLayoutForContent(key, result.plainText)
    return result.selection
  }

  function getDiscTextRichTextCommandState(
    key: DiscTextKey,
    command: DiscTextRichTextCommand,
    selection: PlainTextSelectionRange | undefined,
  ): DiscTextRichTextCommandState {
    const currentText = getCurrentDiscTextContent(key)
    const source = {
      ambientStyle: getDiscTextRichTextAmbientStyle(
        key,
        discTextStyles,
        discTextLayout[key],
      ),
      fallbackText: currentText,
      htmlSource: isDiscTextHtmlEnabled(discTextHtmlSources, key)
        ? getDiscTextHtmlSource(discTextHtmlSources, key, currentText)
        : undefined,
    }

    return command === 'color'
      ? getRichTextSelectionColorState({ ...source, selection })
      : command === 'fontFamily'
        ? getRichTextSelectionFontFamilyState({ ...source, selection })
      : command === 'fontSizePt'
        ? getRichTextSelectionFontSizePtState({ ...source, selection })
      : command === 'bulletedList'
        ? getRichTextBulletedListState({ ...source, selection })
        : getRichTextInlineToggleState({ ...source, command, selection })
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
              getCurrentDiscTextRenderedContent(key),
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
              getCurrentDiscTextRenderedContent(key),
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
