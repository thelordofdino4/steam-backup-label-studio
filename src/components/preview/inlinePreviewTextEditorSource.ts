import { sanitizeHtmlSource } from '../../text/htmlText.ts'

export type InlinePreviewHtmlSourceDraftStatus = {
  canonicalSource: string
  message: string | null
}

const UNSUPPORTED_HTML_SOURCE_PATTERN =
  /<\s*(?:script|style|iframe|object|embed|form|img|a)\b|(?:\son[a-z]+\s*=)|(?:\s(?:class|id)\s*=)|url\s*\(/i

export function getInlinePreviewHtmlSourceDraftStatus(
  source: string,
): InlinePreviewHtmlSourceDraftStatus {
  const canonicalSource = sanitizeHtmlSource(source)
  const hasSource = source.trim().length > 0
  const willChange = canonicalSource !== source

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
