import {
  getDiscTextHtmlSource,
  isDiscTextHtmlEnabled,
} from './index.ts'
import type {
  DiscTextHtmlSources,
  DiscTextKey,
} from './types.ts'
import {
  parseHtmlText,
  type RichTextDocument,
} from '../text/htmlText.ts'

export type DiscTextRenderableContent = Readonly<{
  plainText: string
  richText?: RichTextDocument
}>

export function getDiscTextRenderableContent({
  fallbackText,
  htmlSources,
  key,
}: Readonly<{
  fallbackText: string
  htmlSources: DiscTextHtmlSources
  key: DiscTextKey
}>): DiscTextRenderableContent {
  if (!isDiscTextHtmlEnabled(htmlSources, key)) {
    return Object.freeze({ plainText: fallbackText })
  }

  const richText = parseHtmlText(
    getDiscTextHtmlSource(htmlSources, key, fallbackText),
  )

  return Object.freeze({
    plainText: richText.plainText,
    richText,
  })
}
