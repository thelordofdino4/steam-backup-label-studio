import { sanitizeHtmlSource } from '../../text/htmlText.ts'

export type InlinePreviewHtmlSourceDraftStatus = {
  canonicalSource: string
  message: string | null
}

export type InlinePreviewHtmlSourceDraft = {
  identity: string
  initialized: boolean
  value: string
}

const UNSUPPORTED_HTML_SOURCE_PATTERN =
  /<\s*(?:script|style|iframe|object|embed|form|img|a)\b|(?:\son[a-z]+\s*=)|(?:\s(?:class|id)\s*=)|url\s*\(/i

export function getInlinePreviewHtmlSourceDraftIdentity(targetKey: string) {
  return `${targetKey}:html-source`
}

export function getInlinePreviewHtmlSourceDraftFallback({
  sourceValue,
  value,
}: {
  sourceValue?: string
  value: string
}) {
  return sourceValue ?? value
}

export function createInlinePreviewHtmlSourceDraft({
  fallbackValue,
  initialized,
  identity,
}: {
  fallbackValue: string
  initialized: boolean
  identity: string
}): InlinePreviewHtmlSourceDraft {
  return {
    identity,
    initialized,
    value: fallbackValue,
  }
}

export function resolveInlinePreviewHtmlSourceDraft({
  draft,
  fallbackValue,
  initialized,
  identity,
}: {
  draft: InlinePreviewHtmlSourceDraft
  fallbackValue: string
  initialized: boolean
  identity: string
}): InlinePreviewHtmlSourceDraft {
  return draft.identity === identity
    ? draft
    : createInlinePreviewHtmlSourceDraft({
        fallbackValue,
        initialized,
        identity,
      })
}

export function getInlinePreviewHtmlSourceDraftValue({
  draft,
  fallbackValue,
}: {
  draft: InlinePreviewHtmlSourceDraft
  fallbackValue: string
}) {
  return draft.initialized ? draft.value : fallbackValue
}

export function getInlinePreviewHtmlSourceDraftStatus(
  source: string,
  options: { curvedText?: boolean } = {},
): InlinePreviewHtmlSourceDraftStatus {
  const canonicalSource = sanitizeHtmlSource(source)
  const hasSource = source.trim().length > 0
  const willChange = canonicalSource !== source

  if (options.curvedText && /<\s*\/?\s*(?:ul|ol|li)\b/i.test(source)) {
    return {
      canonicalSource,
      message:
        'Lists are not supported by curved text; safe visible text is preserved and cleaned on Done.',
    }
  }

  if (hasSource && UNSUPPORTED_HTML_SOURCE_PATTERN.test(source)) {
    return {
      canonicalSource,
      message: 'Unsupported HTML is ignored in the preview and cleaned on Done.',
    }
  }

  if (hasSource && willChange) {
    return {
      canonicalSource,
      message: 'HTML will be normalized on Done.',
    }
  }

  return {
    canonicalSource,
    message: null,
  }
}
